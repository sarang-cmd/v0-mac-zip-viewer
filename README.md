# ZIP Explorer

A macOS Finder-inspired ZIP file browser, editor, and converter built with Next.js, React, and TypeScript. Features Quick Look previews, syntax-highlighted code editing, file conversion, image annotation, and optional cloud storage integration.

## Features

### Core
- **ZIP Browsing**: Drag-and-drop or file picker to open ZIP files
- **File Tree**: Collapsible tree view with disclosure triangles, sorting (folders first), and breadcrumb navigation
- **Quick Look Preview**: Inline preview for text, images, audio, video, Markdown, and hex dumps
- **Code Editor**: Syntax-highlighted editing with tabs, find/replace, line numbers, word wrap, and JSON formatting
- **File Converter**: Convert between JSON/YAML/CSV/XML/HTML/Markdown/PNG/JPEG/WebP
- **Image Annotation**: Draw, highlight, add shapes and text to images (Markup-inspired)
- **Export**: Tree JSON, flat JSON, and manifest export with per-extension histograms
- **Download Updated ZIP**: Repack with all edits, conversions, and new files

### UI/UX
- **macOS Design Language**: Frosted glass toolbar, translucent sidebar, vibrancy effects, noise texture overlays
- **Dark Mode**: System, light, and dark themes with macOS-accurate contrast
- **Draggable Dividers**: Resizable sidebar, preview, and inspector panels
- **Keyboard Shortcuts**: Cmd/Ctrl+S to save, Cmd/Ctrl+F to find, Escape to dismiss
- **Context Menus**: Right-click for Copy Path, Export Subtree, Reveal in Tree, Add to Favorites, Open in Editor, Convert File
- **Favorites & Recents**: Stored locally in browser (privacy note in sidebar)

### Integrations (Optional)
- **Firebase**: Authentication (Google, GitHub, email), Firestore sync, Cloud Storage
- **Google Drive**: OAuth 2.0 file storage
- **Dropbox**: API-based file storage
- **WebDAV**: OpenNAS, NextCloud, ownCloud, Synology, QNAP

## Quick Start

```bash
# Clone the repository
git clone https://github.com/sarang-cmd/v0-mac-zip-viewer.git
cd v0-mac-zip-viewer

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and drop a ZIP file.

## Documentation

| Document | Description |
|----------|-------------|
| [SETUP.md](docs/SETUP.md) | Installation, fonts, environment config, development workflow |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy to Vercel, Netlify, Docker, Kubernetes, self-hosted |
| [FIREBASE.md](docs/FIREBASE.md) | Firebase auth, Firestore sync, Cloud Storage setup |
| [CLOUD_STORAGE.md](docs/CLOUD_STORAGE.md) | Google Drive, Dropbox, WebDAV/NAS integration |
| [PRIVACY.md](docs/PRIVACY.md) | Privacy-first design, GDPR/CCPA, security measures |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Component hierarchy, state management, data flow |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + S` | Save current file in editor |
| `Cmd/Ctrl + F` | Open find/replace in editor |
| `Escape` | Close find bar, context menu, or panels |
| `Enter` | Expand/collapse folder in tree |
| `Arrow keys` | Navigate tree items |

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS 3.4 with custom macOS design tokens
- **ZIP Engine**: JSZip (client-side, in-memory)
- **Icons**: Lucide React (MIT, SF Symbols-like aesthetic)
- **Theme**: next-themes with system preference detection
- **Auth**: Firebase Authentication (optional)
- **Cloud**: Google Drive API, Dropbox API, WebDAV protocol

## Project Structure

```
app/
  layout.tsx          # Root layout with ThemeProvider
  page.tsx            # Main page rendering ZipExplorer
  globals.css         # macOS design tokens, vibrancy, animations
  api/zip/parse/      # Server-side ZIP parsing endpoint
components/
  zip-explorer.tsx    # Main shell (state management hub)
  toolbar.tsx         # Upload, search, export, theme controls
  sidebar.tsx         # Favorites, recents, file type filters
  tree-view.tsx       # Hierarchical file browser
  breadcrumbs.tsx     # Path navigation
  inspector.tsx       # File metadata panel
  context-menu.tsx    # Right-click menu
  search-results.tsx  # Filtered file list
  drop-zone.tsx       # Drag-and-drop landing
  converter-panel.tsx # File format conversion UI
  preview/            # Quick Look viewers (text, image, audio, video, hex)
  editor/             # Code editor, Markdown preview, annotation tool
  auth/               # Login button (optional Firebase)
lib/
  types.ts            # TypeScript interfaces and constants
  zip-engine.ts       # Client-side ZIP parsing and mutation
  zip-parser.ts       # Server-side ZIP parsing
  export-utils.ts     # JSON/manifest export builders
  syntax-highlight.ts # Zero-dependency syntax tokenizer
  file-converter.ts   # Format conversion engine
  firebase.ts         # Firebase initialization
  firebase-auth.ts    # Authentication methods
  firestore-sync.ts   # Cloud preference sync
  cloud-providers.ts  # Google Drive, Dropbox, WebDAV
  use-auth.ts         # Auth state hook
docs/                 # All documentation
```

## License

MIT
