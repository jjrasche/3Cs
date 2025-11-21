# Consensus Phase - LLM Use Cases

These are the points where LLMs are injected during the Consensus phase. Each represents a hypothesis to test.

---

## 1. Briefing the Invitee

**When:** Someone joins a collaboration

**What LLM does:**
- Summarizes what this collaboration is about
- Explains current state (what's been decided, what's open)
- Sets context so invitee understands the landscape they're entering

**Input:** Collaboration state (outcome, existing participants, any decisions made)

**Output:** Natural language brief tailored to this person

**Hypothesis to test:** Can LLM produce a brief that makes someone feel oriented and ready to contribute?

---

## 2. Extracting Concerns (Needs)

**When:** After briefing, during initial conversation with invitee

**What LLM does:**
- Asks questions to surface what the person is worried about
- Identifies hard requirements ("If this isn't true, it won't work for me")
- Probes for concerns they might not have articulated yet

**Input:**
- Collaboration context
- Person's initial responses
- Conversation history

**Output:** Identified concerns, each mapped to an underlying need

**Key challenge:** Drawing out concerns the person hasn't consciously formed yet. Not just "what are your concerns?" but helping them discover what actually matters to them.

**Hypothesis to test:** Can LLM ask the right questions to surface concerns that the person wouldn't have volunteered unprompted?

---

## 3. Extracting Desires (Wants)

**When:** During initial conversation with invitee

**What LLM does:**
- Asks what they'd love from this collaboration
- Identifies preferences (nice-to-haves, not dealbreakers)
- Helps them articulate what "great" looks like for them

**Input:**
- Collaboration context
- Person's initial responses
- Already-identified concerns (to avoid repetition)

**Output:** Identified desires, each mapped to an underlying want

**Key challenge:** Inspiring people to think beyond the obvious. "What would make this amazing for you?" not just "what do you want?"

**Hypothesis to test:** Can LLM help people articulate desires they'd be excited about, not just logistics?

---

## 4. Translating to Structured Format

**When:** After extracting concerns/desires

**What LLM does:**
- Takes messy human language and extracts structured needs/wants
- Identifies intensity (how much do they care?)
- Confirms understanding: "Did I get this right?"

**Input:** Raw conversation about concerns and desires

**Output:**
```javascript
{
  needs: [
    { text: "original concern", underlying: "transit_access", intensity: "high" }
  ],
  wants: [
    { text: "original desire", underlying: "outdoor_activity", intensity: "medium" }
  ]
}
```

**Key challenge:** Not losing nuance in translation. The structured format should capture what actually matters, not just keywords.

**Hypothesis to test:** Can LLM translate without losing the essence? Does confirmation step catch errors?

---

## 5. Synthesis / Proposal Generation

**When:** After multiple participants have contributed needs/wants

**What LLM does:**
- Looks across all participants' needs/wants
- Finds overlaps and tensions
- Generates proposals that address underlying interests
- Aims for "consensus through obviousness" - proposals so reasonable voting is rare

**Input:** All participants' structured needs/wants

**Output:** Proposals with rationale explaining how they address needs

**Key challenge:** Creative synthesis, not just averaging. "Hiking vs brunch" becomes "scenic picnic with good food" - finding the third option.

**Hypothesis to test:** Can LLM generate proposals that people respond to with "yeah, that works"?

---

## 6. Enhancing Arguments

**When:** Someone disagrees with a proposal but struggles to articulate why

**What LLM does:**
- Helps them find the strongest version of their argument
- Equalizes rhetorical power regardless of verbal skills
- Presents enhanced argument to group

**Input:** Person's raw objection/concern

**Output:** Clear, compelling articulation of their position

**Key insight:** This is the "persuasion loop" - AI doesn't just translate, it enhances. Everyone gets heard equally.

**Hypothesis to test:** Can LLM enhance weak arguments without changing the underlying position?

---

## 7. Surfacing Tensions

**When:** Needs/wants across participants conflict

**What LLM does:**
- Identifies where needs genuinely conflict
- Frames conflicts as questions to resolve, not battles to win
- Presents to group: "Here's a tension to work through..."

**Input:** All participants' needs/wants

**Output:** Clearly framed tensions with options

**Key challenge:** Distinguishing real conflicts from apparent ones. "I want hiking" vs "I want brunch" might not actually conflict.

**Hypothesis to test:** Can LLM identify genuine tensions and frame them productively?

---

## 8. Minority Position Engagement

**When:** Most people agree, but someone has concerns

**What LLM does:**
- Actively seeks accommodations for minority position
- Asks: "Is there a way to make this work for you?"
- Doesn't bulldoze - treats minority needs as real

**Input:** Majority preference, minority concern

**Output:** Potential accommodations, or acknowledgment that it's a dealbreaker

**Key insight:** Most minority positions aren't dealbreakers - they're unaddressed concerns. AI should try to address them.

**Hypothesis to test:** Can LLM find accommodations that satisfy both majority preference and minority concern?

---

## Priority for Testing

Start with **2, 3, 4** - the extraction and translation. These are foundational:
- If we can't extract concerns/desires well, nothing else works
- If translation loses nuance, synthesis will be garbage

Then **1** (briefing) and **5** (synthesis).

**6, 7, 8** are important but come after we prove the core extraction works.

---

## Testing Approach

For each use case:
1. Define sample inputs (collaboration contexts, user responses)
2. Write the prompt
3. Run against LLM
4. Evaluate output quality
5. Iterate on prompt until it works

The hypothesis-testing folder will contain prompts and test cases for each.
