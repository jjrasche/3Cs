/**
 * Synthesis Hypothesis Test
 *
 * Goal: Can the LLM take all extracted concerns/desires and produce
 * proposals that make people say "yeah, that works"?
 */

import { Collaboration, SynthesisInput, SynthesisOutput } from './types';

// --- The Synthesis Prompt ---

export const SYNTHESIS_SYSTEM_PROMPT = `You are helping a group reach consensus. Your job is to synthesize everyone's concerns and desires into concrete proposals.

Given the collaboration context with all participants' concerns and desires, generate proposals that:
1. Address as many concerns as possible (especially high-intensity ones)
2. Incorporate desires where feasible
3. Respect all constraints
4. Are specific and actionable

For each question that needs resolving (when, where, etc.), provide:
- A concrete proposal
- Rationale explaining how it addresses the needs
- Which specific concerns/desires it satisfies

Also identify any tensions that can't be fully resolved and suggest options.

The goal is "consensus through obviousness" - proposals so reasonable that people go "yeah, that works" without needing to vote.

Be creative in synthesis:
- "Hiking vs brunch" might become "scenic picnic spot"
- Look for third options that address underlying needs
- Don't just average preferences, find solutions

Respond in JSON format:
{
  "proposals": [
    {
      "question": "what this resolves",
      "proposal": "the specific proposal",
      "rationale": "how this addresses needs",
      "addressedConcerns": ["list of concerns this satisfies"],
      "addressedDesires": ["list of desires this incorporates"]
    }
  ],
  "unresolvedTensions": [
    {
      "description": "what's conflicting",
      "concernsInvolved": ["which concerns"],
      "possibleResolutions": ["options to consider"]
    }
  ]
}`;

export function buildSynthesisUserPrompt(input: SynthesisInput): string {
  const { collaboration, questionsToResolve } = input;

  const formatConcern = (c: typeof collaboration.concerns[0]) =>
    `- ${c.participant}: "${c.text}" (need: ${c.need})`;

  const formatDesire = (d: typeof collaboration.desires[0]) =>
    `- ${d.participant}: "${d.text}" (want: ${d.want})`;

  const highConcerns = collaboration.concerns
    .filter(c => c.intensity === 'high')
    .map(formatConcern)
    .join('\n') || '- None';

  const mediumConcerns = collaboration.concerns
    .filter(c => c.intensity === 'medium')
    .map(formatConcern)
    .join('\n') || '- None';

  const lowConcerns = collaboration.concerns
    .filter(c => c.intensity === 'low')
    .map(formatConcern)
    .join('\n') || '- None';

  const highDesires = collaboration.desires
    .filter(d => d.intensity === 'high')
    .map(formatDesire)
    .join('\n') || '- None';

  const mediumDesires = collaboration.desires
    .filter(d => d.intensity === 'medium')
    .map(formatDesire)
    .join('\n') || '- None';

  const lowDesires = collaboration.desires
    .filter(d => d.intensity === 'low')
    .map(formatDesire)
    .join('\n') || '- None';

  const constraintsList = collaboration.constraints
    .map(c => `- ${c}`)
    .join('\n') || '- None';

  const questionsList = questionsToResolve
    .map(q => `- ${q}`)
    .join('\n');

  return `## Collaboration Context

**What:** ${collaboration.outcome}
**Participants:** ${collaboration.participants.join(', ')}

---

## All Concerns (by intensity)

**HIGH intensity (must address):**
${highConcerns}

**MEDIUM intensity (should address):**
${mediumConcerns}

**LOW intensity (nice to address):**
${lowConcerns}

---

## All Desires (by intensity)

**HIGH intensity:**
${highDesires}

**MEDIUM intensity:**
${mediumDesires}

**LOW intensity:**
${lowDesires}

---

## Constraints (must be satisfied)

${constraintsList}

---

## Questions to Resolve

${questionsList}

---

Generate proposals for each question that address the concerns and incorporate the desires.`;
}

// --- Test Case: Potluck After All Extraction ---

export const POTLUCK_AFTER_EXTRACTION: Collaboration = {
  outcome: "Neighborhood potluck in the park",
  when: null,
  where: null,
  creator: "Sarah",
  participants: ["Sarah", "Mike", "Jordan", "Pat"],

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
    },
    {
      participant: "Jordan",
      text: "I have a severe nut allergy - it's life-threatening",
      need: "nut_free_safety",
      intensity: "high"
    }
  ],

  desires: [
    {
      participant: "Sarah",
      text: "Afternoons work best for me since I work mornings",
      want: "afternoon_timing",
      intensity: "medium"
    },
    {
      participant: "Mike",
      text: "I make a killer chili that I'd love to bring",
      want: "bring_specific_dish",
      intensity: "medium"
    },
    {
      participant: "Jordan",
      text: "It would be amazing if we could have some live music - I know a guy",
      want: "live_music",
      intensity: "medium"
    },
    {
      participant: "Pat",
      text: "Weekends are better for me",
      want: "weekend_timing",
      intensity: "low"
    },
    {
      participant: "Pat",
      text: "I hope I can just bring drinks or something simple",
      want: "simple_contribution",
      intensity: "low"
    }
  ],

  constraints: [
    "All food must be clearly labeled for allergens (nut-free safety)"
  ]
};

export const SYNTHESIS_TEST_INPUT: SynthesisInput = {
  collaboration: POTLUCK_AFTER_EXTRACTION,
  questionsToResolve: [
    "When should we do this?",
    "Where should we do this?",
    "What should people bring?"
  ]
};

// --- Evaluation Criteria ---

export const SYNTHESIS_EVALUATION = {
  when: {
    mustAddress: ["Sarah's afternoon preference", "Pat's weekend preference"],
    expectedProposal: "Saturday or Sunday afternoon",
    goodRationale: "Explains why this satisfies both Sarah (afternoon) and Pat (weekend)"
  },

  where: {
    mustAddress: ["Sarah's transit access (HIGH)"],
    expectedProposal: "Specific park on bus line",
    goodRationale: "Explicitly mentions bus accessibility",
    creativeBonus: "Suggests covered area for weather, mentions accessibility features"
  },

  whatToBring: {
    mustAddress: [
      "Jordan's nut allergy (HIGH) via labeling",
      "Mike's budget concern",
      "Mike's desire to bring chili",
      "Pat's desire for simple contribution"
    ],
    expectedProposal: "Potluck with categories, all labeled, drinks welcome",
    goodRationale: "Explains labeling requirement, validates Mike's chili and Pat's drinks",
    creativeBonus: "Suggests coordination to avoid duplicates, mentions budget-friendly options"
  },

  liveMusicTension: {
    description: "Jordan wants live music but it's not core to potluck",
    goodHandling: "Mentions as enhancement, suggests Jordan's guitar friend, doesn't make it required",
    badHandling: "Ignores it entirely or makes it a blocker"
  },

  overallQuality: {
    consensusThroughObviousness: "Would people go 'yeah, that works'?",
    creativeSynthesis: "Did it find solutions, not just compromises?",
    nothingMissed: "Are all HIGH intensity concerns addressed?",
    actionable: "Are proposals specific enough to act on?"
  }
};
