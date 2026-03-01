# Cloud Storage Integration Guide

ZIP Explorer supports multiple cloud storage backends for saving and loading ZIP files. All integrations are optional and require configuration via environment variables.

## Google Drive

### Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Go to APIs & Services > Library
4. Enable "Google Drive API"
5. Go to APIs & Services > Credentials
6. Click "Create Credentials" > "OAuth 2.0 Client ID"
7. Application type: "Web application"
8. Add authorized redirect URI: `https://your-domain.com/api/auth/google/callback`
9. Copy the Client ID

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### How It Works

- Uses OAuth 2.0 implicit flow (client-side, no server secret needed)
- Requests `drive.file` scope (access only to files created by the app)
- Files are stored in the user's Google Drive under a "ZIP Explorer" folder
- Supports list, download, upload, and delete operations

### Scopes

| Scope | Purpose |
|-------|---------|
| `drive.file` | Access files created by the app only |

## Dropbox

### Setup

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click "Create app"
3. Choose "Scoped access" > "Full Dropbox" (or "App folder")
4. Name your app
5. Under Settings, add redirect URI: `https://your-domain.com/api/auth/dropbox/callback`
6. Copy the App key

```env
NEXT_PUBLIC_DROPBOX_APP_KEY=your-app-key
```

### How It Works

- Uses OAuth 2.0 implicit flow
- Files are stored in the user's Dropbox
- Supports list, download, upload, and delete operations

## WebDAV (OpenNAS, NextCloud, ownCloud, Synology, QNAP)

### Overview

WebDAV is a standard protocol supported by most NAS devices and self-hosted cloud storage. ZIP Explorer's WebDAV provider works with:

- **NextCloud** / **ownCloud**: Popular self-hosted cloud platforms
- **OpenNAS**: Open-source NAS management
- **Synology DSM**: Synology NAS devices
- **QNAP QTS**: QNAP NAS devices
- **Apache/Nginx**: Any server with WebDAV enabled

### NextCloud Setup

1. Enable WebDAV in your NextCloud instance (enabled by default)
2. Your WebDAV URL is: `https://your-nextcloud.com/remote.php/dav/files/USERNAME/`
3. Use your NextCloud username and password (or an app password)

```env
NEXT_PUBLIC_WEBDAV_URL=https://your-nextcloud.com/remote.php/dav/files/username/
NEXT_PUBLIC_WEBDAV_USERNAME=your-username
NEXT_PUBLIC_WEBDAV_PASSWORD=your-app-password
```

### OpenNAS / Generic NAS Setup

1. Enable WebDAV on your NAS device
2. Configure HTTPS (strongly recommended)
3. Create a dedicated user for ZIP Explorer access

```env
NEXT_PUBLIC_WEBDAV_URL=https://192.168.1.100:5006/webdav/
NEXT_PUBLIC_WEBDAV_USERNAME=zipexplorer
NEXT_PUBLIC_WEBDAV_PASSWORD=your-password
```

### Synology Setup

1. Go to Control Panel > File Services > WebDAV
2. Enable HTTPS WebDAV
3. Note the port (default: 5006)

```env
NEXT_PUBLIC_WEBDAV_URL=https://your-synology.local:5006/
NEXT_PUBLIC_WEBDAV_USERNAME=your-username
NEXT_PUBLIC_WEBDAV_PASSWORD=your-password
```

### QNAP Setup

1. Go to Control Panel > Network & File Services > WebDAV
2. Enable WebDAV
3. Set up HTTPS

```env
NEXT_PUBLIC_WEBDAV_URL=https://your-qnap.local:8081/
NEXT_PUBLIC_WEBDAV_USERNAME=your-username
NEXT_PUBLIC_WEBDAV_PASSWORD=your-password
```

### Self-Hosted WebDAV with Apache

```apache
<VirtualHost *:443>
    ServerName webdav.example.com

    DocumentRoot /var/www/webdav
    <Directory /var/www/webdav>
        Dav On
        AuthType Basic
        AuthName "WebDAV"
        AuthUserFile /etc/apache2/.htpasswd
        Require valid-user
    </Directory>

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/webdav.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/webdav.example.com/privkey.pem
</VirtualHost>
```

### Self-Hosted WebDAV with Nginx

```nginx
server {
    listen 443 ssl;
    server_name webdav.example.com;

    ssl_certificate /etc/letsencrypt/live/webdav.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/webdav.example.com/privkey.pem;

    root /var/www/webdav;
    client_max_body_size 500M;

    location / {
        dav_methods PUT DELETE MKCOL COPY MOVE;
        dav_ext_methods PROPFIND OPTIONS;
        dav_access user:rw group:rw all:r;
        create_full_put_path on;

        auth_basic "WebDAV";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}
```

## S3-Compatible Storage (MinIO, AWS S3)

While not built-in, you can use S3-compatible storage by setting up a WebDAV proxy:

1. Install [minio-gateway](https://min.io/) or use AWS S3 directly
2. Set up a WebDAV proxy (e.g., [rclone serve webdav](https://rclone.org/commands/rclone_serve_webdav/))
3. Point ZIP Explorer's WebDAV URL to the proxy

```bash
# Using rclone as a WebDAV bridge to S3
rclone serve webdav s3:your-bucket --addr :8080 --user admin --pass secret
```

```env
NEXT_PUBLIC_WEBDAV_URL=http://localhost:8080/
NEXT_PUBLIC_WEBDAV_USERNAME=admin
NEXT_PUBLIC_WEBDAV_PASSWORD=secret
```

## Security Considerations

- **HTTPS**: Always use HTTPS for cloud connections (especially WebDAV with Basic auth)
- **App Passwords**: Use app-specific passwords instead of main account passwords
- **Scoped Access**: Google Drive uses `drive.file` scope (app-created files only)
- **CORS**: Ensure your WebDAV server allows CORS from your app's domain
- **Credentials**: Never commit `.env.local` to version control

## Architecture

All cloud providers implement the `CloudProvider` interface in `lib/cloud-providers.ts`:

```typescript
interface CloudProvider {
  name: string;
  isConfigured(): boolean;
  authenticate(): Promise<boolean>;
  listFiles(folderId?: string): Promise<CloudFile[]>;
  downloadFile(fileId: string): Promise<ArrayBuffer>;
  uploadFile(name: string, data: ArrayBuffer | Blob): Promise<CloudFile>;
  deleteFile(fileId: string): Promise<void>;
}
```

This makes it straightforward to add new providers by implementing the interface.
