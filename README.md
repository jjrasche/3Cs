# 3Cs - Collaboration System

> Non-hierarchical collaboration platform that reduces coordination overhead to near-zero through AI-augmented collective organization.

**Status:** Ready for MVP Development
**Approach:** E2E-first TDD with Docker containerization

---

## What Is This?

A platform for organizing group activities (trips, conferences, reunions, etc.) where:
- **Everyone contributes equally** - No organizer vs participant hierarchy
- **AI handles coordination** - Reduces overhead to near-zero
- **Groups self-organize** - Scale from 5 → 100+ without burden increase
- **Flexible structure** - User-defined data model, not rigid templates

**Core Innovation:** The Three Cs framework (Connection, Consensus, Coordination) implemented with AI mediation.

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)

### Run Locally
```bash
git clone https://github.com/org/3Cs.git
cd 3Cs

# Start all services
docker-compose up

# Open browser
open http://localhost:80
```

**Services running:**
- Frontend (React): http://localhost:80
- API (Node.js): http://localhost:3000
- MongoDB: mongodb://localhost:27017
- WebSocket: ws://localhost:8080

### Run Tests
```bash
# Unit tests (component tests)
npm test

# E2E tests (full user flows)
npm run test:e2e
```

---

## Architecture

```
┌─────────────────────────────────────┐
│      Load Balancer (Nginx)          │
└────────────┬────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼──────┐    ┌─────▼──────┐
│ Frontend │    │  API       │
│ React    │    │ Node.js    │
│ SPA      │    │ + WebSocket│
└──────────┘    └─────┬──────┘
                      │
            ┌─────────┴──────────┐
            │                    │
    ┌───────▼─────┐      ┌───────▼──────┐
    │  MongoDB    │      │   Worker     │
    │  (4 colls)  │      │  (AI Cron)   │
    └─────────────┘      └──────────────┘
```

**Technology Stack:**
- **Database:** MongoDB 7+ (16MB docs, Change Streams)
- **Backend:** Node.js 20 + TypeScript + Express
- **Frontend:** React 18 + TypeScript + TailwindCSS
- **Real-time:** WebSocket + MongoDB Change Streams
- **AI:** Groq (Llama 3.1 70B) - $0.10/M tokens
- **Auth:** Supabase Auth (open source, self-hostable)

---

## Data Model

### Collections

**1. Collaborations** `/collaborations/{collabId}`
- Core collaboration data (outcome, activities, consensus)
- Participants (references to users)
- System fields (permissions, rules, schema)
- **Size:** Typically < 500KB

**2. Users** `/users/{userId}`
- User profiles (name, email, avatar)
- Preferences
- **Size:** < 10KB each

**3. Discussions** `/discussions/{discussionId}`
- Discussion threads (attached to any object)
- Messages array
- **Size:** Grows with messages, typically < 100KB

**4. Audit Logs** `/audit_logs/{logId}`
- Action history (who, what, when)
- Used for debugging and rollback
- **Size:** < 1KB per entry

### Key Design Decisions

✅ **Start with 4 collections** (not single document)
✅ **Activities stay in main doc** (core to workflow)
✅ **Discussions separate** (grow unbounded)
✅ **Audit logs separate** (optional history)

---

## Development Workflow

### E2E-First TDD

```
1. Human: "Add feature X"
   ↓
2. AI: Writes E2E test (would pass if feature exists)
   ↓
3. Human: Reviews test - "Yes, correct"
   ↓
4. AI: Runs test → ❌ RED
   ↓
5. AI: Implements feature to make test pass
   ↓
6. AI: Runs test → ✅ GREEN
   ↓
7. Human: Validates UX
```

**Tests are the spec.** If tests pass, feature is done.

### Test Structure

**Unit Tests** (co-located with code)
```
/frontend/components/DatePicker/
  DatePicker.tsx
  DatePicker.test.tsx  ← Lives with component
```

**E2E Tests** (separate)
```
/e2e-tests/
  user-creates-collaboration.test.js
  user-adds-activity.test.js
  user-votes-on-consensus.test.js
```

---

## Core Concepts

### Actions System
All changes happen through standardized actions:
- `updateField(path, value)` - Modify any field
- `addItem(path, item)` - Add to array
- `createConsensusPoint(...)` - Start vote
- `vote(consensusPath, option)` - Cast vote

**Users and AI call identical actions** - no AI backdoor.

### Rules vs AI

**Rules:** Deterministic logic (fast, predictable)
- "If 5 signups → auto-schedule activity"
- "If budget > $500 → block new expenses"

**AI:** Contextual judgment (smart, flexible)
- "Is this consensus stalled? Should I remind people?"
- "What activities would this participant enjoy?"

**Two AI Modes:**
1. **Task-Specific** - User asks for help ("Help me pick dates")
2. **Daily Check-In** - System reviews health, suggests actions

### Real-Time Sync
- MongoDB Change Streams detect updates
- WebSocket broadcasts to connected clients
- React updates UI (< 2 sec latency)

---

## Documentation

📁 **Detailed docs in `/docs`:**

- [**Core Philosophy**](docs/PHILOSOPHY.md) - Three Cs framework, vision
- [**Architecture Deep Dive**](docs/ARCHITECTURE.md) - Containers, data flow
- [**Data Model**](docs/DATA_MODEL.md) - Collections, schema, indexes
- [**Actions Reference**](docs/ACTIONS.md) - All available actions
- [**Rules & AI**](docs/RULES_AND_AI.md) - Boundary matrix, when to use which
- [**Testing Guide**](docs/TESTING.md) - E2E-first approach, test helpers
- [**API Reference**](docs/API.md) - Endpoints, WebSocket protocol
- [**Authentication**](docs/AUTHENTICATION.md) - Supabase Auth integration
- [**Error Handling**](docs/ERROR_HANDLING.md) - Failure modes, resilience
- [**Deployment**](docs/DEPLOYMENT.md) - Production setup, scaling

---

## Project Status

### ✅ Completed
- Architecture design
- Technology stack selection
- Data model (4 collections)
- Testing strategy
- Core concepts definition

### 🚧 In Progress
- First E2E test: "User creates collaboration with AI help"
- Test infrastructure setup (Docker test containers)
- Basic API scaffolding

### 📋 Next Steps
1. Write first E2E test
2. Implement to make it pass
3. Iterate with more features
4. Add unit tests for components
5. Deploy MVP

---

## Contributing

This project is developed using **AI-augmented TDD**:
1. Describe feature in plain English
2. AI writes E2E test
3. Review test for correctness
4. AI implements feature
5. Validate UX

**Before contributing:**
- Read [Testing Guide](docs/TESTING.md)
- Check [Architecture](docs/ARCHITECTURE.md)
- Follow E2E-first workflow

---

## License

MIT

---

## Questions?

- **Architecture questions?** See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **How to add a feature?** See [docs/TESTING.md](docs/TESTING.md)
- **API reference?** See [docs/API.md](docs/API.md)
- **Why these choices?** See [docs/PHILOSOPHY.md](docs/PHILOSOPHY.md)

**Contact:** [Your contact info]
