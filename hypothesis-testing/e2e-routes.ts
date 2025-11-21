/**
 * E2E Test Routes
 *
 * These routes define the end-to-end flows we need to validate.
 * Each route tests a complete user journey through the system.
 *
 * Usage:
 *   npx ts-node e2e-routes.ts
 */

import 'dotenv/config';
import Groq from 'groq-sdk';
import { Constraint, Extraction, UserProfile, Collaboration } from './types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const MODEL = 'llama-3.3-70b-versatile';

// =============================================================================
// ROUTE 1: Extraction → Constraint Generation → Confirmation
// =============================================================================
//
// Tests the full flow from conversation to collaboration constraint:
// 1. User provides input (concern/desire)
// 2. AI extracts with dig deeper questions
// 3. After sufficient depth, AI generates functional constraint wording
// 4. User confirms (we simulate this)
// 5. Constraint added to collaboration
//
// Key question: Can the LLM convert psychological extraction into functional constraint?

interface Route1Input {
  participant: string;
  conversationHistory: string[];  // multi-turn conversation
  collaboration: Collaboration;
}

interface Route1Output {
  extractions: Extraction[];
  generatedConstraints: string[];  // functional wording proposals
  // User would then confirm which to add
}

const CONSTRAINT_GENERATION_PROMPT = `You are helping convert extracted concerns/desires into functional constraints for a collaboration.

Given the extractions from a conversation, generate functional constraint wording that:
- Is direct and actionable
- Describes what's needed, not why
- Can be used by coordination to find solutions
- Doesn't expose psychological depth

Examples:
- Bad: "Has trust issues around rides due to past abandonment"
- Good: "Needs reliable transport - prefers public transit or confirmed carpool with punctual driver"

- Bad: "Anxious about being alone with strangers"
- Good: "Prefers group settings - not comfortable being alone with any one person"

Respond in JSON:
{
  "constraints": ["constraint 1", "constraint 2", ...]
}`;

// =============================================================================
// ROUTE 2: Synthesis with Anonymous Constraints
// =============================================================================
//
// Tests whether synthesis works when some constraints are anonymous:
// 1. Collaboration has mix of anonymous and attributed constraints
// 2. AI generates proposals that satisfy all constraints
// 3. Proposals don't reveal who has anonymous constraints
//
// Key question: Can the LLM synthesize without knowing who owns what?

interface Route2Input {
  collaboration: Collaboration;  // has constraints with anonymous flags
  questionsToResolve: string[];
}

interface Route2Output {
  proposals: Array<{
    question: string;
    proposal: string;
    rationale: string;
    constraintsSatisfied: string[];  // references constraint text, not who
  }>;
  unresolvedConstraints: string[];  // if any can't be satisfied
}

const ANONYMOUS_SYNTHESIS_PROMPT = `You are helping a group reach consensus on a collaboration.

The collaboration has constraints from participants. Some constraints are anonymous - you know what's needed but not who needs it. Treat all constraints equally regardless of attribution.

Generate proposals that satisfy as many constraints as possible. When explaining rationale:
- Reference the constraint text, not who has it
- Don't speculate about who might have anonymous constraints
- Focus on how the proposal addresses the need

If constraints conflict, surface this as an unresolved tension.

Respond in JSON:
{
  "proposals": [
    {
      "question": "what this answers",
      "proposal": "the proposal",
      "rationale": "how it addresses constraints",
      "constraintsSatisfied": ["constraint text 1", "constraint text 2"]
    }
  ],
  "unresolvedConstraints": ["constraints that couldn't be satisfied"]
}`;

// =============================================================================
// ROUTE 3: Profile Pre-population
// =============================================================================
//
// Tests returning user flow:
// 1. User has profile with learned constraints from past collaborations
// 2. User joins new collaboration
// 3. System suggests which constraints might apply
// 4. User confirms subset
//
// Key question: Can the LLM match profile constraints to collaboration context?

interface Route3Input {
  userProfile: UserProfile;
  newCollaboration: {
    outcome: string;
    description: string;
  };
}

interface Route3Output {
  suggestedConstraints: Array<{
    constraint: string;
    relevance: string;  // why this might apply
    confidence: 'high' | 'medium' | 'low';
  }>;
}

const PROFILE_MATCHING_PROMPT = `You are helping a returning user join a new collaboration.

The user has constraints from past collaborations stored in their profile. Evaluate which constraints might be relevant to this new collaboration.

For each profile constraint:
- Consider if it applies to this type of activity
- Assess confidence: high (clearly applies), medium (probably applies), low (might apply)
- Explain briefly why it might be relevant

Don't include constraints that clearly don't apply (e.g., "needs vegetarian options" for a non-food activity).

Respond in JSON:
{
  "suggestedConstraints": [
    {
      "constraint": "the constraint text",
      "relevance": "why this might apply",
      "confidence": "high" | "medium" | "low"
    }
  ]
}`;

