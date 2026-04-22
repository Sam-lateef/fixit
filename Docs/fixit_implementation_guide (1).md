# Fix It / صلّح — Full Product Spec & Implementation Guide

> **For developers using Cursor AI:** Read this entire document before writing a single line of code. Drop it into your project root and reference it throughout. The UI visual reference is in `fixit_car_owner.html` and `fixit_shop.html` — open both in a browser alongside Cursor.

---

## Table of Contents

1. [App Overview & Vision](#1-app-overview--vision)
2. [How the App Works](#2-how-the-app-works)
3. [User Types & Roles](#3-user-types--roles)
4. [Business Rules & Logic](#4-business-rules--logic)
5. [Tech Stack](#5-tech-stack)
6. [Project Structure](#6-project-structure)
7. [Design System & Tokens](#7-design-system--tokens)
8. [Authentication Flow](#8-authentication-flow)
9. [Database Schema (Prisma)](#9-database-schema-prisma)
10. [Backend API Routes](#10-backend-api-routes)
11. [Feed Filter Algorithm](#11-feed-filter-algorithm)
12. [Geolocation & Distance System](#12-geolocation--distance-system)
13. [Push Notifications](#13-push-notifications)
14. [Real-time Chat (Socket.io)](#14-real-time-chat-socketio)
15. [File & Photo Uploads](#15-file--photo-uploads)
16. [Screen-by-Screen UI Spec](#16-screen-by-screen-ui-spec)
    - [16A — Car Owner Screens](#16a--car-owner-screens)
    - [16B — Shop / Workshop Screens](#16b--shop--workshop-screens)
17. [Localization & i18n](#17-localization--i18n)
18. [Environment Variables](#18-environment-variables)
19. [Cursor AI Instructions](#19-cursor-ai-instructions)

---

## 1. App Overview & Vision

**Fix It / صلّح** is a mobile bid marketplace that connects car owners in Iraq with repair workshops, spare parts shops, and towing services.

The core problem it solves: finding a trustworthy, fairly priced repair shop or spare part in Iraq is currently done through word of mouth or driving around. There is no digital marketplace where car owners can post a job, receive competitive bids from multiple shops, and make an informed decision.

Fix It solves this by letting car owners describe what they need, and letting verified local shops compete for the job by placing bids. The owner picks the best bid, a direct chat opens, and they coordinate the rest. No payment is processed in-app — the platform is connection-only.

**What it is not:**
- Not a booking system (no calendar on the owner side)
- Not a payment processor (no money moves through the app)
- Not a review platform (though ratings are shown)
- Not a social network or public feed for owners

**Primary market:** Iraq — Baghdad, Basra, Mosul, Erbil, Najaf, Karbala, Kirkuk and beyond.

**Languages:** English and Iraqi Arabic (RTL). Default language: Iraqi Arabic.

**Platform:** iOS and Android (single Capacitor + TypeScript codebase).

**Monetization:** Subscription model for shop accounts (not in scope for MVP — shops use the app free during launch phase).

---

## 2. How the App Works

### Car Owner flow

```
Sign up → Set location (city + district) → Home screen (My Posts)
  → Tap "+" → Choose post type (Repair / Parts / Towing)
  → Fill post details → Upload up to 3 photos
  → Post goes live (48h timer starts)
  → Shops see it in their feed and place bids
  → Owner gets push notification for each bid
  → Owner reviews bids on the home screen → Accept best bid
  → Direct chat opens with the shop
  → Coordinate details, confirm appointment
  → Post closes
```

### Shop / Workshop flow

```
Sign up → Choose service types (Repair / Parts / Towing)
  → Set car makes + year range they support
  → Set repair categories (if repair)
  → Set parts categories (if parts)
  → Set location (city + district + optional address)
  → Set service area radius per service type
  → View filtered feed of matching customer posts
  → Tap a post → Place a bid (price + availability + message)
  → Wait for owner response
  → If accepted → chat opens → coordinate details
```

---

## 3. User Types & Roles

| Attribute | Car Owner | Shop / Workshop |
|-----------|-----------|-----------------|
| Can post requests | ✅ Yes | ❌ No |
| Can bid on requests | ❌ No | ✅ Yes |
| Sees public feed | ❌ No | ✅ Yes (filtered) |
| Home screen shows | Their own posts + bids received | Feed of customer requests |
| Navigation | My Posts · New Post (FAB) · Inbox · Profile | Feed · My Bids · Inbox · Profile |
| Post types available | Repair, Parts, Towing | — |
| Bid controls | Accept / Message | Place / Edit / Withdraw |
| GPS used | Towing post only | No |
| Service radius | No | Set per service type during signup |

---

## 4. Business Rules & Logic

### Posts
- Posts are created by car owners only
- A post can be one of three types: **Repair**, **Parts**, or **Towing**
- Each post has a **48-hour expiry timer** from the time of creation
- When 48 hours pass, the post is automatically marked `EXPIRED` and hidden from all feeds
- Owner can manually delete a post at any time before it expires
- Once a bid is accepted, the post is marked `ACCEPTED` and hidden from the shop feed
- Shops cannot see expired or accepted posts
- Max 3 photos per post
- No video support (planned for future)

### Bids
- Only shop accounts can place bids
- A shop can place **one bid per post**
- A shop can **edit or withdraw** their bid at any time before it is accepted
- Once a bid is accepted by the owner, the post closes and no further bids can be placed
- Only one bid can be accepted per post
- Bid status transitions: `PENDING` → `ACCEPTED` | `WITHDRAWN`

### Chat
- A chat thread is created **only after a bid is accepted**
- Both parties (owner and shop) can message in the thread
- Messages are delivered in real-time via Socket.io
- Push notifications are sent when a new message arrives and the app is backgrounded

### Part condition
- Parts posts include a **condition field**: New or Used
- The user selects one or both (selecting both means they accept either)
- No "Either" option — multi-select chips

### "Other" category
- Both repair type and parts category selectors include an "Other" chip
- When selected, a free-text input appears below for the user to describe
- Styled identically to other chips — not highlighted differently
- The text entered is included in the post description
- Shops with "Other" in their categories see posts tagged with "Other"

### GPS for towing
- Towing posts use GPS auto-detect via the Capacitor Geolocation plugin
- On page load: request permission → `getCurrentPosition()` → reverse geocode with Nominatim → show address on map
- User sees a draggable pin on an OpenStreetMap map
- User can drag pin to adjust or tap "Change location" to type manually
- Final lat/lng + address string are stored on the post

### Distance & feed filtering (see Section 11 for algorithm detail)
- Shop feed is filtered server-side — shops only see posts that match their profile
- Distance is calculated using the Haversine formula on district centroids
- Each shop sets a radius per service type (repair, parts, towing)
- Parts shops can toggle **"Ship nationwide"** which bypasses distance filtering for parts posts entirely
- Towing posts trigger urgent push notifications to all nearby towing shops immediately

### Post types & fields

**Repair post fields:**
- Repair type (chip selector: Engine, Brakes, Electrical, AC, Tyres, Suspension, Body & Paint, Transmission, Exhaust, Oil & Fluids, Other)
- Car make, model, year (cascading dropdowns)
- Description (free text, 300 char limit)
- Up to 3 photos

**Parts post fields:**
- Part category (chip selector: Engine parts, Brakes, Filters, Electrical, Suspension, Body parts, Tyres, AC parts, Exhaust, Other)
- Part condition: New / Used (multi-select chips, no "Either" option)
- Car make, model, year (cascading dropdowns)
- Description (free text, 300 char limit)
- Up to 3 photos
- Delivery needed: Yes / No

**Towing post fields:**
- Current location (GPS auto-detect + draggable map pin)
- "Tow to" destination (optional, free text)
- Notes (free text)
- Urgency: ASAP / Within the hour

---

## 5. Tech Stack

### Mobile App
| Layer | Technology |
|-------|-----------|
| Framework | Capacitor + TypeScript |
| UI | Custom HTML/CSS components (no Ionic) |
| State | Lightweight reactive stores |
| Maps | Leaflet.js + OpenStreetMap tiles (towing screen only) |
| GPS | @capacitor/geolocation |
| Push (client) | Firebase Cloud Messaging via @capacitor-firebase/messaging |
| Storage | @capacitor/preferences (secure local storage for JWT) |
| RTL support | CSS `direction: rtl` toggled on root based on language setting |

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Fastify |
| Database | PostgreSQL |
| ORM | Prisma |
| Real-time | Socket.io |
| Auth | Custom JWT + Infobip 2FA (WhatsApp OTP) |
| File storage | Cloudflare R2 (S3-compatible) |
| Push (server) | Firebase Admin SDK (FCM) |
| Geocoding | Nominatim (OpenStreetMap, free) — towing only |
| Distance | Haversine formula on district lat/lng centroids |

### External Services
| Service | Purpose | Notes |
|---------|---------|-------|
| Infobip 2FA | WhatsApp OTP login | Pricing per Infobip plan |
| Firebase FCM | Push notifications iOS + Android | Free |
| Cloudflare R2 | Photo storage | ~$0.015/GB, free egress |
| OpenStreetMap + Nominatim | Map tiles + reverse geocoding | Free |
| Leaflet.js | Map rendering | Free, no API key |

---

## 6. Project Structure

```
fixit/
├── mobile/                           # Expo (React Native) app — primary mobile client
│   ├── app/                          # expo-router screens
│   └── lib/                          # API, auth, i18n, theme
├── app/                              # Legacy Capacitor + Vite web shell (optional / reference)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── splash.ts
│   │   │   │   ├── enter-number.ts
│   │   │   │   ├── otp.ts
│   │   │   │   └── account-type.ts
│   │   │   ├── owner/
│   │   │   │   ├── home.ts           # My Posts — this IS the home screen
│   │   │   │   ├── create-post.ts    # Handles Repair / Parts / Towing
│   │   │   │   ├── inbox.ts
│   │   │   │   ├── chat.ts
│   │   │   │   └── profile.ts
│   │   │   ├── shop/
│   │   │   │   ├── feed.ts
│   │   │   │   ├── place-bid.ts
│   │   │   │   ├── my-bids.ts
│   │   │   │   ├── inbox.ts
│   │   │   │   ├── chat.ts
│   │   │   │   └── profile.ts
│   │   │   └── signup/
│   │   │       ├── owner-details.ts
│   │   │       ├── owner-location.ts
│   │   │       ├── shop-offer.ts         # Step 1: What do you offer
│   │   │       ├── shop-car-makes.ts     # Step 2
│   │   │       ├── shop-repair-cats.ts   # Step 3 (if repair selected)
│   │   │       ├── shop-parts-cats.ts    # Step 4 (if parts selected)
│   │   │       ├── shop-location.ts      # Step 5
│   │   │       ├── shop-service-area.ts  # Step 6
│   │   │       └── shop-review.ts        # Step 7: Review & confirm
│   │   ├── components/
│   │   │   ├── chip-selector.ts
│   │   │   ├── district-picker.ts
│   │   │   ├── post-card.ts
│   │   │   ├── bid-card.ts
│   │   │   ├── photo-uploader.ts
│   │   │   ├── distance-slider.ts
│   │   │   ├── bottom-nav.ts
│   │   │   └── towing-map.ts
│   │   ├── services/
│   │   │   ├── api.ts                # All HTTP requests
│   │   │   ├── auth.ts               # JWT storage + refresh
│   │   │   ├── socket.ts             # Socket.io client
│   │   │   └── notifications.ts      # FCM setup
│   │   ├── stores/
│   │   │   ├── user.ts
│   │   │   └── posts.ts
│   │   ├── i18n/
│   │   │   ├── en.ts
│   │   │   └── ar-iq.ts
│   │   └── utils/
│   │       ├── haversine.ts
│   │       └── districts.ts          # Static district list with lat/lng centroids
│   ├── capacitor.config.ts
│   └── package.json
│
└── api/                              # Fastify backend
    ├── src/
    │   ├── routes/
    │   │   ├── auth.ts
    │   │   ├── posts.ts
    │   │   ├── bids.ts
    │   │   ├── chat.ts
    │   │   ├── users.ts
    │   │   ├── shops.ts
    │   │   └── uploads.ts
    │   ├── services/
    │   │   ├── otp.ts                # Send/verify + dev bypass
    │   │   ├── infobip.ts          # Infobip 2FA WhatsApp
    │   │   ├── fcm.ts
    │   │   ├── haversine.ts
    │   │   ├── r2.ts                 # Cloudflare R2 upload
    │   │   └── nominatim.ts          # Reverse geocoding for towing
    │   ├── middleware/
    │   │   └── auth.ts               # JWT verification
    │   ├── socket/
    │   │   └── chat.ts               # Socket.io server
    │   └── db/
    │       └── prisma.ts
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.ts                   # District seed data
    └── package.json
```

---

## 7. Design System & Tokens

### Colors

```css
/* Primary */
--color-primary:        #1B4332;  /* deep forest green — headers, FAB, splash, selected chips */
--color-primary-mid:    #40916C;  /* medium green — buttons, toggles, sliders, active nav */
--color-primary-light:  #D8F3DC;  /* light green tint — selected chip bg, best bid card bg, info banners */

/* Tags */
--color-repair-bg:      #D8F3DC;  /* green */
--color-repair-text:    #1B4332;
--color-parts-bg:       #E8F0FE;  /* blue */
--color-parts-text:     #1A5FC8;
--color-towing-bg:      #FFF8E6;  /* amber */
--color-towing-text:    #B07A00;

/* Semantic */
--color-success:        #22C55E;  /* bid count dot (active posts) */
--color-warning:        #F59E0B;  /* pending bid dot, star rating */
--color-danger:         #EF4444;  /* delete, withdraw, log out, unread badge */
--color-info-blue:      #1A5FC8;  /* "Bid sent" tag, Parts tag */

/* Neutral */
--color-bg:             #F4F4F2;  /* app background, body of phone frame */
--color-surface:        #FFFFFF;  /* cards, nav bar, header */
--color-chip-default:   #EBEBEA;  /* unselected chip background */
--color-border:         #E5E5E5;  /* card borders */
--color-border-light:   #F0F0F0;  /* row dividers inside cards */
--color-text-primary:   #111111;
--color-text-secondary: #555555;
--color-text-tertiary:  #888888;
--color-text-hint:      #AAAAAA;
```

### Typography

```css
/* System fonts — no external font download needed */
font-family: 'Segoe UI', Arial, sans-serif;                    /* English */
font-family: 'Segoe UI', Tahoma, Arial, sans-serif;            /* Arabic — Tahoma has better Arabic glyphs */

/* Scale (used at zoom:2 in printout, halve for actual app) */
--text-xs:    10px;   /* hints, timestamps */
--text-sm:    11px;   /* secondary labels, chip text */
--text-base:  12px;   /* body text, description */
--text-md:    13px;   /* card titles, primary content */
--text-lg:    16px;   /* screen titles */
--text-xl:    19px;   /* section headers */
--text-2xl:   22px;   /* large headings */

/* Weights: 400 (regular) and 500 (medium) only — no bold */
```

### Spacing & Radius

```css
--radius-chip:    20px;   /* all chips / pills */
--radius-card:    14px;   /* post cards */
--radius-input:   10px;   /* text inputs */
--radius-button:  11px;   /* primary buttons */
--radius-sm:       6px;   /* small cards, tags */
--radius-avatar:  50%;    /* user/shop avatars */

--space-xs:   4px;
--space-sm:   8px;
--space-md:   12px;
--space-lg:   16px;
--space-xl:   20px;
--space-2xl:  28px;
```

### Component Specs

**Chip (unselected):** `background:#EBEBEA; border:0.3px solid #DDD; border-radius:20px; padding:5px 12px; font-size:11px; color:#555`

**Chip (selected):** `background:#1B4332; border:none; border-radius:20px; padding:5px 12px; font-size:11px; color:#fff`

**"Other" chip:** Same as unselected — no special styling. When tapped, reveals a free-text input below the chip grid.

**Primary button:** `background:#40916C; border-radius:11px; padding:11px; width:100%; font-size:12px; font-weight:500; color:#fff`

**Secondary button:** `background:#EBEBEA; border:0.3px solid #DDD; border-radius:11px; padding:11px; color:#333`

**Danger button:** `background:#FEE2E2; border:0.3px solid #FECACA; border-radius:7px; padding:4px 12px; color:#EF4444`

**Post card:** `background:#fff; border:0.5px solid #E5E5E5; border-radius:14px; padding:12px 14px`

**Best bid card:** `background:#D8F3DC; border:2px solid #40916C; border-radius:10px; padding:10px`

**Best bid badge:** Absolute positioned top-left (EN) / top-right (AR), dark green pill: `background:#1B4332; color:#fff; font-size:9px; border-radius:20px; padding:2px 8px`

**Distance badge on feed cards:** `background:#D8F3DC; color:#1B4332; border-radius:20px; font-size:10px; padding:2px 8px`

**Bottom nav FAB:** `width:46px; height:46px; background:#1B4332; border-radius:50%; margin-top:-16px` (floats above nav bar)

**Toggle ON:** `width:36px; height:20px; background:#40916C; border-radius:20px` — thumb on right
**Toggle OFF:** same dimensions, `background:#CCC` — thumb on left

**Distance slider:** `track-height:4px; track-bg:#EEE; fill-color:#40916C; thumb:18px diameter; thumb-border:2px solid #40916C; thumb-bg:#fff`

---

## 8. Authentication Flow

### Login / Signup (same flow)

```
1. User enters Iraqi phone number (+964 format)
2. App → POST /auth/send-otp { phone: "+9647XXXXXXXX" }
3. Backend → Infobip 2FA API → WhatsApp message with 6-digit code
4. User enters code in 6-box OTP screen
5. App → POST /auth/verify-otp { phone, code }
6. Backend verifies with Infobip (or dev bypass — see `api/.env.example`)
7a. New user → { token, isNewUser: true } → Account type selection → Signup flow
7b. Existing user → { token, user } → Home screen
```

### Infobip setup

Use **`Docs/fixit_auth_infobip.md`** and set **`INFOBIP_*`** in `api/.env`. Twilio is not used (not supported for Iraq in this product).

### JWT

- Issue JWT on successful OTP verify (30-day expiry)
- Store in Capacitor Preferences (secure, encrypted)
- All protected API routes require `Authorization: Bearer <token>`
- Backend middleware validates JWT and attaches `req.user`
- On 401, app clears stored token and redirects to splash

---

## 9. Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String    @id @default(cuid())
  phone       String    @unique
  name        String?
  userType    UserType
  city        String?
  districtId  String?
  district    District? @relation(fields: [districtId], references: [id])
  address     String?   // optional free-text address (used as towing default)
  fcmToken    String?   // Firebase push token, updated on each app open
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  posts  Post[]
  shop   Shop?
}

model Shop {
  id     String @id @default(cuid())
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])
  name   String

  // Service types this shop offers
  offersRepair  Boolean @default(false)
  offersParts   Boolean @default(false)
  offersTowing  Boolean @default(false)

  // Service area radius (km) per type
  repairRadiusKm Int @default(15)
  partsRadiusKm  Int @default(20)
  towingRadiusKm Int @default(8)

  // Parts nationwide bypass
  partsNationwide Boolean @default(false)

  // Delivery
  deliveryAvailable Boolean @default(false)

  // Car makes & year range supported
  carMakes   String[] // ["Toyota", "Kia", "Nissan"]
  carYearMin Int?
  carYearMax Int?

  // Service categories
  repairCategories String[] // ["Engine", "Brakes", "Other"]
  partsCategories  String[] // ["Engine parts", "Brakes", "Other"]

  // Stats
  rating      Float @default(0)
  reviewCount Int   @default(0)
  bidsWon     Int   @default(0)

  bids      Bid[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model District {
  id     String @id @default(cuid())
  name   String // English
  nameAr String // Arabic
  city   String // English
  cityAr String // Arabic
  lat    Float
  lng    Float

  users User[]
  posts Post[]
}

model Post {
  id     String  @id @default(cuid())
  userId String
  user   User    @relation(fields: [userId], references: [id])

  serviceType ServiceType // REPAIR | PARTS | TOWING

  // Repair / Parts
  repairCategory String? // "Engine" | "Brakes" | "Other" | etc.
  partsCategory  String? // "Engine parts" | etc.
  carMake        String?
  carModel       String?
  carYear        Int?

  // Part condition (Parts posts only)
  conditionNew  Boolean @default(false)
  conditionUsed Boolean @default(false)

  // Parts
  deliveryNeeded Boolean @default(false)

  // Towing
  towingFromLat     Float?
  towingFromLng     Float?
  towingFromAddress String?
  towingToAddress   String?
  urgency           String? // "ASAP" | "WITHIN_HOUR"

  // Location (district centroid for distance calc)
  districtId String?
  district   District? @relation(fields: [districtId], references: [id])
  lat        Float?
  lng        Float?

  // Content
  description String
  photoUrls   String[]

  // State
  status    PostStatus @default(ACTIVE)
  expiresAt DateTime   // createdAt + 48 hours
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  bids Bid[]
}

model Bid {
  id     String @id @default(cuid())
  postId String
  post   Post   @relation(fields: [postId], references: [id])
  shopId String
  shop   Shop   @relation(fields: [shopId], references: [id])

  priceEstimate Int // Iraqi Dinar (IQD)

  // Repair bid
  appointmentDate DateTime?
  appointmentTime String?   // "11:00 AM"
  estimatedQty    Int?      // number of hours or days
  durationUnit    String?   // "hours" | "days"

  // Parts bid
  deliveryDate   DateTime?
  deliveryWindow String?   // "12pm-3pm"

  message String

  status    BidStatus @default(PENDING)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  chatThread ChatThread?

  @@unique([postId, shopId]) // One bid per shop per post
}

model ChatThread {
  id        String    @id @default(cuid())
  bidId     String    @unique
  bid       Bid       @relation(fields: [bidId], references: [id])
  messages  Message[]
  createdAt DateTime  @default(now())
}

model Message {
  id        String     @id @default(cuid())
  threadId  String
  thread    ChatThread @relation(fields: [threadId], references: [id])
  senderId  String     // User.id of sender
  content   String
  readAt    DateTime?
  createdAt DateTime   @default(now())
}

enum UserType    { OWNER SHOP }
enum ServiceType { REPAIR PARTS TOWING }
enum PostStatus  { ACTIVE ACCEPTED EXPIRED DELETED }
enum BidStatus   { PENDING ACCEPTED WITHDRAWN }
```

### District seed data sample (Baghdad)

```typescript
// prisma/seed.ts — extend with all Iraqi cities
const districts = [
  // Baghdad
  { name: "Karrada",   nameAr: "الكرادة",    city: "Baghdad", cityAr: "بغداد", lat: 33.3152, lng: 44.4219 },
  { name: "Mansour",   nameAr: "المنصور",    city: "Baghdad", cityAr: "بغداد", lat: 33.3406, lng: 44.3611 },
  { name: "Jadriya",   nameAr: "الجادرية",   city: "Baghdad", cityAr: "بغداد", lat: 33.2887, lng: 44.3828 },
  { name: "Adhamiya",  nameAr: "الأعظمية",   city: "Baghdad", cityAr: "بغداد", lat: 33.3797, lng: 44.4094 },
  { name: "Zayouna",   nameAr: "الزيونة",    city: "Baghdad", cityAr: "بغداد", lat: 33.3289, lng: 44.4725 },
  { name: "Kadhimiya", nameAr: "الكاظمية",   city: "Baghdad", cityAr: "بغداد", lat: 33.3803, lng: 44.3417 },
  { name: "Arasat",    nameAr: "عرصات",      city: "Baghdad", cityAr: "بغداد", lat: 33.3044, lng: 44.4016 },
  { name: "Sadr City", nameAr: "مدينة الصدر", city: "Baghdad", cityAr: "بغداد", lat: 33.3731, lng: 44.4792 },
  { name: "Dora",      nameAr: "الدورة",     city: "Baghdad", cityAr: "بغداد", lat: 33.2564, lng: 44.3839 },
  { name: "Hurriya",   nameAr: "الحرية",     city: "Baghdad", cityAr: "بغداد", lat: 33.3919, lng: 44.3689 },
  { name: "Bayaa",     nameAr: "البياع",     city: "Baghdad", cityAr: "بغداد", lat: 33.2872, lng: 44.3256 },
  { name: "Yarmouk",   nameAr: "اليرموك",    city: "Baghdad", cityAr: "بغداد", lat: 33.3233, lng: 44.3333 },
  // Basra
  { name: "Ashar",     nameAr: "العشار",     city: "Basra",   cityAr: "البصرة", lat: 30.5089, lng: 47.7858 },
  { name: "Zubayr",    nameAr: "الزبير",     city: "Basra",   cityAr: "البصرة", lat: 30.3822, lng: 47.7069 },
  { name: "Hayyaniya", nameAr: "الحيانية",   city: "Basra",   cityAr: "البصرة", lat: 30.5300, lng: 47.8200 },
  // Mosul
  { name: "Nabi Younis",nameAr: "نبي يونس", city: "Mosul",   cityAr: "الموصل", lat: 36.3292, lng: 43.1372 },
  { name: "Hadbaa",    nameAr: "الحدباء",    city: "Mosul",   cityAr: "الموصل", lat: 36.3700, lng: 43.1500 },
  // Erbil
  { name: "Ankawa",    nameAr: "عينكاوا",    city: "Erbil",   cityAr: "أربيل", lat: 36.2200, lng: 44.0000 },
  { name: "Iskan",     nameAr: "الإسكان",    city: "Erbil",   cityAr: "أربيل", lat: 36.1900, lng: 44.0100 },
  // Add Najaf, Karbala, Kirkuk, Sulaymaniyah, Duhok...
]
```

---

## 10. Backend API Routes

All routes are prefixed `/api/v1`. All protected routes require `Authorization: Bearer <token>`.

### Auth

```
POST /auth/send-otp
  Body: { phone: string }           // "+9647XXXXXXXX" format
  Response: { success: true }

POST /auth/verify-otp
  Body: { phone: string, code: string }
  Response: { token: string, user: User, isNewUser: boolean }
```

### Users

```
GET  /users/me
  Response: { user: User & { district: District } }

PUT  /users/me
  Body: { name?, city?, districtId?, address?, fcmToken? }
  Response: { user: User }
```

### Shops

```
POST /shops
  Body: { name, offersRepair, offersParts, offersTowing, carMakes, carYearMin, carYearMax,
          repairCategories, partsCategories, deliveryAvailable,
          repairRadiusKm, partsRadiusKm, towingRadiusKm, partsNationwide,
          city, districtId, address }
  Response: { shop: Shop }

GET  /shops/me
  Response: { shop: Shop }

PUT  /shops/me
  Body: { ...any shop fields }
  Response: { shop: Shop }
```

### Posts

```
POST /posts
  Body: {
    serviceType: "REPAIR" | "PARTS" | "TOWING",
    repairCategory?, partsCategory?,
    conditionNew?, conditionUsed?,
    carMake?, carModel?, carYear?,
    deliveryNeeded?,
    towingFromLat?, towingFromLng?, towingFromAddress?, towingToAddress?, urgency?,
    districtId?, lat?, lng?,
    description: string,
    photoUrls: string[]
  }
  Response: { post: Post }

GET  /posts/mine
  Response: { posts: (Post & { bids: (Bid & { shop: Shop })[] })[] }

DELETE /posts/:id
  Response: { success: true }
```

### Feed (shop only)

```
GET  /feed
  Query: { serviceType?: "REPAIR"|"PARTS"|"TOWING", page?: number, limit?: number }
  Response: { posts: (Post & { distanceKm: number, bids: Bid[] })[] }
  Note: Filtered server-side by shop profile. See Section 11 for algorithm.
```

### Bids

```
POST /posts/:postId/bids
  Body: {
    priceEstimate: number,         // IQD
    appointmentDate?: string,      // ISO date
    appointmentTime?: string,      // "11:00 AM"
    estimatedQty?: number,
    durationUnit?: "hours"|"days",
    deliveryDate?: string,
    deliveryWindow?: string,       // "12pm-3pm"
    message: string
  }
  Response: { bid: Bid }

PUT  /bids/:id
  Body: { ...any bid fields }      // Edit a pending bid
  Response: { bid: Bid }

DELETE /bids/:id
  Response: { success: true }      // Withdraw a pending bid

POST /bids/:id/accept
  Response: { bid: Bid, chatThread: ChatThread }
  Note: Only the post owner can call this. Sets bid to ACCEPTED,
        post to ACCEPTED, creates ChatThread, notifies shop.

GET  /bids/mine
  Response: { bids: (Bid & { post: Post })[] }
  Note: Shop-only. Returns all bids placed by this shop.
```

### Chat

```
GET  /threads
  Response: { threads: (ChatThread & { bid: Bid, lastMessage: Message })[] }

GET  /threads/:id/messages
  Query: { page?: number, limit?: number }
  Response: { messages: Message[] }

POST /threads/:id/messages
  Body: { content: string }
  Response: { message: Message }
  Note: Also emits via Socket.io to the thread room.
```

### Uploads

```
POST /uploads/photo
  Body: multipart/form-data with field "photo"
  Response: { url: string }         // Cloudflare R2 CDN URL
  Limits: max 2MB, image types only, max 3 per post (enforced client-side)
```

### Districts

```
GET  /districts
  Query: { city?: string }
  Response: { districts: District[] }
```

---

## 11. Feed Filter Algorithm

The shop feed is filtered entirely on the server. Shops only see posts that match all of the following criteria:

```typescript
// api/src/routes/feed.ts

async function getShopFeed(shopId: string, serviceTypeFilter?: string) {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: { user: { include: { district: true } } }
  })
  if (!shop) throw new Error("Shop not found")

  // Fetch all active, non-expired posts
  const posts = await prisma.post.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { gt: new Date() },
      ...(serviceTypeFilter ? { serviceType: serviceTypeFilter } : {})
    },
    include: { district: true, user: true, bids: true }
  })

  const shopDistrict = shop.user.district
  const results = []

  for (const post of posts) {
    // 1. Shop must offer this service type
    if (post.serviceType === "REPAIR" && !shop.offersRepair) continue
    if (post.serviceType === "PARTS"  && !shop.offersParts)  continue
    if (post.serviceType === "TOWING" && !shop.offersTowing) continue

    // 2. Car make must match (if post specifies a make)
    if (post.carMake && shop.carMakes.length > 0) {
      if (!shop.carMakes.includes(post.carMake)) continue
    }

    // 3. Car year must be in range (if post specifies year)
    if (post.carYear) {
      if (shop.carYearMin && post.carYear < shop.carYearMin) continue
      if (shop.carYearMax && post.carYear > shop.carYearMax) continue
    }

    // 4. Category match
    if (post.serviceType === "REPAIR" && post.repairCategory) {
      if (!shop.repairCategories.includes(post.repairCategory)) continue
    }
    if (post.serviceType === "PARTS" && post.partsCategory) {
      if (!shop.partsCategories.includes(post.partsCategory)) continue
    }

    // 5. Distance check
    // Parts nationwide: bypass distance entirely
    if (post.serviceType === "PARTS" && shop.partsNationwide) {
      results.push({ ...post, distanceKm: null })
      continue
    }

    // No location data on either side: show the post anyway
    if (!post.lat || !post.lng || !shopDistrict) {
      results.push({ ...post, distanceKm: null })
      continue
    }

    const dist = haversineKm(
      { lat: shopDistrict.lat, lng: shopDistrict.lng },
      { lat: post.lat,         lng: post.lng }
    )

    const radius = post.serviceType === "REPAIR" ? shop.repairRadiusKm
                 : post.serviceType === "PARTS"  ? shop.partsRadiusKm
                 : shop.towingRadiusKm

    if (dist > radius) continue

    results.push({ ...post, distanceKm: parseFloat(dist.toFixed(1)) })
  }

  // Sort: towing posts first (urgency), then by createdAt desc
  results.sort((a, b) => {
    if (a.serviceType === "TOWING" && b.serviceType !== "TOWING") return -1
    if (b.serviceType === "TOWING" && a.serviceType !== "TOWING") return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return results
}
```

### Best bid ranking (owner's home screen)

On the owner's My Posts screen, bids are sorted by a "Best match" score. The top-ranked bid gets the green card and "Best" badge.

```typescript
function scoreBid(bid: Bid, allBids: Bid[]): number {
  const prices = allBids.map(b => b.priceEstimate)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)

  // Normalize price: lowest price = 1.0, highest = 0.0
  const priceScore = maxPrice === minPrice ? 1
    : 1 - (bid.priceEstimate - minPrice) / (maxPrice - minPrice)

  // Rating score (0-1)
  const ratingScore = bid.shop.rating / 5

  // Availability score: sooner is better
  const today = Date.now()
  const apptTime = bid.appointmentDate ? new Date(bid.appointmentDate).getTime() : today + 7 * 86400000
  const daysUntil = Math.max(0, (apptTime - today) / 86400000)
  const availScore = Math.max(0, 1 - daysUntil / 7)

  // Weighted final score
  return (priceScore * 0.5) + (ratingScore * 0.3) + (availScore * 0.2)
}
```

---

## 12. Geolocation & Distance System

### Haversine formula

```typescript
// app/src/utils/haversine.ts  (same code used in backend)
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function toRad(deg: number) { return deg * (Math.PI / 180) }
```

### How district matching works

1. Both users and shops select a **district** during signup
2. Each district has a stored **lat/lng centroid** (pre-seeded in DB)
3. When a post is created, the post stores the **district's lat/lng centroid**
4. When filtering the feed, the server calculates `haversineKm(shop.district, post.district)`
5. If `distance <= shop.serviceRadius[serviceType]` → post is shown
6. This is an approximation — good enough for marketplace matching in Iraqi city districts
7. No live GPS tracking for repair/parts — no battery drain, no permission needed during browsing

### GPS for towing (only case requiring real GPS)

```typescript
// app/src/components/towing-map.ts
import { Geolocation } from '@capacitor/geolocation'

async function detectLocation() {
  const permission = await Geolocation.requestPermissions()
  if (permission.location !== 'granted') {
    // Fall back to manual entry
    return
  }

  const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true })
  const { latitude, longitude } = position.coords

  // Reverse geocode using Nominatim (free, no API key)
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
    { headers: { 'Accept-Language': 'ar,en' } }
  )
  const data = await response.json()
  const address = data.display_name

  // Show on Leaflet map with draggable pin
  initMap(latitude, longitude, address)
}

function initMap(lat: number, lng: number, address: string) {
  const map = L.map('towing-map').setView([lat, lng], 15)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

  const marker = L.marker([lat, lng], { draggable: true }).addTo(map)

  // Update address when pin is dragged
  marker.on('dragend', async (e) => {
    const { lat, lng } = e.target.getLatLng()
    // Re-reverse-geocode
  })
}
```

---

## 13. Push Notifications

### Firebase FCM Setup

```typescript
// api/src/services/fcm.ts
import admin from 'firebase-admin'

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!)
  )
})

export async function sendPush(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  highPriority = false
) {
  return admin.messaging().send({
    token: fcmToken,
    notification: { title, body },
    data,
    android: { priority: highPriority ? 'high' : 'normal' },
    apns: {
      payload: { aps: { sound: 'default', badge: 1 } },
      headers: highPriority ? { 'apns-priority': '10' } : {}
    }
  })
}
```

### When to send push notifications

| Event | Who receives | Priority | Timing |
|-------|-------------|----------|--------|
| New bid on your post | Car owner | Normal | Immediate |
| Bid accepted | Shop | Normal | Immediate |
| New message in chat | Other party | Normal | Immediate |
| New post in your feed area (repair/parts) | Shops | Normal | Batched (max 1 per 15 min per shop) |
| New towing post nearby | Shops with towing | **High** | Immediate, no batching |

### Towing notification logic

```typescript
// When a TOWING post is created:
async function notifyTowingShops(post: Post) {
  const shops = await prisma.shop.findMany({
    where: { offersTowing: true, user: { fcmToken: { not: null } } },
    include: { user: { include: { district: true } } }
  })

  for (const shop of shops) {
    if (!shop.user.district || !post.lat || !post.lng) continue

    const dist = haversineKm(
      { lat: shop.user.district.lat, lng: shop.user.district.lng },
      { lat: post.lat, lng: post.lng }
    )

    if (dist <= shop.towingRadiusKm) {
      await sendPush(
        shop.user.fcmToken!,
        '🚗 Urgent towing needed nearby',
        `Someone needs a tow in your area — ${dist.toFixed(1)} km from you`,
        { postId: post.id, type: 'TOWING' },
        true  // high priority
      )
    }
  }
}
```

### Register FCM token on app launch

```typescript
// app/src/services/notifications.ts
import { PushNotifications } from '@capacitor/push-notifications'

export async function initPushNotifications() {
  const perm = await PushNotifications.requestPermissions()
  if (perm.receive !== 'granted') return

  await PushNotifications.register()

  PushNotifications.addListener('registration', async ({ value: token }) => {
    await api.put('/users/me', { fcmToken: token })
  })

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    // App is in foreground — show in-app banner
  })

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    // User tapped notification — navigate to relevant screen
    const { postId, threadId, type } = action.notification.data
    if (threadId) navigate(`/chat/${threadId}`)
    else if (postId) navigate(`/posts/${postId}`)
  })
}
```

---

## 14. Real-time Chat (Socket.io)

### Server

```typescript
// api/src/socket/chat.ts
import { Server } from 'socket.io'
import { verifyJWT } from '../middleware/auth'

export function initSocket(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    const user = verifyJWT(token)
    if (!user) return next(new Error('Unauthorized'))
    socket.data.userId = user.id
    next()
  })

  io.on('connection', (socket) => {
    // Join a thread room
    socket.on('join-thread', (threadId: string) => {
      socket.join(threadId)
    })

    socket.on('send-message', async ({ threadId, content }) => {
      const message = await prisma.message.create({
        data: { threadId, content, senderId: socket.data.userId }
      })

      // Broadcast to all in room (both parties)
      io.to(threadId).emit('new-message', message)

      // Send push to the other party
      // ... fetch other party's fcmToken, call sendPush()
    })

    socket.on('mark-read', async ({ threadId }) => {
      await prisma.message.updateMany({
        where: { threadId, senderId: { not: socket.data.userId }, readAt: null },
        data: { readAt: new Date() }
      })
      socket.to(threadId).emit('messages-read', { threadId })
    })
  })
}
```

### Client

```typescript
// app/src/services/socket.ts
import { io, Socket } from 'socket.io-client'

let socket: Socket

export function connectSocket(token: string) {
  socket = io(process.env.API_URL!, { auth: { token } })
}

export function joinThread(threadId: string) {
  socket.emit('join-thread', threadId)
}

export function sendMessage(threadId: string, content: string) {
  socket.emit('send-message', { threadId, content })
}

export function onNewMessage(callback: (message: Message) => void) {
  socket.on('new-message', callback)
}
```

---

## 15. File & Photo Uploads

```typescript
// api/src/services/r2.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuid } from 'uuid'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  }
})

export async function uploadPhoto(buffer: Buffer, mimeType: string): Promise<string> {
  const key = `posts/${uuid()}.jpg`

  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }))

  return `${process.env.R2_PUBLIC_URL}/${key}`
}
```

**Client-side photo handling:**
1. User selects photo (camera or gallery via @capacitor/camera)
2. Client compresses to max 1200px width, 80% JPEG quality before upload
3. POST to `/uploads/photo` with multipart/form-data
4. Server uploads to R2, returns CDN URL
5. URL is stored in `post.photoUrls[]`
6. Max 3 photos per post (enforced client-side — once 3 uploaded, upload buttons disappear)
7. Max 2MB per photo after compression

---

## 16. Screen-by-Screen UI Spec

> **Visual reference:** Open `fixit_car_owner.html` for car owner screens and `fixit_shop.html` for shop screens. Both files show every screen in English and Iraqi Arabic side by side at 2x zoom.

---

### 16A — Car Owner Screens

#### Splash Screen
- Full-screen dark green (`#1B4332`) background
- Centered white card (icon container) with wrench SVG icon
- App name "Fix It" (EN) / "صلّح" (AR) in white, weight 500
- Tagline below in white at 60% opacity
- Auto-navigates to Enter Number after 2 seconds (or tap to skip)

