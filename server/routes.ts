import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { db } from "./db";
import { imamSignups, insertImamSignupSchema, SALAH_NAMES, eventRsvps, insertEventRsvpSchema, users, otpCodes, insertUserSchema, pushTokens, notificationPreferences, ramadanTimetable, events, insertEventSchema, communityIftaarDates } from "@shared/schema";
import { eq, gte, and, lt, sql, asc, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";

const ICKC_MASJID_ID = "x4KB2K5Q";

interface MasjdalPrayerTime {
  name: string;
  adhan: string;
  iqamah: string;
}

interface MasjdalData {
  prayers: MasjdalPrayerTime[];
  sunrise: string;
  hijriDate: string;
  gregorianDate: string;
  jumuah: string[];
}

function normalizeTimeStr(t: string): string {
  return t.replace(/\s+/g, ' ').trim();
}

async function fetchMasjdalPrayerTimes(): Promise<MasjdalData> {
  const url = `https://timing.athanplus.com/masjid/widgets/embed?theme=1&masjid_id=${ICKC_MASJID_ID}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Masjidal API error: ${response.status}`);
  }
  
  const html = await response.text();
  
  const todayTablePattern = /id="table_div_0"[\s\S]*?(?=id="table_div_1"|<script|$)/i;
  const todayTableMatch = html.match(todayTablePattern);
  const todayHtml = todayTableMatch ? todayTableMatch[0] : html;
  
  const prayerNames = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const prayers: MasjdalPrayerTime[] = [];
  let sunrise = "";
  const jumuah: string[] = [];
  
  for (const name of prayerNames) {
    const pattern = new RegExp(`${name}[\\s\\S]*?<td>([\\d:]+\\s*[AP]M)<\\/td>[\\s\\S]*?<td><b>([\\d:]+\\s*[AP]M)<\\/b><\\/td>`, 'i');
    const match = todayHtml.match(pattern);
    if (match) {
      prayers.push({
        name,
        adhan: normalizeTimeStr(match[1]),
        iqamah: normalizeTimeStr(match[2]),
      });
    }
  }
  
  const sunrisePattern = /colspan="2"[^>]*>([\d:]+\s*[AP]M)<\/td>/i;
  const sunriseMatch = todayHtml.match(sunrisePattern);
  if (sunriseMatch) {
    sunrise = normalizeTimeStr(sunriseMatch[1]);
  }
  
  const jumuahPattern = /<li><b>([\d:]+\s*[AP]M)<\/b>/gi;
  let jumuahMatch;
  while ((jumuahMatch = jumuahPattern.exec(todayHtml)) !== null) {
    jumuah.push(normalizeTimeStr(jumuahMatch[1]));
  }
  
  const activeCarousel = html.match(/carousel-item\s+active"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/i);
  const dateSection = activeCarousel ? activeCarousel[0] : html;
  
  const datePattern = /([A-Za-z]+,\s+[A-Za-z]+\s+\d+,\s+\d+)/;
  const dateMatch = dateSection.match(datePattern);
  const gregorianDate = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const hijriPattern = /<p>([A-Za-z]+\s+\d+,\s+\d{4})<\/p>/;
  const hijriMatch = dateSection.match(hijriPattern);
  const hijriDate = hijriMatch ? hijriMatch[1] : "";
  
  return {
    prayers,
    sunrise,
    hijriDate,
    gregorianDate,
    jumuah,
  };
}

interface MultiDayPrayerData {
  dayOffset: number;
  date: string;
  hijriDate: string;
  prayers: MasjdalPrayerTime[];
}