// =============================================================================
// TEST DATA
// =============================================================================

// Route 1: Sarah's transit conversation
const ROUTE1_TEST: Route1Input = {
  participant: "Sarah",
  conversationHistory: [
    "I thought it would be nice to get the neighborhood together for a potluck. I don't have a car so wherever we do it needs to be on a bus line. Afternoons work best for me since I work mornings.",
    "I'd really prefer to avoid relying on someone else for a ride, but if someone offered I guess I could manage. It's more about not wanting to impose on people or be stuck waiting for them. I've had bad experiences with that before.",
    "Last time I had to wait over an hour when someone forgot to pick me up. I felt terrible having to call and remind them, and then I was late and missed part of the event. I just want to be able to get myself there on my own schedule."
  ],
  collaboration: {
    outcome: "Neighborhood potluck where everyone contributes and has a good time",
    when: null,
    where: null,
    creator: "Sarah",
    participants: ["Sarah"],
    concerns: [],
    desires: [],
    constraints: []
  }
};

// Route 2: Collaboration with anonymous constraints
const ROUTE2_TEST: Route2Input = {
  collaboration: {
    outcome: "Neighborhood potluck where everyone contributes and has a good time",
    when: null,
    where: "TBD",
    creator: "Sarah",
    participants: ["Sarah", "Mike", "Pat", "Jordan"],
    concerns: [],
    desires: [],
    constraints: [
      {
        text: "Needs reliable transport - prefers public transit or confirmed carpool with punctual driver",
        anonymous: false,
        participantId: "sarah-123",
        addedAt: new Date()
      },
      {
        text: "Budget under $15 per person for shared costs",
        anonymous: false,
        participantId: "mike-456",
        addedAt: new Date()
      },
      {
        text: "Not comfortable being alone with any one person - prefers group settings",
        anonymous: true,  // Anonymous!
        participantId: "jordan-789",
        addedAt: new Date()
      },
      {
        text: "Needs wheelchair accessible venue",
        anonymous: true,  // Anonymous!
        participantId: "pat-012",
        addedAt: new Date()
      },
      {
        text: "Afternoon timing preferred (before 6pm)",
        anonymous: false,
        participantId: "sarah-123",
        addedAt: new Date()
      }
    ]
  },
  questionsToResolve: ["where should we hold the potluck?"]
};

// Route 3: Returning user with profile
const ROUTE3_TEST: Route3Input = {
  userProfile: {
    odId: "sarah-123",
    learnedConstraints: [
      "Needs reliable transport - prefers public transit or confirmed carpool",
      "Afternoon timing preferred - works mornings",
      "Vegetarian dietary restriction",
      "Prefers indoor venues - has seasonal allergies"
    ]
  },
  newCollaboration: {
    outcome: "Book club monthly meeting",
    description: "Monthly gathering to discuss a book. Will include light refreshments."
  }
};

// =============================================================================
// TEST RUNNERS
// =============================================================================

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

