const puppeteer = require('puppeteer');
const path = require('path');

const timetable = [
  { day: 1, date: "Feb 17", dayName: "Tuesday", fajrSalah: "5:29 AM", fajrIqama: "5:44 AM", isha: "8:00 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 2, date: "Feb 18", dayName: "Wednesday", fajrSalah: "5:28 AM", fajrIqama: "5:43 AM", isha: "8:00 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 3, date: "Feb 19", dayName: "Thursday", fajrSalah: "5:26 AM", fajrIqama: "5:41 AM", isha: "8:00 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 4, date: "Feb 20", dayName: "Friday", fajrSalah: "5:25 AM", fajrIqama: "5:40 AM", isha: "8:00 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 5, date: "Feb 21", dayName: "Saturday", fajrSalah: "5:24 AM", fajrIqama: "5:39 AM", isha: "8:00 PM", isCommunityIftaar: true, isDaylightChange: false },
  { day: 6, date: "Feb 22", dayName: "Sunday", fajrSalah: "5:22 AM", fajrIqama: "5:37 AM", isha: "8:00 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 7, date: "Feb 23", dayName: "Monday", fajrSalah: "5:21 AM", fajrIqama: "5:36 AM", isha: "8:00 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 8, date: "Feb 24", dayName: "Tuesday", fajrSalah: "5:19 AM", fajrIqama: "5:34 AM", isha: "8:00 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 9, date: "Feb 25", dayName: "Wednesday", fajrSalah: "5:18 AM", fajrIqama: "5:33 AM", isha: "8:00 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 10, date: "Feb 26", dayName: "Thursday", fajrSalah: "5:16 AM", fajrIqama: "5:31 AM", isha: "8:00 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 11, date: "Feb 27", dayName: "Friday", fajrSalah: "5:15 AM", fajrIqama: "5:30 AM", isha: "8:00 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 12, date: "Feb 28", dayName: "Saturday", fajrSalah: "5:13 AM", fajrIqama: "5:28 AM", isha: "8:00 PM", isCommunityIftaar: true, isDaylightChange: false },
  { day: 13, date: "Mar 01", dayName: "Sunday", fajrSalah: "5:12 AM", fajrIqama: "5:27 AM", isha: "8:00 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 14, date: "Mar 02", dayName: "Monday", fajrSalah: "5:10 AM", fajrIqama: "5:25 AM", isha: "8:00 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 15, date: "Mar 03", dayName: "Tuesday", fajrSalah: "5:09 AM", fajrIqama: "5:24 AM", isha: "8:00 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 16, date: "Mar 04", dayName: "Wednesday", fajrSalah: "5:07 AM", fajrIqama: "5:22 AM", isha: "8:00 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 17, date: "Mar 05", dayName: "Thursday", fajrSalah: "5:06 AM", fajrIqama: "5:21 AM", isha: "8:00 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 18, date: "Mar 06", dayName: "Friday", fajrSalah: "5:04 AM", fajrIqama: "5:19 AM", isha: "8:00 PM", isCommunityIftaar: true, isDaylightChange: false },
  { day: 19, date: "Mar 07", dayName: "Saturday", fajrSalah: "5:02 AM", fajrIqama: "5:17 AM", isha: "8:00 PM", isCommunityIftaar: true, isDaylightChange: false },
  { day: 20, date: "Mar 08", dayName: "Sunday", fajrSalah: "6:01 AM", fajrIqama: "6:16 AM", isha: "8:30 PM", isCommunityIftaar: false, isDaylightChange: true },
  { day: 21, date: "Mar 09", dayName: "Monday", fajrSalah: "5:59 AM", fajrIqama: "6:14 AM", isha: "8:30 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 22, date: "Mar 10", dayName: "Tuesday", fajrSalah: "5:57 AM", fajrIqama: "6:12 AM", isha: "8:30 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 23, date: "Mar 11", dayName: "Wednesday", fajrSalah: "5:56 AM", fajrIqama: "6:11 AM", isha: "8:30 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 24, date: "Mar 12", dayName: "Thursday", fajrSalah: "5:54 AM", fajrIqama: "6:09 AM", isha: "8:30 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 25, date: "Mar 13", dayName: "Friday", fajrSalah: "5:52 AM", fajrIqama: "6:07 AM", isha: "8:30 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 26, date: "Mar 14", dayName: "Saturday", fajrSalah: "5:50 AM", fajrIqama: "6:05 AM", isha: "8:30 PM", isCommunityIftaar: true, isDaylightChange: false },
  { day: 27, date: "Mar 15", dayName: "Sunday", fajrSalah: "5:49 AM", fajrIqama: "6:04 AM", isha: "8:30 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 28, date: "Mar 16", dayName: "Monday", fajrSalah: "5:47 AM", fajrIqama: "6:02 AM", isha: "8:30 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 29, date: "Mar 17", dayName: "Tuesday", fajrSalah: "5:45 AM", fajrIqama: "6:00 AM", isha: "8:30 PM", isCommunityIftaar: false, isDaylightChange: false },
  { day: 30, date: "Mar 18", dayName: "Wednesday", fajrSalah: "5:43 AM", fajrIqama: "5:58 AM", isha: "8:30 PM", isCommunityIftaar: false, isDaylightChange: false },
];

function buildRow(item, index) {
  let rowClass = 'row';
  let extra = '';

  if (item.isCommunityIftaar) {
    rowClass += ' community-iftaar';
    extra = `<div class="special-badge iftaar-badge">COMMUNITY IFTAAR</div>`;
  } else if (item.isDaylightChange) {
    rowClass += ' daylight-change';
    extra = `<div class="special-badge daylight-badge">CLOCKS SPRING FORWARD</div>`;
  } else {
    rowClass += index % 2 === 0 ? ' even' : ' odd';
  }

  return `
    <tr class="${rowClass}">
      <td class="day-col">${item.day}</td>
      <td class="date-col">
        <div class="date-text">${item.date}</div>
        <div class="day-name">${item.dayName.toUpperCase()}</div>
        ${extra}
      </td>
      <td class="time-col">${item.fajrSalah}</td>
      <td class="time-col">${item.fajrIqama}</td>
      <td class="time-col isha-col">${item.isha}</td>
    </tr>`;
}

function buildTableHeader() {
  return `
    <tr class="header-row">
      <th class="day-col">DAY</th>
      <th class="date-col">DATE</th>
      <th class="time-col">FAJR SALAH</th>
      <th class="time-col">FAJR IQAMA</th>
      <th class="time-col">ISHA + TARAWEEH</th>
    </tr>`;
}

const fontPath = path.resolve(__dirname, 'node_modules/@expo-google-fonts/montserrat');

const html = `<!DOCTYPE html>
<html>
<head>
<style>
  @font-face {
    font-family: 'Montserrat';
    src: url('file://${fontPath}/300Light/Montserrat_300Light.ttf') format('truetype');
    font-weight: 300;
  }
  @font-face {
    font-family: 'Montserrat';
    src: url('file://${fontPath}/400Regular/Montserrat_400Regular.ttf') format('truetype');
    font-weight: 400;
  }
  @font-face {
    font-family: 'Montserrat';
    src: url('file://${fontPath}/600SemiBold/Montserrat_600SemiBold.ttf') format('truetype');
    font-weight: 600;
  }
  @font-face {
    font-family: 'Montserrat';
    src: url('file://${fontPath}/700Bold/Montserrat_700Bold.ttf') format('truetype');
    font-weight: 700;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Montserrat', sans-serif;
    background: #0A0E1A;
    color: #FFFFFF;
  }

  .page {
    width: 8.5in;
    padding: 0;
    position: relative;
    background: #0A0E1A;
  }

  .page:first-child {
    min-height: 11in;
    page-break-after: always;
  }

  .page:last-child {
    page-break-after: avoid;
  }

  .header-section {
    background: linear-gradient(135deg, #0D7377 0%, #0A5C5F 100%);
    padding: 28px 40px 20px;
    text-align: center;
    border-bottom: 3px solid #C8A951;
  }

  .mosque-name {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 4px;
    color: #FFFFFF;
    text-transform: uppercase;
  }

  .address {
    font-size: 8px;
    font-weight: 300;
    letter-spacing: 2px;
    color: rgba(255,255,255,0.7);
    margin-top: 4px;
  }

  .title-section {
    text-align: center;
    padding: 18px 40px 12px;
  }

  .ramadan-title {
    font-size: 22px;
    font-weight: 700;
    color: #C8A951;
    letter-spacing: 3px;
  }

  .date-range {
    font-size: 10px;
    font-weight: 400;
    color: rgba(255,255,255,0.6);
    margin-top: 4px;
  }

  .quran-verse {
    font-size: 7.5px;
    font-weight: 300;
    color: rgba(255,255,255,0.5);
    font-style: italic;
    margin-top: 8px;
    line-height: 1.5;
    max-width: 480px;
    margin-left: auto;
    margin-right: auto;
  }

  table {
    width: calc(100% - 60px);
    margin: 0 30px;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .header-row {
    background: linear-gradient(135deg, #0D7377 0%, #0A5C5F 100%);
  }

  .header-row th {
    padding: 8px 6px;
    font-size: 7.5px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: rgba(255,255,255,0.9);
    text-align: center;
    text-transform: uppercase;
  }

  .header-row th.date-col {
    text-align: left;
    padding-left: 12px;
  }

  .row td {
    padding: 7px 6px;
    font-size: 10px;
    font-weight: 400;
    color: #FFFFFF;
    text-align: center;
    vertical-align: top;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  .even { background: rgba(255,255,255,0.02); }
  .odd { background: rgba(255,255,255,0.04); }

  .community-iftaar {
    background: rgba(13, 115, 119, 0.15);
    border-left: 3px solid #C8A951;
  }

  .daylight-change {
    background: rgba(255, 152, 0, 0.1);
    border-left: 3px solid #FF9800;
  }

  .day-col {
    width: 8%;
    font-weight: 700;
    color: #0D9B9F;
    font-size: 11px;
  }

  .date-col {
    width: 22%;
    text-align: left;
    padding-left: 12px !important;
  }

  .date-text {
    font-weight: 600;
    font-size: 10px;
    color: #FFFFFF;
  }

  .day-name {
    font-size: 7px;
    font-weight: 400;
    color: rgba(255,255,255,0.5);
    letter-spacing: 0.5px;
    margin-top: 1px;
  }

  .time-col {
    width: 18%;
    font-size: 10px;
    font-weight: 400;
  }

  .isha-col {
    font-weight: 700;
    color: #C8A951;
  }

  .special-badge {
    font-size: 5.5px;
    font-weight: 700;
    letter-spacing: 1px;
    padding: 2px 6px;
    border-radius: 2px;
    display: inline-block;
    margin-top: 2px;
  }

  .iftaar-badge {
    background: #C8A951;
    color: #FFFFFF;
  }

  .daylight-badge {
    background: #FF9800;
    color: #FFFFFF;
  }

  .footer-section {
    text-align: center;
    padding: 15px 40px;
    margin-top: 10px;
  }

  .legend {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin-bottom: 12px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 7.5px;
    font-weight: 400;
    color: rgba(255,255,255,0.6);
  }

  .legend-icon {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    display: inline-block;
    flex-shrink: 0;
  }

  .legend-icon.gold { background: #C8A951; }
  .legend-icon.orange { background: #FF9800; }

  .footer-bar {
    background: linear-gradient(135deg, #0D7377 0%, #0A5C5F 100%);
    padding: 12px 40px;
    text-align: center;
  }

  .footer-contacts {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 18px;
  }

  .footer-contact-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 8px;
    font-weight: 400;
    color: rgba(255,255,255,0.8);
  }

  .contact-icon {
    width: 14px;
    height: 14px;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    color: #FFFFFF;
    flex-shrink: 0;
  }

  .contact-icon.phone { background: #0D7377; }
  .contact-icon.email { background: #C8A951; }
  .contact-icon.web { background: #0D7377; }

  .footer-app {
    font-size: 7px;
    font-weight: 700;
    color: #C8A951;
    margin-top: 6px;
    letter-spacing: 0.5px;
  }
</style>
</head>
<body>

<div class="page">
  <div class="header-section">
    <div class="mosque-name">Islamic Center of Kane County</div>
    <div class="address">2315 DEAN STREET #600, ST. CHARLES, IL 60174</div>
  </div>
  <div class="title-section">
    <div class="ramadan-title">RAMADAN 2026 / 1447 AH</div>
    <div class="date-range">February 17, 2026 - March 18, 2026</div>
    <div class="quran-verse">"The month of Ramadan in which was revealed the Quran, a guidance for the people and clear proofs of guidance and criterion." - Surah Al-Baqarah 2:185</div>
  </div>
  <table>
    ${buildTableHeader()}
    ${timetable.slice(0, 21).map((item, i) => buildRow(item, i)).join('')}
  </table>
</div>

<div class="page">
  <table style="margin-top: 30px;">
    ${buildTableHeader()}
    ${timetable.slice(21).map((item, i) => buildRow(item, i + 21)).join('')}
  </table>
  <div class="footer-section">
    <div class="legend">
      <div class="legend-item"><span class="legend-icon gold"></span> Saturday = Community Iftaar</div>
      <div class="legend-item"><span class="legend-icon orange"></span> March 8 = Daylight Saving Time (Clocks Spring Forward)</div>
    </div>
  </div>
  <div class="footer-bar">
    <div class="footer-contacts">
      <div class="footer-contact-item"><span class="contact-icon phone">&#9742;</span> 872-444-6850</div>
      <div class="footer-contact-item"><span class="contact-icon email">&#9993;</span> reachickc@gmail.com</div>
      <div class="footer-contact-item"><span class="contact-icon web">&#127760;</span> ickc.info</div>
    </div>
    <div class="footer-app">Download the ICKC App - Coming Soon on App Store & Google Play</div>
  </div>
</div>

</body>
</html>`;

async function generatePDF() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: 'ICKC_Ramadan_2026_Timetableupdated.pdf',
    format: 'Letter',
    printBackground: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  await browser.close();
  console.log('PDF generated: ICKC_Ramadan_2026_Timetableupdated.pdf');
}

generatePDF().catch(console.error);
