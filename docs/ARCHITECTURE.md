# Architecture & Technical Design

Overview of ZIP Explorer's architecture, design patterns, and component hierarchy.

## High-Level Architecture

ZIP Explorer follows a privacy-first, client-side architecture with optional cloud integration:

**Browser Layer**: React components handle UI (tree view, editor, preview system). ZIP Engine (JSZip) parses files in-memory with no server uploads.

**Local Storage**: Favorites and recents persist in browser localStorage only.

**Optional Cloud**: Firebase, Google Drive, Dropbox, OpenNAS can be enabled by users.

## State Management

ZIP Explorer uses React hooks for state:

```typescript
// File selection and tree expansion
const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

// User preferences
const [favorites, setFavorites] = useState<Set<string>>(new Set());
const [editorTabs, setEditorTabs] = useState<EditorTab[]>([]);

// Persist to localStorage
useEffect(() => {
  localStorage.setItem('favorites', JSON.stringify(Array.from(favorites)));
}, [favorites]);

// Sync to cloud (optional)
useEffect(() => {
  if (user) saveFavoritesToCloud(Array.from(favorites));
}, [favorites, user]);
```

## Component Structure

- **ZipExplorer** - Main shell, state management
- **Toolbar** - Upload, search, export, theme toggle
- **Sidebar** - Favorites, recents, storage selector
- **TreeView** - Hierarchical file browser with drag-and-drop
- **Breadcrumbs** - Path navigation
- **QuickLook** - Preview pane (text, image, audio, video, hex)
- **CodeEditor** - Text editing with syntax highlighting
- **MarkdownPreview** - GFM rendering with live preview
- **AnnotationEditor** - Canvas-based image markup
- **Inspector** - File metadata display

## Data Structures

```typescript
interface FileEntry {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  compressedSize: number;
  mimeType: string;
  lastModified: Date;
  children?: FileEntry[];
}

interface EditorTab {
  id: string;
  fileId: string;
  fileName: string;
  content: string;
  isDirty: boolean;
  language: string;
}

interface Annotation {
  type: 'pen' | 'rectangle' | 'circle' | 'text' | 'eraser';
  color: string;
  strokeWidth: number;
  points: Array<{ x: number; y: number }>;
}
```

## Performance Optimizations

- **Virtualization** - Tree view and search results use windowing
- **Lazy Loading** - Previews load on demand
- **Chunked Processing** - Large ZIPs processed in 64KB chunks
- **Memoization** - Components memoized to prevent re-renders
- **Image Optimization** - Scaled before preview, EXIF stripped
- **Code Splitting** - Optional features loaded dynamically

## Security Architecture

- **Input Validation** - All file paths sanitized against zip-slip
- **File Size Limits** - Enforced per file type (5MB text, 50MB image, 500MB total ZIP)
- **Content Escaping** - HTML and markdown sanitized before display
- **HTTPS Only** - All communication encrypted (TLS 1.3)
- **No Execution** - ZIP contents never executed as code
- **Optional Encryption** - Client-side AES-256 for cloud uploads

## API Routes (Optional)

If using server-side features:
- `POST /api/zip/parse` - Parse large ZIP files server-side
- `GET/POST /api/auth/*` - OAuth callbacks and sessions
- `GET/POST /api/files/*` - Cloud storage operations
- `POST /api/preview/generate` - Image thumbnail generation

## Deployment Architecture

- **Static Hosting** - Vercel, Netlify, S3 (front-end only)
- **Docker** - Self-hosted with optional API backend
- **Kubernetes** - Enterprise scaling with load balancing
- **Edge Functions** - Serverless for optional API routes
- **CDN** - CloudFlare, CloudFront for global distribution

## Testing

- **Unit Tests** - ZIP parsing, file detection, path sanitization
- **Integration Tests** - Tree building, editor state, cloud sync
- **E2E Tests** - Full workflows (upload → edit → download)
- **Performance Tests** - Memory usage with large ZIPs

## Monitoring

- Optional Sentry for error tracking
- Browser DevTools performance profiling
- Custom debug logs with `console.log('[v0] ...')`
- Firebase Analytics (optional)
- Server logs for self-hosted deployments

## Future Improvements

- Web Workers for background ZIP processing
- SharedArrayBuffer for faster data transfer
- Service Workers for offline support
- IndexedDB for persistent metadata cache
- P2P file sharing with WebRTC
- Collaborative editing with real-time sync