async function runRoute1() {
  console.log('='.repeat(80));
  console.log('ROUTE 1: Extraction → Constraint Generation');
  console.log('='.repeat(80));
  console.log(`Model: ${MODEL}\n`);

  const input = ROUTE1_TEST;

  // Build prompt with full conversation
  const conversationText = input.conversationHistory
    .map((msg, i) => `Turn ${i + 1}: "${msg}"`)
    .join('\n\n');

  const userPrompt = `Collaboration: ${input.collaboration.outcome}

Participant: ${input.participant}

Conversation history:
${conversationText}

Based on this conversation, generate functional constraint wording for the concerns and desires expressed.`;

  console.log('📝 INPUT:\n');
  console.log(`Participant: ${input.participant}`);
  console.log(`Turns: ${input.conversationHistory.length}\n`);

  try {
    const rawResponse = await callLLM(CONSTRAINT_GENERATION_PROMPT, userPrompt);
    const result = parseJSON<{ constraints: string[] }>(rawResponse);

    if (result) {
      console.log('📤 GENERATED CONSTRAINTS:\n');
      result.constraints.forEach((c, i) => {
        console.log(`${i + 1}. ${c}`);
      });
      console.log('\n✅ Evaluation: Are these functional and direct?');
      console.log('   - Do they describe what, not why?');
      console.log('   - Can coordination act on them?');
      console.log('   - Do they avoid psychological language?\n');
    } else {
      console.log('❌ Failed to parse response');
      console.log('Raw:', rawResponse);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function runRoute2() {
  console.log('='.repeat(80));
  console.log('ROUTE 2: Synthesis with Anonymous Constraints');
  console.log('='.repeat(80));
  console.log(`Model: ${MODEL}\n`);

  const input = ROUTE2_TEST;

  // Build constraint list, marking which are anonymous
  const constraintList = input.collaboration.constraints
    .map(c => {
      const attribution = c.anonymous ? '[anonymous]' : `[${c.participantId}]`;
      return `${attribution} ${c.text}`;
    })
    .join('\n');

  const userPrompt = `Collaboration: ${input.collaboration.outcome}

Participants: ${input.collaboration.participants.join(', ')}

Constraints:
${constraintList}

Questions to resolve: ${input.questionsToResolve.join(', ')}

Generate proposals that satisfy these constraints. Remember: don't speculate about who has anonymous constraints.`;

  console.log('📝 INPUT:\n');
  console.log('Constraints:');
  input.collaboration.constraints.forEach(c => {
    const anonTag = c.anonymous ? ' [ANON]' : '';
    console.log(`  • ${c.text}${anonTag}`);
  });
  console.log(`\nQuestion: ${input.questionsToResolve[0]}\n`);

  try {
    const rawResponse = await callLLM(ANONYMOUS_SYNTHESIS_PROMPT, userPrompt);
    const result = parseJSON<Route2Output>(rawResponse);

    if (result) {
      console.log('📤 PROPOSALS:\n');
      result.proposals.forEach((p, i) => {
        console.log(`Proposal ${i + 1}: ${p.proposal}`);
        console.log(`Rationale: ${p.rationale}`);
        console.log(`Satisfies: ${p.constraintsSatisfied.join(', ')}`);
        console.log('');
      });

      if (result.unresolvedConstraints && result.unresolvedConstraints.length > 0) {
        console.log('⚠️  UNRESOLVED:');
        result.unresolvedConstraints.forEach(c => console.log(`  • ${c}`));
        console.log('');
      }

      console.log('✅ Evaluation:');
      console.log('   - Does rationale reference constraints, not people?');
      console.log('   - Does it avoid speculation about anonymous constraints?');
      console.log('   - Does the proposal actually satisfy the constraints?\n');
    } else {
      console.log('❌ Failed to parse response');
      console.log('Raw:', rawResponse);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function runRoute3() {
  console.log('='.repeat(80));
  console.log('ROUTE 3: Profile Pre-population');
  console.log('='.repeat(80));
  console.log(`Model: ${MODEL}\n`);

  const input = ROUTE3_TEST;

  const userPrompt = `New collaboration: ${input.newCollaboration.outcome}
Description: ${input.newCollaboration.description}

User's profile constraints from past collaborations:
${input.userProfile.learnedConstraints.map(c => `• ${c}`).join('\n')}

Which of these constraints might be relevant to this new collaboration?`;

  console.log('📝 INPUT:\n');
  console.log(`New collaboration: ${input.newCollaboration.outcome}`);
  console.log(`\nProfile constraints:`);
  input.userProfile.learnedConstraints.forEach(c => console.log(`  • ${c}`));
  console.log('');

  try {
    const rawResponse = await callLLM(PROFILE_MATCHING_PROMPT, userPrompt);
    const result = parseJSON<Route3Output>(rawResponse);

    if (result) {
      console.log('📤 SUGGESTED CONSTRAINTS:\n');
      result.suggestedConstraints.forEach(s => {
        const confEmoji = s.confidence === 'high' ? '🟢' : s.confidence === 'medium' ? '🟡' : '🔴';
        console.log(`${confEmoji} ${s.constraint}`);
        console.log(`   Relevance: ${s.relevance}`);
        console.log(`   Confidence: ${s.confidence}`);
        console.log('');
      });

      console.log('✅ Evaluation:');
      console.log('   - Did it correctly identify relevant constraints?');
      console.log('   - Did it exclude clearly irrelevant ones?');
      console.log('   - Are confidence levels appropriate?\n');
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

  const args = process.argv.slice(2);
  const routeArg = args[0];

  if (routeArg === '1') {
    await runRoute1();
  } else if (routeArg === '2') {
    await runRoute2();
  } else if (routeArg === '3') {
    await runRoute3();
  } else {
    // Run all routes
    await runRoute1();
    console.log('\n\n');
    await runRoute2();
    console.log('\n\n');
    await runRoute3();
  }
}

main().catch(console.error);
