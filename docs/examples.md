# Worked Examples

These examples trace collaborations through all three Cs to show how the system works in practice.

---

## Example 1: The Potluck

A group of 12 neighbors wants to organize a potluck in the park.

### Connection Phase

**Starting point:** One person has the idea and a few neighbors in mind.

**AI helps expand:**
- "You mentioned wanting to meet more neighbors—want to invite the folks on Oak Street?"
- "Three people in your contacts have expressed interest in neighborhood events"

**Outcome:** 12 participants confirmed

---

### Consensus Phase

**Open questions to resolve:**
- When?
- Where?
- What kind of food?
- Budget expectations?

**AI extracts needs/wants from each participant:**

| Participant | Concern (Need) | Desire (Want) |
|-------------|----------------|---------------|
| Sarah | Must be accessible by transit | Prefers afternoon |
| Mike | Needs to stay under $20 | Wants to bring his famous chili |
| Jordan | Has severe nut allergy | Would love live music |
| Pat | Can only do weekends | Prefers park over someone's house |

**AI synthesizes positions:**

"Looks like Saturday afternoon works for most people, and there's a strong preference for the park. Sarah needs transit access—Riverside Park is on the bus line and has a covered pavilion in case of weather. Does this work?"

**Reactions:**
- Most: "Yeah, that works"
- One person: "I was hoping for Sunday"
- AI: "Would Saturday work for you, or is Sunday a hard requirement?"
- "Saturday's fine, just preferred Sunday"

**Consensus artifacts:**
- Date/time: Saturday, 3pm
- Location: Riverside Park, covered pavilion
- Food: Potluck style, variety encouraged, nut-free labels required
- Budget: Nothing over $20

---

### Coordination Phase

**AI generates initial assignments:**

Based on what people said they wanted to bring and identified gaps:

| Assignment | Person | Status |
|------------|--------|--------|
| Chili | Mike | Confirmed |
| Salad | Sarah | Confirmed |
| Dessert | Jordan | Confirmed |
| Drinks | Pat | Confirmed |
| Plates/utensils | ? | Gap |
| Tables | ? | Gap |

**AI addresses gaps:**

"We need someone to bring plates and utensils. Anyone able to handle that?"

Two people volunteer → AI assigns one, notes the other as backup.

"Does anyone have folding tables? We'll need at least two for food."

One person has tables but no way to transport them → AI matches with someone who has a truck.

**Logistics optimization:**

- Setup crew: Randomly assigned, AI checks for objections
- Cleanup crew: Different people, balanced workload
- Reminders: Sent day before and morning of

**Escalation example:**

Nobody wants to bring a main dish besides Mike's chili.

AI escalates to consensus: "We're short on mains. Options: someone volunteers, we order pizza for $5/person, or we make it appetizers and desserts only. Which works?"

Group votes for appetizers-and-desserts approach → AI updates coordination assignments.

---

### Outcome

The potluck happens. No single organizer. Everyone contributed to the decisions that mattered to them. Logistics were handled automatically. When gaps emerged, they escalated cleanly.

---

## Example 2: The Pop-Up Renaissance Fair

A more ambitious collaboration: 200 strangers creating a one-day renaissance fair in a forest clearing.

### Connection Phase

**Starting point:** Someone posts the idea publicly.

**AI helps with discovery:**
- Surfaces the collaboration to people who've expressed interest in: outdoor events, crafts, medieval history, community building
- Matches by location (within 2-hour drive)
- Matches by complementary skills (someone wants to organize jousting, someone has horses)

**Trust at scale:**
- Phone number verification required
- Commitment tracking visible (have they followed through on past collaborations?)
- Clear obligations stated upfront

**Outcome:** 200 participants, most strangers to each other

---

### Consensus Phase

**The challenge:** 200 people need to agree on what this thing even is.

**AI structures the conversation:**

Rather than open discussion (chaos), AI asks each participant:
- "What excites you about this?"
- "What concerns you?"
- "What would you want to contribute?"

**AI clusters responses:**

Concerns cluster into themes:
- Safety (30% mentioned)
- Parking/access (25%)
- Weather contingency (20%)
- Cost (15%)
- Authenticity vs. fun (10%)

Desires cluster into themes:
- Food and drink (40%)
- Performances/entertainment (35%)
- Crafts and vendors (30%)
- Immersive experience (25%)
- Kid-friendly activities (20%)

