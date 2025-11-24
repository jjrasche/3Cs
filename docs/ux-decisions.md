# UX Decisions

Decisions made about how the product looks, feels, and behaves. Companion to `ux-questions.md`.

---

## Core Interaction Model

**Individual ↔ AI is the only interaction pattern.**

Users never interact directly with each other through the system. The AI mediates everything:
- Extraction: You talk to the AI
- Synthesis: AI combines everyone's input (you don't see this process)
- Proposals: AI presents options, you respond
- Coordination: AI assigns actions, you confirm/modify

**Implication:** The extraction conversation IS the product. Everything else is the AI showing its work.

---

## AI Character

**Competent concierge** - the defining metaphor.

Traits:
- **Experienced**: Has seen every situation, nothing surprises them, knows what questions to ask because they've done this a thousand times
- **Bounded curiosity**: Asks insightful follow-ups ("sounds like timing matters more than location for you—is that right?") but knows when to stop
- **Shows work lightly**: "Here's what I'm hearing..." before moving on - you feel understood without confirming every micro-point
- **Gives you the exit**: "Anything else I should know?" rather than "What about X? What about Y?" - you control when you're done
- **Sounds like making plans**: Questions framed as helping a friend figure out what to do, not commanding a device

---

## Entry Modes

Two ways into the system:

### Discovery Mode
"What's out there?" / "What do you want to do right now?"

- Browse open collaborations/events in your area
- Your profile constraints filter what you see
- Quick calibration: "Feeling social or low-key?" "Want to try something new?"
- If nothing matches → system prompts you to start something

### Start Mode
"I want to do this thing"

- You describe what you want
- AI knows there's latent demand before you commit
- Example: "You mentioned wanting to try a new coffee shop. There are 3 people in your area who said similar things this week. Want to put something out there?"

**Key insight:** These aren't really separate modes. Discovery's fallback is starting something. Starting is informed by what others want. They blend together.

---

## The Extraction Conversation

### Voice-First Input

**User speaks only. No keyboard. No text input.**

- You don't see your own text - just audio out
- You see what the AI extracted (as tags/constraints)
- Correct by speaking more, not editing text
- This prevents self-editing - voice captures the messy truth

**Why this matters:** Text makes you guard yourself. Voice lets you ramble, contradict, half-form thoughts. The AI catches the real signal.

**The bet:** This is currently countercultural - research shows people are uncomfortable with voice assistants in public. But behavior will shift. Earbuds normalize it (feels like a phone call). The concierge framing helps (sounds like making plans with a friend).

### What Extraction Builds

Not just constraints for synthesis - **a model of your attention**:
- What you care about
- What would make you object
- What would delight you

This model powers personalized contextualization later.

---

## Constraint/Desire Visualization

**Tags assemble in real-time as you speak.**

The "thinker/talker" architecture: You watch the AI's model of you being built. It's like seeing the AI's inner monologue.

### Tag Structure

Two dimensions:

**Concerns (constraints)** - severity scale:
- Non-negotiable
- Strong preference
- Preference
- Nice-to-have

**Desires (wants)** - intensity scale:
- Must have
- Would love
- Would like
- Nice-to-have

### Examples

Constraints:
- `non-negotiable: allergens must be listed`
- `strong preference: accessible by transit`

Desires:
- `would like: cornbread`
- `would love: outside seating`

### Visual Treatment

**Opacity indicates priority:**
- Solid/opaque = high priority (non-negotiable, must have)
- Faded/transparent = lower priority (nice-to-have)

Tags split by concerns and desires, ranked within each category.

### Interaction

- **Tap**: Confirm the tag is correct
- **Long-press**: Remove (AI got it wrong)
- Speaking more refines or corrects tags

**Note:** Users cannot manually add or edit tags - only remove incorrect ones. Corrections happen through voice. This maintains the "don't guard yourself" principle.

---

## Profile Structure

### Two Types of Constraints/Desires

**Long-term** - Part of your persistent profile:
- Dietary restrictions
- Accessibility needs
- General preferences (morning person, prefers small groups)
- These follow you to every collaboration

**Short-term** - Part of the current conversation:
- How you're feeling right now
- What you're in the mood for today
- Specific to this collaboration

### Pre-population

When joining a new collaboration, relevant long-term constraints are suggested. You confirm which apply. Returning users don't re-explain themselves.

---

## Personalized Contextualization

**The AI doesn't just present information - it contextualizes it for YOU specifically.**

Instead of "here's the proposal, review it," the AI says:
- Here's what changed
- Here's how it affects what you care about
- Here's where you might want to look
- Here's what might delight you

### Examples

> "The proposal has been updated based on new input. Nothing you should object to based on your constraints. You may actually like [specific thing]. Do you have any concerns?"

> "3 people have shared preferences. Looking like Saturday afternoon is emerging."

### Confidence Signals

- "Nothing you should object to based on your constraints" = high confidence
- "I think this works for you but worth a look" = lower confidence

### Easy Expansion

The AI's summary is a starting point, not a gate. Full details always one tap away.

---

## Ambient Group Presence

**Feel the group without seeing their process.**

You don't see other people's extraction conversations. But you sense their presence:

- "4 people have shared their preferences"
- "The proposal has been updated based on new input"
- Attributed constraints (if they chose that): "Jamie can't do Tuesdays"
- Progress indicators: "Waiting on 2 more people"