#### Enter Number
- WhatsApp logo in green rounded square, 24×24px
- "Welcome" / "أهلاً وسهلاً" heading
- Subtitle explaining code will come via WhatsApp
- Country code picker: 🇮🇶 +964 (pre-filled, Iraqi flag)
- Phone number input: `direction: ltr` always (even in AR mode)
- "Send code on WhatsApp" button: disabled until valid number length (10 digits after +964)
- Hint text below button

#### OTP Screen
- 6 individual digit boxes in a row, always `direction: ltr`
- Green tint (`#D8F3DC`) + green border on filled boxes
- Auto-advances focus on each digit entered
- Auto-submits when all 6 filled
- Verify button disabled until all 6 entered
- Resend link: disabled with countdown (60s), then enabled as tappable text
- Error state: boxes shake and clear on wrong code

#### Account Type Selection
- "I am a..." / "أنا..." heading
- Two large cards stacked:
  - **Car owner** — selected by default (green border + green tint bg)
  - **Shop / Workshop** — unselected (grey border + grey bg)
- Tapping a card selects it (only one can be active)
- Continue button text updates based on selection
- Selecting Shop proceeds to shop signup flow (Steps 1–7)
- Selecting Car Owner proceeds to owner details

#### Owner Details (Step 1 of 2)
- Name field (free text input)
- City dropdown (Baghdad, Basra, Mosul, Erbil, Najaf, Karbala, Kirkuk, other)
- Progress bar: 1/2 filled

