/**
 * Contextualization Isolated Tests
 *
 * Tests the Contextualization prompt's ability to personalize proposals
 * for individual participants based on their constraints and desires.
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
import { ContextualizationInput, Participant, Proposal } from '../types';

// =============================================================================
// TEST CASE DEFINITIONS
// =============================================================================

interface ContextualizationTestCase {
  id: string;
  name: string;
  description: string;

  // Input
  participant: Participant;
  proposal: Proposal;

  // Expected behavior (for judge context)
  expectedBehavior: string;
}

const TEST_CASES: ContextualizationTestCase[] = [
  // =============================================================================
  // HIGH CONFIDENCE - Perfect match
  // =============================================================================
  {
    id: 'high-perfect-match',
    name: 'High Confidence - Perfect Match',
    description: 'Proposal perfectly addresses all participant constraints',
    participant: {
      id: 'p1',
      name: 'Sarah',
      extraction: {
        tags: [
          { text: 'Vegetarian options required', type: 'concern', severity: 'non-negotiable', quote: '', underlying: '' },
          { text: 'Budget under $20 per person', type: 'concern', severity: 'preference', quote: '', underlying: '' }
        ],
        message: '',
        signal: 'complete'
      }
    },
    proposal: {
      question: 'Where should we have lunch?',
      proposal: 'Veggie Delight Cafe - fully vegetarian menu with options ranging from $10-$18 per person',
      rationale: 'Affordable vegetarian restaurant',
      addressedConcerns: ['Vegetarian options required', 'Budget under $20 per person'],
      addressedDesires: []
    },
    expectedBehavior: `Since the proposal is a fully vegetarian restaurant within the budget, confidence should be HIGH.
Highlights should mention vegetarian menu and affordable pricing.
Concerns should be empty or minimal since all constraints are satisfied.`
  },

  // =============================================================================
  // LOW CONFIDENCE - Constraint violated
  // =============================================================================
  {
    id: 'low-constraint-violated',
    name: 'Low Confidence - Constraint Violated',
    description: 'Proposal violates a non-negotiable constraint',
    participant: {
      id: 'p1',
      name: 'Pat',
      extraction: {
        tags: [
          { text: 'Must be fully vegan restaurant', type: 'concern', severity: 'non-negotiable', quote: '', underlying: '' }
        ],
        message: '',
        signal: 'complete'
      }
    },
    proposal: {
      question: 'Where should we have dinner?',
      proposal: 'Italian Bistro - has vegetarian pasta options',
      rationale: 'Central location with variety',
      addressedConcerns: [],
      addressedDesires: []
    },
    expectedBehavior: `Since the proposal offers vegetarian (not vegan) options, and the participant requires vegan, confidence should be LOW.
Concerns should clearly identify that vegetarian ≠ vegan and this violates the requirement.
Highlights should be empty or minimal since the key constraint is violated.`
  },

  // =============================================================================
  // MEDIUM CONFIDENCE - Partial match
  // =============================================================================
  {
    id: 'medium-partial-match',
    name: 'Medium Confidence - Partial Match',
    description: 'Proposal meets some constraints but misses others',
    participant: {
      id: 'p1',
      name: 'Taylor',
      extraction: {
        tags: [
          { text: 'Transit accessible location', type: 'concern', severity: 'non-negotiable', quote: '', underlying: '' },
          { text: 'Budget under $15 per person', type: 'concern', severity: 'strong-preference', quote: '', underlying: '' },
          { text: 'Outdoor seating preferred', type: 'desire', intensity: 'would-like', quote: '', underlying: '' }
        ],
        message: '',
        signal: 'complete'
      }
    },
    proposal: {
      question: 'Where should we meet?',
      proposal: 'Downtown Cafe on Main Street - accessible via bus lines 1 and 5, average cost $25 per person, indoor seating only',
      rationale: 'Central and accessible',
      addressedConcerns: ['Transit accessible location'],
      addressedDesires: []
    },
    expectedBehavior: `The non-negotiable (transit accessible) is satisfied, so confidence should be MEDIUM or HIGH.
However, the budget preference ($15) is not met ($25), so MEDIUM is more appropriate.
Highlights should mention transit accessibility.
Concerns should note the budget is higher than preferred and no outdoor seating.`
  },

  // =============================================================================
  // PERSONALIZATION TEST - Multiple participants, different reactions
  // =============================================================================
  {
    id: 'personalization-match',
    name: 'Personalization - What Matters to This Person',
    description: 'Contextualization should focus on what THIS participant cares about',
    participant: {
      id: 'p1',
      name: 'Jordan',
      extraction: {
        tags: [
          { text: 'Nut-free food or clear allergen labeling', type: 'concern', severity: 'non-negotiable', quote: '', underlying: '' }
        ],
        message: '',
        signal: 'complete'
      }
    },
    proposal: {
      question: 'What should we order for the potluck?',
      proposal: 'Catered meal from SafeEats Catering - all dishes clearly labeled with allergen information including nuts, gluten, dairy',
      rationale: 'Professional catering with safety labels',
      addressedConcerns: ['Nut-free food or clear allergen labeling'],
      addressedDesires: []
    },
    expectedBehavior: `The proposal explicitly addresses allergen labeling, so confidence should be HIGH.
Highlights should emphasize the allergen labeling and safety for this person's nut allergy.
Concerns should be empty since the key constraint is satisfied.
The contextualization should feel personalized to Jordan's specific safety concern.`
  }
];

// =============================================================================
// TEST RUNNER
// =============================================================================

interface TestResult {
  testCase: ContextualizationTestCase;
  actualOutput: any;
  judgeEvaluation: any;
  pass: boolean;
  failures: string[];
}

async function runTest(
  testCase: ContextualizationTestCase,
  llmClient: LLMClient,
  judge: LLMJudge
): Promise<TestResult> {
  const failures: string[] = [];

  // Set logging context
  setLogContext({
    phase: 'contextualization-test',
    personaId: testCase.participant.id
  });

  // Build input
  const input: ContextualizationInput = {
    proposal: testCase.proposal,
    participant: testCase.participant
  };

  const prompt = buildUserPrompt('contextualization', input);

  // Call LLM to get contextualization
  const response = await llmClient.call(
    PROMPTS.contextualization,
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
    phase: 'judge-contextualization',
    personaId: testCase.participant.id
  });

  const judgeEvaluation = await judge.evaluate(
    RUBRICS.contextualization,
    { participant: testCase.participant, proposal: testCase.proposal },
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
  console.log('CONTEXTUALIZATION TEST HARNESS (LLM-as-Judge)');
  console.log('================================================================================');
  console.log(`Running ${TEST_CASES.length} test(s)\n`);

  // Start logging session
  startNewSession('contextualization-tests-judge');

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
    console.log(`\nParticipant: ${testCase.participant.name}`);
    console.log(`Constraints:`);
    for (const tag of testCase.participant.extraction?.tags || []) {
      console.log(`  - [${tag.severity || tag.intensity}] ${tag.text}`);
    }
    console.log(`\nProposal: ${testCase.proposal.proposal}`);

    const result = await runTest(testCase, llmClient, judge);
    results.push(result);

    console.log(`\n--- Contextualization Output ---`);
    console.log(`Summary: ${result.actualOutput.summary}`);
    console.log(`Confidence: ${result.actualOutput.confidence}`);

    if (result.actualOutput.highlights && result.actualOutput.highlights.length > 0) {
      console.log(`\nHighlights:`);
      for (const h of result.actualOutput.highlights) {
        console.log(`  ✨ ${h}`);
      }
    }

    if (result.actualOutput.concerns && result.actualOutput.concerns.length > 0) {
      console.log(`\nConcerns:`);
      for (const c of result.actualOutput.concerns) {
        console.log(`  ⚠️  ${c}`);
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
