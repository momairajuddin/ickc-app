# ICKC App Design Guidelines

## Brand Identity

**Purpose**: Connect the Islamic Center of Kane County community through prayer times, events, donations, and spiritual resources with a modern, tech-forward experience.

**Aesthetic Direction**: **Futuristic Islamic Tech** - Vibrant neon teals and blues evoke energy and digital innovation. Glowing accents and geometric Islamic patterns blend sacred tradition with high-tech aesthetics. Glassmorphism cards float over subtle pattern backgrounds. This is a mosque for the digital age - reverent yet boldly modern.

**Memorable Element**: ICKC logo features a subtle neon glow effect (outer glow with vibrant teal, 8px blur radius). Prayer time transitions use gradient fade animations. Islamic geometric patterns pulse softly in backgrounds.

## Navigation Architecture

**Root Navigation**: Tab Navigation (4 tabs + floating action)

**Tabs**:
1. **Home** - Prayer times, Quranic verse, quick links
2. **Events** - Calendar and upcoming events
3. **Donate** (Floating Action Button - center, glowing)
4. **More** - Notifications, Ramadan, Profile, Settings

**Auth Required**: Yes (Apple Sign-In for iOS, Google Sign-In for Android)

## Screen-by-Screen Specifications

### Welcome Screen (Stack-only, shown once)
- **Layout**: Non-scrollable, centered content, gradient background
- **Header**: None
- **Content**: ICKC logo with glow effect (large), "Islamic Center of Kane County", "St. Charles, IL", Quranic verse (6:162), gradient "Get Started" button
- **Safe Area**: Bottom: insets.bottom + Spacing.xl

### Home Screen (Home Tab)
- **Header**: Transparent, centered ICKC logo with glow, no buttons
- **Layout**: Scrollable
- **Safe Area**: Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl
- **Components**: Next prayer countdown card (glassmorphic, large, gradient border), prayer times grid (Fajr, Dhuhr, Asr, Maghrib, Isha from Masjidal API), Jumu'ah time card, Quranic verse card with geometric pattern background, quick action buttons (glowing borders)
- **Background**: Subtle geometric Islamic pattern overlay (10% opacity)

### Events Screen (Events Tab)
- **Header**: Default, title "Events", right "+" glowing button (admins only)
- **Layout**: Calendar at top, scrollable list below
- **Safe Area**: Top: Spacing.xl, Bottom: tabBarHeight + Spacing.xl
- **Components**: Month calendar with event dots (vibrant teal), glassmorphic event cards (title, date, gradient "Sign Up" button), empty state illustration
- **Admin Flow**: "+" opens Create Event modal (glassmorphic form, gradient submit button in header)

### Donate Modal (from FAB)
- **Header**: Custom, "Donate" title, left "Close" button
- **Layout**: Scrollable form, gradient background
- **Safe Area**: Top: headerHeight + Spacing.xl, Bottom: insets.bottom + Spacing.xl
- **Components**: Charity ayah card with glow effect, donation type chips (glowing borders when selected), amount presets (glassmorphic buttons), frequency toggle, gradient "Donate with Square" button

### More Screen (More Tab)
- **Header**: Default, title "More"
- **Layout**: Scrollable list
- **Safe Area**: Top: Spacing.xl, Bottom: tabBarHeight + Spacing.xl
- **Components**: Glassmorphic list cards with icons (vibrant teal glow): Notifications, Ramadan Timetable, Profile, Settings, Privacy Policy, Terms of Service

### Notifications Screen
- **Header**: Default, title "Notifications", back button
- **Layout**: Scrollable
- **Safe Area**: Top: Spacing.xl, Bottom: insets.bottom + Spacing.xl
- **Components**: Toggle switches with neon accents, notification cards (glassmorphic), empty state, admin "Send Alert" button (gradient)

### Ramadan Timetable Screen
- **Header**: Default, title "Ramadan 2024", back button
- **Layout**: Scrollable
- **Safe Area**: Top: Spacing.xl, Bottom: insets.bottom + Spacing.xl
- **Components**: Glassmorphic table cards, current day highlighted with gradient border, countdown card with glow effect

### Profile Screen
- **Header**: Default, title "Profile", back button
- **Layout**: Scrollable
- **Safe Area**: Top: Spacing.xl, Bottom: insets.bottom + Spacing.xl
- **Components**: Avatar with neon ring, display name field (glassmorphic input), "Account Settings" link, "Log Out" button (with confirmation), Delete Account nested under Settings > Account

## Color Palette

**Primary Teal**: #00B4A0 (vibrant teal)
**Primary Light Teal**: #00D4AA (bright teal)
**Accent Blue**: #00A5FF (electric blue)
**Background**: #0A0E1A (deep navy-black)
**Surface**: #1A1F2E (dark blue-gray for glassmorphic cards)
**Text Primary**: #FFFFFF (pure white)
**Text Secondary**: #B0B8C8 (light gray-blue)
**Glow Primary**: #00D4AA with 40% opacity
**Glow Accent**: #00A5FF with 30% opacity
**Border**: #2A3F5F (subtle blue-gray)
**Success**: #4CAF50
**Error**: #FF6B6B

## Typography

**Font**: Nunito (Google Font - modern, friendly sans-serif)

**Type Scale**:
- Hero: Bold, 28px
- H1: Bold, 22px
- H2: SemiBold, 18px
- Body: Regular, 16px
- Caption: Regular, 13px
- Button: Bold, 16px

## Visual Design

- **Glassmorphism Cards**: Surface color with 60% opacity, 16px border radius, 1px border with 20% white, backdrop blur (use library like react-native-blur)
- **Glow Effects**: ICKC logo, FAB, active states use outer glow (shadowColor: Primary Light Teal, shadowOffset: 0/0, shadowOpacity: 0.6, shadowRadius: 12)
- **Gradients**: Primary Teal to Accent Blue (45-degree angle) for buttons, backgrounds
- **Geometric Patterns**: Islamic star/tessellation patterns as background overlays (10% opacity, tiled)
- **Floating Donate FAB**: Gradient fill (Primary Teal to Accent Blue), glow shadow (offset: 0/4, opacity: 0.4, radius: 8)
- **Tab Bar**: Active state glowing underline (3px, Primary Light Teal with glow)
- **Icons**: Feather icons from @expo/vector-icons, vibrant teal color
- **Touchable Feedback**: 0.7 opacity on press, glowing border appears on hold
- **Prayer Cards**: Glassmorphic surface, gradient left border (3px)

## Assets to Generate

1. **icon.png** - ICKC logo on gradient background (teal to blue) with subtle glow - USED: Device home screen
2. **splash-icon.png** - ICKC logo centered with animated glow effect on dark background - USED: App launch
3. **pattern-islamic-geometric.png** - Repeating Islamic star tessellation pattern (white lines, transparent background) - USED: Background overlay for all screens
4. **empty-events.png** - Futuristic mosque outline with neon teal glow - USED: Events empty state
5. **empty-notifications.png** - Glowing bell icon with geometric pattern - USED: Notifications empty state
6. **charity-glow.png** - Abstract hands with vibrant gradient and glow rays - USED: Donate modal header
7. **avatar-default.png** - Circle with neon ring and initials placeholder - USED: Profile default