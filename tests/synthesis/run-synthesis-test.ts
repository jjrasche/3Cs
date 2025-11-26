/**
 * Synthesis-Only Test Harness
 *
 * Tests synthesis in isolation with KNOWN inputs (no extraction).
 * This lets us verify synthesis quality independently.
 *
 * Usage:
 *   npx ts-node tests/synthesis/run-synthesis-test.ts [test-id]
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { LLMClient } from '../framework/llm-client';
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

  // Keywords that MUST appear in proposals to satisfy each constraint
  validationKeywords: {
    constraint: string;
    keywords: string[];  // At least one must appear (case-insensitive)
  }[];
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
    validationKeywords: [
      { constraint: 'Vegetarian food options required', keywords: ['vegetarian', 'veggie', 'plant-based', 'meatless'] },
      { constraint: 'Transit accessible location', keywords: ['transit', 'bus', 'metro', 'subway', 'public transport', 'train'] },
      { constraint: 'Nut-free food or clear allergen labeling', keywords: ['nut-free', 'nut free', 'allergen', 'allergy', 'label'] },
    ]
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
    validationKeywords: [
      { constraint: 'Must return by 5pm', keywords: ['5pm', '5:00', 'by 5', 'before 5', '4pm', '4:00', 'afternoon'] },
      { constraint: 'Need wheelchair accessible trail', keywords: ['wheelchair', 'accessible', 'ADA', 'paved', 'flat'] },
    ]
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
    validationKeywords: [
      { constraint: 'Maximum budget $20 per person', keywords: ['$20', '20 dollar', 'budget', 'cost'] },
      { constraint: 'Must be fine dining experience', keywords: ['fine dining', 'upscale', 'elegant'] },
    ]
  }
];

// =============================================================================
// TEST RUNNER
// =============================================================================

async function runSynthesisTest(
  llmClient: LLMClient,
  testCase: SynthesisTestCase
): Promise<{
  success: boolean;
  proposals: Proposal[];
  tensions: any[];
  constraintResults: { constraint: string; satisfied: boolean; foundKeywords: string[] }[];
  rawOutput: string;
}> {

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
      constraintResults: [],
      rawOutput: response.content
    };
  }

  // Validate: check if each constraint's keywords appear in proposals
  const allProposalText = synthesis.proposals
    .map(p => `${p.question} ${p.proposal} ${p.rationale} ${(p.addressedConcerns || []).join(' ')}`)
    .join(' ')
    .toLowerCase();

  const allTensionText = synthesis.tensions
    .map(t => `${t.description} ${(t.constraintsInvolved || []).join(' ')} ${(t.possibleResolutions || []).join(' ')}`)
    .join(' ')
    .toLowerCase();

  const combinedText = allProposalText + ' ' + allTensionText;

  const constraintResults = testCase.validationKeywords.map(vk => {
    const foundKeywords = vk.keywords.filter(kw =>
      combinedText.includes(kw.toLowerCase())
    );
    return {
      constraint: vk.constraint,
      satisfied: foundKeywords.length > 0,
      foundKeywords
    };
  });

  const allSatisfied = constraintResults.every(r => r.satisfied);

  return {
    success: allSatisfied,
    proposals: synthesis.proposals,
    tensions: synthesis.tensions,
    constraintResults,
    rawOutput: response.content
  };
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const testId = args[0];

  const llmClient = new LLMClient();

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
  console.log('SYNTHESIS-ONLY TEST HARNESS');
  console.log('================================================================================');
  console.log(`Running ${testCases.length} test(s)\n`);

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
      const result = await runSynthesisTest(llmClient, testCase);
      results.push({ test: testCase, result });

      // Print results
      console.log(`\n--- Proposals Generated ---`);
      for (const p of result.proposals) {
        console.log(`  Q: ${p.question}`);
        console.log(`  A: ${p.proposal}`);
        console.log('');
      }

      if (result.tensions.length > 0) {
        console.log(`--- Tensions Surfaced ---`);
        for (const t of result.tensions) {
          console.log(`  - ${t.description}`);
        }
      }

      console.log(`\n--- Constraint Validation ---`);
      for (const cr of result.constraintResults) {
        const icon = cr.satisfied ? '✅' : '❌';
        const keywords = cr.satisfied
          ? `(found: ${cr.foundKeywords.join(', ')})`
          : '(no keywords found)';
        console.log(`  ${icon} ${cr.constraint} ${keywords}`);
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
          constraintResults: [],
          rawOutput: String(error)
        }
      });
    }
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(80)}`);

  const passed = results.filter(r => r.result.success).length;
  const total = results.length;

  console.log(`\nPassed: ${passed}/${total} (${(passed/total*100).toFixed(0)}%)`);

  for (const { test, result } of results) {
    const icon = result.success ? '✅' : '❌';
    const failedConstraints = result.constraintResults
      .filter(cr => !cr.satisfied)
      .map(cr => cr.constraint);
    const failureInfo = failedConstraints.length > 0
      ? ` - Missing: ${failedConstraints.join(', ')}`
      : '';
    console.log(`  ${icon} ${test.id}: ${test.name}${failureInfo}`);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