#### Owner Location (Step 2 of 2)
- District search + chip picker:
  - Search bar at top (filters chips client-side, no API call)
  - "Popular" chips shown as quick picks (top 6–8 districts for selected city)
  - Scrollable chip grid for all districts
  - Single-select only (one district)
- Optional home address free-text field
- Hint below address: "Used as default location for towing posts — can change per post"
- "Finish setup" button → navigate to My Posts home screen
- Progress bar: 2/2 filled

#### My Posts (Owner Home Screen)
- Header: "My Posts" / "طلباتي" + user avatar (initials, green circle) top right (EN) / left (AR)
- Each active post is shown as an expanded card:
  - Delete (X) icon top-left (EN) / top-right (AR)
  - Service type + category tag top-right (EN) / top-left (AR): e.g., "Repair · Engine"
  - Car details: Make Model Year
  - Post description
  - Bottom row: "X hrs left" + bid count with green dot
  - Below that: bids listed in order (best bid first):
    - Best bid: green tinted card, "Best" badge (top-left EN / top-right AR), price, shop name, short message, Accept + Message buttons
    - Other bids: grey cards, same structure, lighter styling
- Empty state: "No active posts — tap + to post your first request"
- When posts exist but no bids yet: "Waiting for bids..." below post
- "Need something else? Tap + to post" hint text at bottom
- Nav bar: My Posts (active) · New Post (FAB center) · Inbox · Profile

