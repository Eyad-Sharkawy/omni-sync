# Omni Sync

Omni Sync is an Angular productivity app that combines a Kanban board and a Calendar view, with Firebase Authentication and Firestore persistence for signed-in users.

## Features

- Kanban boards with columns, tasks, drag-and-drop, and board management
- Calendar view synced from Kanban tasks
- Authentication:
  - Google sign-in (popup with redirect fallback)
  - Email/password sign-up and sign-in
  - Email verification flow
  - Password reset
  - Email link (passwordless) sign-in
- Data persistence strategy:
  - Signed-in users: Firestore (with local cache fallback)
  - Guests: localStorage

## Architecture Overview

```mermaid
flowchart TD
  UI[Angular UI: Navbar / Sidebar / Kanban / Calendar] --> Store[KanbanStore]
  Store --> Auth[Auth Service]
  Store --> Storage[Storage Service]

  Auth --> FirebaseAuth[Firebase Authentication]
  Storage --> Firestore[(Firestore kanban/{uid})]
  Storage --> LocalCache[(localStorage cache)]

  FirebaseAuth --> Rules[Auth + Firestore Rules]
  Firestore --> Rules
```

## Tech Stack

- Angular 21
- Angular CDK
- AngularFire + Firebase Auth + Firestore
- FullCalendar
- Tailwind CSS

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Run locally

```bash
npm start
```

App runs at `http://localhost:4200`.

## Scripts

- `npm start` - Start dev server
- `npm run build` - Generate environment file from env vars (if present), then build
- `npm run watch` - Build in watch mode
- `npm run test` - Run tests
- `npm run lint` - Run lint checks
- `npm run format` - Format code
- `npm run check-all` - Format + lint

## Environment Configuration

This app expects Firebase web config under `environment.firebaseConfig`.

For local development, keep:
- `src/environments/environment.ts`
- `src/environments/environment.development.ts`

For CI/Vercel builds, `set-env.js` can generate `src/environments/environment.ts` from:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MEASUREMENT_ID`

If these vars are missing, generation is skipped and existing files are used.

## Firestore Rules (Recommended)

Current data model stores one document per user in `kanban/{uid}`.

Use:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /kanban/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Firebase Auth Setup Checklist

Enable in Firebase Console -> Authentication -> Sign-in method:

- Google
- Email/Password
- Email link (passwordless)
- Phone (optional; requires billing for real SMS)

Also ensure:
- Authorized domains include `localhost` and your production domain
- Verification and reset email templates are configured

## Deploying to Vercel

1. Import the repo into Vercel
2. Add the Firebase environment variables listed above
3. Deploy

Build command is already configured via npm:

```bash
npm run build
```

## Troubleshooting

- `Could not resolve ../environments/environment`
  - Ensure `src/environments/environment.ts` exists in repo or env generation runs before build.

- `auth/popup-blocked`
  - Browser blocked popup; app falls back to redirect flow.

- Firestore empty but app has data
  - App may be using local fallback due to Firestore permission issues.
  - Verify Firestore rules and check browser console for `permission-denied`.

## Notes on Security

Firebase web config values in frontend (`apiKey`, `authDomain`, etc.) are not admin secrets. Security is enforced by:

- Firestore/Storage Security Rules
- Auth checks
- App Check (recommended)

Never commit admin credentials or service account keys.