**AI surfaces tensions:**

"There's a split on alcohol: 70% want it, 30% have concerns (driving, family-friendly, cost). Options to consider: separate beer garden area, limit to historically-accurate mead, or keep it dry."

**AI proposes synthesis:**

"Based on input, here's a proposal:
- Location: [Forest clearing] with backup indoor venue for rain
- Date: [Spring Saturday] with rain date the following week
- Structure: Food court, performance stage, craft vendors, kids area, beer garden (separate, wristband required)
- Budget: $15/person covers shared costs
- Safety: First aid station, clear parking, emergency plan

Does this work, or what needs adjustment?"

**Iteration:**
- Several people push back on $15 (too high for families)
- AI adjusts: "$10/person, kids free"
- Others want more clarity on the beer garden
- AI elaborates: "21+, separate area, can bring own chair"

**Consensus reached** through successive refinement, not formal voting.

**Fork example:**

A faction of 30 people wanted a "hardcore authentic" experience—no modern conveniences, period-accurate everything. They couldn't compromise with the "fun for everyone" majority.

AI offers fork: "Looks like there are two visions here. Want to split into two events? The main fair and a separate 'Authentic Experience' camp?"

They fork. Both events happen. Some people attend both.

---

### Coordination Phase

**Work Breakdown Structure:**

Consensus established the mandate. Now it decomposes:

```
Renaissance Fair (Outcome)
├── Venue & Logistics
│   ├── Secure location permits
│   ├── Arrange parking
│   ├── Setup/teardown crew
│   └── Emergency plan
├── Food Court
│   ├── Recruit vendors
│   ├── Coordinate equipment
│   └── Health/safety compliance
├── Entertainment
│   ├── Stage construction
│   ├── Performance schedule
│   └── Sound equipment
├── Beer Garden
│   ├── Licensing
│   ├── Wristband system
│   └── Staffing
└── Kids Area
    ├── Activities
    ├── Supervision
    └── Safety
```

**AI assigns and tracks:**

- Tasks assigned based on expressed interests and skills
- Dependencies identified (can't schedule performances until stage is confirmed)
- Gaps flagged early
- Reminders sent at appropriate intervals

**Escalation examples:**

1. **Resource conflict:** Two groups both need the generator at the same time
   - AI tries to optimize (shift one's timing)
   - If can't resolve: escalates to consensus ("Should we rent a second generator for $50?")

2. **Commitment failure:** Someone who committed to building the stage drops out
   - AI redistributes tasks
   - If can't cover: escalates ("Stage construction is at risk. Options: simplify design, recruit more help, or cut the performance schedule")

3. **Significant change:** Weather forecast shows rain on event day
   - AI escalates: "Rain likely. Options: move to rain date, shift to indoor backup, or proceed with rain plan"

---

### Outcome

200 strangers successfully create a one-day event. No single organizer. Consensus formed through AI-mediated synthesis. Coordination handled autonomously with clean escalation when needed. A faction forked to do their own thing—and that's fine.

---

## Key Patterns Across Examples

### The Feedback Loop in Action

Both examples show coordination surfacing gaps that escalate to consensus:
- Potluck: No mains → consensus on appetizers-only
- Fair: Stage builder drops out → consensus on simplified design

This is normal, not failure. The system handles it cleanly.

### Consensus Through Obviousness

In both cases, explicit voting was rare. AI proposed syntheses that addressed stated needs, and people went "yeah, that works." The voting that did happen was on genuinely contested issues, not logistics.

### AI as Buffer

Disagreements were with proposals, not people:
- "I have concerns about the $15 price" (not "Mike's being cheap")
- "The beer garden needs more clarity" (not "Jordan's being difficult")

This made conflict productive rather than personal.

### Forking as Positive Outcome

The renaissance fair fork wasn't failure—it was right-sizing. Two groups with incompatible visions both got what they wanted. The system made divergence easy and non-dramatic.

### Scale Difference

The potluck (12 people) and fair (200 people) use the same mechanics, but:
- Fair needed more structure (WBS, formal phases)
- Fair needed trust mechanisms (verification, commitment tracking)
- Fair had more complex clustering (more voices to synthesize)

The framework scales, but larger collaborations need more explicit scaffolding.