#### Create Post — Shared header
- Back arrow (CL) top-left + "Create post" / "إنشاء طلب" title + "Post" / "نشر" button top-right
- Three-card type selector: Repair / Parts / Towing (selected = green border + green tint bg)
- Switching type updates the form fields below immediately

#### Create Post — Repair
- Type selector: Repair selected
- Repair type chip grid (single-select): Engine · Brakes · Electrical · AC · Tyres · Suspension · Body & Paint · Transmission · Exhaust · Oil & Fluids · Other
- When "Other" selected: text input appears below chips with label "Describe what you need repaired"
- Car details: Make dropdown → Model dropdown (populated based on make) → Year dropdown
- Description textarea (max 300 chars, counter shown bottom-right)
- Photos: up to 3, shown as thumbnail squares with X to remove. Empty slots shown as dashed boxes with camera icon
- Footer: "Post & start receiving bids" button + "Auto-deletes after 48 hours" hint

#### Create Post — Parts
- Type selector: Parts selected
- Part category chip grid (single-select): Engine parts · Brakes · Filters · Electrical · Suspension · Body parts · Tyres · AC parts · Exhaust · Other
- When "Other" selected: text input appears below chips
- Part condition (multi-select chips — user can pick both): **New** / **Used**
- Car details: Make / Model / Year dropdowns
- Description textarea (max 300 chars)
- Photos: up to 3
- Delivery needed: Yes / No chips (single-select)
- Footer: Post button + hint

