# Setup Guide

## Prerequisites

- Node.js 18+ (recommended: 20 LTS)
- pnpm 8+ (or npm/yarn)
- Git

## Installation

```bash
git clone https://github.com/sarang-cmd/v0-mac-zip-viewer.git
cd v0-mac-zip-viewer
pnpm install
```

## Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

All environment variables are **optional**. The app works fully offline by default. See `.env.example` for all available options with inline documentation.

### Minimal Setup (No Cloud)

No `.env.local` needed. Just run `pnpm dev`.

### With Firebase Auth

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Google, GitHub, and/or Email providers)
3. Create a Firestore database
4. Copy your web app config into `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### With Cloud Storage

See [CLOUD_STORAGE.md](CLOUD_STORAGE.md) for Google Drive, Dropbox, and WebDAV/NAS setup.

## Font Configuration

ZIP Explorer uses the macOS system font stack by default:

```css
font-family: "SF Pro Text Local", "SF Pro Display Local", -apple-system,
  BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

### Optional: Local San Francisco Fonts

If you have licensed SF Pro font files, place them in `public/fonts/san-francisco/`:

```
public/fonts/san-francisco/
  SF-Pro-Display-Regular.woff2
  SF-Pro-Display-Medium.woff2
  SF-Pro-Display-Semibold.woff2
  SF-Pro-Text-Regular.woff2
  SF-Pro-Text-Medium.woff2
  SF-Pro-Text-Semibold.woff2
```

The `@font-face` rules in `globals.css` will automatically pick them up. If the files are missing, the browser falls back gracefully to system fonts with no visual breakage.

**Important**: Do not commit SF Pro font files to the repository. Apple's fonts are proprietary. Add `public/fonts/san-francisco/` to `.gitignore`.

## Development

```bash
# Start dev server with Turbopack
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint
```

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

The app requires modern browser APIs: `File`, `ArrayBuffer`, `Blob`, `URL.createObjectURL`, `backdrop-filter`. All are supported in the browsers listed above.

## Troubleshooting

### ZIP file won't open
- Ensure the file is a valid `.zip` archive (not `.rar`, `.7z`, etc.)
- Check the file size is under 500 MB (configurable via `MAX_ZIP_SIZE` in `zip-engine.ts`)
- Try switching between "Local" and "Server" parse modes in the toolbar

### Fonts look different on Windows/Linux
- This is expected. The app uses system fonts that match macOS on Mac, Segoe UI on Windows, and Roboto/system on Linux
- To get SF Pro on non-Mac, legally obtain the fonts and place them in `public/fonts/san-francisco/`

### Firebase auth not working
- Verify all 6 Firebase environment variables are set in `.env.local`
- Check that your Firebase project has the auth providers enabled
- Ensure your domain is in the authorized domains list in Firebase Console

### Dark mode not applying
- The app respects your OS preference by default
- Toggle manually using the sun/moon icon in the toolbar
- `suppressHydrationWarning` on `<html>` and `<body>` prevents hydration mismatches with `next-themes`
