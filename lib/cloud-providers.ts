/**
 * Cloud storage provider interfaces and implementations.
 * Supports Google Drive, Dropbox, and WebDAV (OpenNAS/NextCloud).
 * All providers follow the same interface for consistent integration.
 */

export interface CloudFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedAt: string;
  path: string;
}

export interface CloudProvider {
  name: string;
  icon: string;
  isConfigured(): boolean;
  authenticate(): Promise<boolean>;
  listFiles(folderId?: string): Promise<CloudFile[]>;
  downloadFile(fileId: string): Promise<ArrayBuffer>;
  uploadFile(name: string, data: ArrayBuffer | Blob, folderId?: string): Promise<CloudFile>;
  deleteFile(fileId: string): Promise<void>;
}

// ── Google Drive Provider ────────────────────────────────────────────

export class GoogleDriveProvider implements CloudProvider {
  name = "Google Drive";
  icon = "drive";
  private clientId: string;
  private accessToken: string | null = null;

  constructor() {
    this.clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  }

  isConfigured(): boolean {
    return Boolean(this.clientId);
  }

  async authenticate(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    // OAuth 2.0 implicit flow for client-side
    return new Promise((resolve) => {
      const redirectUri = `${window.location.origin}/api/auth/google/callback`;
      const scope = "https://www.googleapis.com/auth/drive.file";
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}`;
      const popup = window.open(authUrl, "google-auth", "width=500,height=600");
      const listener = (event: MessageEvent) => {
        if (event.data?.type === "google-auth-success") {
          this.accessToken = event.data.token;
          window.removeEventListener("message", listener);
          resolve(true);
        }
      };
      window.addEventListener("message", listener);
      // Timeout after 2 minutes
      setTimeout(() => {
        window.removeEventListener("message", listener);
        if (popup && !popup.closed) popup.close();
        resolve(false);
      }, 120000);
    });
  }

  async listFiles(folderId?: string): Promise<CloudFile[]> {
    if (!this.accessToken) throw new Error("Not authenticated");
    const q = folderId ? `'${folderId}' in parents` : "'root' in parents";
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,modifiedTime)`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
    const data = await res.json();
    return (data.files || []).map((f: { id: string; name: string; mimeType: string; size?: string; modifiedTime?: string }) => ({
      id: f.id, name: f.name, mimeType: f.mimeType,
      size: parseInt(f.size || "0"), modifiedAt: f.modifiedTime || "", path: f.name,
    }));
  }

  async downloadFile(fileId: string): Promise<ArrayBuffer> {
    if (!this.accessToken) throw new Error("Not authenticated");
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
    return res.arrayBuffer();
  }

  async uploadFile(name: string, data: ArrayBuffer | Blob, folderId?: string): Promise<CloudFile> {
    if (!this.accessToken) throw new Error("Not authenticated");
    const metadata: Record<string, unknown> = { name };
    if (folderId) metadata.parents = [folderId];
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", data instanceof Blob ? data : new Blob([data]));
    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime",
      { method: "POST", headers: { Authorization: `Bearer ${this.accessToken}` }, body: form }
    );
    const f = await res.json();
    return { id: f.id, name: f.name, mimeType: f.mimeType, size: parseInt(f.size || "0"), modifiedAt: f.modifiedTime || "", path: f.name };
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.accessToken) throw new Error("Not authenticated");
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${this.accessToken}` },
    });
  }
}

// ── Dropbox Provider ─────────────────────────────────────────────────

export class DropboxProvider implements CloudProvider {
  name = "Dropbox";
  icon = "dropbox";
  private accessToken: string | null = null;
  private appKey: string;

  constructor() {
    this.appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY || "";
  }

  isConfigured(): boolean {
    return Boolean(this.appKey);
  }

  async authenticate(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    return new Promise((resolve) => {
      const redirectUri = `${window.location.origin}/api/auth/dropbox/callback`;
      const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${this.appKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token`;
      const popup = window.open(authUrl, "dropbox-auth", "width=500,height=600");
      const listener = (event: MessageEvent) => {
        if (event.data?.type === "dropbox-auth-success") {
          this.accessToken = event.data.token;
          window.removeEventListener("message", listener);
          resolve(true);
        }
      };
      window.addEventListener("message", listener);
      setTimeout(() => {
        window.removeEventListener("message", listener);
        if (popup && !popup.closed) popup.close();
        resolve(false);
      }, 120000);
    });
  }

  async listFiles(folderId?: string): Promise<CloudFile[]> {
    if (!this.accessToken) throw new Error("Not authenticated");
    const res = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: folderId || "" }),
    });
    const data = await res.json();
    return (data.entries || []).map((e: { id: string; name: string; size?: number; server_modified?: string; path_display?: string }) => ({
      id: e.id, name: e.name, mimeType: "application/octet-stream",
      size: e.size || 0, modifiedAt: e.server_modified || "", path: e.path_display || e.name,
    }));
  }

  async downloadFile(fileId: string): Promise<ArrayBuffer> {
    if (!this.accessToken) throw new Error("Not authenticated");
    const res = await fetch("https://content.dropboxapi.com/2/files/download", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Dropbox-API-Arg": JSON.stringify({ path: fileId }),
      },
    });
    return res.arrayBuffer();
  }

  async uploadFile(name: string, data: ArrayBuffer | Blob, folderId?: string): Promise<CloudFile> {
    if (!this.accessToken) throw new Error("Not authenticated");
    const path = folderId ? `${folderId}/${name}` : `/${name}`;
    const res = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Dropbox-API-Arg": JSON.stringify({ path, mode: "overwrite", autorename: true }),
        "Content-Type": "application/octet-stream",
      },
      body: data,
    });
    const e = await res.json();
    return { id: e.id, name: e.name, mimeType: "application/octet-stream", size: e.size || 0, modifiedAt: e.server_modified || "", path: e.path_display || name };
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.accessToken) throw new Error("Not authenticated");
    await fetch("https://api.dropboxapi.com/2/files/delete_v2", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ path: fileId }),
    });
  }
}