#### Create Post — Towing
- Type selector: Towing selected
- "Your location" label
- Map placeholder showing OpenStreetMap via Leaflet.js
- GPS auto-detect: on page load, request location permission → getCurrentPosition → drop pin on map → reverse geocode → show address below map
- Address label below map (auto-filled): e.g., "Palestine St, Baghdad"
- "Change location" link (small, green) — allows re-detecting or typing manually
- "Drag pin to adjust" hint text
- "Tow to" optional free-text input: "Enter destination..."
- Notes textarea
- Urgency chips (single-select): ASAP / Within the hour
- Footer: "Post & get bids" button (no auto-delete hint — towing is urgent)

#### Chat Screen (Owner)
- Header: shop name + post type details + "Accepted" green badge
- Chat thread: shop messages on left (bubble-in style), owner messages on right (bubble-out style)
- "Bid accepted · Today HH:MMam" system message at top of thread
- Message input bar: text field + send button (round, dark green)
- Real-time: Socket.io, new messages appear instantly
- Timestamps below each message, read receipts (✓✓) on sent messages

#### Owner Profile
- Dark green header with user avatar (initials circle), name, phone
- Settings rows: Notifications · Language · City · District · Address
- Links: Privacy policy · Terms of service
- Log out (red text)
- Nav: My Posts · New Post (FAB) · Inbox · Profile (active)

