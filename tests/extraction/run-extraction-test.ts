/**
 * Extraction Isolated Tests
 *
 * Tests the Extraction prompt's ability to:
 * - Accurately extract concerns and desires from participant messages
 * - Calibrate severity/intensity based on language used
 * - Determine appropriate signal (complete/needs-more-info/opt-out)
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
import { ExtractionInput } from '../types';

// =============================================================================
// TEST CASE DEFINITIONS
// =============================================================================

interface ExtractionTestCase {
  id: string;
  name: string;
  description: string;

  // Input
  participantMessage: string;
  collaborationContext: {
    outcome: string;
    currentState?: string;
  };

  // Expected behavior (for judge)
  expectedBehavior: string;
}

const TEST_CASES: ExtractionTestCase[] = [
  // =============================================================================
  // CLEAR NON-NEGOTIABLE - Strong language
  // =============================================================================
  {
    id: 'clear-non-negotiable',
    name: 'Clear Non-Negotiable Constraint',
    description: 'Strong language like "must" should be tagged as non-negotiable',
    participantMessage: "I'm vegan so the restaurant must be fully vegan. Also I don't have a car so it needs to be accessible by public transit.",
    collaborationContext: {
      outcome: 'Plan dinner for the team'
    },
    expectedBehavior: `Should extract:
- "Fully vegan restaurant" as non-negotiable concern (strong language: "must")
- "Public transit accessible" as non-negotiable concern (strong language: "needs to be")
- Signal should be "complete" (participant gave clear constraints)
- Underlying reasons should capture why (ethical/dietary for vegan, no car for transit)`
  },

  // =============================================================================
  // PREFERENCE vs NON-NEGOTIABLE - Language calibration
  // =============================================================================
  {
    id: 'preference-calibration',
    name: 'Preference Not Non-Negotiable',
    description: 'Soft language like "prefer" should be tagged as preference',
    participantMessage: "I'd prefer somewhere with outdoor seating if possible, and I'd like to keep it under $20 per person.",
    collaborationContext: {
      outcome: 'Plan lunch meetup'
    },
    expectedBehavior: `Should extract:
- "Outdoor seating" as preference or nice-to-have (soft language: "prefer if possible")
- "Under $20 per person" as preference or strong-preference (language: "I'd like")
- Should NOT be tagged as non-negotiable (no strong must/need language)
- Signal should be "complete"`
  },

  // =============================================================================
  // VAGUE INPUT - Needs more info
  // =============================================================================
  {
    id: 'vague-needs-info',
    name: 'Vague Input Needs Clarification',
    description: 'Non-committal responses should signal needs-more-info',
    participantMessage: "Whatever works for me. I'm pretty flexible. Maybe something fun?",
    collaborationContext: {
      outcome: 'Plan weekend activity'
    },
    expectedBehavior: `Should extract:
- Very few or no specific constraints (they gave no real requirements)
- If "something fun" is extracted, should be lowest intensity (nice-to-have)
- Signal should be "needs-more-info" (they were vague and non-committal)
- Should NOT over-inflate their flexibility into strong constraints`
  },

  // =============================================================================
  // OPT-OUT - Declining to participate
  // =============================================================================
  {
    id: 'opt-out-signal',
    name: 'Opt-Out Detection',
    description: 'Declining participation should signal opt-out',
    participantMessage: "Thanks for thinking of me, but I'm going to sit this one out. Have fun!",
    collaborationContext: {
      outcome: 'Plan team outing'
    },
    expectedBehavior: `Should extract:
- Signal should be "opt-out" (they explicitly declined)
- Tags can be empty or minimal
- Message should acknowledge their opt-out`
  },

  // =============================================================================
  // MULTIPLE SEVERITY LEVELS - Mix of strong and weak
  // =============================================================================
  {
    id: 'mixed-severity',
    name: 'Mixed Severity Calibration',
    description: 'Should calibrate different severity levels correctly',
    participantMessage: "I absolutely cannot eat nuts due to allergies - that's critical. I really prefer vegetarian options, and it would be nice if there's parking.",
    collaborationContext: {
      outcome: 'Choose restaurant for dinner'
    },
    expectedBehavior: `Should extract:
- "Nut-free or allergen labeling" as non-negotiable (language: "absolutely cannot", "critical")
- "Vegetarian options" as strong-preference (language: "really prefer")
- "Parking available" as nice-to-have or preference (language: "would be nice")
- Each severity level should match the language intensity
- Underlying reason for nut-free should mention allergy/safety`
  },

  // =============================================================================
  // DESIRES vs CONCERNS - Type classification
  // =============================================================================
  {
    id: 'desire-vs-concern',
    name: 'Desires vs Concerns Classification',
    description: 'Should correctly classify constraints vs wants',
    participantMessage: "I need to be back by 8pm for childcare. I'd love if we could do something outdoors and I'm hoping we can keep it casual.",
    collaborationContext: {
      outcome: 'Plan evening activity'
    },
    expectedBehavior: `Should extract:
- "Back by 8pm" as concern (constraint, limitation) with non-negotiable severity (language: "need to")
- "Outdoor activity" as desire (want) with would-love intensity
- "Casual atmosphere" as desire (want) with would-like intensity
- Should distinguish between constraints (concerns) and aspirations (desires)`
  }
];

// =============================================================================
// TEST RUNNER
// =============================================================================

interface TestResult {
  testCase: ExtractionTestCase;
  actualOutput: any;
  judgeEvaluation: any;
  pass: boolean;
  failures: string[];
}

async function runTest(
  testCase: ExtractionTestCase,
  llmClient: LLMClient,
  judge: LLMJudge
): Promise<TestResult> {
  const failures: string[] = [];

  // Set logging context
  setLogContext({
    phase: 'extraction-test',
    personaId: testCase.id
  });

  // Build input
  const input: ExtractionInput = {
    collaboration: {
      id: 'test-collab',
      outcome: testCase.collaborationContext.outcome,
      creator: 'system',
      participants: [],
      constraints: []
    },
    participant: {
      id: 'test-participant',
      name: 'Test User'
    },
    participantMessage: testCase.participantMessage
  };

  const prompt = buildUserPrompt('extraction', input);

  // Call LLM to get extraction
  const response = await llmClient.call(
    PROMPTS.extraction,
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
    phase: 'judge-extraction',
    personaId: testCase.id
  });

  const judgeEvaluation = await judge.evaluate(
    RUBRICS.extraction,
    { participantMessage: testCase.participantMessage, context: testCase.collaborationContext },
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
  console.log('EXTRACTION TEST HARNESS (LLM-as-Judge)');
  console.log('================================================================================');
  console.log(`Running ${TEST_CASES.length} test(s)\n`);

  // Start logging session
  startNewSession('extraction-tests-judge');

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
    console.log(`\nParticipant Message: "${testCase.participantMessage}"`);

    const result = await runTest(testCase, llmClient, judge);
    results.push(result);

    console.log(`\n--- Extraction Output ---`);
    console.log(`Signal: ${result.actualOutput.signal}`);
    console.log(`Message: ${result.actualOutput.message}`);

    if (result.actualOutput.tags && result.actualOutput.tags.length > 0) {
      console.log(`\nTags:`);
      for (const tag of result.actualOutput.tags) {
        const severity = tag.severity || tag.intensity;
        const type = tag.type;
        console.log(`  [${type}/${severity}] ${tag.text}`);
        if (tag.underlying) {
          console.log(`      Why: ${tag.underlying}`);
        }
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
