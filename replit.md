# ICKC Mobile App

## Overview

The ICKC (Islamic Center of Kane County) mobile app is a React Native/Expo application designed to foster community connection in St. Charles, IL. It provides essential features such as prayer times, event management, donation capabilities, and push notifications. The app aims for a luxurious and refined aesthetic, blending traditional Islamic geometric patterns with modern UI elements like glass morphism and gradients. The project's vision is to create a central digital hub for the mosque community, enhancing engagement and accessibility to mosque services.

## User Preferences

Preferred communication style: Simple, everyday language.

### Mandatory Workflow
- **ALWAYS bump app.json version** when making any code changes: increment `version`, `buildNumber` (iOS), and `versionCode` (Android) before completing a task. This ensures every build submitted to app stores has a unique version number.

## System Architecture

### Frontend Architecture

- **Framework**: Expo SDK 54 with React Native 0.81
- **Navigation**: React Navigation v7, utilizing a hybrid structure with a root Stack Navigator and a Bottom Tab Navigator, each tab containing its own Stack Navigator.
- **State Management**: TanStack React Query for server-side state, React hooks for local state.
- **Styling**: Custom theming system supporting light/dark modes, driven by a centralized theme file.
- **Animations**: React Native Reanimated for smooth UI interactions.
- **Fonts**: Montserrat via @expo-google-fonts.
- **UI/UX Decisions**:
    - Luxurious, refined aesthetic combining traditional Islamic geometric patterns with modern glass morphism and gradients.
    - Transparent headers with blur effects for a premium iOS-style navigation.
    - Floating Donate Button as a prominent circular CTA in the tab bar.
    - Onboarding flow with a Welcome screen shown once, state persisted in AsyncStorage.
    - Vibrant teal and blue color scheme with glow effects on the logo and glassmorphic cards.

### Backend Architecture

- **Framework**: Express.js v5 with TypeScript.
- **API Pattern**: RESTful endpoints, prefixed with `/api`.
- **Server Setup**: Custom CORS handling for development and production environments.
- **Static Serving**: Provides a landing page for web visitors with app download links.

### Data Storage

- **ORM**: Drizzle ORM with PostgreSQL dialect.
- **Schema**: Defined in `shared/schema.ts` for type sharing between client and server.
- **Migrations**: Managed by drizzle-kit.
- **Current Storage**: In-memory storage (`MemStorage`) used as a placeholder.

### Key Design Decisions

- **Monorepo Structure**: Client code in `/client`, server in `/server`, and shared types in `/shared` to facilitate type sharing and a single deployment unit.
- **API URL Resolution**: The client uses synchronous URL discovery (`resolveApiUrl()` in `client/lib/query-client.ts`) with priority: `EXPO_PUBLIC_API_BASE_URL` env var (baked at build time) > web origin > dev hostUri > manifest `apiBaseUrl` > `launchAsset` URL > manifest `hostUri` > `EXPO_PUBLIC_DOMAIN` > hardcoded fallback (`islamic-center-connect.replit.app`). The server dynamically injects the correct production domain into the Expo manifest at serve time using `resolveProductionHost()` which prioritizes `x-forwarded-host` (from Replit proxy) with `.replit.app` domains over `REPLIT_DEV_DOMAIN`. The build script (`scripts/build.js`) also explicitly passes `EXPO_PUBLIC_API_BASE_URL` to Metro so the env var is baked into the JS bundle. The stable published domain is `islamic-center-connect.replit.app`.
- **Published Domain**: `islamic-center-connect.replit.app` — used as the production backend URL. Set via `EXPO_PUBLIC_API_BASE_URL` env var. The build script and client code both have this as a fallback.
- **Path Aliases**: `@/` for client and `@shared/` for shared, improving import readability.

### Feature Specifications

- **Screens**: Welcome, Home, Events, Donate, Notifications, Profile, Ramadan Timetable, Imam Volunteer Sign-Up, Event Signup.
- **Prayer Times**: Displays Adhan and Iqamah times, including Jumu'ah, sourced from Masjidal. Swipeable to view up to 4 days (today + 3 future days) with day labels and pagination dots.
  - **CRITICAL: Next Prayer Card** — Always visible on HomeScreen showing the upcoming prayer name, iqamah time, and a live countdown timer. When all of today's prayers have passed, it shows tomorrow's Fajr with a "(Tomorrow)" label. This card must NEVER disappear and must stay visible regardless of which day the user is viewing in the swipeable prayer times.
  - **CRITICAL: Teal row highlighting** — The next upcoming prayer row in today's prayer table must be highlighted with a teal background, a teal dot indicator, and teal-colored text. This highlighting only applies to today's prayers. When all prayers have passed for today, no row is highlighted.
  - **CRITICAL: St. Charles, IL map link** — The "St. Charles, IL" location badge below the mosque name must be a tappable Pressable that opens the mosque address (2315 Dean Street #600, St. Charles, IL 60174) in Apple Maps (iOS), Google Maps (Android), or Google Maps web. Uses `expo-haptics` for tactile feedback on press.
- **Donations**: Supports various types (Sadaqah, General, Fitrana, Zakath) with custom amounts, processed via Square and Zelle.
  - **3% CC Fee Coverage**: Optional toggle lets donors cover the credit card processing fee. When enabled, 3% is calculated on the base amount and added to the total. Fee coverage info is appended to the payment note sent to Square for dashboard visibility.
  - **Donation Notes**: Donors can add a personal note to their donation. Notes are passed to Square via the `payment_note` field and appear in the Square dashboard alongside the payment.
- **Authentication**: SMS/OTP-based authentication via Twilio for user registration, login, and password reset.
- **Push Notifications**: Comprehensive system with customizable settings for prayer reminders, event reminders, announcements, Ramadan reminders, and donation campaigns.
- **Imam Volunteer Sign-Up**: Calendar-based system for volunteers to sign up for salah, with real-time updates and admin management.
- **Ramadan 2026 Timetable**: Mobile-friendly display of daily Fajr and Isha/Taraweeh times, highlighting special days.
- **Event RSVP**: Allows users to RSVP for events like Community Iftaar, tracks attendees, and provides admin management features.

## External Dependencies

### Third-Party Services
- **Masjidal**: Provides prayer times data using `masjid_id: x4KB2K5Q`.
- **Square**: Payment processing for donations.
- **Zelle**: Alternative donation method (email: `ReachICKC@gmail.com`).
- **Twilio**: Used for SMS-based authentication and OTP delivery.

### Key npm Packages
- `expo-notifications`: Push notification functionality.
- `expo-web-browser`: For opening external links within the app.
- `expo-linear-gradient`: For gradient backgrounds.
- `expo-blur` / `expo-glass-effect`: For glassmorphism UI elements.
- `expo-haptics`: For tactile feedback.
- `drizzle-orm` / `drizzle-zod`: Database ORM with Zod validation.
- `@tanstack/react-query`: For data fetching, caching, and synchronization.

### Database
- **PostgreSQL**: Used for data persistence.
- **Key Tables**:
    - `users`: Stores user information (id, phone, password, etc.).
    - `otp_codes`: Manages OTPs for authentication.
    - `push_tokens`: Stores device push tokens.
    - `notification_preferences`: User-specific notification settings.
    - `imam_signups`: Records volunteer imam sign-ups.
    - `ramadan_timetable`: Stores Ramadan schedule data.
    - `events`: Dynamic events managed via admin dashboard (title, description, date, time, location, category, active status).
    - `event_rsvps`: Manages event RSVPs.