---

### 16B — Shop / Workshop Screens

#### Shop Account Type Selection
- Same OTP flow as owner
- On account type screen: Shop / Workshop card is selected (green border)
- Continue → Shop signup Step 1

#### Shop Signup — Step 1: What do you offer?
- "What do you offer?" / "شنو تقدم؟" heading
- Progress bar: 1/6
- Three service type cards stacked (multi-select):
  - Repair — icon + description: "Fix cars at your workshop"
  - Parts — icon + description: "Sell spare parts"
  - Towing — icon + description: "Roadside tow service"
- Selected: green border + green tint bg + filled green checkbox top-right (EN) / top-left (AR)
- Unselected: grey border + grey bg + empty checkbox
- At least one must be selected to continue
- Note below: "You'll set up categories for each service in the next steps"
- Continue button

#### Shop Signup — Step 2: Car Makes & Year Range
- Selected makes shown as green chips at top (with X to remove)
- "Popular in Iraq" section: Toyota, Kia, Hyundai, Nissan, Honda, GMC, Isuzu, Mitsubishi, Suzuki, Chevrolet
- Divider
- "All brands" — search bar + scrollable chip grid (all car brands)
- Multi-select
- Year range: two dropdowns "From: YYYY" and "To: YYYY" (1990–2026)
- Footer: "X selected · Clear all" + Continue (disabled until ≥1 make selected)