// ── WebDAV Provider (OpenNAS, NextCloud, ownCloud) ───────────────────

export class WebDAVProvider implements CloudProvider {
  name: string;
  icon = "server";
  private baseUrl: string;
  private username: string;
  private password: string;

  constructor(name = "NAS / WebDAV") {
    this.name = name;
    this.baseUrl = process.env.NEXT_PUBLIC_WEBDAV_URL || "";
    this.username = process.env.NEXT_PUBLIC_WEBDAV_USERNAME || "";
    this.password = process.env.NEXT_PUBLIC_WEBDAV_PASSWORD || "";
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl);
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {};
    if (this.username) {
      headers["Authorization"] = "Basic " + btoa(`${this.username}:${this.password}`);
    }
    return headers;
  }

  async authenticate(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const res = await fetch(this.baseUrl, {
        method: "PROPFIND",
        headers: { ...this.getHeaders(), Depth: "0" },
      });
      return res.ok || res.status === 207;
    } catch {
      return false;
    }
  }

  async listFiles(folderId?: string): Promise<CloudFile[]> {
    const url = folderId ? `${this.baseUrl}/${folderId}` : this.baseUrl;
    const res = await fetch(url, {
      method: "PROPFIND",
      headers: { ...this.getHeaders(), Depth: "1", "Content-Type": "application/xml" },
    });
    const text = await res.text();
    // Parse WebDAV XML response
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");
    const responses = xml.getElementsByTagNameNS("DAV:", "response");
    const files: CloudFile[] = [];
    for (let i = 1; i < responses.length; i++) {
      const href = responses[i].getElementsByTagNameNS("DAV:", "href")[0]?.textContent || "";
      const displayName = responses[i].getElementsByTagNameNS("DAV:", "displayname")[0]?.textContent || href.split("/").pop() || "";
      const contentLength = responses[i].getElementsByTagNameNS("DAV:", "getcontentlength")[0]?.textContent || "0";
      const lastModified = responses[i].getElementsByTagNameNS("DAV:", "getlastmodified")[0]?.textContent || "";
      const contentType = responses[i].getElementsByTagNameNS("DAV:", "getcontenttype")[0]?.textContent || "application/octet-stream";
      files.push({
        id: href, name: displayName, mimeType: contentType,
        size: parseInt(contentLength), modifiedAt: lastModified, path: href,
      });
    }
    return files;
  }

  async downloadFile(fileId: string): Promise<ArrayBuffer> {
    const url = fileId.startsWith("http") ? fileId : `${this.baseUrl}/${fileId}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    return res.arrayBuffer();
  }

  async uploadFile(name: string, data: ArrayBuffer | Blob, folderId?: string): Promise<CloudFile> {
    const path = folderId ? `${folderId}/${name}` : name;
    const url = `${this.baseUrl}/${path}`;
    await fetch(url, { method: "PUT", headers: this.getHeaders(), body: data });
    return { id: path, name, mimeType: "application/octet-stream", size: data instanceof Blob ? data.size : data.byteLength, modifiedAt: new Date().toISOString(), path };
  }

  async deleteFile(fileId: string): Promise<void> {
    const url = fileId.startsWith("http") ? fileId : `${this.baseUrl}/${fileId}`;
    await fetch(url, { method: "DELETE", headers: this.getHeaders() });
  }
}

// ── Provider factory ─────────────────────────────────────────────────

export function getAvailableProviders(): CloudProvider[] {
  const providers: CloudProvider[] = [];
  const gdrive = new GoogleDriveProvider();
  if (gdrive.isConfigured()) providers.push(gdrive);
  const dropbox = new DropboxProvider();
  if (dropbox.isConfigured()) providers.push(dropbox);
  const webdav = new WebDAVProvider();
  if (webdav.isConfigured()) providers.push(webdav);
  return providers;
}
