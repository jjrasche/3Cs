# Architecture Deep Dive

**System Design, Technology Stack, and Data Flow**

---

## System Overview

```
┌─────────────────────────────────────┐
│      Load Balancer (Nginx)          │
└────────────┬────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼──────┐    ┌─────▼──────┐
│ Frontend │    │  API       │
│ (React)  │    │ (Node.js)  │
└──────────┘    └─────┬──────┘
                      │
            ┌─────────┴──────────┐
            │                    │
    ┌───────▼─────┐      ┌───────▼──────┐
    │  MongoDB    │      │   Worker     │
    │  (Data)     │      │  (AI Jobs)   │
    └─────────────┘      └──────────────┘
```

---

## Container Services

### Frontend Container
- **Image:** Nginx serving React SPA
- **Purpose:** Static assets, client-side routing
- **Responsibilities:**
  - Serve React application
  - Proxy API/WebSocket requests to backend
  - Handle client-side routing

### API Container
- **Image:** Node.js 20 + TypeScript
- **Purpose:** Business logic, real-time sync
- **Responsibilities:**
  - REST API endpoints
  - WebSocket server (real-time sync)
  - Rule evaluation engine
  - Permission validation
  - User-initiated AI chat

### Worker Container
- **Image:** Node.js 20 + TypeScript (same as API)
- **Purpose:** Background processing
- **Responsibilities:**
  - Daily AI batch processing (cron)
  - Async job queue
  - Cleanup tasks

### MongoDB Container
- **Image:** MongoDB 7+
- **Purpose:** Data persistence
- **Responsibilities:**
  - Store collaboration data (16MB document limit)
  - Provide Change Streams for real-time events
  - Separate test instance for E2E tests

---

## Technology Stack

### Why MongoDB Over Firestore

| Aspect | Firestore | MongoDB | Decision |
|--------|-----------|---------|----------|
| **Size Limit** | 1MB | 16MB | **MongoDB** (16x larger) |
| **Nested Queries** | Limited | Full JSONPath | **MongoDB** |
| **Real-time** | Native, instant | DIY, 1-2 sec | Firestore (but not critical) |
| **Cost** | Pay per operation | Flat hosting | **MongoDB** at scale |
| **Flexibility** | Subcollections required | Arbitrary nesting | **MongoDB** |

**Verdict:** Need for arbitrary nesting + 16MB documents outweighs Firestore's real-time sync magic.

### Core Technology Choices

| Component | Choice | Reasoning |
|-----------|--------|-----------|
| **Database** | MongoDB 7+ | 16MB limit (vs 1MB Firestore), nested queries, Change Streams |
| **Backend** | Node.js 20 + TypeScript | Async-first, great ecosystem, TypeScript safety |
| **Frontend** | React 18 + TypeScript | Component model fits UI primitives, hooks for state |
| **Real-time** | WebSocket + Change Streams | MongoDB native, 1-2 sec latency acceptable |
| **AI** | Groq (Llama 3.1 70B) | $0.10/M tokens (cheapest), fast inference |
| **Auth** | Supabase Auth | Open source, self-hostable, drop-in replacement for Firebase |
| **Containers** | Docker + Docker Compose | Development/production parity, easy scaling |

### AI Provider Strategy

**Current: Groq (Llama 3.1 70B)**
- Cheap ($0.10/M tokens)
- Fast (300+ tokens/sec)
- Good enough quality

**Future: Self-hosted Llama**
- Break-even at ~100M tokens/month
- GPU server ($100-200/month)
- No rate limits
- Full control

**Code abstraction allows provider swap:**
```javascript
// ai.js
switch (process.env.AI_PROVIDER) {
  case 'groq': return groq.chat(prompt);
  case 'ollama': return ollama.chat(prompt);
  case 'anthropic': return anthropic.chat(prompt);
}
```

---

## Data Flow Diagrams

### User Action Flow

```
User clicks button in React
  ↓
POST /api/actions/{actionName}
  ↓
API validates permissions
  ↓
MongoDB: Update document
  ↓
Change Stream detects update
  ↓
WebSocket broadcasts to connected clients
  ↓
React updates UI (< 2 sec latency)
```

### Daily AI Check-In Flow

```
2:00 AM: Worker cron triggers
  ↓
Query MongoDB for active collaborations
  ↓
Batch 20 collaborations, summarize
  ↓
Single Groq API call (Llama 3.1 70B)
  ↓
AI returns action list (JSON)
  ↓
Execute automatic actions (sendMessage)
  ↓
Request approval for protected actions
  ↓
MongoDB updates
  ↓
Change Stream → WebSocket → Users see updates
```

### Real-Time Sync Implementation

**MongoDB Change Streams:**
```javascript
// Server watches for changes
const changeStream = db.collection('collaborations').watch();

changeStream.on('change', (change) => {
  const collabId = change.documentKey._id;

  // Find all connected clients watching this collaboration
  connectedClients
    .filter(client => client.watching === collabId)
    .forEach(client => {
      client.send(JSON.stringify({
        type: 'collaboration_updated',
        collaborationId: collabId,
        changes: change.updateDescription,
        version: change.fullDocument.version
      }));
    });
});
```

**WebSocket Protocol:**

Server → Client:
```javascript
{
  type: 'collaboration_updated',
  collaborationId: 'collab_001',
  changes: {
    path: 'activities[0].status',
    oldValue: 'proposed',
    newValue: 'scheduled'
  },
  version: 6
}
```

Client → Server:
```javascript
{
  type: 'subscribe',
  collaborationId: 'collab_001',
  userId: 'user_jim'
}
```

---

## Scaling Strategy

### Phase 1 (MVP): Single Server
All containers on one machine:
- DigitalOcean droplet or AWS EC2
- Docker Compose orchestration
- Handles ~100 active collaborations
- Cost: $20-40/month

### Phase 2 (Growth): Horizontal Scaling
Load balance API containers:
- 3x API containers behind Nginx
- MongoDB replica set (3 nodes)
- Separate worker node
- Handles ~1000 active collaborations
- Cost: $100-200/month

### Phase 3 (Scale): Kubernetes
Full container orchestration:
- Kubernetes cluster
- Auto-scaling API pods
- Separate AI worker nodes (GPU)
- Managed MongoDB (Atlas)
- Handles ~10,000+ collaborations
- Cost: Variable based on load

---

## Development vs Production

### Development Setup
```yaml
# docker-compose.yml
services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"

  mongodb-test:
    image: mongo:7
    ports:
      - "27018:27017"

  api:
    build: ./backend
    volumes:
      - ./backend:/app  # Hot reload
    environment:
      - NODE_ENV=development

  frontend:
    build: ./frontend
    volumes:
      - ./frontend:/app  # Hot reload
```

### Production Setup
```yaml
# docker-compose.prod.yml
services:
  mongodb:
    image: mongo:7
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped

  api:
    build: ./backend
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  frontend:
    build: ./frontend
    restart: unless-stopped

volumes:
  mongo-data:
```

---

## Security Considerations

### Authentication
- Supabase Auth for user management
- JWT tokens for API requests
- Secure WebSocket connections

### Data Access
- Permission checks on every action
- User can only access collaborations they're part of
- Audit logs track all changes

### AI Safety
- AI actions constrained by permissions
- Protected actions require owner approval
- Rule evaluation sandboxed (no code injection)

---

**Next:** [Data Model](DATA_MODEL.md) - Database schema and collections