#### Shop Signup — Step 3: Repair Categories (if repair selected)
- Chip grid: Engine · Brakes · Electrical · AC · Tyres · Suspension · Body & Paint · Transmission · Exhaust · Oil & Fluids · Other
- Multi-select
- Continue

#### Shop Signup — Step 4: Parts Categories (if parts selected)
- Chip grid: Engine parts · Brakes · Filters · Electrical · Suspension · Body parts · Tyres · AC parts · Exhaust · Other
- Multi-select
- Below categories: "Delivery available?" — Yes / No chips
- Continue

#### Shop Signup — Step 5: Shop Location
- City dropdown
- District search + chip picker (single-select)
- Shop address free-text field (optional but encouraged)
- "Helps customers know exactly where you are" hint
- Continue

#### Shop Signup — Step 6: Service Area
- "Your service area" heading
- **Important green info banner:** "Controls which customer requests appear in your feed — not what you post"
- One collapsible section per selected service type:
  - **Repair:** Slider 1–50 km, default 15 km. Distance badge shows current value dynamically.
  - **Parts:** Toggle "Show requests from all of Iraq / Ship nationwide". When ON: slider hidden, green confirmation text shown. When OFF: slider 1–50 km, default 20 km.
  - **Towing:** Slider 1–30 km (tighter max), default 8 km. Hint: "Only show towing requests close enough to reach quickly"
- Continue → Review

#### Shop Signup — Step 7: Review & Confirm
- Summary table of all selections
- "Create my shop profile" button

#### Shop Feed (Home Screen)
- Header: shop type label + shop name + filter icon (with green dot when active) + avatar
- Type filter tabs: All · Repair · Parts · Towing (only shows types the shop offers)
- Post cards in feed:
  - User avatar (initials) + name + time posted + city/district + distance badge ("3.2 km")
  - Service type tag + subcategory (e.g., "Repair · Engine") + "New" green badge or "Bid sent" blue badge
  - Car chip (make, model, year) — if repair/parts post
  - Description (truncated to ~2 lines)
  - Bottom row: "X bids · Xh left" + "Place bid" button (or "Edit bid" if bid already placed)
  - Cards where bid already submitted: slightly dimmed
  - Towing posts: shown at top, red urgency indicator
- Nav: Feed (active) · My Bids · Inbox · Profile

#### Place Bid — Repair
- Post summary card at top (green tint): service type, car, user name, description
- Price estimate input (IQD): large numeric input, always `direction: ltr`
- "Can adjust after inspection" hint
- Estimated time: number input + Hours/Days dropdown
- Appointment date: calendar month picker
  - Past dates disabled, greyed
  - Today: green border
  - Selected: dark green fill
  - Arabic calendar: week starts Saturday (س ح ن ث ر خ ج)
- Appointment time: dropdown (8am–8pm in 1-hour slots)
- Message to customer: textarea (500 char limit)
- Submit bid button

#### Place Bid — Parts
- Same as repair but:
  - No "Estimated time" field
  - "Delivery date" instead of "Appointment date"
  - "Delivery window" dropdown instead of time: 9am–12pm · 12pm–3pm · 3pm–6pm · 6pm–9pm

#### My Bids
- Three sections:
  1. **Waiting for response** — pending bids. Each card shows: service type tag, car details, price, "Pending" status dot + label, short message preview. Edit + Withdraw buttons.
  2. **Accepted** — green border cards. "Message customer" CTA button.
  3. **Closed / not selected** — dimmed cards (post expired, or another bid was accepted). No action buttons.
- Nav: Feed · My Bids (active) · Inbox · Profile

