# Firebase Integration Guide

## Overview

Firebase provides optional authentication and cloud sync for ZIP Explorer. When configured, users can:
- Sign in with Google, GitHub, or email/password
- Sync favorites, recents, and preferences across devices
- Store files in Firebase Cloud Storage

When Firebase is NOT configured, the app works entirely offline with localStorage.

## Setup

### 1. Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click "Add project"
3. Name it (e.g., "zip-explorer")
4. Disable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Authentication

1. Go to Authentication > Sign-in method
2. Enable the providers you want:
   - **Google**: Click Enable, add your support email
   - **GitHub**: Click Enable, add your GitHub OAuth App credentials
   - **Email/Password**: Click Enable
3. Go to Authentication > Settings > Authorized domains
4. Add your production domain

### 3. Create Firestore Database

1. Go to Firestore Database > Create database
2. Choose "Start in production mode"
3. Select a location close to your users

#### Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. Configure Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456
```

## Architecture

### File: `lib/firebase.ts`
Initializes the Firebase app, Auth, Firestore, and Storage instances. Only runs when environment variables are present. All exports are `null` when unconfigured.

### File: `lib/firebase-auth.ts`
Authentication methods: `signInWithGoogle()`, `signInWithGitHub()`, `signInWithEmail()`, `createAccount()`, `signOut()`. All methods return `null` when Firebase is not configured.

### File: `lib/firestore-sync.ts`
Syncs user preferences (favorites, recents, theme, panel sizes) to Firestore. Uses the document path `users/{userId}/preferences/main`. All writes include a `serverTimestamp()` for conflict resolution.

### File: `lib/use-auth.ts`
React hook that provides `{ user, loading, isConfigured }`. Uses `onAuthStateChanged` for real-time auth state. Returns `null` user when Firebase is not configured.

## Data Model

```
firestore/
  users/
    {userId}/
      preferences/
        main {
          favorites: FavoriteItem[]
          recentPaths: string[]
          theme: "light" | "dark" | "system"
          sidebarWidth: number
          previewWidth: number
          parseMode: "client" | "server"
          updatedAt: Timestamp
        }
```

## GitHub OAuth Setup

1. Go to [github.com/settings/applications/new](https://github.com/settings/applications/new)
2. Set "Homepage URL" to your app URL
3. Set "Authorization callback URL" to: `https://your-project.firebaseapp.com/__/auth/handler`
4. Copy the Client ID and Client Secret
5. In Firebase Console > Authentication > GitHub, paste both values

## Offline Support

Firebase Firestore has built-in offline persistence. When enabled, user preferences are cached locally and synced when connectivity is restored. This is handled automatically by the Firestore SDK.

## Cost Considerations

Firebase free tier (Spark plan) includes:
- 50K auth operations/month
- 1 GiB Firestore storage
- 50K Firestore reads/day, 20K writes/day
- 5 GB Cloud Storage

This is sufficient for most personal and small team use cases.
