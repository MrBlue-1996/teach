# 8. Deployment Guide

## Overview

Deploy TopShelf Teaching MCP Server to various environments with confidence.

## Prerequisites

- Node.js 20+ installed
- TypeScript compiler
- Port 3000 available (or configure custom port)

## Local Development

```bash
cd implementations/mcp-server
pnpm install
pnpm run dev
```

Server runs with hot-reload on `http://localhost:3000`

## Production Build

```bash
cd implementations/mcp-server
pnpm install --prod
pnpm run build
pnpm start
```

## Environment Variables

```bash
# .env file
PORT=3000                    # Server port
NODE_ENV=production          # Environment
LOG_LEVEL=info              # Logging level
SESSION_TIMEOUT_MS=3600000  # 1 hour session timeout
```

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine

RUN corepack enable

WORKDIR /app

COPY implementations/mcp-server/package*.json ./
RUN pnpm install --prod

COPY implementations/mcp-server/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### Build and Run

```bash
docker build -t topshelf-teach .
docker run -p 3000:3000 topshelf-teach
```

## Cloud Deployment

### AWS EC2

1. Launch Ubuntu instance
2. Install Node.js 20+
3. Clone repository
4. Build and run
5. Use PM2 for process management

```bash
npm install -g pm2
pm2 start dist/index.js --name teach-mcp
pm2 save
pm2 startup
```

### Heroku

```bash
# Procfile
web: cd implementations/mcp-server && node dist/index.js
```

### Google Cloud Run

```bash
gcloud run deploy teach-mcp \
  --source implementations/mcp-server \
  --platform managed \
  --region us-central1
```

## Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name teach.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

### Logs

```bash
# PM2 logs
pm2 logs teach-mcp

# Docker logs
docker logs <container-id>
```

### Metrics to Monitor

- Response time
- Active sessions
- Memory usage
- CPU usage
- Error rate

## Scaling Considerations

### Horizontal Scaling

- Use Redis for session storage
- Load balancer across multiple instances
- Stateless server design

### Session Storage

```typescript
// Future: Redis integration
import Redis from 'ioredis';
const redis = new Redis();

// Store session
await redis.set(`session:${id}`, JSON.stringify(context));

// Retrieve session
const data = await redis.get(`session:${id}`);
```

## Security

### HTTPS

- Use Let's Encrypt for SSL
- Redirect HTTP to HTTPS
- HSTS headers

### CORS

```typescript
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true,
  })
);
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## Backup and Recovery

### Session Data

- Export active sessions periodically
- Store in S3 or similar
- Restore on server restart

### Database (Future)

- Automated backups
- Point-in-time recovery
- Replication for HA

## Troubleshooting

### Server Won't Start

- Check port availability: `lsof -i :3000`
- Verify Node version: `node --version`
- Check logs for errors

### High Memory Usage

- Monitor session count
- Implement session cleanup
- Set session timeouts

### Slow Response Times

- Check database queries (future)
- Monitor CPU usage
- Consider caching
