# Privacy & Security

## Privacy-First Architecture

ZIP Explorer is designed with privacy as a core principle. By default, all file processing happens entirely in your browser.

### Default Mode: Local Processing

- ZIP files are parsed **client-side** using JSZip in the browser
- File contents never leave your device
- No data is sent to any server
- No analytics, tracking, or telemetry by default

### Server Mode (Optional)

- When "Server" parse mode is selected, the ZIP is uploaded to the Next.js API route
- The file is processed in-memory and immediately discarded
- No files are written to disk on the server
- No logs contain file contents

### Local Storage

Favorites and recents are stored in `localStorage` in the browser:
- Data never leaves the device
- Clearing browser data removes all stored preferences
- A privacy note is displayed in the sidebar when data is stored

### Cloud Sync (Optional)

When Firebase is configured and a user signs in:
- Only **metadata** is synced (favorites, recents, theme preferences)
- File contents are never uploaded to Firebase
- Users can sign out at any time to stop syncing
- All synced data can be deleted by the user

## Security Measures

### ZIP Processing

- **Zip-slip protection**: All file paths are validated against directory traversal attacks. Paths containing `..` segments that escape the root are rejected.
- **Size limits**: Maximum ZIP size of 500 MB, maximum 50,000 entries, maximum 10 MB per file preview
- **Entry validation**: All paths are normalized and validated before processing

### Content Display

- **HTML sanitization**: Markdown rendering uses `rehype-sanitize` to strip dangerous HTML
- **No execution**: ZIP contents (JavaScript, HTML) are never executed in the browser
- **Text encoding**: Files are decoded as UTF-8 with graceful fallback
- **Image rendering**: Images are displayed via object URLs, not inline data URIs in HTML context

### Authentication (Firebase)

- OAuth 2.0 with industry-standard providers (Google, GitHub)
- No passwords stored by the application (delegated to Firebase Auth)
- Session tokens managed by Firebase SDK with automatic refresh
- Email/password auth uses Firebase's built-in password hashing (bcrypt variant)

### Cloud Storage

- Google Drive: Uses `drive.file` scope (access only to app-created files)
- Dropbox: Uses scoped access tokens
- WebDAV: Always use HTTPS to protect Basic auth credentials
- All credentials stored in environment variables, never in client code

## GDPR Compliance

### Data Collection

| Data Type | Stored Where | Purpose | Retention |
|-----------|-------------|---------|-----------|
| Favorites | localStorage | Quick access | Until cleared |
| Recents | localStorage | Navigation history | Until cleared |
| Theme preference | localStorage | UI preference | Until cleared |
| Auth token | Firebase | Authentication | Until sign-out |
| User preferences | Firestore | Cloud sync | Until deleted |

### User Rights

- **Access**: Users can view all stored data in browser DevTools > Application > localStorage
- **Deletion**: Clear localStorage, or sign out and delete Firebase account
- **Portability**: Export preferences as JSON via the export menu
- **Consent**: No data collection without user action (signing in, adding favorites)

### No Tracking

- No Google Analytics by default
- No third-party tracking scripts
- No fingerprinting
- No cookies except Firebase auth session (when configured)

## CCPA Compliance

- No personal information is sold
- No personal information is shared with third parties
- Users can request deletion of all cloud-stored data

## HIPAA / SOC 2 Considerations

For regulated environments:
- Use local-only mode (no cloud features)
- Deploy on-premises with Docker or Kubernetes
- Enable HTTPS with TLS 1.3
- Configure Content Security Policy headers
- Disable server-side parsing if file confidentiality is critical
- Audit all environment variables and access logs

## Content Security Policy

Recommended CSP headers for production:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  media-src 'self' blob:;
  connect-src 'self' https://*.googleapis.com https://*.dropboxapi.com https://*.firebaseio.com;
  font-src 'self';
  frame-src 'self' https://accounts.google.com;
```

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:
1. Do not open a public GitHub issue
2. Email the maintainer directly
3. Include steps to reproduce, impact assessment, and suggested fix
4. Allow reasonable time for a fix before public disclosure
