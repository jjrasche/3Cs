# Core Concepts

This document describes the mechanics and architecture of the Three Cs framework.

---

## The Three Cs - Definitions

### Connection
**What it is:** Assembling the group

**Key questions:** Who's involved? Who should be? Who can we find?

**AI role:** Matching interests, suggesting invitations, facilitating introductions with context

**Outcome:** A defined participant group with shared interest in the collaboration

---

### Consensus
**What it is:** Binding decisions about what the collaboration IS

**Key questions:** What are we doing? When? Where? Within what constraints? What's the ideal outcome?

**AI role:** Extracting needs/wants from participants, synthesizing positions, proposing agreements

**Outcome:** A mandate - the group's agreed-upon goals, constraints, and success criteria

---

### Coordination
**What it is:** The manifestation of an outcome that consensus formed

**Key questions:** Who does what? With what resources? How do we combine efforts?

**AI role:** Planning, assigning, tracking, reminding, logistics optimization

**Outcome:** Execution - consensus decomposes into actionable tasks and assignments

---

## The Relationship Between Phases

The three Cs are not strictly sequential. They overlap and feed back into each other.

### The Feedback Loop

```
Connection → Consensus → Coordination
                 ↑            ↓
                 └────────────┘
```

**Coordination surfaces gaps in consensus.** When optimization can't satisfy constraints, it escalates back to consensus. When consensus needs change, it may affect connection (who's involved).

**Core insight:** Coordination is autonomous optimization until it hits a wall, then it escalates to consensus.

### Decision Hierarchy

| Level | Phase | What's Decided | AI Autonomy |
|-------|-------|----------------|-------------|
| 1 | Connection | Who's in | Low - AI suggests, humans decide |
| 2 | Consensus | What we're doing | Medium - AI proposes, humans approve |
| 3 | Coordination | How we execute | High - AI acts unless overridden |

---

## AI Behavior by Phase

The AI operates differently in each phase:

### In Connection
- **Suggestive:** "You might want to invite..."
- **Facilitative:** "Here's context for the introduction..."
- **Passive:** Waits for human decision on who to include

### In Consensus
- **Extractive:** "What matters to you about this?"
- **Synthetic:** "Here's a proposal that addresses..."
- **Careful:** Always surfaces options, never decides unilaterally

### In Coordination
- **Proactive:** "I've assigned setup crew randomly"
- **Optimizing:** "Swapped you to desserts since we're heavy on mains"
- **Autonomous within bounds:** Acts unless overridden or escalation triggered

---

## Escalation Triggers

AI escalates from coordination back to consensus when:

1. **Unresolvable gap** - No solution exists within current constraints
2. **Resource conflict** - Not enough to go around, can't be optimized
3. **Constraint violation** - Can't meet the agreed outcome
4. **Significant change** - Circumstances have shifted materially
5. **Free riders detected** - Participants not meeting obligations

When triggered, AI surfaces the issue as a consensus question, not a coordination problem.

---

## The Needs/Wants Framework

AI transforms raw input into structured understanding:

| Input Type | Maps To | Treatment |
|------------|---------|-----------|
| Concerns | Needs | Constraints - must be satisfied |
| Desires | Wants | Preferences - optimize for these |

**The transformation process:**

1. Participant expresses concern or desire (messy, emotional, half-formed)
2. AI extracts underlying need or want
3. AI identifies intensity (how much do they care?)
4. AI presents back for confirmation: "Did I get this right?"
5. Corrections refine the understanding

**Key distinction from voting:** Voting is positional (pick A or B). This captures needs and intensity. Voting finds the option most people tolerate. This finds the solution that addresses what people actually care about.

---

## From Conversation to Constraints

AI extracts understanding through conversation, but what persists is functional and actionable.

### The Flow

```
Conversation (private, ephemeral)
         ↓
    Extraction (AI understands underlying need)
         ↓
    Constraint (functional wording)
         ↓
    User confirms (anonymous or attributed)
         ↓
Collaboration (shared, actionable)
```

### Key Distinctions

| Conversation | Constraint |
|--------------|------------|
| "I've had bad experiences with rides" | "Needs reliable transport - prefers public transit or confirmed carpool" |
| Ephemeral, deletable | Persisted on collaboration |
| Tied to user | Tied to collaboration |
| Psychological depth | Functional and direct |

**The AI's role is diagnostic, not therapeutic.** It digs deep to understand the underlying need, but outputs actionable constraints that coordination can work with. The bedrock informs the constraint; it doesn't become the constraint.

### Anonymous vs Attributed

Users choose how to add constraints:

- **Attributed:** "Sarah needs bus access" - lets others offer solutions
- **Anonymous:** "Someone in this group can't be alone with one person" - protects privacy while informing coordination

Both are actionable. Anonymous constraints still have a `participantId` for the owner to edit/remove, but the group doesn't see who.

### User Profile

Conversations and learned patterns accumulate in the user profile:

- **Conversation history:** Private, deletable, never on the collaboration
- **Learned constraints:** Patterns from past collaborations

When joining a new collaboration, the system suggests relevant constraints from the profile. User confirms which apply.

