# ICKC Mobile App

  ## Islamic Center of Kane County - Mobile Application

  A React Native/Expo mobile application designed to foster community connection for the Islamic Center of Kane County in St. Charles, IL.

  ## Features

  - **Prayer Times**: Live Adhan and Iqamah times via Masjidal API, with swipeable multi-day view and next prayer countdown
  - **Event Management**: Dynamic events with RSVP functionality and admin management
  - **Donations**: Square payment integration with Sadaqah, General, Fitrana, and Zakath types, plus 3% CC fee coverage option
  - **Push Notifications**: Customizable notification preferences for prayers, events, announcements, and Ramadan
  - **Ramadan Timetable**: Daily Fajr and Isha/Taraweeh schedule with special day highlights
  - **Imam Volunteer Sign-Up**: Calendar-based volunteer scheduling system
  - **Community Iftaar**: Event signup and attendance tracking
  - **SMS Authentication**: OTP-based login via Twilio

  ## Tech Stack

  - **Frontend**: Expo SDK 54 + React Native 0.81
  - **Navigation**: React Navigation v7
  - **Backend**: Express.js v5 with TypeScript
  - **Database**: PostgreSQL with Drizzle ORM
  - **State Management**: TanStack React Query
  - **Payments**: Square API
  - **Styling**: Custom theming with glassmorphism, gradients, and Islamic geometric patterns

  ## Getting Started

  1. Install dependencies: `npm install`
  2. Start the backend: `npm run server:dev`
  3. Start the frontend: `npm run expo:dev`

  ## Project Structure

  ```
  client/          # React Native/Expo frontend
    screens/       # App screens
    components/    # Reusable UI components
    navigation/    # React Navigation setup
    hooks/         # Custom hooks
    constants/     # Theme and config
    lib/           # API client utilities
  server/          # Express.js backend
    routes.ts      # API endpoints
    storage.ts     # Data persistence
    db.ts          # Database connection
  shared/          # Shared types and schema
    schema.ts      # Drizzle ORM schema
  scripts/         # Build scripts
  assets/          # Images and icons
  ```
  