**Why:** Social presence without social pressure. You're focused on your own needs, but aware you're part of something.

---

## Discovery as Propellant

### Not Just Browsing

Discovery mode isn't passive scrolling. The AI prompts you to initiate:

> "You mentioned wanting to try a new coffee shop. There are 3 people in your area who said similar things this week. Want to put something out there?"

**De-risks initiation** by showing latent demand exists before you commit.

### Ambient Presence (Future State)

Twitter-like sharing of what people are doing:
- "I'm at a coffee shop working on X"
- "Going to the movies tonight"
- "Looking for someone to try that new restaurant"

This creates ambient awareness of what's happening around you. The connection happens when interests align.

### "Social but not social media"

No feed. No likes. No content to consume. Just: who's around, what do they want to do, do you want to do it together. The activity is the point, not the broadcast.

---

## Equality of Inviter/Invitee

The initiator has framing power (they started it) but not decision power. Their constraints are weighted equally with everyone else's.

The invitation just seeds the problem space. Everything is negotiable. Invitees have the same opportunity to shape the collaboration - their extraction conversation is just as important as the initiator's.

---

## Consensus Flow

### Response Options

Three ways to respond to a proposal:

1. **Accept** - I'm good with this
2. **Accept with reservations** - I'll go along, but have concerns
3. **Opt out** - This doesn't work for me, continue without me

**Object** (implicit fourth option) - Triggers a mini-extraction conversation to understand what's not working. This feeds back to synthesis for a new proposal.

### Consent Mechanism

**Silence = consent.** After the response window expires, non-responses are treated as tacit approval.

Objections trigger re-extraction:
- AI: "What's not working for you?"
- Extracts new constraints or surfaces how existing ones should be reprioritized
- Feeds back to synthesis

### Group Visibility

**Real-time aggregation** - People see responses as they come in:
- "5 accepted, 2 with reservations, 1 opted out"

**Reservations shown anonymously:**
- "2 people have reservations about timing"
- Reservations are concerns already known from extraction - this just surfaces which ones are active

**No attribution** unless the person chose to attribute their constraints.

### Threshold

**Majority proceeds, minority can fork.** There's no unanimous requirement - if most people accept, the collaboration moves forward. Those who can't make it work can opt out or fork into a separate collaboration.

### Non-Resolvable Situations

When synthesis can't satisfy someone's constraints:

1. **Graceful opt-out** - "Based on your constraints, this doesn't have a solution that works for you. Want me to keep you posted if things shift?"
2. **Accept with noted reservations** - Go along but concerns are logged
3. **Raise a tradeoff** - "To make this work for you, the group would need to give up X. Do you want to surface that?" (Future: explore how this works mechanically)

---

## Coordination / Task Assignment

### Consensus → Coordination Transition

**Accepting a proposal = commitment to contribute.**

- Consensus is on the **mandate** (outcome + requirements)
- Tasks are the AI's optimization of *how* you contribute
- Declining a task ≠ reopening consensus
- Declining all tasks = effectively opting out

### Task Flow

Once mandate is established:

1. **AI generates tasks** from the mandate's requirements/deliverables
2. **Preference round** - People indicate which tasks they'd like to do
3. **AI distributes** based on preferences + extraction data (skills, availability)
4. **Assignments sent** - Each person sees their tasks
5. **Confirm or decline** - Declining triggers reassignment

### Decline Handling

- Task declined once → AI reassigns to next best fit
- Task declined more than once → Flagged to group for resolution

### Gap Resolution

Unassigned tasks get surfaced to the group. Someone must volunteer or the group decides how to handle (defer, simplify, split up, etc.).

---

## Platform

**Progressive Web App (PWA)**

- Web-first, works on mobile and desktop
- Sidesteps "mobile vs desktop first" question
- Handles notifications (mostly - some limitations)
- No app store friction

Mobile is the primary use case (voice-first, on-the-go discovery) but desktop works fine.

---

## Open Questions

Still to resolve:

- **Tag visualization density**: Clean accumulating tags vs flowing narrative vs spatial clustering?
- **Chat vs dashboard balance**: How much structure vs conversational flow?
- **Calendar integration specifics**: How does this work with existing calendars?
- **Response window timing**: How long do people have to respond to proposals? Time-based? Contextual?
- **Deferred conditionality**: How do compromise commitments ("this restaurant now, that one next time") get tracked and honored?
- **Tradeoff surfacing mechanics**: When someone wants to raise a tradeoff to the group, how does that flow work?
- **PWA notification limitations**: What's the fallback for notification edge cases?

---

## Design Principles Summary

1. **Individual ↔ AI only** - no direct user interaction
2. **Voice-first** - text makes you guard yourself
3. **Competent concierge** - experienced, bounded, shows work lightly
4. **Build a model of attention** - not just constraints, but what you care about
5. **Personalized contextualization** - AI tells you what matters to you
6. **Ambient group presence** - feel the group without seeing their process
7. **Discovery as propellant** - prompt initiation, don't just show what exists
8. **Social but not social media** - the activity is the point
9. **Silence = consent** - reduce friction, maintain momentum
10. **Acceptance = commitment** - agreeing to the mandate means agreeing to contribute
