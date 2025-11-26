/**
 * Synthesis-Only Test Harness
 *
 * Tests synthesis in isolation with KNOWN inputs (no extraction).
 * This lets us verify synthesis quality independently.
 *
 * Uses LLM-as-judge for semantic evaluation instead of keyword heuristics.
 *
 * Usage:
 *   npx ts-node tests/synthesis/run-synthesis-test.ts [test-id]
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { LLMClient, setLogContext, startNewSession } from '../framework/llm-client';
import { LLMJudge, RUBRICS } from '../framework/llm-judge';
import { buildUserPrompt, PROMPTS } from '../prompts/index';
import {
  Collaboration,
  Participant,
  Tag,
  SynthesisInput,
  Proposal
} from '../types';

// =============================================================================
// TEST CASE DEFINITIONS
// =============================================================================

interface SynthesisTestCase {
  id: string;
  name: string;
  description: string;

  // The collaboration context
  outcome: string;

  // Known constraints to seed (these MUST appear in proposals)
  requiredConstraints: {
    text: string;
    owner: string;  // Which participant owns this
    severity: 'non-negotiable' | 'strong-preference' | 'preference' | 'nice-to-have';
  }[];

  // Optional desires
  desires?: {
    text: string;
    owner: string;
    intensity: 'must-have' | 'would-love' | 'would-like' | 'nice-to-have';
  }[];

  // Expected behavior (for judge evaluation)
  expectedBehavior: string;
}

const TEST_CASES: SynthesisTestCase[] = [
  {
    id: 'potluck-basic',
    name: 'Potluck with dietary constraints',
    description: 'Tests if synthesis explicitly addresses dietary and accessibility requirements',
    outcome: 'Plan a neighborhood potluck',
    requiredConstraints: [
      { text: 'Vegetarian food options required', owner: 'Sarah', severity: 'non-negotiable' },
      { text: 'Transit accessible location', owner: 'Sarah', severity: 'non-negotiable' },
      { text: 'Nut-free food or clear allergen labeling', owner: 'Jordan', severity: 'non-negotiable' },
    ],
    desires: [
      { text: 'Would love outdoor setting', owner: 'Mike', intensity: 'would-love' },
      { text: 'Keep costs under $15 per person', owner: 'Alex', intensity: 'strong-preference' as any },
    ],
    expectedBehavior: `The proposal must explicitly address all three non-negotiable constraints:
1. Vegetarian food options (mention vegetarian/plant-based options)
2. Transit accessible location (mention public transit, bus lines, or similar)
3. Nut-free food or allergen labeling (mention allergen safety or nut-free options)
The proposal should be concrete with specific details (venue, food plan, etc.) and the rationale should explain how these constraints are satisfied.`
  },
  {
    id: 'hike-timing',
    name: 'Hike with hard timing constraints',
    description: 'Tests if synthesis respects time constraints',
    outcome: 'Plan a group hike',
    requiredConstraints: [
      { text: 'Must return by 5pm', owner: 'Taylor', severity: 'non-negotiable' },
      { text: 'Need wheelchair accessible trail', owner: 'Jordan', severity: 'non-negotiable' },
    ],
    desires: [
      { text: 'Scenic views would be nice', owner: 'Alex', intensity: 'would-like' },
    ],
    expectedBehavior: `The proposal must explicitly address both non-negotiable constraints:
1. Must return by 5pm (should specify timing that ensures return by 5pm)
2. Wheelchair accessible trail (should mention wheelchair accessibility, ADA compliance, or paved/flat trail)
The proposal should include specific timing details and trail characteristics.`
  },
  {
    id: 'budget-conflict',
    name: 'Dinner with conflicting budget/quality',
    description: 'Tests if synthesis surfaces budget conflicts honestly',
    outcome: 'Plan a group dinner',
    requiredConstraints: [
      { text: 'Maximum budget $20 per person', owner: 'Budget-conscious person', severity: 'non-negotiable' },
      { text: 'Must be fine dining experience', owner: 'Quality-focused person', severity: 'non-negotiable' },
    ],
    desires: [],
    expectedBehavior: `This is a conflict scenario where both constraints cannot be satisfied simultaneously (fine dining typically costs more than $20 per person).
The synthesis should either:
1. Surface a tension describing the conflict between budget and quality constraints, OR
2. Propose a creative solution that attempts to satisfy both (e.g., lunch instead of dinner, prix fixe menus, etc.)
The proposal should acknowledge both constraints even if one cannot be fully met.`
  }
];

// =============================================================================
// TEST RUNNER
// =============================================================================

async function runSynthesisTest(
  llmClient: LLMClient,
  judge: LLMJudge,
  testCase: SynthesisTestCase
): Promise<{
  success: boolean;
  proposals: Proposal[];
  tensions: any[];
  judgeEvaluation: any;
  rawOutput: string;
}> {

  // Set logging context
  setLogContext({
    phase: 'synthesis-test',
    scenarioId: testCase.id
  });

  // Build a fake collaboration with the known constraints
  const participants: Participant[] = [];
  const participantMap = new Map<string, Participant>();

  // Create participants from constraint owners
  for (const c of testCase.requiredConstraints) {
    if (!participantMap.has(c.owner)) {
      const p: Participant = {
        id: c.owner.toLowerCase().replace(/\s+/g, '-'),
        name: c.owner,
        extraction: { tags: [], message: '', signal: 'complete' }
      };
      participantMap.set(c.owner, p);
      participants.push(p);
    }

    // Add as extracted tag
    const participant = participantMap.get(c.owner)!;
    participant.extraction!.tags.push({
      text: c.text,
      type: 'concern',
      severity: c.severity,
      quote: c.text,
      underlying: c.text
    });
  }

  // Add desires
  for (const d of testCase.desires || []) {
    if (!participantMap.has(d.owner)) {
      const p: Participant = {
        id: d.owner.toLowerCase().replace(/\s+/g, '-'),
        name: d.owner,
        extraction: { tags: [], message: '', signal: 'complete' }
      };
      participantMap.set(d.owner, p);
      participants.push(p);
    }

    const participant = participantMap.get(d.owner)!;
    participant.extraction!.tags.push({
      text: d.text,
      type: 'desire',
      intensity: d.intensity,
      quote: d.text,
      underlying: d.text
    });
  }

  const collaboration: Collaboration = {
    id: `test-${testCase.id}`,
    outcome: testCase.outcome,
    creator: 'Test',
    participants,
    constraints: testCase.requiredConstraints.map(c => ({
      text: c.text,
      anonymous: false,
      participantId: c.owner.toLowerCase().replace(/\s+/g, '-')
    })),
    when: undefined,
    where: undefined
  };

  // Build synthesis input (skip QI for isolated test)
  const synthInput: SynthesisInput = {
    collaboration
  };

  const userPrompt = buildUserPrompt('synthesis', synthInput);

  console.log('\n--- Synthesis Input ---');
  console.log(userPrompt.substring(0, 1000) + '...\n');

  // Call LLM
  const response = await llmClient.call(
    PROMPTS.synthesis,
    userPrompt,
    {
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      jsonMode: true
    }
  );

  // Parse response
  let synthesis: { proposals: Proposal[]; tensions: any[] };
  try {
    synthesis = JSON.parse(response.content);
  } catch (e) {
    console.error('Failed to parse synthesis response:', response.content);
    return {
      success: false,
      proposals: [],
      tensions: [],
      judgeEvaluation: { overallPass: false, summary: 'Failed to parse JSON' },
      rawOutput: response.content
    };
  }

  // Use LLM-as-judge to evaluate
  setLogContext({
    phase: 'judge-synthesis',
    scenarioId: testCase.id
  });

  const judgeEvaluation = await judge.evaluate(
    RUBRICS.synthesis,
    { collaboration },
    synthesis,
    testCase.expectedBehavior
  );

  return {
    success: judgeEvaluation.overallPass,
    proposals: synthesis.proposals,
    tensions: synthesis.tensions,
    judgeEvaluation,
    rawOutput: response.content
  };
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const testId = args[0];

  // Select test cases
  let testCases = TEST_CASES;
  if (testId) {
    const testCase = TEST_CASES.find(t => t.id === testId);
    if (!testCase) {
      console.error(`Test case not found: ${testId}`);
      console.error('Available tests:', TEST_CASES.map(t => t.id).join(', '));
      process.exit(1);
    }
    testCases = [testCase];
  }

  console.log('================================================================================');
  console.log('SYNTHESIS TEST HARNESS (LLM-as-Judge)');
  console.log('================================================================================');
  console.log(`Running ${testCases.length} test(s)\n`);

  // Start logging session
  startNewSession('synthesis-tests-judge');

  // Initialize LLM client for component under test
  const llmClient = new LLMClient();
  await llmClient.initializeQuota('llama-3.1-8b-instant');

  // Initialize LLM judge (uses more capable model)
  const judgeClient = new LLMClient();
  await judgeClient.initializeQuota('llama-3.3-70b-versatile');
  const judge = new LLMJudge(judgeClient);

  const results: { test: SynthesisTestCase; result: Awaited<ReturnType<typeof runSynthesisTest>> }[] = [];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`TEST: ${testCase.name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Description: ${testCase.description}`);
    console.log(`\nRequired constraints:`);
    for (const c of testCase.requiredConstraints) {
      console.log(`  - [${c.severity}] ${c.text} (${c.owner})`);
    }

    try {
      const result = await runSynthesisTest(llmClient, judge, testCase);
      results.push({ test: testCase, result });

      // Print results
      console.log(`\n--- Proposals Generated ---`);
      for (const p of result.proposals) {
        console.log(`  Q: ${p.question}`);
        console.log(`  A: ${p.proposal}`);
        console.log(`  Rationale: ${p.rationale}`);
        if (p.addressedConcerns && p.addressedConcerns.length > 0) {
          console.log(`  Addressed Concerns: ${p.addressedConcerns.join(', ')}`);
        }
        console.log('');
      }

      if (result.tensions.length > 0) {
        console.log(`--- Tensions Surfaced ---`);
        for (const t of result.tensions) {
          console.log(`  - ${t.description}`);
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
      console.log(`RESULT: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`${'='.repeat(40)}`);

    } catch (error) {
      console.error(`\n❌ Test failed with error:`, error);
      results.push({
        test: testCase,
        result: {
          success: false,
          proposals: [],
          tensions: [],
          judgeEvaluation: { overallPass: false, summary: String(error) },
          rawOutput: String(error)
        }
      });
    }
  }

  // Summary
  const passed = results.filter(r => r.result.success).length;
  const total = results.length;

  console.log(`\n${'='.repeat(80)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(80)}`);
  console.log(`\nPassed: ${passed}/${total} (${(passed / total * 100).toFixed(0)}%)`);

  console.log(`\nResults by Test:`);
  for (const { test, result } of results) {
    const icon = result.success ? '✅' : '❌';
    console.log(`  ${icon} ${test.id}: ${test.name}`);
    if (!result.success && result.judgeEvaluation.criticalFailures) {
      for (const failure of result.judgeEvaluation.criticalFailures) {
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
