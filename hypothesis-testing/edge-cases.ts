/**
 * Edge Case Tests
 *
 * Tests for difficult scenarios:
 * 1. Conflicting constraints that can't both be satisfied
 * 2. Anonymous constraints forcing difficult tradeoffs
 * 3. Profile constraints that contradict new collaboration needs
 *
 * Usage:
 *   npx ts-node edge-cases.ts [1|2|3|all]
 */

import 'dotenv/config';
import Groq from 'groq-sdk';
import { Constraint, Collaboration, UserProfile } from './types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const MODEL = 'llama-3.3-70b-versatile';

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 2000
  });

  return response.choices[0]?.message?.content || '';
}

function parseJSON<T>(text: string): T | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    return null;
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    return null;
  }
}

// =============================================================================
// EDGE CASE 1: Conflicting Constraints
// =============================================================================
//
// Scenario: Two constraints that cannot both be satisfied
// - Sarah: "Must be on a bus line" (no car)
// - Mike: "Must have free parking" (driving from suburbs)
// - The only affordable venues either have parking OR bus access, not both
//
// Expected behavior: AI surfaces this as an unresolved tension with options

const CONFLICT_SYNTHESIS_PROMPT = `You are helping a group reach consensus on a collaboration.

The collaboration has constraints from participants. Some constraints may conflict - meaning no single solution can satisfy all of them.

When you encounter conflicts:
1. Clearly identify the tension
2. Explain why they conflict
3. Propose options that satisfy SOME constraints (not all)
4. Suggest how the group might resolve the conflict

Be honest about tradeoffs. Don't pretend a solution works when it doesn't.

Respond in JSON:
{
  "proposals": [
    {
      "question": "what this answers",
      "proposal": "the proposal",
      "satisfies": ["constraints this satisfies"],
      "violates": ["constraints this violates"],
      "rationale": "why this tradeoff might be acceptable"
    }
  ],
  "conflicts": [
    {
      "description": "what's conflicting",
      "constraintsInvolved": ["constraint 1", "constraint 2"],
      "whyConflict": "explanation",
      "resolutionOptions": ["option 1", "option 2"]
    }
  ]
}`;

const CONFLICT_TEST: Collaboration = {
  outcome: "Neighborhood potluck",
  when: "Saturday afternoon",
  where: null,
  creator: "Sarah",
  participants: ["Sarah", "Mike", "Jordan", "Pat"],
  concerns: [],
  desires: [],
  constraints: [
    {
      text: "Location must be on a bus line - no car available",
      anonymous: false,
      participantId: "sarah-123",
      addedAt: new Date()
    },
    {
      text: "Location must have free parking - driving from suburbs",
      anonymous: false,
      participantId: "mike-456",
      addedAt: new Date()
    },
    {
      text: "Budget under $50 total for venue rental",
      anonymous: false,
      participantId: "pat-789",
      addedAt: new Date()
    },
    {
      text: "Wheelchair accessible venue required",
      anonymous: false,
      participantId: "jordan-012",
      addedAt: new Date()
    }
  ]
};

