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

### Interaction

- **Tap**: Confirm the tag is correct
- **Long-press**: Remove (AI got it wrong)
- Speaking more refines or corrects tags

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

## Open Questions

Still to resolve:

- **Tag visualization density**: Clean accumulating tags vs flowing narrative vs spatial clustering?
- **Exact severity/intensity scales**: Finalize the four-point scales
- **Mobile vs desktop**: Mobile seems primary (voice-first, on-the-go discovery) but need to confirm
- **Chat vs dashboard balance**: How much structure vs conversational flow?
- **Calendar integration specifics**: How does this work with existing calendars?

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