async function fetchMasjdalMultiDayPrayerTimes(): Promise<MultiDayPrayerData[]> {
  const url = `https://timing.athanplus.com/masjid/widgets/embed?theme=1&masjid_id=${ICKC_MASJID_ID}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Masjidal API error: ${response.status}`);
  }

  const html = await response.text();
  const prayerNames = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const results: MultiDayPrayerData[] = [];

  const carouselItems: { index: number; date: string; hijriDate: string }[] = [];
  const carouselPattern = /carousel-item[^"]*"\s*data-id="(\d+)"([\s\S]*?)(?=carousel-item[^"]*"\s*data-id="|<script|$)/gi;
  let carouselMatch;
  while ((carouselMatch = carouselPattern.exec(html)) !== null) {
    const idx = parseInt(carouselMatch[1]);
    const section = carouselMatch[2];
    const datePattern = /([A-Za-z]+,\s+[A-Za-z]+\s+\d+,\s+\d+)/;
    const dateMatch = section.match(datePattern);
    const hijriPattern = /<p>([A-Za-z]+\s+\d+,\s+\d{4})<\/p>/;
    const hijriMatch = section.match(hijriPattern);
    carouselItems.push({
      index: idx,
      date: dateMatch ? dateMatch[1] : "",
      hijriDate: hijriMatch ? hijriMatch[1] : "",
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let todayIndex = -1;
  for (const item of carouselItems) {
    if (item.date) {
      const parsed = new Date(item.date);
      parsed.setHours(0, 0, 0, 0);
      if (parsed.getTime() === today.getTime()) {
        todayIndex = item.index;
        break;
      }
    }
  }
  if (todayIndex === -1) {
    const activeMatch = html.match(/carousel-item\s+active"\s*data-id="(\d+)"/);
    todayIndex = activeMatch ? parseInt(activeMatch[1]) : 0;
  }

  for (let dayOffset = 0; dayOffset < 4; dayOffset++) {
    const tableIdx = todayIndex + dayOffset;
    if (tableIdx > 6) break;

    const tablePattern = new RegExp(`id="table_div_${tableIdx}"([\\s\\S]*?)(?=id="table_div_${tableIdx + 1}"|<script|$)`, 'i');
    const tableMatch = html.match(tablePattern);
    if (!tableMatch) continue;

    const tableHtml = tableMatch[1];
    const prayers: MasjdalPrayerTime[] = [];

    for (const name of prayerNames) {
      const pattern = new RegExp(`${name}[\\s\\S]*?<td>([\\d:]+\\s*[AP]M)<\\/td>[\\s\\S]*?<td><b>([\\d:]+\\s*[AP]M)<\\/b><\\/td>`, 'i');
      const match = tableHtml.match(pattern);
      if (match) {
        prayers.push({
          name,
          adhan: normalizeTimeStr(match[1]),
          iqamah: normalizeTimeStr(match[2]),
        });
      }
    }

    const carouselItem = carouselItems.find(c => c.index === tableIdx);
    const dateForDay = carouselItem?.date || "";
    const hijriForDay = carouselItem?.hijriDate || "";

    if (prayers.length > 0) {
      results.push({
        dayOffset,
        date: dateForDay,
        hijriDate: hijriForDay,
        prayers,
      });
    }
  }

  return results;
}

function formatTime12Hour(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function addMinutesToTime(time24: string, minutes: number): string {
  const [hours, mins] = time24.split(":").map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, "0")}:${newMins.toString().padStart(2, "0")}`;
}

function getDateWindow(): { yesterday: string; maxDate: string } {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 14);
  
  return {
    yesterday: yesterday.toISOString().split("T")[0],
    maxDate: maxDate.toISOString().split("T")[0],
  };
}

function isFriday(dateStr: string): boolean {
  const date = new Date(dateStr + "T12:00:00");
  return date.getDay() === 5;
}

async function cleanupOldSignups() {
  const { yesterday } = getDateWindow();
  try {
    await db.delete(imamSignups).where(lt(imamSignups.date, yesterday));
    console.log(`Cleaned up signups older than ${yesterday}`);
  } catch (error) {
    console.error("Error cleaning up old signups:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  cleanupOldSignups();

  app.get("/api/health", (req, res) => {
    const internalDomain = process.env.REPLIT_INTERNAL_APP_DOMAIN || null;
    const devDomain = process.env.REPLIT_DEV_DOMAIN || null;
    const replitDomains = process.env.REPLIT_DOMAINS || null;
    const nodeEnv = process.env.NODE_ENV || null;
    const forwarded = req.header("x-forwarded-host") || null;
    const hostHeader = req.get("host") || null;

    const host = internalDomain || devDomain || "";

    console.log("[health] REPLIT_INTERNAL_APP_DOMAIN:", internalDomain);
    console.log("[health] REPLIT_DEV_DOMAIN:", devDomain);
    console.log("[health] REPLIT_DOMAINS:", replitDomains);
    console.log("[health] x-forwarded-host:", forwarded);
    console.log("[health] host header:", hostHeader);

    res.json({
      ok: true,
      apiBaseUrl: host ? `https://${host}` : null,
      debug: {
        internalDomain,
        devDomain,
        replitDomains,
        nodeEnv,
        forwarded,
        hostHeader,
      },
    });
  });

  app.get("/api/prayer-times", async (_req, res) => {
    try {
      const data = await fetchMasjdalPrayerTimes();
      
      res.json({
        prayers: data.prayers,
        hijriDate: data.hijriDate,
        gregorianDate: data.gregorianDate,
        sunrise: data.sunrise,
        jumuah: data.jumuah,
        source: "masjidal",
      });
    } catch (error) {
      console.error("Error fetching prayer times from Masjidal:", error);
      res.status(500).json({ error: "Failed to fetch prayer times" });
    }
  });

  app.get("/api/prayer-times/multi-day", async (_req, res) => {
    try {
      const days = await fetchMasjdalMultiDayPrayerTimes();
      res.json({ days, source: "masjidal" });
    } catch (error) {
      console.error("Error fetching multi-day prayer times:", error);
      res.status(500).json({ error: "Failed to fetch multi-day prayer times" });
    }
  });

  // Public Events API
  app.get("/api/events", async (_req, res) => {
    try {
      const allEvents = await db.select().from(events).where(eq(events.isActive, true)).orderBy(asc(events.sortOrder), asc(events.date));
      const now = new Date();
      const cutoffMs = 14 * 24 * 60 * 60 * 1000;
      const expiredIds: string[] = [];
      const result: typeof allEvents = [];

      for (const e of allEvents) {
        const parsed = new Date(e.date);
        if (isNaN(parsed.getTime())) { result.push(e); continue; }

        if (e.recurrence && e.recurrence !== 'none') {
          let nextDate = new Date(parsed);
          while (nextDate < now) {
            if (e.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
            else if (e.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
            else if (e.recurrence === 'biweekly') nextDate.setDate(nextDate.getDate() + 14);
            else if (e.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
            else break;
          }
          const newDateStr = nextDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          if (newDateStr !== e.date) {
            await db.update(events).set({ date: newDateStr, updatedAt: new Date() }).where(eq(events.id, e.id));
          }
          result.push({ ...e, date: newDateStr });
        } else {
          if ((now.getTime() - parsed.getTime()) > cutoffMs) {
            expiredIds.push(e.id);
          } else {
            result.push(e);
          }
        }
      }

      if (expiredIds.length > 0) {
        for (const eid of expiredIds) {
          await db.delete(events).where(eq(events.id, eid));
        }
      }
      res.json(result);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const [event] = await db.select().from(events).where(eq(events.id, req.params.id));
      if (!event) return res.status(404).json({ error: "Event not found" });
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  // Event RSVP endpoints
  app.get("/api/event-rsvps", async (req, res) => {
    try {
      const { eventName } = req.query;
      
      let rsvps;
      if (eventName) {
        rsvps = await db
          .select()
          .from(eventRsvps)
          .where(eq(eventRsvps.eventName, eventName as string));
      } else {
        rsvps = await db.select().from(eventRsvps);
      }
      
      // Group by event date and calculate totals
      const grouped: Record<string, { attendees: typeof rsvps; totalCount: number }> = {};
      
      for (const rsvp of rsvps) {
        if (!grouped[rsvp.eventDate]) {
          grouped[rsvp.eventDate] = { attendees: [], totalCount: 0 };
        }
        grouped[rsvp.eventDate].attendees.push(rsvp);
        grouped[rsvp.eventDate].totalCount += 1 + rsvp.guestCount;
      }
      
      res.json({ rsvps, grouped });
    } catch (error) {
      console.error("Error fetching RSVPs:", error);
      res.status(500).json({ error: "Failed to fetch RSVPs" });
    }
  });

  app.get("/api/event-rsvps/:eventDate", async (req, res) => {
    try {
      const { eventDate } = req.params;
      const { eventName } = req.query;
      
      let rsvps;
      if (eventName) {
        rsvps = await db
          .select()
          .from(eventRsvps)
          .where(and(
            eq(eventRsvps.eventDate, eventDate),
            eq(eventRsvps.eventName, eventName as string)
          ));
      } else {
        rsvps = await db
          .select()
          .from(eventRsvps)
          .where(eq(eventRsvps.eventDate, eventDate));
      }
      
      const totalCount = rsvps.reduce((sum, r) => sum + 1 + r.guestCount, 0);
      
      res.json({ rsvps, totalCount });
    } catch (error) {
      console.error("Error fetching RSVPs for date:", error);
      res.status(500).json({ error: "Failed to fetch RSVPs" });
    }
  });

  app.post("/api/event-rsvps", async (req, res) => {
    try {
      const parsed = insertEventRsvpSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid RSVP data", details: parsed.error.issues });
      }
      
      const [newRsvp] = await db
        .insert(eventRsvps)
        .values(parsed.data)
        .returning();
      
      res.json(newRsvp);
    } catch (error) {
      console.error("Error creating RSVP:", error);
      res.status(500).json({ error: "Failed to create RSVP" });
    }
  });

  app.put("/api/event-rsvps/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { attendeeName, guestCount } = req.body;
      
      const [updated] = await db
        .update(eventRsvps)
        .set({
          attendeeName: attendeeName,
          guestCount: guestCount,
        })
        .where(eq(eventRsvps.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "RSVP not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating RSVP:", error);
      res.status(500).json({ error: "Failed to update RSVP" });
    }
  });

  app.delete("/api/event-rsvps/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { passcode } = req.body;
      
      const adminCode = process.env.ICKC_ADMIN_CODE;
      if (passcode !== "ickc" && (!adminCode || passcode !== adminCode)) {
        return res.status(403).json({ error: "Invalid passcode" });
      }
      
      const [deleted] = await db
        .delete(eventRsvps)
        .where(eq(eventRsvps.id, id))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ error: "RSVP not found" });
      }
      
      res.json({ success: true, deleted });
    } catch (error) {
      console.error("Error deleting RSVP:", error);
      res.status(500).json({ error: "Failed to delete RSVP" });
    }
  });

  app.get("/api/imam-signups", async (_req, res) => {
    try {
      const { yesterday, maxDate } = getDateWindow();
      const signups = await db
        .select()
        .from(imamSignups)
        .where(and(gte(imamSignups.date, yesterday), lt(imamSignups.date, maxDate)));
      res.json(signups);
    } catch (error) {
      console.error("Error fetching signups:", error);
      res.status(500).json({ error: "Failed to fetch signups" });
    }
  });

  app.delete("/api/imam-signups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { passcode } = req.body;

      const adminCode = process.env.ICKC_ADMIN_CODE;
      if (!adminCode) {
        return res.status(500).json({ error: "Admin passcode not configured" });
      }

      if (passcode !== adminCode) {
        return res.status(401).json({ error: "Invalid passcode" });
      }

      const result = await db.delete(imamSignups).where(eq(imamSignups.id, id)).returning();
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Signup not found" });
      }

      res.json({ success: true, deleted: result[0] });
    } catch (error) {
      console.error("Error deleting signup:", error);
      res.status(500).json({ error: "Failed to delete signup" });
    }
  });

  app.post("/api/imam-signups", async (req, res) => {
    try {
      const parsed = insertImamSignupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      }

      const { date, salah, volunteerName } = parsed.data;

      if (!SALAH_NAMES.includes(salah as any)) {
        return res.status(400).json({ error: "Invalid salah name" });
      }

      if (isFriday(date) && salah === "Dhuhr") {
        return res.status(400).json({ error: "Friday Dhuhr signups are not allowed" });
      }

      const { yesterday, maxDate } = getDateWindow();
      if (date < yesterday || date >= maxDate) {
        return res.status(400).json({ error: "Date is outside the allowed window" });
      }

      const [newSignup] = await db
        .insert(imamSignups)
        .values({ date, salah, volunteerName })
        .returning();

      res.status(201).json(newSignup);
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "Sorry, someone else just took that slot." });
      }
      console.error("Error creating signup:", error);
      res.status(500).json({ error: "Failed to create signup" });
    }
  });

  // ============= AUTHENTICATION ROUTES =============
  
  function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async function sendSMS(phone: string, message: string): Promise<boolean> {
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.log(`[SMS MOCK] To ${phone}: ${message}`);
      return true;
    }
    
    try {
      const auth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: phone,
            From: twilioPhoneNumber,
            Body: message,
          }),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Twilio SMS error:', errorData);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }

  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phone, type } = req.body;
      
      if (!phone || !type) {
        return res.status(400).json({ error: "Phone number and type are required" });
      }
      
      if (!["register", "login", "reset"].includes(type)) {
        return res.status(400).json({ error: "Invalid OTP type" });
      }
      
      if (type === "register") {
        const existingUser = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
        if (existingUser.length > 0) {
          return res.status(409).json({ error: "Phone number already registered" });
        }
      }
      
      if (type === "login" || type === "reset") {
        const existingUser = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
        if (existingUser.length === 0) {
          return res.status(404).json({ error: "Phone number not registered" });
        }
      }
      
      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      await db.insert(otpCodes).values({
        phone,
        code,
        type,
        expiresAt,
      });
      
      const message = `Your ICKC verification code is: ${code}. Valid for 10 minutes.`;
      const sent = await sendSMS(phone, message);
      
      if (!sent) {
        return res.status(500).json({ error: "Failed to send OTP" });
      }
      
      res.json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { phone, code, type } = req.body;
      
      if (!phone || !code || !type) {
        return res.status(400).json({ error: "Phone, code, and type are required" });
      }
      
      const [otpRecord] = await db
        .select()
        .from(otpCodes)
        .where(and(
          eq(otpCodes.phone, phone),
          eq(otpCodes.code, code),
          eq(otpCodes.type, type),
          eq(otpCodes.used, false)
        ))
        .limit(1);
      
      if (!otpRecord) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }
      
      if (new Date() > otpRecord.expiresAt) {
        return res.status(400).json({ error: "OTP has expired" });
      }
      
      await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otpRecord.id));
      
      res.json({ success: true, verified: true });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { phone, password, name, email, otpCode } = req.body;
      
      if (!phone || !password || !otpCode) {
        return res.status(400).json({ error: "Phone, password, and OTP code are required" });
      }
      
      const [otpRecord] = await db
        .select()
        .from(otpCodes)
        .where(and(
          eq(otpCodes.phone, phone),
          eq(otpCodes.code, otpCode),
          eq(otpCodes.type, "register"),
          eq(otpCodes.used, true)
        ))
        .limit(1);
      
      if (!otpRecord) {
        return res.status(400).json({ error: "Please verify your phone number first" });
      }
      
      const existingUser = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
      if (existingUser.length > 0) {
        return res.status(409).json({ error: "Phone number already registered" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const [newUser] = await db
        .insert(users)
        .values({
          phone,
          password: hashedPassword,
          name: name || null,
          email: email || null,
          isVerified: true,
        })
        .returning();
      
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({ success: true, user: userWithoutPassword });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { phone, password } = req.body;
      
      if (!phone || !password) {
        return res.status(400).json({ error: "Phone and password are required" });
      }
      
      const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid phone number or password" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid phone number or password" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { phone, newPassword, otpCode } = req.body;
      
      if (!phone || !newPassword || !otpCode) {
        return res.status(400).json({ error: "Phone, new password, and OTP code are required" });
      }
      
      const [otpRecord] = await db
        .select()
        .from(otpCodes)
        .where(and(
          eq(otpCodes.phone, phone),
          eq(otpCodes.code, otpCode),
          eq(otpCodes.type, "reset"),
          eq(otpCodes.used, true)
        ))
        .limit(1);
      
      if (!otpRecord) {
        return res.status(400).json({ error: "Please verify your phone number first" });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const [updated] = await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.phone, phone))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // ============= ADMIN ROUTES =============
  
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { phone, password } = req.body;
      
      if (!phone || !password) {
        return res.status(400).json({ error: "Phone and password are required" });
      }
      
      const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
      
      if (!user || !user.isAdmin) {
        return res.status(401).json({ error: "Invalid credentials or not an admin" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
      console.error("Error admin login:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      const { passcode } = req.query;
      
      const adminCode = process.env.ICKC_ADMIN_CODE;
      if (!adminCode || passcode !== adminCode) {
        return res.status(403).json({ error: "Invalid admin passcode" });
      }
      
      const allUsers = await db.select({
        id: users.id,
        phone: users.phone,
        name: users.name,
        email: users.email,
        isAdmin: users.isAdmin,
        isVerified: users.isVerified,
        createdAt: users.createdAt,
      }).from(users);
      
      res.json({ users: allUsers });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:id/toggle-admin", async (req, res) => {
    try {
      const { id } = req.params;
      const { passcode } = req.body;
      
      const adminCode = process.env.ICKC_ADMIN_CODE;
      if (!adminCode || passcode !== adminCode) {
        return res.status(403).json({ error: "Invalid admin passcode" });
      }
      
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const [updated] = await db
        .update(users)
        .set({ isAdmin: !user.isAdmin })
        .where(eq(users.id, id))
        .returning();
      
      const { password: _, ...userWithoutPassword } = updated;
      res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
      console.error("Error toggling admin:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { passcode } = req.body;
      
      const adminCode = process.env.ICKC_ADMIN_CODE;
      if (!adminCode || passcode !== adminCode) {
        return res.status(403).json({ error: "Invalid admin passcode" });
      }
      
      const [deleted] = await db.delete(users).where(eq(users.id, id)).returning();
      
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ success: true, message: "User deleted" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    try {
      const { passcode } = req.query;
      
      const adminCode = process.env.ICKC_ADMIN_CODE;
      if (!adminCode || passcode !== adminCode) {
        return res.status(403).json({ error: "Invalid admin passcode" });
      }
      
      const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
      const [imamSignupCount] = await db.select({ count: sql<number>`count(*)` }).from(imamSignups);
      const [eventRsvpCount] = await db.select({ count: sql<number>`count(*)` }).from(eventRsvps);
      
      res.json({
        stats: {
          totalUsers: Number(userCount.count),
          totalImamSignups: Number(imamSignupCount.count),
          totalEventRsvps: Number(eventRsvpCount.count),
        }
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ============= SQUARE PAYMENT ROUTES =============
  
  app.post("/api/payments/create-checkout", async (req, res) => {
    try {
      const { amount, donationType, note } = req.body;
      
      if (!amount || !donationType) {
        return res.status(400).json({ error: "Amount and donation type are required" });
      }
      
      const squareAccessToken = process.env.SQUARE_ACCESS_TOKEN;
      const squareLocationId = process.env.SQUARE_LOCATION_ID;
      
      if (!squareAccessToken || !squareLocationId) {
        return res.status(500).json({ error: "Square is not configured" });
      }
      
      const idempotencyKey = `ickc-${donationType}-${amount}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      
      const response = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
        method: 'POST',
        headers: {
          'Square-Version': '2024-11-20',
          'Authorization': `Bearer ${squareAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          quick_pay: {
            name: `ICKC ${donationType} Donation`,
            price_money: {
              amount: amount * 100,
              currency: 'USD',
            },
            location_id: squareLocationId,
          },
          payment_note: `${donationType} donation - $${amount}${note ? ` | Note: ${note}` : ''}`,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Square error:', errorData);
        return res.status(500).json({ error: "Failed to create checkout link" });
      }
      
      const data = await response.json();
      
      res.json({ 
        success: true, 
        checkoutUrl: data.payment_link?.url || data.payment_link?.long_url,
        linkId: data.payment_link?.id,
      });
    } catch (error) {
      console.error("Error creating checkout link:", error);
      res.status(500).json({ error: "Failed to create checkout link" });
    }
  });

  // ============= PUSH NOTIFICATION ROUTES =============
  
  app.post("/api/notifications/register", async (req, res) => {
    try {
      const { token, platform, userId } = req.body;
      
      if (!token || !platform) {
        return res.status(400).json({ error: "Token and platform are required" });
      }
      
      const [existingToken] = await db
        .select()
        .from(pushTokens)
        .where(eq(pushTokens.token, token))
        .limit(1);
      
      if (existingToken) {
        await db
          .update(pushTokens)
          .set({ userId: userId || null, updatedAt: new Date() })
          .where(eq(pushTokens.token, token));
        
        return res.json({ success: true, message: "Token updated" });
      }
      
      await db.insert(pushTokens).values({
        token,
        platform,
        userId: userId || null,
      });
      
      const [existingPrefs] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.pushToken, token))
        .limit(1);
      
      if (!existingPrefs) {
        await db.insert(notificationPreferences).values({
          pushToken: token,
          prayerReminders: true,
          eventReminders: true,
          communityAnnouncements: true,
          ramadanReminders: true,
          donationCampaigns: false,
        });
      }
      
      res.json({ success: true, message: "Token registered" });
    } catch (error) {
      console.error("Error registering push token:", error);
      res.status(500).json({ error: "Failed to register push token" });
    }
  });

  app.get("/api/notifications/preferences/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const [prefs] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.pushToken, token))
        .limit(1);
      
      if (!prefs) {
        return res.json({
          prayerReminders: true,
          eventReminders: true,
          communityAnnouncements: true,
          ramadanReminders: true,
          donationCampaigns: false,
        });
      }
      
      res.json({
        prayerReminders: prefs.prayerReminders,
        eventReminders: prefs.eventReminders,
        communityAnnouncements: prefs.communityAnnouncements,
        ramadanReminders: prefs.ramadanReminders,
        donationCampaigns: prefs.donationCampaigns,
      });
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  app.put("/api/notifications/preferences/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { prayerReminders, eventReminders, communityAnnouncements, ramadanReminders, donationCampaigns } = req.body;
      
      const [existingPrefs] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.pushToken, token))
        .limit(1);
      
      if (!existingPrefs) {
        await db.insert(notificationPreferences).values({
          pushToken: token,
          prayerReminders: prayerReminders ?? true,
          eventReminders: eventReminders ?? true,
          communityAnnouncements: communityAnnouncements ?? true,
          ramadanReminders: ramadanReminders ?? true,
          donationCampaigns: donationCampaigns ?? false,
        });
      } else {
        await db
          .update(notificationPreferences)
          .set({
            prayerReminders: prayerReminders ?? existingPrefs.prayerReminders,
            eventReminders: eventReminders ?? existingPrefs.eventReminders,
            communityAnnouncements: communityAnnouncements ?? existingPrefs.communityAnnouncements,
            ramadanReminders: ramadanReminders ?? existingPrefs.ramadanReminders,
            donationCampaigns: donationCampaigns ?? existingPrefs.donationCampaigns,
            updatedAt: new Date(),
          })
          .where(eq(notificationPreferences.pushToken, token));
      }
      
      res.json({ success: true, message: "Preferences updated" });
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  app.post("/api/admin/notifications/send", async (req, res) => {
    try {
      const { passcode, title, body, type } = req.body;
      
      const adminCode = process.env.ICKC_ADMIN_CODE;
      if (!adminCode || passcode !== adminCode) {
        return res.status(403).json({ error: "Invalid admin passcode" });
      }
      
      if (!title || !body || !type) {
        return res.status(400).json({ error: "Title, body, and type are required" });
      }
      
      const tokens = await db.select().from(pushTokens);
      
      const validTokens: string[] = [];
      for (const tokenRecord of tokens) {
        const [prefs] = await db
          .select()
          .from(notificationPreferences)
          .where(eq(notificationPreferences.pushToken, tokenRecord.token))
          .limit(1);
        
        if (!prefs) {
          validTokens.push(tokenRecord.token);
          continue;
        }
        
        const shouldSend =
          (type === "prayer_reminders" && prefs.prayerReminders) ||
          (type === "event_reminders" && prefs.eventReminders) ||
          (type === "community_announcements" && prefs.communityAnnouncements) ||
          (type === "ramadan_reminders" && prefs.ramadanReminders) ||
          (type === "donation_campaigns" && prefs.donationCampaigns);
        
        if (shouldSend) {
          validTokens.push(tokenRecord.token);
        }
      }

      if (validTokens.length > 0) {
        const messages = validTokens.map((token) => ({
          to: token,
          sound: "default" as const,
          title,
          body,
          data: { type },
          channelId: "default",
        }));

        const chunks: typeof messages[] = [];
        for (let i = 0; i < messages.length; i += 100) {
          chunks.push(messages.slice(i, i + 100));
        }

        let successCount = 0;
        let failCount = 0;

        for (const chunk of chunks) {
          try {
            const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: {
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
              },
              body: JSON.stringify(chunk),
            });

            if (pushResponse.ok) {
              const result = await pushResponse.json();
              if (result.data) {
                for (const ticket of result.data) {
                  if (ticket.status === "ok") {
                    successCount++;
                  } else {
                    failCount++;
                    if (ticket.details?.error === "DeviceNotRegistered") {
                      const badToken = chunk.find((_, idx) => result.data[idx] === ticket)?.to;
                      if (badToken) {
                        await db.delete(pushTokens).where(eq(pushTokens.token, badToken));
                        await db.delete(notificationPreferences).where(eq(notificationPreferences.pushToken, badToken));
                      }
                    }
                  }
                }
              }
            } else {
              failCount += chunk.length;
              console.error("Expo Push API error:", pushResponse.status, await pushResponse.text());
            }
          } catch (pushError) {
            failCount += chunk.length;
            console.error("Error sending push chunk:", pushError);
          }
        }

        res.json({
          success: true,
          message: `Notification sent to ${successCount} devices (${failCount} failed)`,
          successCount,
          failCount,
          targetedDevices: validTokens.length,
          totalDevices: tokens.length,
        });
      } else {
        res.json({
          success: true,
          message: "No devices matched the notification criteria",
          successCount: 0,
          failCount: 0,
          targetedDevices: 0,
          totalDevices: tokens.length,
        });
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // ==========================================
  // Ramadan Timetable - Public API
  // ==========================================
  app.get("/api/ramadan-timetable", async (_req, res) => {
    try {
      const timetable = await db
        .select()
        .from(ramadanTimetable)
        .orderBy(asc(ramadanTimetable.day));
      
      res.json({ timetable });
    } catch (error) {
      console.error("Error fetching Ramadan timetable:", error);
      res.status(500).json({ error: "Failed to fetch timetable" });
    }
  });

  // ==========================================
  // Admin - Ramadan Timetable Management
  // ==========================================
  const ADMIN_USER = "ickc";
  const ADMIN_PASS = "ickc";

  app.post("/api/admin/dashboard-login", (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      res.json({ success: true, token: Buffer.from(`${ADMIN_USER}:${ADMIN_PASS}`).toString("base64") });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  function verifyAdminAuth(req: any, res: any): boolean {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Basic ")) {
      res.status(401).json({ error: "Unauthorized" });
      return false;
    }
    const decoded = Buffer.from(auth.replace("Basic ", ""), "base64").toString();
    if (decoded !== `${ADMIN_USER}:${ADMIN_PASS}`) {
      res.status(401).json({ error: "Invalid credentials" });
      return false;
    }
    return true;
  }

  app.get("/api/admin/ramadan-timetable", async (req, res) => {
    if (!verifyAdminAuth(req, res)) return;
    try {
      const timetable = await db
        .select()
        .from(ramadanTimetable)
        .orderBy(asc(ramadanTimetable.day));
      res.json({ timetable });
    } catch (error) {
      console.error("Error fetching admin timetable:", error);
      res.status(500).json({ error: "Failed to fetch timetable" });
    }
  });

  app.put("/api/admin/ramadan-timetable/:day", async (req, res) => {
    if (!verifyAdminAuth(req, res)) return;
    try {
      const dayNum = parseInt(req.params.day);
      const { fajrIqama, ishaIqama } = req.body;

      if (!fajrIqama || !ishaIqama) {
        return res.status(400).json({ error: "fajrIqama and ishaIqama are required" });
      }

      const [existing] = await db
        .select()
        .from(ramadanTimetable)
        .where(eq(ramadanTimetable.day, dayNum))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: `Day ${dayNum} not found` });
      }

      await db
        .update(ramadanTimetable)
        .set({ fajrIqama, ishaIqama })
        .where(eq(ramadanTimetable.day, dayNum));

      res.json({ success: true, message: `Day ${dayNum} updated` });
    } catch (error) {
      console.error("Error updating timetable:", error);
      res.status(500).json({ error: "Failed to update timetable" });
    }
  });

  app.post("/api/admin/ramadan-timetable/seed", async (req, res) => {
    if (!verifyAdminAuth(req, res)) return;
    try {
      const { timetable } = req.body;
      if (!Array.isArray(timetable) || timetable.length === 0) {
        return res.status(400).json({ error: "timetable array required" });
      }

      for (const entry of timetable) {
        const [existing] = await db
          .select()
          .from(ramadanTimetable)
          .where(eq(ramadanTimetable.day, entry.day))
          .limit(1);

        if (existing) {
          await db
            .update(ramadanTimetable)
            .set({
              date: entry.date,
              dayName: entry.dayName,
              fajrIqama: entry.fajrIqama,
              ishaIqama: entry.ishaIqama,
              isSaturday: entry.isSaturday || false,
              isDaylightChange: entry.isDaylightChange || false,
            })
            .where(eq(ramadanTimetable.day, entry.day));
        } else {
          await db.insert(ramadanTimetable).values({
            day: entry.day,
            date: entry.date,
            dayName: entry.dayName,
            fajrIqama: entry.fajrIqama,
            ishaIqama: entry.ishaIqama,
            isSaturday: entry.isSaturday || false,
            isDaylightChange: entry.isDaylightChange || false,
          });
        }
      }

      res.json({ success: true, message: `${timetable.length} days saved` });
    } catch (error) {
      console.error("Error seeding timetable:", error);
      res.status(500).json({ error: "Failed to seed timetable" });
    }
  });

  // Admin Events CRUD
  app.get("/api/admin/events", async (req, res) => {
    if (!verifyAdminAuth(req, res)) return;
    try {
      const allEvents = await db.select().from(events).orderBy(asc(events.sortOrder), asc(events.date));
      res.json({ events: allEvents });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/admin/events", async (req, res) => {
    if (!verifyAdminAuth(req, res)) return;
    try {
      const parsed = insertEventSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid event data", details: parsed.error.errors });
      const [newEvent] = await db.insert(events).values(parsed.data).returning();
      res.status(201).json(newEvent);
    } catch (error) {
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.put("/api/admin/events/:id", async (req, res) => {
    if (!verifyAdminAuth(req, res)) return;
    try {
      const { id } = req.params;
      const { title, description, date, time, location, category, signupEnabled, isActive, sortOrder } = req.body;
      const [updated] = await db.update(events).set({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(date !== undefined && { date }),
        ...(time !== undefined && { time }),
        ...(location !== undefined && { location }),
        ...(category !== undefined && { category }),
        ...(signupEnabled !== undefined && { signupEnabled }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
        updatedAt: new Date(),
      }).where(eq(events.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Event not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  app.delete("/api/admin/events/:id", async (req, res) => {
    if (!verifyAdminAuth(req, res)) return;
    try {
      const { id } = req.params;
      const [deleted] = await db.delete(events).where(eq(events.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Event not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  // ==========================================
  // Community Iftaar Dates API
  // ==========================================
  app.get("/api/community-iftaar-dates", async (_req, res) => {
    try {
      const dates = await db.select().from(communityIftaarDates).orderBy(asc(communityIftaarDates.date));
      res.json(dates);
    } catch (error) {
      console.error("Error fetching iftaar dates:", error);
      res.status(500).json({ error: "Failed to fetch iftaar dates" });
    }
  });

  app.post("/api/admin/community-iftaar-dates", async (req, res) => {
    if (!verifyAdminAuth(req, res)) return;
    try {
      const { date, label } = req.body;
      if (!date) return res.status(400).json({ error: "Date is required" });
      const [created] = await db.insert(communityIftaarDates).values({ date, label: label || null }).returning();
      res.json(created);
    } catch (error: any) {
      if (error?.code === "23505") return res.status(409).json({ error: "This date already exists" });
      console.error("Error adding iftaar date:", error);
      res.status(500).json({ error: "Failed to add iftaar date" });
    }
  });

  app.delete("/api/admin/community-iftaar-dates/:id", async (req, res) => {
    if (!verifyAdminAuth(req, res)) return;
    try {
      const { id } = req.params;
      const [deleted] = await db.delete(communityIftaarDates).where(eq(communityIftaarDates.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Date not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting iftaar date:", error);
      res.status(500).json({ error: "Failed to delete iftaar date" });
    }
  });

  // ==========================================
  // Admin Web Dashboard - HTML pages
  // ==========================================
  app.get("/admin", (_req, res) => {
    res.redirect("/admin/login");
  });

  app.get("/admin/login", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(getAdminLoginPage());
  });

  app.get("/admin/dashboard", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(getAdminDashboardPage());
  });

  const httpServer = createServer(app);

  return httpServer;
}

function getAdminLoginPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ICKC Admin Login</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0A0E1A 0%, #1a2332 100%); color: #fff; }
  .login-card { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(0,180,160,0.3); border-radius: 16px; padding: 48px 40px; width: 100%; max-width: 400px; }
  .logo-section { text-align: center; margin-bottom: 32px; }
  .logo-icon { width: 64px; height: 64px; border-radius: 16px; background: linear-gradient(135deg, #00B4A0, #00A5FF); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px; }
  h1 { font-size: 22px; font-weight: 600; color: #fff; }
  .subtitle { color: rgba(255,255,255,0.5); font-size: 14px; margin-top: 4px; }
  .form-group { margin-bottom: 20px; }
  label { display: block; font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 6px; font-weight: 500; }
  input { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; color: #fff; font-size: 15px; outline: none; transition: border-color 0.2s; }
  input:focus { border-color: #00B4A0; }
  input::placeholder { color: rgba(255,255,255,0.3); }
  .login-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #00B4A0, #009688); border: none; border-radius: 10px; color: #fff; font-size: 16px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; margin-top: 8px; }
  .login-btn:hover { opacity: 0.9; }
  .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .error-msg { background: rgba(196,30,58,0.15); border: 1px solid rgba(196,30,58,0.3); color: #ff6b7a; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; display: none; }
</style>
</head>
<body>
<div class="login-card">
  <div class="logo-section">
    <div class="logo-icon">&#9770;</div>
    <h1>ICKC Admin</h1>
    <p class="subtitle">Islamic Center of Kane County</p>
  </div>
  <div id="error" class="error-msg"></div>
  <form id="loginForm">
    <div class="form-group">
      <label>Username</label>
      <input type="text" id="username" placeholder="Enter username" required autocomplete="username">
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" id="password" placeholder="Enter password" required autocomplete="current-password">
    </div>
    <button type="submit" class="login-btn" id="loginBtn">Sign In</button>
  </form>
</div>
<script>
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('error');
  btn.disabled = true;
  btn.textContent = 'Signing in...';
  errEl.style.display = 'none';
  try {
    const res = await fetch('/api/admin/dashboard-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('username').value,
        password: document.getElementById('password').value
      })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem('ickc_admin_token', data.token);
      window.location.href = '/admin/dashboard';
    } else {
      errEl.textContent = data.error || 'Login failed';
      errEl.style.display = 'block';
    }
  } catch(err) {
    errEl.textContent = 'Connection error. Please try again.';
    errEl.style.display = 'block';
  }
  btn.disabled = false;
  btn.textContent = 'Sign In';
});
</script>
</body>
</html>`;
}

function getAdminDashboardPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ICKC Admin Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; background: #0f1219; color: #e0e0e0; }
  .topbar { background: rgba(0,0,0,0.4); border-bottom: 1px solid rgba(0,180,160,0.2); padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; backdrop-filter: blur(12px); }
  .topbar-left { display: flex; align-items: center; gap: 12px; }
  .topbar-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #00B4A0, #00A5FF); display: flex; align-items: center; justify-content: center; font-size: 18px; }
  .topbar h1 { font-size: 18px; font-weight: 600; color: #fff; }
  .logout-btn { padding: 8px 16px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: rgba(255,255,255,0.7); font-size: 13px; cursor: pointer; transition: all 0.2s; }
  .logout-btn:hover { background: rgba(196,30,58,0.2); border-color: rgba(196,30,58,0.4); color: #ff6b7a; }
  .container { max-width: 900px; margin: 0 auto; padding: 24px; }
  .page-header { margin-bottom: 24px; }
  .page-header h2 { font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 4px; }
  .page-header p { color: rgba(255,255,255,0.5); font-size: 14px; }
  .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
  .card-header { background: linear-gradient(135deg, #00B4A0, #009688); padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; }
  .card-header h3 { font-size: 16px; font-weight: 600; color: #fff; }
  .save-all-btn { padding: 8px 20px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .save-all-btn:hover { background: rgba(255,255,255,0.3); }
  .save-all-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 12px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(255,255,255,0.4); background: rgba(0,0,0,0.2); font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.06); }
  td { padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 14px; vertical-align: middle; }
  tr:hover { background: rgba(0,180,160,0.04); }
  tr.saturday { background: rgba(212,175,55,0.06); }
  tr.saturday:hover { background: rgba(212,175,55,0.1); }
  tr.daylight { background: rgba(0,165,255,0.06); }
  tr.daylight:hover { background: rgba(0,165,255,0.1); }
  .day-badge { display: inline-block; width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #00B4A0, #00A5FF); color: #fff; font-size: 12px; font-weight: 700; text-align: center; line-height: 28px; }
  .day-name { font-size: 12px; color: rgba(255,255,255,0.4); }
  .saturday-badge { display: inline-block; padding: 2px 8px; background: rgba(212,175,55,0.2); border: 1px solid rgba(212,175,55,0.3); border-radius: 4px; font-size: 10px; color: #D4AF37; font-weight: 600; margin-left: 6px; }
  .daylight-badge { display: inline-block; padding: 2px 8px; background: rgba(0,165,255,0.2); border: 1px solid rgba(0,165,255,0.3); border-radius: 4px; font-size: 10px; color: #00A5FF; font-weight: 600; margin-left: 6px; }
  tr.eid { background: rgba(76,175,80,0.08); }
  tr.eid:hover { background: rgba(76,175,80,0.14); }
  .eid-badge { display: inline-block; padding: 2px 8px; background: rgba(76,175,80,0.2); border: 1px solid rgba(76,175,80,0.3); border-radius: 4px; font-size: 10px; color: #4CAF50; font-weight: 600; margin-left: 6px; }
  .time-input { width: 110px; padding: 8px 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: #fff; font-size: 14px; font-family: 'SF Mono', 'Fira Code', monospace; outline: none; transition: border-color 0.2s; }
  .time-input:focus { border-color: #00B4A0; background: rgba(0,180,160,0.08); }
  .time-input.changed { border-color: #D4AF37; background: rgba(212,175,55,0.08); }
  .save-btn { padding: 6px 14px; background: linear-gradient(135deg, #00B4A0, #009688); border: none; border-radius: 6px; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
  .save-btn:hover { opacity: 0.85; }
  .save-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .save-btn.saved { background: linear-gradient(135deg, #2ecc71, #27ae60); }
  .toast { position: fixed; bottom: 24px; right: 24px; padding: 14px 22px; border-radius: 10px; font-size: 14px; font-weight: 500; z-index: 1000; transition: all 0.3s; transform: translateY(100px); opacity: 0; }
  .toast.show { transform: translateY(0); opacity: 1; }
  .toast.success { background: #00B4A0; color: #fff; }
  .toast.error { background: #C41E3A; color: #fff; }
  .loading { text-align: center; padding: 60px 20px; color: rgba(255,255,255,0.4); }
  .loading-spinner { width: 32px; height: 32px; border: 3px solid rgba(0,180,160,0.2); border-top-color: #00B4A0; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .stats { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .stat-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px; flex: 1; min-width: 120px; }
  .stat-value { font-size: 24px; font-weight: 700; color: #00B4A0; }
  .stat-label { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px; }
  .tabs { display: flex; gap: 4px; margin-bottom: 24px; background: rgba(255,255,255,0.04); border-radius: 10px; padding: 4px; }
  .tab-btn { flex: 1; padding: 10px 16px; border: none; background: none; color: rgba(255,255,255,0.5); font-size: 14px; font-weight: 500; cursor: pointer; border-radius: 8px; transition: all 0.2s; }
  .tab-btn.active { background: linear-gradient(135deg, #00B4A0, #009688); color: #fff; }
  .tab-btn:hover:not(.active) { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); }
  .tab-content { display: none; }
  .tab-content.active { display: block; }
  .event-form { padding: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .event-form .full-width { grid-column: 1 / -1; }
  .form-label { display: block; font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 4px; font-weight: 500; }
  .form-input { width: 100%; padding: 10px 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: #fff; font-size: 14px; outline: none; transition: border-color 0.2s; font-family: inherit; }
  .form-input:focus { border-color: #00B4A0; }
  textarea.form-input { resize: vertical; min-height: 60px; }
  select.form-input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
  .add-event-btn { padding: 10px 24px; background: linear-gradient(135deg, #00B4A0, #009688); border: none; border-radius: 8px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
  .add-event-btn:hover { opacity: 0.85; }
  .add-event-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .event-row { display: flex; align-items: center; padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.04); gap: 12px; transition: background 0.15s; }
  .event-row:hover { background: rgba(0,180,160,0.04); }
  .event-info { flex: 1; }
  .event-title-text { font-size: 15px; font-weight: 600; color: #fff; }
  .event-meta-text { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 2px; }
  .event-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-right: 6px; }
  .badge-active { background: rgba(0,180,160,0.2); border: 1px solid rgba(0,180,160,0.3); color: #00B4A0; }
  .badge-inactive { background: rgba(255,59,48,0.2); border: 1px solid rgba(255,59,48,0.3); color: #ff3b30; }
  .badge-category { background: rgba(0,165,255,0.15); border: 1px solid rgba(0,165,255,0.25); color: #00A5FF; }
  .event-actions { display: flex; gap: 6px; }
  .action-btn { padding: 6px 12px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); border-radius: 6px; color: rgba(255,255,255,0.7); font-size: 12px; cursor: pointer; transition: all 0.15s; }
  .action-btn:hover { background: rgba(255,255,255,0.1); }
  .action-btn.delete:hover { background: rgba(255,59,48,0.2); border-color: rgba(255,59,48,0.4); color: #ff6b7a; }
  .action-btn.toggle-active { }
  .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: rgba(255,255,255,0.7); }
  .checkbox-label input { width: 16px; height: 16px; accent-color: #00B4A0; }
</style>
</head>
<body>
<div class="topbar">
  <div class="topbar-left">
    <div class="topbar-icon">&#9770;</div>
    <h1>ICKC Admin</h1>
  </div>
  <button class="logout-btn" onclick="logout()">Sign Out</button>
</div>
<div class="container">
  <div class="tabs">
    <button class="tab-btn active" onclick="switchTab('timetable')">Ramadan Timetable</button>
    <button class="tab-btn" onclick="switchTab('events')">Events</button>
    <button class="tab-btn" onclick="switchTab('iftaar')">Iftaar Dates</button>
  </div>

  <div id="tab-timetable" class="tab-content active">
    <div class="page-header">
      <h2>Ramadan 2026 Timetable</h2>
      <p>Edit Fajr and Isha + Taraweeh times. Changes are reflected in the app immediately.</p>
    </div>
    <div class="stats" id="stats"></div>
    <div class="card">
      <div class="card-header">
        <h3>Prayer Schedule (30 Days)</h3>
        <button class="save-all-btn" id="saveAllBtn" onclick="saveAll()">Save All Changes</button>
      </div>
      <div id="tableContainer">
        <div class="loading"><div class="loading-spinner"></div>Loading timetable...</div>
      </div>
    </div>
  </div>

  <div id="tab-events" class="tab-content">
    <div class="page-header">
      <h2>Manage Events</h2>
      <p>Add, edit, or remove events. Changes show up in the app immediately — no new release needed.</p>
    </div>
    <div class="card">
      <div class="card-header">
        <h3>Add New Event</h3>
      </div>
      <div class="event-form" id="eventForm">
        <div>
          <label class="form-label">Title</label>
          <input class="form-input" id="evt-title" placeholder="e.g. Quran Roundtable">
        </div>
        <div>
          <label class="form-label">Category</label>
          <select class="form-input" id="evt-category">
            <option value="Islamic Studies">Islamic Studies</option>
            <option value="Health & Wellness">Health & Wellness</option>
            <option value="Social Event">Social Event</option>
            <option value="Charity Event">Charity Event</option>
            <option value="Youth Program">Youth Program</option>
            <option value="Sisters Program">Sisters Program</option>
            <option value="Community">Community</option>
          </select>
        </div>
        <div>
          <label class="form-label">Event Date</label>
          <input class="form-input" id="evt-date" type="date">
        </div>
        <div>
          <label class="form-label">Time</label>
          <input class="form-input" id="evt-start-time" type="time">
        </div>
        <div>
          <label class="form-label">Recurrence</label>
          <select class="form-input" id="evt-recurrence">
            <option value="none">One-time Event</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Every 2 Weeks</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div>
          <label class="form-label">Location</label>
          <input class="form-input" id="evt-location" placeholder="ICKC Main Hall">
        </div>
        <div>
          <label class="form-label">Sort Order</label>
          <input class="form-input" id="evt-order" type="number" value="0" placeholder="0">
        </div>
        <div class="full-width">
          <label class="form-label">Description</label>
          <textarea class="form-input" id="evt-desc" placeholder="Event description..."></textarea>
        </div>
        <div class="full-width" style="display:flex;align-items:center;justify-content:space-between;">
          <label class="checkbox-label"><input type="checkbox" id="evt-signup"> Enable Sign-up</label>
          <button class="add-event-btn" onclick="addEvent()">Add Event</button>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <h3>Current Events</h3>
      </div>
      <div id="eventsListContainer">
        <div class="loading"><div class="loading-spinner"></div>Loading events...</div>
      </div>
    </div>
  </div>

  <div id="tab-iftaar" class="tab-content">
    <div class="page-header">
      <h2>Community Iftaar Dates</h2>
      <p>Select which days during Ramadan will have Community Iftaar. These dates appear in the app for RSVP.</p>
    </div>
    <div class="card">
      <div class="card-header">
        <h3>Add Iftaar Date</h3>
      </div>
      <div class="event-form" style="grid-template-columns: 1fr 1fr auto;">
        <div>
          <label class="form-label">Date</label>
          <input class="form-input" id="iftaar-date" type="date">
        </div>
        <div>
          <label class="form-label">Label (optional)</label>
          <input class="form-input" id="iftaar-label" placeholder="e.g. Special Friday Iftaar">
        </div>
        <div style="display:flex;align-items:flex-end;">
          <button class="add-event-btn" onclick="addIftaarDate()">Add Date</button>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <h3>Scheduled Iftaar Dates</h3>
      </div>
      <div id="iftaarListContainer">
        <div class="loading"><div class="loading-spinner"></div>Loading iftaar dates...</div>
      </div>
    </div>
  </div>
</div>
<div class="toast" id="toast"></div>

<script>
const TOKEN = localStorage.getItem('ickc_admin_token');
if (!TOKEN) window.location.href = '/admin/login';

let originalData = {};
let currentData = {};

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b,i) => {
    b.classList.toggle('active', (tab === 'timetable' && i === 0) || (tab === 'events' && i === 1) || (tab === 'iftaar' && i === 2));
  });
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  if (tab === 'events') loadEvents();
  if (tab === 'iftaar') loadIftaarDates();
}

function getHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + TOKEN };
}

function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.className = 'toast', 3000);
}

function logout() {
  localStorage.removeItem('ickc_admin_token');
  window.location.href = '/admin/login';
}

async function loadTimetable() {
  try {
    const res = await fetch('/api/admin/ramadan-timetable', { headers: getHeaders() });
    if (res.status === 401) { logout(); return; }
    const data = await res.json();

    if (!data.timetable || data.timetable.length === 0) {
      await seedDefaultData();
      return loadTimetable();
    }

    renderTable(data.timetable);
    renderStats(data.timetable);
  } catch(err) {
    document.getElementById('tableContainer').innerHTML = '<div class="loading">Failed to load data. Please refresh.</div>';
  }
}

async function seedDefaultData() {
  const defaults = [
    { day:1, date:"Feb 17", dayName:"Tuesday", fajrIqama:"5:44 AM", ishaIqama:"8:00 PM", isSaturday:false, isDaylightChange:false },
    { day:2, date:"Feb 18", dayName:"Wednesday", fajrIqama:"5:43 AM", ishaIqama:"8:00 PM", isSaturday:false, isDaylightChange:false },
    { day:3, date:"Feb 19", dayName:"Thursday", fajrIqama:"5:41 AM", ishaIqama:"8:00 PM", isSaturday:false, isDaylightChange:false },
    { day:4, date:"Feb 20", dayName:"Friday", fajrIqama:"5:40 AM", ishaIqama:"8:00 PM", isSaturday:false, isDaylightChange:false },
    { day:5, date:"Feb 21", dayName:"Saturday", fajrIqama:"5:39 AM", ishaIqama:"8:00 PM", isSaturday:true, isDaylightChange:false },
    { day:6, date:"Feb 22", dayName:"Sunday", fajrIqama:"5:37 AM", ishaIqama:"8:00 PM", isSaturday:false, isDaylightChange:false },
    { day:7, date:"Feb 23", dayName:"Monday", fajrIqama:"5:36 AM", ishaIqama:"8:00 PM", isSaturday:false, isDaylightChange:false },
    { day:8, date:"Feb 24", dayName:"Tuesday", fajrIqama:"5:34 AM", ishaIqama:"8:00 PM", isSaturday:false, isDaylightChange:false },
    { day:9, date:"Feb 25", dayName:"Wednesday", fajrIqama:"5:33 AM", ishaIqama:"8:00 PM", isSaturday:false, isDaylightChange:false },
    { day:10, date:"Feb 26", dayName:"Thursday", fajrIqama:"5:31 AM", ishaIqama:"8:00 PM", isSaturday:false, isDaylightChange:false },
    { day:11, date:"Feb 27", dayName:"Friday", fajrIqama:"5:30 AM", ishaIqama:"8:00 PM", isSaturday:false, isDaylightChange:false },
    { day:12, date:"Feb 28", dayName:"Saturday", fajrIqama:"5:28 AM", ishaIqama:"8:00 PM", isSaturday:true, isDaylightChange:false },
    { day:13, date:"Mar 01", dayName:"Sunday", fajrIqama:"5:27 AM", ishaIqama:"8:00 PM", isSaturday:false, isDaylightChange:false },
    { day:14, date:"Mar 02", dayName:"Monday", fajrIqama:"5:25 AM", ishaIqama:"8:00 PM", isSaturday:false, isDaylightChange:false },
    { day:15, date:"Mar 03", dayName:"Tuesday", fajrIqama:"5:24 AM", ishaIqama:"8:00 PM", isSaturday:false, isDaylightChange:false },
    { day:16, date:"Mar 04", dayName:"Wednesday", fajrIqama:"5:22 AM", ishaIqama:"8:00 PM", isSaturday:false, isDaylightChange:false },
    { day:17, date:"Mar 05", dayName:"Thursday", fajrIqama:"5:21 AM", ishaIqama:"8:00 PM", isSaturday:false, isDaylightChange:false },
    { day:18, date:"Mar 06", dayName:"Friday", fajrIqama:"5:19 AM", ishaIqama:"8:00 PM", isSaturday:true, isDaylightChange:false },
    { day:19, date:"Mar 07", dayName:"Saturday", fajrIqama:"5:17 AM", ishaIqama:"8:00 PM", isSaturday:true, isDaylightChange:false },
    { day:20, date:"Mar 08", dayName:"Sunday", fajrIqama:"6:16 AM", ishaIqama:"8:00 PM", isSaturday:false, isDaylightChange:true },
    { day:21, date:"Mar 09", dayName:"Monday", fajrIqama:"6:14 AM", ishaIqama:"8:30 PM", isSaturday:false, isDaylightChange:false },
    { day:22, date:"Mar 10", dayName:"Tuesday", fajrIqama:"6:12 AM", ishaIqama:"8:30 PM", isSaturday:false, isDaylightChange:false },
    { day:23, date:"Mar 11", dayName:"Wednesday", fajrIqama:"6:11 AM", ishaIqama:"8:30 PM", isSaturday:false, isDaylightChange:false },
    { day:24, date:"Mar 12", dayName:"Thursday", fajrIqama:"6:09 AM", ishaIqama:"8:30 PM", isSaturday:false, isDaylightChange:false },
    { day:25, date:"Mar 13", dayName:"Friday", fajrIqama:"6:07 AM", ishaIqama:"8:30 PM", isSaturday:false, isDaylightChange:false },
    { day:26, date:"Mar 14", dayName:"Saturday", fajrIqama:"6:05 AM", ishaIqama:"8:30 PM", isSaturday:true, isDaylightChange:false },
    { day:27, date:"Mar 15", dayName:"Sunday", fajrIqama:"6:04 AM", ishaIqama:"8:30 PM", isSaturday:false, isDaylightChange:false },
    { day:28, date:"Mar 16", dayName:"Monday", fajrIqama:"6:02 AM", ishaIqama:"8:30 PM", isSaturday:false, isDaylightChange:false },
    { day:29, date:"Mar 17", dayName:"Tuesday", fajrIqama:"6:00 AM", ishaIqama:"8:30 PM", isSaturday:false, isDaylightChange:false },
    { day:30, date:"Mar 18", dayName:"Wednesday", fajrIqama:"5:58 AM", ishaIqama:"8:30 PM", isSaturday:false, isDaylightChange:false },
    { day:31, date:"Mar 20", dayName:"Friday", fajrIqama:"Eid Mubarak", ishaIqama:"See Eid flyer for Salah", isSaturday:false, isDaylightChange:false }
  ];
  await fetch('/api/admin/ramadan-timetable/seed', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ timetable: defaults })
  });
}

function renderStats(timetable) {
  const saturdays = timetable.filter(d => d.isSaturday).length;
  document.getElementById('stats').innerHTML =
    '<div class="stat-card"><div class="stat-value">' + timetable.length + '</div><div class="stat-label">Total Days</div></div>' +
    '<div class="stat-card"><div class="stat-value">' + saturdays + '</div><div class="stat-label">Community Iftaar (Sat)</div></div>' +
    '<div class="stat-card"><div class="stat-value">Feb 17 - Mar 20</div><div class="stat-label">Ramadan 2026 + Eid</div></div>';
}

function renderTable(timetable) {
  originalData = {};
  currentData = {};
  timetable.forEach(d => {
    originalData[d.day] = { fajrIqama: d.fajrIqama, ishaIqama: d.ishaIqama };
    currentData[d.day] = { fajrIqama: d.fajrIqama, ishaIqama: d.ishaIqama };
  });

  let html = '<table><thead><tr><th>Day</th><th>Date</th><th>Day</th><th>Fajr Iqama</th><th>Isha + Taraweeh</th><th></th></tr></thead><tbody>';
  timetable.forEach(d => {
    let isEid = d.day === 31;
    let cls = isEid ? 'eid' : (d.isSaturday ? 'saturday' : (d.isDaylightChange ? 'daylight' : ''));
    let badges = '';
    if (d.isSaturday) badges += '<span class="saturday-badge">IFTAAR</span>';
    if (d.isDaylightChange) badges += '<span class="daylight-badge">DST</span>';
    if (isEid) badges += '<span class="eid-badge">EID</span>';
    html += '<tr class="' + cls + '" id="row-' + d.day + '">' +
      '<td><span class="day-badge">' + d.day + '</span></td>' +
      '<td>' + d.date + badges + '</td>' +
      '<td><span class="day-name">' + d.dayName + '</span></td>' +
      '<td><input type="text" class="time-input" id="fajr-' + d.day + '" value="' + d.fajrIqama + '" onchange="markChanged(' + d.day + ')"></td>' +
      '<td><input type="text" class="time-input" id="isha-' + d.day + '" value="' + d.ishaIqama + '" onchange="markChanged(' + d.day + ')"></td>' +
      '<td><button class="save-btn" id="btn-' + d.day + '" onclick="saveDay(' + d.day + ')">Save</button></td>' +
      '</tr>';
  });
  html += '</tbody></table>';
  document.getElementById('tableContainer').innerHTML = html;
}

function markChanged(day) {
  const fajr = document.getElementById('fajr-' + day).value;
  const isha = document.getElementById('isha-' + day).value;
  currentData[day] = { fajrIqama: fajr, ishaIqama: isha };
  const fajrEl = document.getElementById('fajr-' + day);
  const ishaEl = document.getElementById('isha-' + day);
  if (fajr !== originalData[day].fajrIqama) fajrEl.classList.add('changed');
  else fajrEl.classList.remove('changed');
  if (isha !== originalData[day].ishaIqama) ishaEl.classList.add('changed');
  else ishaEl.classList.remove('changed');
}

async function saveDay(day) {
  const btn = document.getElementById('btn-' + day);
  const fajr = document.getElementById('fajr-' + day).value.trim();
  const isha = document.getElementById('isha-' + day).value.trim();
  if (!fajr || !isha) { showToast('Times cannot be empty', 'error'); return; }
  btn.disabled = true;
  btn.textContent = '...';
  try {
    const res = await fetch('/api/admin/ramadan-timetable/' + day, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ fajrIqama: fajr, ishaIqama: isha })
    });
    if (res.status === 401) { logout(); return; }
    if (res.ok) {
      originalData[day] = { fajrIqama: fajr, ishaIqama: isha };
      document.getElementById('fajr-' + day).classList.remove('changed');
      document.getElementById('isha-' + day).classList.remove('changed');
      btn.textContent = 'Saved';
      btn.classList.add('saved');
      showToast('Day ' + day + ' updated', 'success');
      setTimeout(() => { btn.textContent = 'Save'; btn.classList.remove('saved'); }, 2000);
    } else {
      showToast('Failed to save Day ' + day, 'error');
    }
  } catch(err) {
    showToast('Connection error', 'error');
  }
  btn.disabled = false;
}

async function saveAll() {
  const btn = document.getElementById('saveAllBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';
  let saved = 0;
  let failed = 0;
  for (const day in currentData) {
    if (currentData[day].fajrIqama !== originalData[day].fajrIqama ||
        currentData[day].ishaIqama !== originalData[day].ishaIqama) {
      try {
        const res = await fetch('/api/admin/ramadan-timetable/' + day, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(currentData[day])
        });
        if (res.ok) {
          originalData[day] = { ...currentData[day] };
          document.getElementById('fajr-' + day).classList.remove('changed');
          document.getElementById('isha-' + day).classList.remove('changed');
          const dbtn = document.getElementById('btn-' + day);
          dbtn.textContent = 'Saved';
          dbtn.classList.add('saved');
          setTimeout(() => { dbtn.textContent = 'Save'; dbtn.classList.remove('saved'); }, 2000);
          saved++;
        } else { failed++; }
      } catch(err) { failed++; }
    }
  }
  if (saved > 0) showToast(saved + ' day(s) updated', 'success');
  else if (failed === 0) showToast('No changes to save', 'success');
  if (failed > 0) showToast(failed + ' day(s) failed to save', 'error');
  btn.disabled = false;
  btn.textContent = 'Save All Changes';
}

async function loadEvents() {
  try {
    const res = await fetch('/api/admin/events', { headers: getHeaders() });
    if (res.status === 401) { logout(); return; }
    const data = await res.json();
    renderEventsList(data.events || []);
  } catch(err) {
    document.getElementById('eventsListContainer').innerHTML = '<div class="loading">Failed to load events.</div>';
  }
}

function renderEventsList(evts) {
  if (evts.length === 0) {
    document.getElementById('eventsListContainer').innerHTML = '<div class="loading">No events yet. Add your first event above.</div>';
    return;
  }
  let html = '';
  evts.forEach(e => {
    const recBadge = (e.recurrence && e.recurrence !== 'none') ? '<span class="event-badge" style="background:rgba(168,85,247,0.2);border:1px solid rgba(168,85,247,0.3);color:#a855f7;">' + recurrenceLabel(e.recurrence) + '</span>' : '';
    html += '<div class="event-row" id="evt-row-' + e.id + '">' +
      '<div class="event-info">' +
        '<div class="event-title-text">' + escHtml(e.title) + '</div>' +
        '<div class="event-meta-text">' +
          '<span class="event-badge badge-category">' + escHtml(e.category) + '</span>' +
          '<span class="event-badge ' + (e.isActive ? 'badge-active' : 'badge-inactive') + '">' + (e.isActive ? 'Active' : 'Hidden') + '</span>' +
          recBadge +
          escHtml(e.date) + ' | ' + escHtml(e.time) + ' | ' + escHtml(e.location) +
        '</div>' +
        '<div class="event-meta-text" style="margin-top:4px;">' + escHtml(e.description).substring(0,120) + (e.description.length > 120 ? '...' : '') + '</div>' +
      '</div>' +
      '<div class="event-actions">' +
        '<button class="action-btn toggle-active" onclick="toggleEvent(\\'' + e.id + '\\',' + !e.isActive + ')">' + (e.isActive ? 'Hide' : 'Show') + '</button>' +
        '<button class="action-btn delete" onclick="deleteEvent(\\'' + e.id + '\\')">Delete</button>' +
      '</div>' +
    '</div>';
  });
  document.getElementById('eventsListContainer').innerHTML = html;
}

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function formatDatePretty(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
function formatTimePretty(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return h12 + ':' + String(m).padStart(2,'0') + ' ' + ampm;
}
function recurrenceLabel(r) {
  const map = { none:'One-time', daily:'Daily', weekly:'Weekly', biweekly:'Every 2 Weeks', monthly:'Monthly' };
  return map[r] || r;
}

async function addEvent() {
  const title = document.getElementById('evt-title').value.trim();
  const category = document.getElementById('evt-category').value;
  const rawDate = document.getElementById('evt-date').value;
  const startTime = document.getElementById('evt-start-time').value;
  const recurrence = document.getElementById('evt-recurrence').value;
  const location = document.getElementById('evt-location').value.trim();
  const description = document.getElementById('evt-desc').value.trim();
  const signupEnabled = document.getElementById('evt-signup').checked;
  const sortOrder = parseInt(document.getElementById('evt-order').value) || 0;
  if (!title || !rawDate || !startTime || !location) { showToast('Please fill in title, date, time, and location', 'error'); return; }
  const date = formatDatePretty(rawDate);
  const time = formatTimePretty(startTime);
  try {
    const res = await fetch('/api/admin/events', {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify({ title, category, date, time, location, description: description || '', signupEnabled, sortOrder, recurrence, isActive: true })
    });
    if (res.status === 401) { logout(); return; }
    if (res.ok) {
      showToast('Event added!', 'success');
      document.getElementById('evt-title').value = '';
      document.getElementById('evt-date').value = '';
      document.getElementById('evt-start-time').value = '';
      document.getElementById('evt-recurrence').value = 'none';
      document.getElementById('evt-location').value = '';
      document.getElementById('evt-desc').value = '';
      document.getElementById('evt-signup').checked = false;
      document.getElementById('evt-order').value = '0';
      loadEvents();
    } else { showToast('Failed to add event', 'error'); }
  } catch(err) { showToast('Connection error', 'error'); }
}

async function toggleEvent(id, isActive) {
  try {
    const res = await fetch('/api/admin/events/' + id, {
      method: 'PUT', headers: getHeaders(),
      body: JSON.stringify({ isActive })
    });
    if (res.status === 401) { logout(); return; }
    if (res.ok) {
      showToast(isActive ? 'Event visible in app' : 'Event hidden from app', 'success');
      loadEvents();
    } else { showToast('Failed to update event', 'error'); }
  } catch(err) { showToast('Connection error', 'error'); }
}

async function deleteEvent(id) {
  if (!confirm('Delete this event permanently?')) return;
  try {
    const res = await fetch('/api/admin/events/' + id, {
      method: 'DELETE', headers: getHeaders()
    });
    if (res.status === 401) { logout(); return; }
    if (res.ok) {
      showToast('Event deleted', 'success');
      loadEvents();
    } else { showToast('Failed to delete event', 'error'); }
  } catch(err) { showToast('Connection error', 'error'); }
}

async function loadIftaarDates() {
  try {
    const res = await fetch('/api/community-iftaar-dates', { headers: getHeaders() });
    if (res.status === 401) { logout(); return; }
    const dates = await res.json();
    const container = document.getElementById('iftaarListContainer');
    if (!dates || dates.length === 0) {
      container.innerHTML = '<div class="loading">No iftaar dates set yet. Add dates above.</div>';
      return;
    }
    let html = '<table style="width:100%;border-collapse:collapse;">';
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left;padding:12px;color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;">Date</th><th style="text-align:left;padding:12px;color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;">Day</th><th style="text-align:left;padding:12px;color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;">Label</th><th style="text-align:right;padding:12px;color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;">Actions</th></tr>';
    dates.forEach(d => {
      const dateObj = new Date(d.date + 'T12:00:00');
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const pretty = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">';
      html += '<td style="padding:12px;font-weight:500;">' + pretty + '</td>';
      html += '<td style="padding:12px;color:rgba(255,255,255,0.7);">' + dayName + '</td>';
      html += '<td style="padding:12px;color:rgba(255,255,255,0.7);">' + (d.label || '-') + '</td>';
      html += '<td style="padding:12px;text-align:right;"><button onclick="deleteIftaarDate(\\''+d.id+'\\')" style="background:#e74c3c;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;">Remove</button></td>';
      html += '</tr>';
    });
    html += '</table>';
    container.innerHTML = html;
  } catch(err) {
    document.getElementById('iftaarListContainer').innerHTML = '<div class="loading">Failed to load iftaar dates.</div>';
  }
}

async function addIftaarDate() {
  const date = document.getElementById('iftaar-date').value;
  const label = document.getElementById('iftaar-label').value.trim();
  if (!date) { showToast('Please select a date', 'error'); return; }
  try {
    const res = await fetch('/api/admin/community-iftaar-dates', {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify({ date, label: label || null })
    });
    if (res.status === 401) { logout(); return; }
    if (res.status === 409) { showToast('This date already exists', 'error'); return; }
    if (res.ok) {
      showToast('Iftaar date added!', 'success');
      document.getElementById('iftaar-date').value = '';
      document.getElementById('iftaar-label').value = '';
      loadIftaarDates();
    } else { showToast('Failed to add date', 'error'); }
  } catch(err) { showToast('Connection error', 'error'); }
}

async function deleteIftaarDate(id) {
  if (!confirm('Remove this iftaar date?')) return;
  try {
    const res = await fetch('/api/admin/community-iftaar-dates/' + id, {
      method: 'DELETE', headers: getHeaders()
    });
    if (res.status === 401) { logout(); return; }
    if (res.ok) {
      showToast('Iftaar date removed', 'success');
      loadIftaarDates();
    } else { showToast('Failed to remove date', 'error'); }
  } catch(err) { showToast('Connection error', 'error'); }
}

loadTimetable();
</script>
</body>
</html>`;
}
