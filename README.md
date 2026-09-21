# Tiyende — Zambia's Transport Super-App

Tiyende ("Let's Go" in Nyanja) is a full-stack ride-hailing, food ordering, parcel delivery and cargo platform built for the Zambian market. It is built with **React Native + Expo** and **Firebase** and runs on both Android and iOS.

---

## Features

### Passenger
| Feature | Description |
|---|---|
| **Ride booking** | Book standard, Boda Boda (motorcycle), Comfort, or XL rides |
| **Upfront fare** | Fixed fare shown before you confirm — no surprises |
| **Multiple stops** | Add a via-stop to your trip |
| **Food ordering** | Order from registered restaurants and OSM-discovered restaurants |
| **Parcel delivery** | Send parcels across Lusaka |
| **Cargo** | Book for larger moves |
| **Live tracking** | Real-time driver position on OpenStreetMap |
| **In-app chat** | Message your driver during the trip |
| **Data call** | Video/audio call via WebRTC |
| **Trip receipt** | Full receipt shown automatically after each completed trip |
| **Saved Home/Work** | Tap once to book to your saved home or work address |
| **Quick destinations** | Airport, UTH, East Park Mall, UNZA — one tap |
| **Promo codes** | `TIYENDE10` = 10% off first ride |
| **Dark mode** | Full dark theme across the whole app |
| **Multiple payment methods** | Mobile Money, Cash, Wallet, Card |

### Driver
| Feature | Description |
|---|---|
| **Live request feed** | See pending ride, food, delivery and cargo requests |
| **One-tap accept** | Accept any request instantly |
| **Navigate button** | Opens Google Maps / Apple Maps with destination pre-filled |
| **Trip chat** | Message passenger and restaurant during a job |
| **Earnings dashboard** | Today's earnings, trip count, and star rating |
| **Online / Offline toggle** | Go online or offline with one button |
| **Trip status flow** | Pending → Accepted → Arrived → In Progress → Complete |

### Restaurant Owner
| Feature | Description |
|---|---|
| **Menu management** | Add, edit, and delete food items with photos |
| **Live orders** | Real-time order dashboard with status updates |
| **Discounts** | Create and manage coupon codes |
| **Open/Closed toggle** | Instantly go online or take a break |
| **Restaurant profile** | Logo, cuisine type, and location |
| **Order chat** | Talk to delivery drivers in real time |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81.5 + Expo ~54 (managed workflow) |
| Auth | Firebase Authentication (email/phone) |
| Database | Cloud Firestore (users, requests, restaurants, menus) |
| Realtime | Firebase Realtime Database (driver GPS location) |
| Storage | Firebase Storage (profile photos, food images) |
| Maps | OpenStreetMap via react-native-maps UrlTile (no API key needed) |
| Navigation | React Navigation v7 (Stack + Bottom Tabs) |
| UI | Custom design system (theme.js — colors, shadows, radius) |
| State | React Context (AppContext for dark mode, promos) |

---

## Project Structure

```
Tiyende/
├── App.js                      # Root — role-based navigator routing
├── firebase.js                 # Firebase app init (Auth, Firestore, RTDB, Storage)
├── theme.js                    # Design tokens (colors, shadows, radius)
├── app.json                    # Expo config (icons, permissions, bundle IDs)
├── eas.json                    # EAS Build profiles (development / preview / production)
│
├── navigation/
│   ├── AuthNavigator.js        # Login, onboarding, driver/restaurant setup
│   ├── MainNavigator.js        # Passenger tabs (Home, Food, Delivery, Cargo, Profile)
│   ├── DriverNavigator.js      # Driver tabs (Dashboard, Earnings, Settings)
│   └── RestaurantNavigator.js  # Restaurant tabs (Orders, Menu, Discounts, Profile)
│
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.js
│   │   ├── OnboardingSelector.js   # Choose: Ride / Driver / Restaurant
│   │   ├── DriverOnboarding.js     # Vehicle details step
│   │   └── RestaurantOnboarding.js # Restaurant name, location step
│   ├── passenger/
│   │   ├── HomeScreen.js           # Booking, tracking, receipt, saved places
│   │   ├── FoodScreen.js           # Restaurant list + menu + food orders
│   │   ├── DeliveryScreen.js
│   │   ├── CargoScreen.js
│   │   └── ProfileScreen.js
│   ├── driver/
│   │   ├── DriverDashboard.js      # Request feed + active trip + navigate
│   │   ├── EarningsScreen.js
│   │   └── DriverSettings.js
│   ├── restaurant/
│   │   ├── RestaurantDashboard.js  # Live order board
│   │   ├── MenuScreen.js
│   │   ├── AddMenuItemScreen.js
│   │   ├── DiscountsScreen.js
│   │   └── RestaurantProfileScreen.js
│   └── shared/
│       ├── TripChatScreen.js
│       ├── DataCallScreen.js
│       └── RestaurantChatScreen.js
│
├── services/
│   ├── requestService.js       # Ride/delivery/food request CRUD + watchers
│   ├── restaurantService.js    # Restaurant profile, menus, discounts, orders
│   └── profileService.js       # User profile + photo upload (Firebase Storage)
│
├── utils/
│   └── geo.js                  # LUSAKA_PLACES, RIDE_TYPES, fare calc, distance
│
├── hooks/
│   └── useUserProfile.js
├── context/
│   └── AppContext.js           # Dark mode, promo state
└── components/
    ├── LoadingScreen.js
    └── ProfilePhotoButton.js
```

