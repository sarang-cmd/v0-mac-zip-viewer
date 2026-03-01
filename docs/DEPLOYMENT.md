# Deployment Guide

## Vercel (Recommended)

The fastest way to deploy ZIP Explorer.

1. Push your repository to GitHub
2. Visit [vercel.com/new](https://vercel.com/new) and import the repo
3. Add environment variables in the Vercel dashboard (optional)
4. Click Deploy

Vercel automatically detects Next.js and configures the build. No additional setup needed.

```bash
# Or deploy via CLI
npx vercel
```

### Environment Variables on Vercel

Go to Project Settings > Environment Variables and add any needed variables from `.env.example`.

## Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
pnpm build
netlify deploy --prod --dir=.next
```

Add a `netlify.toml`:

```toml
[build]
  command = "pnpm build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

## Docker

### Dockerfile

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

```bash
# Build and run
docker build -t zip-explorer .
docker run -p 3000:3000 zip-explorer
```

### Docker Compose

```yaml
version: '3.8'
services:
  zip-explorer:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.local
    restart: unless-stopped
```

## Self-Hosted with Nginx

```bash
# Build the app
pnpm build

# Start with PM2
npm install -g pm2
pm2 start pnpm --name "zip-explorer" -- start
```

Nginx reverse proxy configuration:

```nginx
server {
    listen 80;
    server_name zipexplorer.example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name zipexplorer.example.com;

    ssl_certificate /etc/letsencrypt/live/zipexplorer.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zipexplorer.example.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Increase body size for ZIP uploads (server mode)
    client_max_body_size 500M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets caching
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

## Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zip-explorer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: zip-explorer
  template:
    metadata:
      labels:
        app: zip-explorer
    spec:
      containers:
      - name: zip-explorer
        image: your-registry/zip-explorer:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: zip-explorer
spec:
  selector:
    app: zip-explorer
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: zip-explorer
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "500m"
spec:
  rules:
  - host: zipexplorer.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: zip-explorer
            port:
              number: 80
```

## AWS (EC2 + ALB)

1. Launch an EC2 instance (t3.small or larger)
2. Install Node.js 20 and pnpm
3. Clone the repo, install dependencies, and build
4. Set up PM2 for process management
5. Configure an Application Load Balancer with HTTPS
6. Point your domain to the ALB

```bash
# On EC2
sudo yum install -y nodejs
npm install -g pnpm pm2

git clone https://github.com/sarang-cmd/v0-mac-zip-viewer.git
cd v0-mac-zip-viewer
pnpm install
pnpm build
pm2 start pnpm --name "zip-explorer" -- start
pm2 save
pm2 startup
```

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure HTTPS with valid SSL certificate
- [ ] Set up rate limiting (Nginx, Cloudflare, or application-level)
- [ ] Add security headers (CSP, HSTS, X-Frame-Options)
- [ ] Configure backup strategy for any persistent storage
- [ ] Set up monitoring (Sentry, Datadog, or similar)
- [ ] Test ZIP upload limits match your Nginx/proxy configuration
- [ ] Review and set appropriate Firebase security rules if using Firebase
