/**
 * Briefing Isolated Tests
 *
 * Tests the Briefing prompt's ability to:
 * - Orient participants to collaboration context
 * - Use warm but efficient tone (not corporate/stiff)
 * - Personalize based on known constraints
 * - Provide clear, concise context
 *
 * Uses LLM-as-judge for semantic evaluation.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { LLMClient, setLogContext, startNewSession } from '../framework/llm-client';
import { LLMJudge, RUBRICS } from '../framework/llm-judge';
import { buildUserPrompt, PROMPTS } from '../prompts/index';
import { BriefingInput, Participant } from '../types';

// =============================================================================
// TEST CASE DEFINITIONS
// =============================================================================

interface BriefingTestCase {
  id: string;
  name: string;
  description: string;

  // Input
  collaboration: {
    id: string;
    outcome: string;
    creator: string;
    participants: Participant[];
    constraints: any[];
    currentState?: string;
  };
  participant: Participant;

  // Expected behavior (for judge)
  expectedBehavior: string;
}

const TEST_CASES: BriefingTestCase[] = [
  // =============================================================================
  // BASIC BRIEFING - New collaboration
  // =============================================================================
  {
    id: 'basic-new-collab',
    name: 'Basic Briefing - New Collaboration',
    description: 'Should cover all context elements for a new collaboration',
    collaboration: {
      id: 'dinner-plan',
      outcome: 'Plan team dinner',
      creator: 'system',
      participants: [
        { id: 'p1', name: 'Sarah' },
        { id: 'p2', name: 'Mike' },
        { id: 'p3', name: 'Alex' }
      ],
      constraints: [],
      currentState: 'gathering-input'
    },
    participant: { id: 'p1', name: 'Sarah' },
    expectedBehavior: `Should include:
- What: Planning a team dinner
- Who: Sarah, Mike, Alex involved
- Current state: Just started, gathering what people need
- What's expected: Share constraints/preferences
- Tone: Warm but efficient, not corporate
- Should NOT use stiff phrases like "looking forward to hearing your thoughts"`
  },

  // =============================================================================
  // PERSONALIZATION - Known constraints
  // =============================================================================
  {
    id: 'personalized-constraints',
    name: 'Personalized - Acknowledges Known Constraints',
    description: 'Should acknowledge participant\'s known constraints',
    collaboration: {
      id: 'lunch-plan',
      outcome: 'Plan lunch meetup',
      creator: 'system',
      participants: [
        { id: 'p1', name: 'Pat' },
        { id: 'p2', name: 'Jordan' }
      ],
      constraints: [],
      currentState: 'gathering-input'
    },
    participant: {
      id: 'p1',
      name: 'Pat',
      extraction: {
        tags: [
          { text: 'Must be vegan restaurant', type: 'concern', severity: 'non-negotiable', quote: '', underlying: 'Ethical dietary requirement' }
        ],
        message: '',
        signal: 'complete'
      }
    },
    expectedBehavior: `Should include:
- Acknowledgment of Pat's vegan requirement (e.g., "I see you're vegan - we'll factor that in")
- Context about the lunch planning
- Who's involved (Pat and Jordan)
- What's expected next
- Personal, friendly tone`
  },

  // =============================================================================
  // IN-PROGRESS COLLABORATION - Has history
  // =============================================================================
  {
    id: 'in-progress-state',
    name: 'In-Progress Collaboration',
    description: 'Should summarize current state and what\'s needed',
    collaboration: {
      id: 'weekend-activity',
      outcome: 'Plan weekend hike',
      creator: 'system',
      participants: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Carol' }
      ],
      constraints: [],
      currentState: 'We\'re looking at Saturday morning. Alice needs to be back by 3pm. Still deciding on the trail.'
    },
    participant: { id: 'p3', name: 'Carol' },
    expectedBehavior: `Should include:
- What: Planning a weekend hike
- Who: Alice, Bob, Carol
- Current state: Saturday morning, Alice has 3pm constraint, trail undecided
- What Carol needs to do: Share preferences for trail choice
- Concise summary without overwhelming detail
- Natural, helpful tone`
  },

  // =============================================================================
  // TONE TEST - Should avoid corporate language
  // =============================================================================
  {
    id: 'tone-natural',
    name: 'Natural Tone - Not Corporate',
    description: 'Should sound natural and avoid stiff corporate phrases',
    collaboration: {
      id: 'potluck',
      outcome: 'Organize neighborhood potluck',
      creator: 'system',
      participants: [
        { id: 'p1', name: 'Taylor' },
        { id: 'p2', name: 'Morgan' }
      ],
      constraints: [],
      currentState: 'gathering-input'
    },
    participant: { id: 'p1', name: 'Taylor' },
    expectedBehavior: `Should:
- Sound warm but efficient, like helping a friend
- Ask "What matters to you for this?" instead of "Please let us know your preferences"
- Avoid: "Looking forward to hearing your thoughts", "Your input will be valuable"
- Use: Natural, direct language
- Not be chatty, but not stiff either`
  },

  // =============================================================================
  // CLARITY TEST - Clear and concise
  // =============================================================================
  {
    id: 'clarity-concise',
    name: 'Clarity - Clear and Concise',
    description: 'Should be clear without being verbose',
    collaboration: {
      id: 'dinner',
      outcome: 'Choose restaurant for celebration dinner',
      creator: 'system',
      participants: [
        { id: 'p1', name: 'Sam' },
        { id: 'p2', name: 'Riley' },
        { id: 'p3', name: 'Jordan' }
      ],
      constraints: [],
      currentState: 'gathering-input'
    },
    participant: { id: 'p1', name: 'Sam' },
    expectedBehavior: `Should:
- Get straight to the point (what/who/state/next)
- Not include unnecessary details or be overly chatty
- Not be too brief that it's confusing
- Clear enough that Sam knows exactly what to do
- Balanced between informative and concise`
  }
];

// =============================================================================
// TEST RUNNER
// =============================================================================

interface TestResult {
  testCase: BriefingTestCase;
  actualOutput: any;
  judgeEvaluation: any;
  pass: boolean;
  failures: string[];
}

async function runTest(
  testCase: BriefingTestCase,
  llmClient: LLMClient,
  judge: LLMJudge
): Promise<TestResult> {
  const failures: string[] = [];

  // Set logging context
  setLogContext({
    phase: 'briefing-test',
    personaId: testCase.participant.id
  });

  // Build input
  const input: BriefingInput = {
    collaboration: testCase.collaboration,
    participant: testCase.participant
  };

  const prompt = buildUserPrompt('briefing', input);

  // Call LLM to get briefing
  const response = await llmClient.call(
    PROMPTS.briefing,
    prompt,
    {
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      jsonMode: true
    }
  );

  const output = JSON.parse(response.content);

  // Use LLM-as-judge to evaluate
  setLogContext({
    phase: 'judge-briefing',
    personaId: testCase.participant.id
  });

  const judgeEvaluation = await judge.evaluate(
    RUBRICS.briefing,
    {
      collaboration: testCase.collaboration,
      participant: testCase.participant
    },
    output,
    testCase.expectedBehavior
  );

  // Check if evaluation passed
  if (!judgeEvaluation.overallPass) {
    failures.push(...judgeEvaluation.criticalFailures.map(f => `Critical failure: ${f}`));
  }

  return {
    testCase,
    actualOutput: output,
    judgeEvaluation,
    pass: judgeEvaluation.overallPass,
    failures
  };
}

async function main() {
  console.log('================================================================================');
  console.log('BRIEFING TEST HARNESS (LLM-as-Judge)');
  console.log('================================================================================');
  console.log(`Running ${TEST_CASES.length} test(s)\n`);

  // Start logging session
  startNewSession('briefing-tests-judge');

  // Initialize LLM client for component under test
  const llmClient = new LLMClient();
  await llmClient.initializeQuota('llama-3.1-8b-instant');

  // Initialize LLM judge
  const judgeClient = new LLMClient();
  await judgeClient.initializeQuota('llama-3.3-70b-versatile');
  const judge = new LLMJudge(judgeClient);

  // Run tests
  const results: TestResult[] = [];

  for (const testCase of TEST_CASES) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`TEST: ${testCase.name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Description: ${testCase.description}`);
    console.log(`\nCollaboration: ${testCase.collaboration.outcome}`);
    console.log(`Participant: ${testCase.participant.name}`);
    if (testCase.participant.extraction) {
      console.log(`Known Constraints:`);
      for (const tag of testCase.participant.extraction.tags || []) {
        console.log(`  - [${tag.severity}] ${tag.text}`);
      }
    }

    const result = await runTest(testCase, llmClient, judge);
    results.push(result);

    console.log(`\n--- Briefing Output ---`);
    console.log(`Message:\n${result.actualOutput.message}`);

    console.log(`\n--- Judge Evaluation ---`);
    console.log(`Overall: ${result.judgeEvaluation.overallPass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Summary: ${result.judgeEvaluation.summary}`);

    console.log(`\nCriteria Results:`);
    for (const criterion of result.judgeEvaluation.criteriaResults) {
      const icon = criterion.pass ? '✅' : '❌';
      console.log(`  ${icon} ${criterion.criterionId}: ${criterion.pass ? 'PASS' : 'FAIL'}`);
      console.log(`     ${criterion.reasoning}`);
      if (criterion.evidence) {
        console.log(`     Evidence: "${criterion.evidence}"`);
      }
      if (criterion.score !== undefined) {
        console.log(`     Score: ${criterion.score}/5`);
      }
    }

    if (result.judgeEvaluation.criticalFailures.length > 0) {
      console.log(`\n⚠️  Critical Failures:`);
      for (const failure of result.judgeEvaluation.criticalFailures) {
        console.log(`  - ${failure}`);
      }
    }

    console.log(`\n${'='.repeat(40)}`);
    if (result.pass) {
      console.log(`RESULT: ✅ PASS`);
    } else {
      console.log(`RESULT: ❌ FAIL`);
    }
    console.log(`${'='.repeat(40)}`);
  }

  // Summary
  const passed = results.filter(r => r.pass).length;
  const total = results.length;

  console.log(`\n${'='.repeat(80)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(80)}`);
  console.log(`\nPassed: ${passed}/${total} (${(passed / total * 100).toFixed(0)}%)`);

  console.log(`\nResults by Test:`);
  for (const result of results) {
    const icon = result.pass ? '✅' : '❌';
    console.log(`  ${icon} ${result.testCase.id}: ${result.testCase.name}`);
    if (!result.pass) {
      for (const failure of result.failures) {
        console.log(`      - ${failure}`);
      }
    }
  }

  process.exit(passed === total ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