async function runConflictTest() {
  console.log('='.repeat(80));
  console.log('EDGE CASE 1: Conflicting Constraints');
  console.log('='.repeat(80));
  console.log(`Model: ${MODEL}\n`);

  console.log('📝 SCENARIO:\n');
  console.log('Constraints that may conflict:');
  CONFLICT_TEST.constraints.forEach(c => {
    console.log(`  • ${c.text}`);
  });
  console.log('\nThe challenge: Affordable venues typically have EITHER bus access');
  console.log('OR parking, rarely both. Can the AI identify and handle this?\n');

  const constraintList = CONFLICT_TEST.constraints
    .map(c => `[${c.participantId}] ${c.text}`)
    .join('\n');

  const userPrompt = `Collaboration: ${CONFLICT_TEST.outcome}
When: ${CONFLICT_TEST.when}
Participants: ${CONFLICT_TEST.participants.join(', ')}

Constraints:
${constraintList}

Question to resolve: Where should we hold the potluck?

Note: In this area, affordable venues (under $50) typically have either bus access OR parking, but rarely both. More expensive venues ($100+) might have both.`;

  try {
    const rawResponse = await callLLM(CONFLICT_SYNTHESIS_PROMPT, userPrompt);
    const result = parseJSON<any>(rawResponse);

    if (result) {
      console.log('📤 OUTPUT:\n');

      if (result.conflicts && result.conflicts.length > 0) {
        console.log('⚠️  CONFLICTS IDENTIFIED:\n');
        result.conflicts.forEach((c: any, i: number) => {
          console.log(`${i + 1}. ${c.description}`);
          console.log(`   Constraints: ${c.constraintsInvolved.join(' vs ')}`);
          console.log(`   Why: ${c.whyConflict}`);
          console.log(`   Options: ${c.resolutionOptions.join('; ')}`);
          console.log('');
        });
      }

      if (result.proposals && result.proposals.length > 0) {
        console.log('💡 PROPOSALS (with tradeoffs):\n');
        result.proposals.forEach((p: any, i: number) => {
          console.log(`Proposal ${i + 1}: ${p.proposal}`);
          console.log(`   ✅ Satisfies: ${p.satisfies.join(', ')}`);
          console.log(`   ❌ Violates: ${p.violates.join(', ')}`);
          console.log(`   Rationale: ${p.rationale}`);
          console.log('');
        });
      }

      console.log('✅ EVALUATION:');
      console.log('   - Did it identify the bus vs parking conflict?');
      console.log('   - Did it propose options with clear tradeoffs?');
      console.log('   - Did it suggest resolution options (carpool, budget increase)?');
    } else {
      console.log('❌ Failed to parse response');
      console.log('Raw:', rawResponse);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// =============================================================================
// EDGE CASE 2: Anonymous Constraint Tradeoff
// =============================================================================
//
// Scenario: An anonymous constraint forces a difficult choice
// - Anonymous: "Cannot be at venue X" (maybe had a bad experience there)
// - Everyone else prefers venue X because it's perfect otherwise
//
// Expected behavior: AI proposes alternatives without revealing or speculating
// about who has the constraint or why

const ANON_TRADEOFF_PROMPT = `You are helping a group reach consensus.

Some constraints are anonymous - you know what's needed but not who needs it or why.

CRITICAL RULES for anonymous constraints:
1. Never speculate about WHO has the anonymous constraint
2. Never speculate about WHY they have it
3. Treat it as equally valid as attributed constraints
4. If it forces a difficult choice, present the tradeoff neutrally

Respond in JSON:
{
  "proposals": [
    {
      "question": "what this answers",
      "proposal": "the proposal",
      "rationale": "how this addresses constraints",
      "constraintsSatisfied": ["list"]
    }
  ],
  "notes": "any important observations about tradeoffs"
}`;

const ANON_TRADEOFF_TEST: Collaboration = {
  outcome: "Team offsite meeting",
  when: "Next Friday",
  where: null,
  creator: "Alex",
  participants: ["Alex", "Blake", "Casey", "Dana"],
  concerns: [],
  desires: [],
  constraints: [
    {
      text: "Cannot be held at The Grand Hotel",
      anonymous: true,  // Someone has a reason but doesn't want to share
      participantId: "casey-789",
      addedAt: new Date()
    },
    {
      text: "Needs presentation equipment (projector, screen)",
      anonymous: false,
      participantId: "alex-123",
      addedAt: new Date()
    },
    {
      text: "Must have catering available",
      anonymous: false,
      participantId: "blake-456",
      addedAt: new Date()
    },
    {
      text: "Budget under $500 for venue",
      anonymous: false,
      participantId: "dana-012",
      addedAt: new Date()
    }
  ]
};

async function runAnonTradeoffTest() {
  console.log('='.repeat(80));
  console.log('EDGE CASE 2: Anonymous Constraint Tradeoff');
  console.log('='.repeat(80));
  console.log(`Model: ${MODEL}\n`);

  console.log('📝 SCENARIO:\n');
  console.log('Constraints:');
  ANON_TRADEOFF_TEST.constraints.forEach(c => {
    const tag = c.anonymous ? '[ANONYMOUS]' : `[${c.participantId}]`;
    console.log(`  ${tag} ${c.text}`);
  });
  console.log('\nThe challenge: The Grand Hotel is the only venue that meets');
  console.log('all other requirements under budget. Can the AI handle the');
  console.log('anonymous veto without speculating about who or why?\n');

  const constraintList = ANON_TRADEOFF_TEST.constraints
    .map(c => {
      const tag = c.anonymous ? '[anonymous]' : `[${c.participantId}]`;
      return `${tag} ${c.text}`;
    })
    .join('\n');

  const userPrompt = `Collaboration: ${ANON_TRADEOFF_TEST.outcome}
When: ${ANON_TRADEOFF_TEST.when}
Participants: ${ANON_TRADEOFF_TEST.participants.join(', ')}

Constraints:
${constraintList}

Question to resolve: Where should we hold the offsite?

Context: The Grand Hotel would be perfect - it has presentation equipment, catering, and is under budget at $450. However, one anonymous constraint rules it out. The next best option is Conference Center B at $480, which meets most needs but requires renting separate AV equipment ($75).`;

  try {
    const rawResponse = await callLLM(ANON_TRADEOFF_PROMPT, userPrompt);
    const result = parseJSON<any>(rawResponse);

    if (result) {
      console.log('📤 OUTPUT:\n');

      if (result.proposals && result.proposals.length > 0) {
        result.proposals.forEach((p: any, i: number) => {
          console.log(`Proposal ${i + 1}: ${p.proposal}`);
          console.log(`   Rationale: ${p.rationale}`);
          console.log(`   Satisfies: ${p.constraintsSatisfied.join(', ')}`);
          console.log('');
        });
      }

      if (result.notes) {
        console.log(`📋 Notes: ${result.notes}\n`);
      }

      console.log('✅ EVALUATION:');
      console.log('   - Did it avoid speculating about who has the anonymous constraint?');
      console.log('   - Did it avoid speculating about why?');
      console.log('   - Did it treat the anonymous constraint as valid (not dismissible)?');
      console.log('   - Did it find an alternative or explain the budget tradeoff?');
    } else {
      console.log('❌ Failed to parse response');
      console.log('Raw:', rawResponse);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// =============================================================================
// EDGE CASE 3: Profile Contradiction
// =============================================================================
//
// Scenario: User's profile constraints contradict new collaboration needs
// - Profile: "Prefers indoor venues" (seasonal allergies)
// - New collaboration: Hiking trip (inherently outdoor)
//
// Expected behavior: AI flags the contradiction and asks how to proceed

const PROFILE_CONTRADICTION_PROMPT = `You are helping a returning user join a new collaboration.

The user has constraints from their profile (learned from past collaborations). Some may contradict this new collaboration's nature.

When you find contradictions:
1. Clearly identify the conflict
2. Don't assume it's a dealbreaker - the user may be willing to make exceptions
3. Suggest how they might participate despite the contradiction
4. Ask for clarification if needed

Respond in JSON:
{
  "suggestedConstraints": [
    {
      "constraint": "text",
      "relevance": "why relevant",
      "confidence": "high|medium|low"
    }
  ],
  "contradictions": [
    {
      "profileConstraint": "the constraint",
      "collaborationType": "what about this collaboration conflicts",
      "possibleResolutions": ["how they might still participate"]
    }
  ],
  "questions": ["clarifying questions to ask the user"]
}`;

const PROFILE_CONTRADICTION_TEST = {
  userProfile: {
    odId: "user-123",
    learnedConstraints: [
      "Prefers indoor venues - seasonal allergies",
      "Needs wheelchair accessible locations",
      "Vegetarian dietary restriction",
      "Prefers morning activities"
    ]
  },
  newCollaboration: {
    outcome: "Group hiking trip to mountain trail",
    description: "Day hike on a moderate trail, 5 miles round trip. Pack lunch, meet at trailhead at 9am."
  }
};

async function runProfileContradictionTest() {
  console.log('='.repeat(80));
  console.log('EDGE CASE 3: Profile Contradiction');
  console.log('='.repeat(80));
  console.log(`Model: ${MODEL}\n`);

  console.log('📝 SCENARIO:\n');
  console.log('Profile constraints:');
  PROFILE_CONTRADICTION_TEST.userProfile.learnedConstraints.forEach(c => {
    console.log(`  • ${c}`);
  });
  console.log(`\nNew collaboration: ${PROFILE_CONTRADICTION_TEST.newCollaboration.outcome}`);
  console.log(`Description: ${PROFILE_CONTRADICTION_TEST.newCollaboration.description}`);
  console.log('\nThe challenge: Indoor preference + wheelchair accessibility + hiking trip');
  console.log('= multiple contradictions. How does the AI handle this?\n');

  const userPrompt = `New collaboration: ${PROFILE_CONTRADICTION_TEST.newCollaboration.outcome}
Description: ${PROFILE_CONTRADICTION_TEST.newCollaboration.description}

User's profile constraints from past collaborations:
${PROFILE_CONTRADICTION_TEST.userProfile.learnedConstraints.map(c => `• ${c}`).join('\n')}

Analyze which constraints are relevant and identify any contradictions with this collaboration type.`;

  try {
    const rawResponse = await callLLM(PROFILE_CONTRADICTION_PROMPT, userPrompt);
    const result = parseJSON<any>(rawResponse);

    if (result) {
      console.log('📤 OUTPUT:\n');

      if (result.contradictions && result.contradictions.length > 0) {
        console.log('⚠️  CONTRADICTIONS:\n');
        result.contradictions.forEach((c: any, i: number) => {
          console.log(`${i + 1}. ${c.profileConstraint}`);
          console.log(`   Conflicts with: ${c.collaborationType}`);
          console.log(`   Possible resolutions: ${c.possibleResolutions.join('; ')}`);
          console.log('');
        });
      }

      if (result.suggestedConstraints && result.suggestedConstraints.length > 0) {
        console.log('✅ STILL RELEVANT:\n');
        result.suggestedConstraints.forEach((s: any) => {
          const emoji = s.confidence === 'high' ? '🟢' : s.confidence === 'medium' ? '🟡' : '🔴';
          console.log(`${emoji} ${s.constraint}`);
          console.log(`   Relevance: ${s.relevance}`);
          console.log('');
        });
      }

      if (result.questions && result.questions.length > 0) {
        console.log('❓ QUESTIONS FOR USER:\n');
        result.questions.forEach((q: string) => {
          console.log(`  • ${q}`);
        });
        console.log('');
      }

      console.log('✅ EVALUATION:');
      console.log('   - Did it identify indoor preference vs outdoor hike?');
      console.log('   - Did it identify wheelchair accessibility vs trail hiking?');
      console.log('   - Did it suggest possible resolutions (allergy meds, accessible trails)?');
      console.log('   - Did it still note relevant constraints (vegetarian for pack lunch)?');
    } else {
      console.log('❌ Failed to parse response');
      console.log('Raw:', rawResponse);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY environment variable not set');
    process.exit(1);
  }

  const testArg = process.argv[2];

  if (testArg === '1') {
    await runConflictTest();
  } else if (testArg === '2') {
    await runAnonTradeoffTest();
  } else if (testArg === '3') {
    await runProfileContradictionTest();
  } else {
    // Run all
    await runConflictTest();
    console.log('\n\n');
    await runAnonTradeoffTest();
    console.log('\n\n');
    await runProfileContradictionTest();
  }
}

main().catch(console.error);