---

## Ride Types & Fare Model

| Type | Base Fare | Per KM | Multiplier | Seats |
|---|---|---|---|---|
| Standard | ZK 28 | ZK 8 | 1.0× | 4 |
| Boda Boda | ZK 15 | ZK 5 | 0.65× | 1 |
| Comfort | ZK 28 | ZK 8 | 1.25× | 4 |
| XL | ZK 28 | ZK 8 | 1.55× | 6 |

Delivery: ZK 25 base + ZK 7/km. Cargo: ZK 75 base + ZK 16/km.

---

## User Roles & Account Flow

```
Sign Up → OnboardingSelector
  ├── Passenger  → role: 'passenger'   → MainNavigator
  ├── Driver     → role: 'driver_pending' → DriverOnboarding → role: 'driver' → DriverNavigator
  └── Restaurant → role: 'restaurant_pending' → RestaurantOnboarding → role: 'restaurant' → RestaurantNavigator
```

> **Note:** Existing passenger accounts go directly to the passenger home screen. To try the restaurant or driver portal, sign up with a new account and choose the role during onboarding.

---

## Firebase Collections

| Collection | Purpose |
|---|---|
| `users/{uid}` | Profile, role, vehicleType, savedPlaces, driverOnline |
| `serviceRequests/{id}` | All ride/food/delivery/cargo requests |
| `restaurants/{uid}` | Restaurant profile (name, cuisine, logo, isOpen) |
| `restaurants/{uid}/menu/{id}` | Menu items with name, price, photo, available |
| `restaurants/{uid}/discounts/{id}` | Promo codes and discount percentages |
| RTDB `drivers/{uid}/location` | Live GPS coordinates (updated every few seconds) |

---

## Running Locally

```bash
# Install dependencies
npm install

# Start the dev server
npx expo start

# Android
npx expo start --android

# iOS (macOS only, requires Xcode)
npx expo start --ios
```

---

## Installing on iPhone — Two Ways

### Option 1: Expo Go (Free, Instant — best for testing)

1. Install **Expo Go** from the App Store on your iPhone
2. Make sure your iPhone and PC are on the **same Wi-Fi network**
3. On your PC, run: `npx expo start`
4. A QR code will appear in the terminal
5. Open the **Camera** app on your iPhone and scan the QR code
6. The app opens inside Expo Go — full functionality works

> This works right now with no Apple Developer account needed.

### Option 2: EAS Build — Compiled .ipa (Requires Apple Developer Account)

EAS Build compiles your app on Expo's cloud servers (macOS) and produces a real `.ipa` file you can distribute.

#### Prerequisites
- [Expo account](https://expo.dev) (free)
- Apple Developer account ($99/year) — needed to sign the app for device installation
- EAS CLI installed globally

#### Steps

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Log in to your Expo account
eas login

# 3. Connect your project to Expo
eas init

# 4. Build for iOS (preview = installable via TestFlight or direct link)
eas build --platform ios --profile preview

# EAS will ask for your Apple ID and create provisioning profiles automatically.
# The build runs in Expo's cloud — takes 10–20 minutes.
# When done, you get a download link for the .ipa file.
```

#### Installing the .ipa on your iPhone

After the build completes:
1. Go to [expo.dev/builds](https://expo.dev/builds) and find your build
2. Click **"Install"** — this sends a link to your device
3. Open the link on your iPhone and follow the prompts
4. Go to **Settings → General → VPN & Device Management** → trust the developer certificate
5. Open Tiyende from your home screen

> For distribution to others without the App Store, use **TestFlight** (requires App Store Connect setup).

---

## Environment / Firebase Config

Firebase credentials are in `firebase.js`. To use your own Firebase project:

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password, Phone)
3. Enable Firestore Database
4. Enable Realtime Database
5. Enable Storage
6. Copy your config object into `firebase.js`

**Firestore Security Rules (minimum for development):**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Storage Security Rules:**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Known Limitations (Trial Version)

- GPS pickup is fixed to Lusaka city centre — real GPS integration is the next step
- Payment is UI-only — no live mobile money gateway connected
- Phone OTP requires Firebase phone auth setup and test phone numbers
- Driver location on passenger's map updates on trip status change, not continuous GPS

---

## Developer

**Frackson Banda** — bmikala0@gmail.com  
Built with Claude Code · Expo SDK 57 · Firebase v12