**Result:** Returning users don't re-explain. The system already understands their patterns.

---

## The Persuasion Loop

How AI facilitates convergence on consensus:

```
Individual has concern/desire
         ↓
Elaborates privately to AI
         ↓
AI translates to needs/wants + enhances argument
         ↓
AI presents to group as synthesis or proposal
         ↓
Others respond (agree, disagree, modify)
         ↓
Those who disagree elaborate to AI
         ↓
AI synthesizes multiple enhanced arguments
         ↓
New proposal emerges
         ↓
Repeat until consensus or fork
```

**Key insight:** The AI doesn't just translate - it **enhances**. It finds the strongest version of your argument. This equalizes rhetorical power regardless of verbal skills.

---

## AI as Mediator

### Translation, Not Arbitration

The AI's job is to translate positions into underlying interests, then find where those interests overlap.

**Example:** "I want hiking" vs "I want brunch" isn't a conflict - it's two solutions to unstated needs. Maybe hiking person wants movement and nature; brunch person wants relaxed social time with good food. Synthesis: scenic picnic spot, easy trail, bring fancy sandwiches.

### The Buffer Effect

AI absorbs interpersonal friction. Instead of "I disagree with you," it becomes "I disagree with the AI's proposal." This is psychologically easier and makes disagreement safe.

### Minority Position Engagement

Rather than bulldozing outvoted positions, AI actively seeks accommodations:

"Looks like most folks want the bar. Wondering if there's a way to make that work for you—separate area, good non-alcoholic options, or would you prefer we pick somewhere else?"

**Key frame:** Majority preference matters AND minority needs matter. Most minority positions aren't dealbreakers - they're unaddressed concerns.

---

## Consensus Through Obviousness

The goal is not to force votes. The goal is for AI to propose syntheses so reasonable that explicit voting becomes rare.

**Target state:** People go "yeah, that works."

When voting IS needed, use stack-ranked preferences rather than yes/no - captures intensity and tradeoffs, not just positions.

---

## Work Breakdown Structure

Consensus decomposes into coordination through a hierarchy:

```
Consensus (Mandate/Outcome)
         ↓
    Requirements
         ↓
    Deliverables
         ↓
      Tasks
```

Each level is more concrete than the last. The AI generates this breakdown and participants can modify it.

---

## Collaboration as Initiative

A collaboration is a bounded initiative with:

- **Clear outcome:** What success looks like
- **Limited obligations:** What's expected of participants
- **Defined membership:** Who's in
- **Explicit governance:** How decisions are made (chosen upfront)

This framing provides:
- Clarity about expectations
- Natural end points
- Scope for AI to optimize within

---

## Governance Models

Governance should be explicitly chosen when creating a collaboration:

- **Direct democracy:** Everyone votes on everything
- **Consent-based:** No objections = approved
- **Delegated authority:** Designated decision-maker with input
- **Threshold-based:** Different rules for different decision types

The framework supports multiple models - groups choose what fits their context.

---

## Time-Decaying Thresholds

An optional mechanism for creating urgency:

- Proposals start needing supermajority (e.g., 80%)
- Threshold decays over time (to 66%, then majority)
- Decay rate is set by the group

This creates urgency without deadlines. The decay period is an opportunity for the persuasion loop - as threshold drops, AI can prompt: "Still no consensus. Anyone want to make their case?"

---

## Forking

When synthesis genuinely fails, graceful divergence beats forced consensus.

**Fork is a positive outcome, not failure:**
- Two groups pursue different visions
- Forks can still cooperate on shared interests
- "Two dinners" is better than "one dinner half the people resent"

AI should make forking easy and non-dramatic when positions are irreconcilable.

---

## Trust Mechanisms

### What Creates Trust

- **Dependency:** Knowing you depend on others (and they on you) creates accountability
- **History:** Track record of follow-through
- **Verification:** Phone numbers and identity confirmation
- **Commitment tracking:** Did people do what they said?

### Trust by Phase

- **Connection:** Do I trust these people enough to collaborate?
- **Consensus:** Do I trust the process produced a fair outcome?
- **Coordination:** Do I trust the system to optimize correctly?

---

## UI Concept: Card-Based Dashboard

Different card types for different phases:

### Connection Cards
- Potential collaborators (match score, mutual interests)
- Invitation status (invited, joined, declined)

### Consensus Cards
- Open questions (when, where, what)
- Current state (aligned, needs discussion, conflict)
- Synthesis proposals (AI-generated options to approve/modify)

### Coordination Cards
- Assignments (who's doing what)
- Resources (what's needed, who's providing)
- Logistics (transportation, timing)
- Status (confirmed, pending, gap)

---

## Key Phrases

- **"Consensus decomposes into coordination"** - The mandate breaks down into actionable tasks
- **"Coordination is the manifestation of an outcome that consensus formed"** - Making the abstract real
- **"Autonomous optimization until it hits a wall"** - How AI operates in coordination
- **"Translation, enhancement, synthesis"** - The AI's core value-add
- **"Consensus through obviousness"** - Proposals so reasonable voting is rare
