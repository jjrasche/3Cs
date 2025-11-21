# The Three Cs
> We can do more together, for less, than we can individually, and it is the high cost of collaboration that kills that possibility.

## The Problem

Collaboration tools help us communicate, but they don't do the **cognitive work** of collaboration. Someone still has to:
- Chase people for input
- Translate what people say into what they mean
- Find compromise between conflicting needs
- Manage the spreadsheet
- Send the reminders

So we don't plan the trip. We don't start the project. We don't organize the event. Not because we don't want to, but because **collaboration is hard**.

The real friction isn't logistics—it's the human stuff: conflict of ideas, timidity that suppresses contribution, miscommunication, emotional stubbornness.

## The Promise

**Effortless human collaboration**

When organizing 100 people takes the same effort as organizing 5, we attempt things we never would have tried.

## The Vision

AI cannot make decisions for us, but it can:
- **Translate** what people say into underlying needs and wants
- **Enhance** weak arguments so everyone gets heard equally
- **Synthesize** conflicting positions into creative proposals
- **Absorb** interpersonal friction so disagreement feels safe

The goal: AI proposes syntheses so reasonable that explicit voting is rare. People go "yeah, that works."


## The Three Cs

Every collaboration requires solving three problems:

### 1. Connection — Assembling the Group

Who's involved? Who should be?

**AI helps:** Match interests, suggest invitations, facilitate introductions with context. Expand beyond your existing network.

---

### 2. Consensus — Forming the Mandate

Binding decisions about what the collaboration IS. What are we doing? When? Where? Within what constraints?

**AI helps you surface needs individually** — extracts concerns and desires from each participant

**AI helps you converge collectively** — synthesizes positions into proposals that address underlying needs

The persuasion loop: Individual elaborates to AI → AI enhances and presents to group → others respond → AI synthesizes → new proposal emerges → repeat until consensus.

---

### 3. Coordination — Manifesting the Outcome

Consensus decomposes into actionable tasks. Who does what? With what resources? How do we combine efforts?

**AI optimizes autonomously** within consensus constraints. When it hits a wall—unresolvable gap, resource conflict, constraint violation—it escalates back to consensus.

Coordination is the manifestation of an outcome that consensus formed.

---

## The Approach

**AI translates, enhances, and synthesizes.**
Not just routing messages—doing the cognitive work of understanding what people mean and finding what works for everyone.

**Humans decide, AI proposes.**
Every decision comes from people. AI generates options, surfaces tradeoffs, and absorbs friction.

**Collaboration as bounded initiative.**
Clear outcomes, limited obligations, explicit governance chosen upfront.

---

## How It Feels

Imagine planning a 50-person potluck where:
- **AI extracts what matters** ("Sarah needs transit access, Mike wants it under $20")
- **Conflicts become proposals** (not "park vs house" but "covered pavilion addresses both concerns")
- **Consensus emerges obviously** (synthesis so reasonable explicit voting is rare)
- **Coordination just happens** (assignments, reminders, gap-filling—all autonomous)
- **Gaps escalate cleanly** ("No one wants to bring mains—should we order pizza or make it a dessert party?")

You never feel like the organizer. Nobody does. The collaboration organizes itself.


---

## Technical Decisions

### Why MongoDB

| Aspect | Firestore | MongoDB | Decision |
|--------|-----------|---------|----------|
| **Document Size** | 1MB | 16MB | MongoDB (16x larger) |
| **Nested Queries** | Limited | Full JSONPath | MongoDB |
| **Schema Flexibility** | Subcollections required | Arbitrary nesting | MongoDB |

**Rationale:** Collaborations need flexible, user-defined structures. "Collaboration shapes itself" requires arbitrary nesting and large documents for complex group data.

### Why Self-Contained JWT Auth

- No external dependencies (simpler deployment)
- Full control over auth flow
- No vendor lock-in
- Standard JWT works everywhere

### Core Stack

| Component | Choice | Reasoning |
|-----------|--------|-----------|
| **Backend** | Node.js + TypeScript | Async-first for real-time, type safety for complex nested data |
| **Frontend** | React + TypeScript | Component model fits card-based UI, hooks for real-time state |
| **Real-time** | WebSocket + MongoDB Change Streams | Native to MongoDB, 1-2 sec latency acceptable |
| **Containers** | Docker Compose | Dev/prod parity, easy scaling path |

### AI Provider Strategy

**Current:** Groq (Llama 3.1 70B) - cheap ($0.10/M tokens), fast

**Note:** The AI role includes sophisticated synthesis work (translating needs/wants, enhancing arguments, synthesizing proposals). Llama 70B may suffice for check-ins but synthesis quality should be evaluated. Better models (Claude, GPT-4) may be needed for consensus-building. Code abstraction allows per-task model selection.

---

## Get Involved

This is early. Vision is clear, implementation is beginning.

We need people who believe collaboration can be better. Developers who want to build it. Groups willing to try it.

**[→ Core concepts and mechanics](docs/concepts.md) | [→ Worked examples](docs/examples.md)**
