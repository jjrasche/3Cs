# Minimum Context Structure for LLM

What does the LLM need to know about a collaboration to brief an invitee and extract their concerns/desires?

---

## The Structure

```javascript
{
  // What is this?
  outcome: "Potluck in the park with neighbors",
  type: "event", // event, project, trip, ongoing

  // Who's involved?
  creator: {
    name: "Sarah",
    relationship: "neighbor on Oak Street" // context for invitee
  },
  participants: [
    { name: "Mike", joined: "2 days ago" },
    { name: "Jordan", joined: "1 day ago" }
  ],
  invitee: {
    name: "Pat",
    invitedBy: "Sarah",
    relationship: "neighbor" // how they know the creator
  },

  // Current state
  state: "forming", // forming, deciding, coordinating, complete

  // What's decided vs open
  decided: [
    // empty for new collaboration
  ],
  open: [
    { question: "When?", context: "Looking at weekends in the next month" },
    { question: "Where?", context: "Somewhere in the neighborhood" },
    { question: "What kind of food?", context: "Potluck style" }
  ],

  // What we already know from other participants (summarized)
  landscape: {
    concerns: [
      "Sarah needs transit access",
      "Mike wants to keep it under $20",
      "Jordan has a nut allergy"
    ],
    desires: [
      "Sarah prefers afternoon",
      "Mike wants to bring his famous chili",
      "Jordan would love live music"
    ]
  },

  // Constraints (hard requirements already established)
  constraints: [
    "Must be nut-free or clearly labeled"
  ]
}
```

---

## Example: Potluck at Invitation Stage

```javascript
{
  outcome: "Neighborhood potluck in the park",
  type: "event",

  creator: {
    name: "Sarah",
    relationship: "your neighbor on Oak Street"
  },
  participants: [
    { name: "Mike", joined: "2 days ago" },
    { name: "Jordan", joined: "yesterday" }
  ],
  invitee: {
    name: "Pat",
    invitedBy: "Sarah",
    relationship: "neighbor"
  },

  state: "forming",

  decided: [],

  open: [
    { question: "When should we do this?", context: "Looking at weekends" },
    { question: "Where exactly?", context: "Somewhere accessible in the neighborhood" },
    { question: "What food setup?", context: "Potluck - everyone brings something" },
    { question: "Budget expectations?", context: "Not discussed yet" }
  ],

  landscape: {
    concerns: [
      "Sarah needs it to be transit accessible",
      "Jordan has a severe nut allergy - needs clear labeling"
    ],
    desires: [
      "Sarah prefers afternoon timing",
      "Mike wants to bring his famous chili",
      "Jordan would love if there was live music"
    ]
  },

  constraints: [
    "All food must be labeled for allergens"
  ]
}
```

---

## What This Enables

**Briefing:**
> "Sarah invited you to a neighborhood potluck she's organizing. Mike and Jordan have already joined. They're figuring out when and where to do it - looking at weekends at a spot in the neighborhood. A few things have come up: Sarah needs somewhere transit accessible, and Jordan has a nut allergy so food will need labels. What matters to you about this?"

**Contextual extraction:**
The LLM knows:
- This is a casual neighborhood event, not a work project
- Timing, location, food are open questions
- Transit access and allergies are already concerns
- It can ask about things like "Any dietary restrictions?" or "Weekend timing work for you?"

**Avoiding redundancy:**
The LLM won't ask about nut allergies again - it's already a constraint. It can focus on what's NOT yet surfaced.

---

## What's Missing / Questions

1. **How much landscape detail?** Do we show all concerns/desires from others, or just summaries? Too much might bias the invitee.

2. **Intensity?** Should the landscape show how much people care about each thing?

3. **Governance?** How decisions will be made - might affect what concerns people raise.

4. **History?** What's been discussed/rejected already?

---

## Next Step

Use this structure to write the briefing + extraction prompts. Test with the potluck scenario and see:
- Does the LLM produce good briefs?
- Does it ask contextually relevant questions?
- Does it avoid redundant extraction?
