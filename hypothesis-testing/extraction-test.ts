/**
 * Extraction Hypothesis Test
 *
 * Goal: Can the LLM extract structured concerns/desires from natural conversation,
 * in context of the collaboration?
 */

import { Collaboration, ExtractionInput, ExtractionOutput } from './types';

// --- The Extraction Prompt ---

export const EXTRACTION_SYSTEM_PROMPT = `You are helping facilitate a collaboration. Your job is to extract structured information from what a participant says.

Given the collaboration context and what the participant said, extract:
1. CONCERNS - Things they're worried about, hard requirements, dealbreakers
2. DESIRES - Things they'd love, preferences, nice-to-haves
3. CONSTRAINTS - Any absolute requirements that should apply to everyone
4. FOLLOW-UP QUESTIONS - Things you'd ask to better understand their needs

For each concern/desire:
- Capture what they said (quote)
- Identify the underlying need/want (the deeper reason)
- Assess intensity on 1-4 scale:
  - 1: Minor - nice to have
  - 2: Preferred - this matters to me
  - 3: Important - I really need this addressed
  - 4: Non-negotiable - I will not participate without this
- Propose a question to dig deeper toward the emotional bedrock (why this really matters)

Be careful to:
- Only extract what's actually there (don't over-interpret)
- Distinguish concerns (problems) from desires (wants)
- Identify things that affect everyone (constraints) vs personal preferences

Respond in JSON format matching this structure:
{
  "extractions": [
    {
      "quote": "exact text from their message",
      "type": "concern" or "desire",
      "summary": "brief description",
      "underlying": "the deeper need/want",
      "intensity": 1-4,
      "digDeeper": "question to ask next to get to bedrock"
    }
  ],
  "newConstraints": ["things that should apply to everyone"],
  "participant": "name"
}`;

export function buildExtractionUserPrompt(input: ExtractionInput): string {
  const { collaboration, participant, conversation } = input;

  const whenState = collaboration.when ? `When: ${collaboration.when}` : 'When: not decided';
  const whereState = collaboration.where ? `Where: ${collaboration.where}` : 'Where: not decided';

  const concerns = collaboration.concerns.length > 0
    ? collaboration.concerns.map(c => `- ${c.text} (${c.need})`).join('\n')
    : '- None yet';

  const desires = collaboration.desires.length > 0
    ? collaboration.desires.map(d => `- ${d.text} (${d.want})`).join('\n')
    : '- None yet';

  const constraints = collaboration.constraints.length > 0
    ? collaboration.constraints.map(c => `- ${c}`).join('\n')
    : '- None yet';

  return `## Collaboration Context

**What:** ${collaboration.outcome}
**Creator:** ${collaboration.creator}
**Participants:** ${collaboration.participants.join(', ')}
**Current state:** ${whenState}, ${whereState}

**Already known concerns:**
${concerns}

**Already known desires:**
${desires}

**Constraints:**
${constraints}

---

## Participant Input

**${participant} says:**
"${conversation}"

---

Extract concerns, desires, constraints, and follow-up questions from what ${participant} said.`;
}

// --- Test Cases: Potluck Scenario ---

export const POTLUCK_INITIAL: Collaboration = {
  outcome: "Neighborhood potluck in the park",
  when: null,
  where: null,
  creator: "Sarah",
  participants: ["Sarah"],
  concerns: [],
  desires: [],
  constraints: []
};

