# Deployment Guide

**Local Setup, Production Deployment, and Scaling Strategy**

---

## Local Development

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Git

### Initial Setup

```bash
# Clone repository
git clone https://github.com/org/3Cs.git
cd 3Cs

# Start all services
docker-compose up

# Application runs at:
# - Frontend: http://localhost:80
# - API: http://localhost:3000
# - MongoDB: mongodb://localhost:27017
# - WebSocket: ws://localhost:8080
```

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    volumes:
      - mongo-data:/data/db
    ports:
      - "27017:27017"

  mongodb-test:
    image: mongo:7
    volumes:
      - mongo-test-data:/data/db
    ports:
      - "27018:27017"

  api:
    build: ./backend
    volumes:
      - ./backend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
      - "8080:8080"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongodb:27017/collaborations
      - GROQ_API_KEY=${GROQ_API_KEY}
    depends_on:
      - mongodb

  worker:
    build: ./backend
    command: npm run worker
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongodb:27017/collaborations
      - GROQ_API_KEY=${GROQ_API_KEY}
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "80:80"
    depends_on:
      - api

volumes:
  mongo-data:
  mongo-test-data:
```

### Environment Variables

```bash
# .env
GROQ_API_KEY=your_groq_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Production Deployment

### Single Server (Phase 1)

**Hardware:**
- DigitalOcean Droplet or AWS EC2
- 4GB RAM minimum
- 2 CPUs
- 50GB storage

**Setup:**

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 2. Clone repository
git clone https://github.com/org/3Cs.git
cd 3Cs

# 3. Set environment variables
cp .env.example .env
nano .env  # Edit with production values

# 4. Start services
docker-compose -f docker-compose.prod.yml up -d

# 5. Check logs
docker-compose logs -f
```

### Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    restart: unless-stopped
    networks:
      - internal

  api:
    build: ./backend
    ports:
      - "3000:3000"
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/collaborations?authSource=admin
      - GROQ_API_KEY=${GROQ_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    depends_on:
      - mongodb
    restart: unless-stopped
    networks:
      - internal
      - external

  worker:
    build: ./backend
    command: npm run worker
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/collaborations?authSource=admin
      - GROQ_API_KEY=${GROQ_API_KEY}
    depends_on:
      - mongodb
    restart: unless-stopped
    networks:
      - internal

  frontend:
    build: ./frontend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: unless-stopped
    networks:
      - external

volumes:
  mongo-data:

networks:
  internal:
  external:
```

### SSL/HTTPS Setup

```bash
# Install Certbot
apt-get install certbot

# Get SSL certificate
certbot certonly --standalone -d your-domain.com

# Copy certificates
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./nginx/ssl/

# Auto-renewal cron job
crontab -e
# Add: 0 0 * * 0 certbot renew --quiet && docker-compose restart frontend
```

### Nginx Configuration

```nginx
# nginx/nginx.conf
server {
  listen 80;
  server_name your-domain.com;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name your-domain.com;

  ssl_certificate /etc/nginx/ssl/fullchain.pem;
  ssl_certificate_key /etc/nginx/ssl/privkey.pem;

  # Serve React app
  location / {
    root /usr/share/nginx/html;
    try_files $uri /index.html;
  }

  # Proxy API requests
  location /api {
    proxy_pass http://api:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  # Proxy WebSocket
  location /ws {
    proxy_pass http://api:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }
}
```

---

## Scaling Strategy

### Phase 1: Single Server (MVP)
**Capacity:** ~100 active collaborations

```
┌─────────────┐
│   Server    │
│             │
│ - Frontend  │
│ - API       │
│ - Worker    │
│ - MongoDB   │
└─────────────┘
```

**Cost:** $20-40/month

---

### Phase 2: Horizontal Scaling
**Capacity:** ~1000 active collaborations

```
┌──────────────┐
│ Load Balancer│
└──────┬───────┘
       │
   ┌───┴─────┬─────────┐
   │         │         │
┌──▼──┐  ┌──▼──┐  ┌──▼──┐
│ API │  │ API │  │ API │
└──┬──┘  └──┬──┘  └──┬──┘
   │         │         │
   └─────────┴─────────┘
             │
      ┌──────▼──────┐
      │  MongoDB    │
      │ Replica Set │
      │ (3 nodes)   │
      └─────────────┘
```

**Setup:**

```bash
# Use Docker Swarm or Kubernetes
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.swarm.yml 3cs
```

**Cost:** $100-200/month

---

### Phase 3: Full Kubernetes (Scale)
**Capacity:** 10,000+ collaborations

```
┌─────────────────────────────────┐
│      Kubernetes Cluster         │
│                                 │
│  ┌─────────────────────────┐   │
│  │  API Pods (Auto-scale)  │   │
│  │  Min: 3, Max: 10        │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │  Worker Pods (AI GPU)   │   │
│  │  Self-hosted Llama      │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │  MongoDB Atlas          │   │
│  │  Managed Service        │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

**Kubernetes Deployment:**

```yaml
# k8s/api-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: your-registry/3cs-api:latest
        ports:
        - containerPort: 3000
        - containerPort: 8080
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: mongo-secret
              key: uri
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

**Cost:** Variable ($500-2000/month based on usage)

---

## Backup Strategy

### MongoDB Backups

```bash
# Daily backup cron job
0 2 * * * docker exec mongodb mongodump --out /backup/$(date +\%Y\%m\%d)

# Backup to S3
0 3 * * * aws s3 sync /backup s3://your-bucket/backups/
```

### Restore from Backup

```bash
# Restore from specific date
docker exec mongodb mongorestore /backup/20251117
```

---

## Monitoring

### Health Checks

```bash
# Check all services
docker-compose ps

# Check logs
docker-compose logs -f api

# Check MongoDB
docker exec mongodb mongo --eval "db.adminCommand('ping')"

# Check API health
curl http://localhost:3000/health
```

### Uptime Monitoring

Use services like:
- UptimeRobot (free tier)
- Pingdom
- New Relic

Monitor:
- `/health` endpoint
- WebSocket connectivity
- MongoDB connectivity

---

## CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run tests
        run: |
          docker-compose up -d
          docker-compose run test-runner npm run test:e2e

      - name: Build images
        run: |
          docker build -t your-registry/3cs-api:latest ./backend
          docker build -t your-registry/3cs-frontend:latest ./frontend

      - name: Push to registry
        run: |
          docker push your-registry/3cs-api:latest
          docker push your-registry/3cs-frontend:latest

      - name: Deploy to production
        run: |
          ssh user@your-server "cd /app/3Cs && docker-compose pull && docker-compose up -d"
```

---

## Troubleshooting

### Common Issues

**MongoDB won't start:**
```bash
# Check logs
docker-compose logs mongodb

# Reset data (WARNING: deletes all data)
docker-compose down -v
docker-compose up
```

**API can't connect to MongoDB:**
```bash
# Check network
docker network inspect 3cs_internal

# Test connection
docker exec api ping mongodb
```

**Frontend can't reach API:**
```bash
# Check Nginx config
docker exec frontend nginx -t

# Reload Nginx
docker exec frontend nginx -s reload
```

---

**Status:** Documentation complete! Ready for development.
