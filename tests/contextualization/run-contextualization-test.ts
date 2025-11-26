/**
 * Contextualization Isolated Tests
 *
 * Tests the Contextualization prompt's ability to personalize proposals
 * for individual participants based on their constraints and desires.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { LLMClient, setLogContext, startNewSession } from '../framework/llm-client';
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

  // Expected output
  expected: {
    confidence: 'high' | 'medium' | 'low';
    highlightsKeywords?: string[];  // Keywords that should appear in highlights
    concernsKeywords?: string[];    // Keywords that should appear in concerns
  };
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
    expected: {
      confidence: 'high',
      highlightsKeywords: ['vegetarian', 'budget'],
      concernsKeywords: [] // No concerns expected
    }
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
    expected: {
      confidence: 'low',
      highlightsKeywords: [],
      concernsKeywords: ['vegan', 'vegetarian'] // Should note the mismatch
    }
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
    expected: {
      confidence: 'medium',
      highlightsKeywords: ['transit', 'accessible'],
      concernsKeywords: ['budget', '$25'] // Over budget
    }
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
    expected: {
      confidence: 'high',
      highlightsKeywords: ['allergen', 'label'],
      concernsKeywords: []
    }
  }
];

// =============================================================================
// TEST RUNNER
// =============================================================================

interface TestResult {
  testCase: ContextualizationTestCase;
  actualOutput: any;
  pass: boolean;
  failures: string[];
}

async function runTest(
  testCase: ContextualizationTestCase,
  llmClient: LLMClient
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

  // Call LLM
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

  // Validate confidence level
  if (output.confidence !== testCase.expected.confidence) {
    failures.push(
      `Expected confidence "${testCase.expected.confidence}" but got "${output.confidence}"`
    );
  }

  // Validate highlights contain keywords
  if (testCase.expected.highlightsKeywords && testCase.expected.highlightsKeywords.length > 0) {
    const highlightsText = (output.highlights || []).join(' ').toLowerCase();
    for (const keyword of testCase.expected.highlightsKeywords) {
      if (!highlightsText.includes(keyword.toLowerCase())) {
        failures.push(`Expected highlights to include "${keyword}"`);
      }
    }
  }

  // Validate concerns contain keywords
  if (testCase.expected.concernsKeywords && testCase.expected.concernsKeywords.length > 0) {
    const concernsText = (output.concerns || []).join(' ').toLowerCase();
    for (const keyword of testCase.expected.concernsKeywords) {
      if (!concernsText.includes(keyword.toLowerCase())) {
        failures.push(`Expected concerns to include "${keyword}"`);
      }
    }
  }

  return {
    testCase,
    actualOutput: output,
    pass: failures.length === 0,
    failures
  };
}

async function main() {
  console.log('================================================================================');
  console.log('CONTEXTUALIZATION TEST HARNESS');
  console.log('================================================================================');
  console.log(`Running ${TEST_CASES.length} test(s)\n`);

  // Start logging session
  startNewSession('contextualization-tests');

  // Initialize LLM client
  const llmClient = new LLMClient();
  await llmClient.initializeQuota('llama-3.1-8b-instant');

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

    const result = await runTest(testCase, llmClient);
    results.push(result);

    console.log(`\n--- Contextualization ---`);
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

    console.log(`\n${'='.repeat(40)}`);
    if (result.pass) {
      console.log(`RESULT: ✅ PASS`);
    } else {
      console.log(`RESULT: ❌ FAIL`);
      console.log(`\nFailures:`);
      for (const failure of result.failures) {
        console.log(`  - ${failure}`);
      }
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