export const TEST_CASES: ExtractionInput[] = [
  // Test 1: Sarah (creator) - has transit need and time preference
  {
    collaboration: POTLUCK_INITIAL,
    participant: "Sarah",
    conversation: "I thought it would be nice to get the neighborhood together for a potluck. I don't have a car so wherever we do it needs to be on a bus line. Afternoons work best for me since I work mornings."
  },

  // Test 2: Mike - budget concern and specific contribution desire
  {
    collaboration: {
      ...POTLUCK_INITIAL,
      participants: ["Sarah", "Mike"],
      concerns: [
        {
          participant: "Sarah",
          text: "I don't have a car so wherever we do it needs to be on a bus line",
          need: "transit_access",
          intensity: "high"
        }
      ],
      desires: [
        {
          participant: "Sarah",
          text: "Afternoons work best for me since I work mornings",
          want: "afternoon_timing",
          intensity: "medium"
        }
      ]
    },
    participant: "Mike",
    conversation: "Sounds like a great idea! I'd like to keep costs reasonable - maybe everyone stays under $20? I make a killer chili that I'd love to bring if that works."
  },

  // Test 3: Jordan - allergy (should become constraint) and desire
  {
    collaboration: {
      ...POTLUCK_INITIAL,
      participants: ["Sarah", "Mike", "Jordan"],
      concerns: [
        {
          participant: "Sarah",
          text: "I don't have a car so wherever we do it needs to be on a bus line",
          need: "transit_access",
          intensity: "high"
        },
        {
          participant: "Mike",
          text: "I'd like to keep costs reasonable - maybe everyone stays under $20",
          need: "budget_limit",
          intensity: "medium"
        }
      ],
      desires: [
        {
          participant: "Sarah",
          text: "Afternoons work best for me",
          want: "afternoon_timing",
          intensity: "medium"
        },
        {
          participant: "Mike",
          text: "I make a killer chili that I'd love to bring",
          want: "bring_specific_dish",
          intensity: "medium"
        }
      ],
      constraints: []
    },
    participant: "Jordan",
    conversation: "Count me in! I should mention I have a severe nut allergy - it's actually life-threatening so we'd need to make sure all food is labeled. On a happier note, it would be absolutely amazing if we could have some live music! I know a guy who plays guitar."
  },

  // Test 4: Pat - minimal input, vague preferences
  {
    collaboration: {
      ...POTLUCK_INITIAL,
      participants: ["Sarah", "Mike", "Jordan", "Pat"],
      concerns: [
        {
          participant: "Sarah",
          text: "needs to be on a bus line",
          need: "transit_access",
          intensity: "high"
        },
        {
          participant: "Mike",
          text: "keep costs under $20",
          need: "budget_limit",
          intensity: "medium"
        },
        {
          participant: "Jordan",
          text: "severe nut allergy - life-threatening",
          need: "nut_free_safety",
          intensity: "high"
        }
      ],
      desires: [
        {
          participant: "Sarah",
          text: "Afternoons work best",
          want: "afternoon_timing",
          intensity: "medium"
        },
        {
          participant: "Mike",
          text: "bring his chili",
          want: "bring_specific_dish",
          intensity: "medium"
        },
        {
          participant: "Jordan",
          text: "live music",
          want: "entertainment",
          intensity: "medium"
        }
      ],
      constraints: ["All food must be clearly labeled for allergens"]
    },
    participant: "Pat",
    conversation: "Yeah sure, I can come. Weekends are better for me. I don't really cook much so I hope I can just bring drinks or something simple."
  }
];

// --- Evaluation Criteria ---

export const EVALUATION_CRITERIA = {
  test1_sarah: {
    expectedConcerns: 1,  // transit access
    expectedDesires: 1,   // afternoon timing
    mustIdentify: ["transit", "bus"],
    intensityCheck: "transit should be high (no car = hard requirement)",
    shouldNotOverInterpret: "don't invent concerns about parking, weather, etc."
  },

  test2_mike: {
    expectedConcerns: 1,  // budget
    expectedDesires: 1,   // bring chili
    mustIdentify: ["budget", "$20", "chili"],
    intensityCheck: "budget is medium (reasonable, not absolute), chili is medium (would love, not need)",
    shouldNotOverInterpret: "don't assume he's poor or has dietary restrictions"
  },

  test3_jordan: {
    expectedConcerns: 1,  // nut allergy
    expectedDesires: 1,   // live music
    expectedConstraints: 1, // allergen labeling should become constraint
    mustIdentify: ["nut allergy", "life-threatening", "labeled", "music", "guitar"],
    intensityCheck: "allergy is HIGH (life-threatening), music is medium (amazing but not required)",
    keyTest: "Does AI recognize this should be a constraint for everyone, not just a personal concern?"
  },

  test4_pat: {
    expectedConcerns: 0,  // weekends is more preference than concern
    expectedDesires: 2,   // weekend timing, simple contribution
    mustIdentify: ["weekend", "drinks", "simple"],
    intensityCheck: "both are low-medium (casual participant)",
    followUpExpected: "AI should want to ask: any dietary restrictions? what kind of drinks?",
    keyTest: "Does AI recognize this is a low-commitment participant and not over-extract?"
  }
};