#### Shop Chat
- Same as owner chat, mirrored:
  - Shop messages on right (bubble-out), customer messages on left (bubble-in)
  - Same Socket.io real-time

#### Shop Profile
- Dark green header: shop name + avatar, phone, city, star rating + review count
- Stats row: Bids won · Reviews · Rating
- Three editable category sections (each with "Edit" link):
  1. Car makes & year range
  2. Repair categories
  3. Parts categories
- Settings rows: Towing On/Off · Delivery On/Off · Notifications · Language
- Log out (red)
- Tapping "Edit" on any category section opens the same chip picker used during signup

---

## 17. Localization & i18n

### Setup

```typescript
// app/src/i18n/index.ts
const LOCALE_KEY = 'app_locale'

export function getLocale(): 'en' | 'ar-iq' {
  return (localStorage.getItem(LOCALE_KEY) || 'ar-iq') as 'en' | 'ar-iq'
}

export function setLocale(locale: 'en' | 'ar-iq') {
  localStorage.setItem(LOCALE_KEY, locale)
  document.documentElement.dir = locale === 'ar-iq' ? 'rtl' : 'ltr'
  document.documentElement.lang = locale === 'ar-iq' ? 'ar' : 'en'
  // Trigger re-render
}
```

### Iraqi Arabic specifics

- **Currency:** Iraqi Dinar — display as `380,000 د.ع` (Western numerals for amounts, abbreviation after)
- **Numbers in UI labels:** Use Arabic-Indic numerals (١ ٢ ٣) for things like bid counts and step numbers
- **Numbers in inputs/prices/phone:** Always use Western numerals (1 2 3), always `direction: ltr`
- **Calendar:** Week starts **Saturday** (not Sunday or Monday — Gulf/Iraq convention)
- **Time:** 12-hour format with ص (AM) / م (PM)
- **Date format:** day/month/year
- **Dialect words used in UI:** شنو (what), بسرعة (ASAP), صبح الباجر (tomorrow morning), تابع (continue), اقبل (accept)

### RTL layout rules

- Apply `direction: rtl` to root `<html>` element for Arabic
- Flexbox automatically mirrors in RTL — use it for all row layouts
- Use CSS logical properties: `padding-inline-start`, `margin-inline-end`
- Phone number inputs: always `dir="ltr"` regardless of app language
- Price inputs: always `dir="ltr"` regardless of app language
- Chat bubbles: sent = right side, received = left side (regardless of language)
- Icon positions mirror: chevron that points right (→) in LTR points left (←) in RTL

---

## 18. Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fixit

# JWT
JWT_SECRET=your_long_random_secret_here
JWT_EXPIRES_IN=30d

# Infobip 2FA WhatsApp — see Docs/fixit_auth_infobip.md
INFOBIP_BASE_URL=
INFOBIP_API_KEY=
INFOBIP_APP_ID=
INFOBIP_MSG_ID=
INFOBIP_SENDER=

# Firebase (Push notifications)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}

# Cloudflare R2 (Photo storage)
R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_BUCKET_NAME=fixit-photos
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev

# App
PORT=3000
API_URL=https://api.yourapp.com
APP_URL=https://yourapp.com
```

---

## 19. Cursor AI Instructions

> **Read this carefully before starting any code.**

### How to use this document with Cursor

1. Drop this file (`fixit_implementation_guide.md`) into your project root
2. Open `fixit_car_owner.html` and `fixit_shop.html` in a browser — these are your visual references for every screen
3. In Cursor, open this `.md` file so the AI has it in context
4. Use the prompts below to guide Cursor through the build

### Project setup prompt

```
Build the Fix It / صلّح app following fixit_implementation_guide.md.
The visual UI reference for car owner screens is in fixit_car_owner.html.
The visual UI reference for shop screens is in fixit_shop.html.

Tech stack:
- Mobile: Capacitor + TypeScript
- Backend: Node.js + Fastify + PostgreSQL + Prisma
- Real-time: Socket.io
- Auth: JWT + Infobip 2FA (WhatsApp OTP)
- Push: Firebase FCM
- Storage: Cloudflare R2
- Maps: Leaflet.js + OpenStreetMap (towing screen only)

Start by:
1. Setting up the Fastify backend project structure
2. Running Prisma schema migrations (schema in Section 9 of the guide)
3. Seeding the districts table (Section 9 of the guide)
4. Implementing auth routes (Section 10)
```

### Key things to tell Cursor explicitly

- **Shops never post** — they only bid. The shop has no "Create post" button. Their home screen IS the feed.
- **Owners never see a public feed** — their home screen is "My Posts" showing their own posts + incoming bids.
- **The feed filter runs server-side** — see Section 11 for the full algorithm.
- **Photos upload to Cloudflare R2** before being attached to the post. Upload happens immediately when user picks a photo, not on post submit.
- **GPS is only used for towing posts** — not for repair or parts. Use `@capacitor/geolocation` on the towing create post screen only.
- **The "Other" chip** looks identical to all other chips. No special styling. Selecting it reveals a free-text input below the chip grid.
- **Part condition is multi-select** — user can pick New, Used, or both. There is no "Either" option.
- **RTL direction** is applied at the root `<html>` level and cascades. Only price inputs and phone inputs explicitly override with `dir="ltr"`.
- **Post auto-expiry** — run a cron job every 5 minutes that sets `status = EXPIRED` for posts where `expiresAt < NOW() AND status = ACTIVE`.
- **Best bid ranking** — when displaying bids on the owner's My Posts screen, sort by the score formula in Section 11. Top bid gets the green card + "Best" badge.
- **Towing push notifications are high-priority and immediate** — no batching. All towing shops within radius get notified the moment a towing post is created.
- **Calendar for AR locale** — week starts Saturday (س ح ن ث ر خ ج), not Sunday.

### Suggested build order

```
Phase 1 — Backend foundation
  1. Project setup, Fastify, Prisma, PostgreSQL
  2. District seed data
  3. Auth routes (send-otp, verify-otp, JWT)
  4. User + Shop CRUD routes
  5. Post CRUD routes
  6. Feed route with filter algorithm
  7. Bid routes
  8. Photo upload to R2
  9. Chat routes + Socket.io
  10. FCM push notifications
  11. Post expiry cron job

Phase 2 — Mobile app
  1. Capacitor project setup
  2. Auth screens (splash, number, OTP, account type)
  3. Owner signup (details, location)
  4. My Posts home screen
  5. Create post screens (Repair, Parts, Towing with GPS)
  6. Owner chat
  7. Owner profile
  8. Shop signup (6 steps)
  9. Shop feed
  10. Place bid screens
  11. My Bids
  12. Shop chat
  13. Shop profile
  14. RTL / i18n pass
  15. Push notification registration
```

### Design tokens for Cursor

Tell Cursor to use these exact color values throughout:

```
Primary dark green:  #1B4332
Primary mid green:   #40916C
Primary light green: #D8F3DC
Repair tag:          bg #D8F3DC, text #1B4332
Parts tag:           bg #E8F0FE, text #1A5FC8
Towing tag:          bg #FFF8E6, text #B07A00
App background:      #F4F4F2
Surface (cards):     #FFFFFF
Danger:              #EF4444
Warning / stars:     #F59E0B
```

---

*Document version: 2.0 — April 2026*
*App: Fix It / صلّح — Car services bid marketplace — Iraq*
*Developer: Yousif (solo)*
