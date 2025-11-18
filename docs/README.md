# 3Cs Documentation

> Complete technical documentation for the non-hierarchical collaboration platform

**Version:** 1.0
**Last Updated:** 2025-11-17
**Status:** Ready for Development

---

## 📚 Documentation Map

### Getting Started
- **[Main README](../README.md)** - Quick start, architecture overview, project status
- **[Core Philosophy](PHILOSOPHY.md)** - The Three Cs framework, vision, and principles

### Architecture & Design
- **[Architecture Deep Dive](ARCHITECTURE.md)** - Containers, data flows, system design
- **[Data Model](DATA_MODEL.md)** - Collections, schemas, indexes, design decisions
- **[Actions System](ACTIONS.md)** - All available actions, execution flow, permissions

### AI & Automation
- **[Rules & AI](RULES_AND_AI.md)** - Boundary matrix, when to use rules vs AI, two AI modes

### Development
- **[Testing Guide](TESTING.md)** - E2E-first TDD workflow, test structure, helpers
- **[API Reference](API.md)** - REST endpoints, WebSocket protocol, authentication

### Operations
- **[Authentication](AUTHENTICATION.md)** - Supabase Auth integration
- **[Error Handling](ERROR_HANDLING.md)** - Failure modes, retry strategies, monitoring
- **[Deployment Guide](DEPLOYMENT.md)** - Local setup, production deployment, scaling strategy

---

## 🎯 Quick Navigation by Role

### **New Developer**
Start here:
1. [Main README](../README.md) - Understand what we're building
2. [Core Philosophy](PHILOSOPHY.md) - Why we're building it this way
3. [Architecture](ARCHITECTURE.md) - How the system works
4. [Testing Guide](TESTING.md) - How to contribute

### **Frontend Developer**
Focus on:
- [Actions System](ACTIONS.md) - How to trigger changes
- [API Reference](API.md) - Available endpoints
- [Data Model](DATA_MODEL.md) - Data structure you'll work with

### **Backend Developer**
Focus on:
- [Architecture](ARCHITECTURE.md) - Server components
- [Data Model](DATA_MODEL.md) - MongoDB schema
- [Rules & AI](RULES_AND_AI.md) - Business logic layer
- [Error Handling](ERROR_HANDLING.md) - Resilience patterns

### **DevOps/SRE**
Focus on:
- [Deployment Guide](DEPLOYMENT.md) - Infrastructure setup
- [Architecture](ARCHITECTURE.md) - Container topology
- [Error Handling](ERROR_HANDLING.md) - Monitoring strategy

### **Product/Design**
Focus on:
- [Core Philosophy](PHILOSOPHY.md) - Vision and principles
- [Actions System](ACTIONS.md) - What users can do
- [Rules & AI](RULES_AND_AI.md) - How AI assists users

---

## 📖 Document Summaries

### [PHILOSOPHY.md](PHILOSOPHY.md)
**The Three Cs Framework:** Connection, Consensus, Coordination

Learn why we're building a non-hierarchical system, the 10-year vision, and core principles like "AI as Partner" and "Action Uniformity."

**Read this to understand:** The "why" behind all technical decisions.

---

### [ARCHITECTURE.md](ARCHITECTURE.md)
**System Design:** Containers, data flows, technology choices

Deep dive into the 4 container architecture (Frontend, API, Worker, MongoDB), detailed data flow diagrams, and why we chose MongoDB over Firestore.

**Read this to understand:** How the system works end-to-end.

---

### [DATA_MODEL.md](DATA_MODEL.md)
**Database Schema:** 4 collections, document structure, indexes

Complete schema for collaborations, users, discussions, and audit logs. Includes design rationale for 4-collection approach.

**Read this to understand:** What data we store and how.

---

### [ACTIONS.md](ACTIONS.md)
**Actions System:** All operations users and AI can perform

Comprehensive reference for all actions: `updateField`, `vote`, `addItem`, etc. Includes permission model and execution flow.

**Read this to understand:** How changes happen in the system.

---

### [RULES_AND_AI.md](RULES_AND_AI.md)
**Rules vs AI:** When to use deterministic logic vs AI judgment

The boundary matrix with examples, two AI modes (task-specific vs holistic check-in), and rule structure.

**Read this to understand:** How automation and AI assistance work.

---

### [TESTING.md](TESTING.md)
**E2E-First TDD:** Test-driven development workflow

Complete testing strategy, test infrastructure setup, helper functions, and the AI-augmented development workflow.

**Read this to understand:** How to build features and contribute.

---

### [API.md](API.md)
**API Reference:** REST endpoints, WebSocket protocol

All endpoints, request/response formats, WebSocket message types, and real-time sync implementation.

**Read this to understand:** How frontend and backend communicate.

---

### [AUTHENTICATION.md](AUTHENTICATION.md)
**Authentication:** Supabase Auth integration

Authentication flow, token management, user session handling, and security considerations.

**Read this to understand:** How users log in and stay authenticated.

---

### [ERROR_HANDLING.md](ERROR_HANDLING.md)
**Error Handling:** Failure modes, retry strategies, monitoring

How the system handles MongoDB disconnects, WebSocket drops, AI API failures, and action execution errors.

**Read this to understand:** How the system stays resilient.

---

### [DEPLOYMENT.md](DEPLOYMENT.md)
**Deployment:** Local setup, production deployment, scaling

Docker Compose setup, environment variables, production configuration, and scaling strategy from single server to Kubernetes.

**Read this to understand:** How to run and deploy the system.

---

## 🔍 Quick Reference

### Common Questions

**Q: How do I add a new feature?**
A: See [Testing Guide](TESTING.md) - Write E2E test first, implement to make it pass.

**Q: How does real-time sync work?**
A: See [Architecture](ARCHITECTURE.md#real-time-sync) - MongoDB Change Streams + WebSocket.

**Q: When should I use a rule vs AI?**
A: See [Rules & AI](RULES_AND_AI.md#boundary-matrix) - Rules for deterministic logic, AI for judgment.

**Q: What can users do?**
A: See [Actions System](ACTIONS.md) - Complete list of all actions.

**Q: How do I deploy locally?**
A: See [Main README](../README.md#quick-start) - Just run `docker-compose up`.

**Q: What's the data structure?**
A: See [Data Model](DATA_MODEL.md#main-document-structure) - Complete schema with examples.

---

## 📝 Contributing to Docs

Found an error or want to improve documentation?

1. **Update the relevant doc** - Find the right file above
2. **Follow the style:**
   - Use clear headings
   - Include code examples
   - Add diagrams where helpful
   - Link to related docs
3. **Test links** - Ensure all internal links work
4. **Submit PR** - Follow E2E-first TDD workflow

---

## 🏗️ Documentation Structure

```
/docs
├── README.md              ← You are here (navigation hub)
├── PHILOSOPHY.md          ← Why we're building this
├── ARCHITECTURE.md        ← How it works
├── DATA_MODEL.md          ← Database schema
├── ACTIONS.md             ← Available operations
├── RULES_AND_AI.md        ← Automation logic
├── TESTING.md             ← Development workflow
├── API.md                 ← Endpoints reference
├── AUTHENTICATION.md      ← Auth integration
├── ERROR_HANDLING.md      ← Resilience patterns
└── DEPLOYMENT.md          ← Running the system
```

---

**Need help?** Start with the [Main README](../README.md) or ask in discussions.
