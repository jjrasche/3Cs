/**
 * Question Identification Isolated Tests
 *
 * Tests the Question Identification prompt's ability to:
 * - Identify decision questions from constraints
 * - Detect conflicts between participants
 * - Identify couplings between questions
 * - Recognize consensus items
 *
 * Uses LLM-as-judge for semantic evaluation instead of keyword heuristics.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { LLMClient, setLogContext, startNewSession } from '../framework/llm-client';
import { LLMJudge, RUBRICS } from '../framework/llm-judge';
import { buildUserPrompt, PROMPTS } from '../prompts/index';
import { Collaboration, QuestionIdentificationInput } from '../types';

// =============================================================================
// TEST CASE DEFINITIONS
// =============================================================================

interface QuestionIDTestCase {
  id: string;
  name: string;
  description: string;

  // Input collaboration state
  collaboration: Collaboration;

  // Expected behavior (for judge context)
  expectedBehavior: string;
}

const TEST_CASES: QuestionIDTestCase[] = [
  // =============================================================================
  // SIMPLE - No conflicts
  // =============================================================================
  {
    id: 'simple-no-conflict',
    name: 'Simple Case - No Conflicts',
    description: 'All participants want the same thing - should identify questions but no conflicts',
    collaboration: {
      id: 'test-simple',
      outcome: 'Team lunch',
      creator: 'organizer',
      participants: [
        {
          id: 'p1',
          name: 'Alice',
          extraction: {
            tags: [
              { text: 'Vegetarian options required', type: 'concern', severity: 'non-negotiable', quote: '', underlying: '' },
              { text: 'Budget under $15 per person', type: 'concern', severity: 'preference', quote: '', underlying: '' }
            ],
            message: '',
            signal: 'complete'
          }
        },
        {
          id: 'p2',
          name: 'Bob',
          extraction: {
            tags: [
              { text: 'Vegetarian options available', type: 'concern', severity: 'preference', quote: '', underlying: '' },
              { text: 'Quick service preferred', type: 'desire', intensity: 'would-like', quote: '', underlying: '' }
            ],
            message: '',
            signal: 'complete'
          }
        }
      ],
      constraints: [],
      when: undefined,
      where: undefined
    },
    expectedBehavior: `Should identify relevant decision categories (at least what/where for a lunch).
Both participants want vegetarian options, so this should appear in consensus items or be noted as aligned.
Since both participants have compatible preferences, there should be NO conflict markers on any questions.
Should identify appropriate decision categories but not falsely detect conflicts.`
  },

  // =============================================================================
  // CONFLICT - Direct disagreement
  // =============================================================================
  {
    id: 'conflict-timing',
    name: 'Conflict - Incompatible Timing',
    description: 'Two participants have conflicting time constraints',
    collaboration: {
      id: 'test-conflict',
      outcome: 'Hiking trip',
      creator: 'organizer',
      participants: [
        {
          id: 'p1',
          name: 'Alice',
          extraction: {
            tags: [
              { text: 'Must be back by 3pm for childcare pickup', type: 'concern', severity: 'non-negotiable', quote: '', underlying: '' },
              { text: 'Morning start preferred', type: 'desire', intensity: 'would-like', quote: '', underlying: '' }
            ],
            message: '',
            signal: 'complete'
          }
        },
        {
          id: 'p2',
          name: 'Bob',
          extraction: {
            tags: [
              { text: 'Cannot start before 10am due to work call', type: 'concern', severity: 'non-negotiable', quote: '', underlying: '' },
              { text: 'Prefers longer hikes (6+ hours)', type: 'desire', intensity: 'would-love', quote: '', underlying: '' }
            ],
            message: '',
            signal: 'complete'
          }
        }
      ],
      constraints: [],
      when: undefined,
      where: undefined
    },
    expectedBehavior: `Should identify a timing/when category with a CONFLICT marker.
The conflict: Alice needs to be back by 3pm, Bob can't start before 10am, and Bob wants a 6+ hour hike.
Starting at 10am + 6 hours = 4pm finish, which violates Alice's 3pm deadline.
Should also identify coupling between when and what (duration/activity type) since hike length affects timing feasibility.`
  },

  // =============================================================================
  // COUPLING - Budget and Quality
  // =============================================================================
  {
    id: 'coupling-budget-quality',
    name: 'Coupling - Budget Constrains Quality',
    description: 'Budget and quality expectations create a coupling',
    collaboration: {
      id: 'test-coupling',
      outcome: 'Group dinner',
      creator: 'organizer',
      participants: [
        {
          id: 'p1',
          name: 'Alice',
          extraction: {
            tags: [
              { text: 'Budget under $15 per person', type: 'concern', severity: 'strong-preference', quote: '', underlying: '' }
            ],
            message: '',
            signal: 'complete'
          }
        },
        {
          id: 'p2',
          name: 'Bob',
          extraction: {
            tags: [
              { text: 'Fine dining experience desired', type: 'desire', intensity: 'would-love', quote: '', underlying: '' },
              { text: 'High-quality food important', type: 'concern', severity: 'preference', quote: '', underlying: '' }
            ],
            message: '',
            signal: 'complete'
          }
        }
      ],
      constraints: [],
      when: undefined,
      where: undefined
    },
    expectedBehavior: `Should identify relevant decision categories (budget, restaurant type/quality).
Should detect CONFLICT between Alice's budget preference ($15) and Bob's desire for fine dining (typically >$15).
Should identify a COUPLING between budget and what/quality since budget directly constrains restaurant options.
The coupling is: low budget limits ability to have fine dining experience.`
  },

  // =============================================================================
  // COMPLEX - Multiple couplings
  // =============================================================================
  {
    id: 'complex-accessibility',
    name: 'Complex - Accessibility and Location Couplings',
    description: 'Location, accessibility, and activity type are all coupled',
    collaboration: {
      id: 'test-complex',
      outcome: 'Outdoor activity',
      creator: 'organizer',
      participants: [
        {
          id: 'p1',
          name: 'Alice',
          extraction: {
            tags: [
              { text: 'Wheelchair accessible location required', type: 'concern', severity: 'non-negotiable', quote: '', underlying: '' },
              { text: 'Avoid steep trails or stairs', type: 'concern', severity: 'non-negotiable', quote: '', underlying: '' }
            ],
            message: '',
            signal: 'complete'
          }
        },
        {
          id: 'p2',
          name: 'Bob',
          extraction: {
            tags: [
              { text: 'Transit accessible location needed', type: 'concern', severity: 'non-negotiable', quote: '', underlying: '' }
            ],
            message: '',
            signal: 'complete'
          }
        },
        {
          id: 'p3',
          name: 'Carol',
          extraction: {
            tags: [
              { text: 'Hiking preferred', type: 'desire', intensity: 'would-love', quote: '', underlying: '' }
            ],
            message: '',
            signal: 'complete'
          }
        }
      ],
      constraints: [],
      when: undefined,
      where: undefined
    },
    expectedBehavior: `Should identify decision categories for activity type (what) and location (where).
Should identify COUPLINGS between what and where since:
  - Activity type (hiking) determines which locations are feasible
  - Location accessibility requirements (wheelchair, transit) constrain which activities are possible
Should note that accessibility is a common theme/consensus item across multiple participants.
May detect a potential conflict between Carol's hiking preference and Alice's accessibility needs, depending on interpretation.`
  }
];

// =============================================================================
// TEST RUNNER
// =============================================================================

interface TestResult {
  testCase: QuestionIDTestCase;
  actualOutput: any;
  judgeEvaluation: any;
  pass: boolean;
  failures: string[];
}

async function runTest(
  testCase: QuestionIDTestCase,
  llmClient: LLMClient,
  judge: LLMJudge
): Promise<TestResult> {
  const failures: string[] = [];

  // Set logging context
  setLogContext({
    phase: 'question-identification-test'
  });

  // Build input
  const input: QuestionIdentificationInput = {
    collaboration: testCase.collaboration
  };

  const prompt = buildUserPrompt('questionIdentification', input);

  // Call LLM to get question identification
  const response = await llmClient.call(
    PROMPTS.questionIdentification,
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
    phase: 'judge-question-identification'
  });

  const judgeEvaluation = await judge.evaluate(
    RUBRICS.questionIdentification,
    { collaboration: testCase.collaboration },
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
  console.log('QUESTION IDENTIFICATION TEST HARNESS (LLM-as-Judge)');
  console.log('================================================================================');
  console.log(`Running ${TEST_CASES.length} test(s)\n`);

  // Start logging session
  startNewSession('question-id-tests-judge');

  // Initialize LLM client for component under test
  const llmClient = new LLMClient();
  await llmClient.initializeQuota('llama-3.1-8b-instant');

  // Initialize LLM judge (uses more capable model)
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
    console.log(`\nParticipants: ${testCase.collaboration.participants.map(p => p.name).join(', ')}`);
    console.log(`\nKey Constraints:`);
    for (const p of testCase.collaboration.participants) {
      if (p.extraction && p.extraction.tags.length > 0) {
        console.log(`  ${p.name}:`);
        for (const tag of p.extraction.tags) {
          console.log(`    - [${tag.severity || tag.intensity}] ${tag.text}`);
        }
      }
    }

    const result = await runTest(testCase, llmClient, judge);
    results.push(result);

    console.log(`\n--- Question Identification Output ---`);
    console.log(`Questions Identified: ${result.actualOutput.questions.length}`);
    for (const q of result.actualOutput.questions) {
      const conflict = q.hasConflict ? '[CONFLICT]' : '[no conflict]';
      console.log(`  - ${q.category}: ${q.question} ${conflict}`);
    }

    if (result.actualOutput.couplings && result.actualOutput.couplings.length > 0) {
      console.log(`\nCouplings Detected: ${result.actualOutput.couplings.length}`);
      for (const c of result.actualOutput.couplings) {
        console.log(`  - ${c.categories.join(' + ')}: ${c.nature}`);
      }
    }

    if (result.actualOutput.consensusItems && result.actualOutput.consensusItems.length > 0) {
      console.log(`\nConsensus Items:`);
      for (const item of result.actualOutput.consensusItems) {
        console.log(`  - ${item}`);
      }
    }

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
        console.log(`     Score: ${criterion.score}`);
      }
    }

    if (result.judgeEvaluation.criticalFailures.length > 0) {
      console.log(`\nCritical Failures:`);
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
