/**
 * Question Identification Isolated Tests
 *
 * Tests the Question Identification prompt's ability to:
 * - Identify decision questions from constraints
 * - Detect conflicts between participants
 * - Identify couplings between questions
 * - Recognize consensus items
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { LLMClient, setLogContext, startNewSession } from '../framework/llm-client';
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

  // Expected output
  expected: {
    minQuestions: number;          // At least this many questions
    hasConflict?: string[];        // These question categories should have conflict
    noConflict?: string[];         // These question categories should NOT have conflict
    couplings?: string[][];        // Expected couplings (array of category pairs)
    consensusItems?: string[];     // Keywords that should appear in consensus items
  };
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
    expected: {
      minQuestions: 2,               // At least "what" and "where/when"
      noConflict: ['what', 'budget'], // No conflict on these
      consensusItems: ['vegetarian']  // Should recognize vegetarian as consensus
    }
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
    expected: {
      minQuestions: 1,
      hasConflict: ['when'],         // Clear timing conflict
      couplings: [['when', 'what']]  // Duration of hike coupled with timing
    }
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
    expected: {
      minQuestions: 2,
      hasConflict: ['budget', 'what'],  // Conflict on budget and restaurant type
      couplings: [['budget', 'what']]    // Budget constrains restaurant choice
    }
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
    expected: {
      minQuestions: 2,
      couplings: [
        ['what', 'where'],     // Activity type determines location options
        ['where', 'what']      // Location constraints determine activity feasibility
      ],
      consensusItems: ['accessible'] // Accessibility is common theme
    }
  }
];

// =============================================================================
// TEST RUNNER
// =============================================================================

interface TestResult {
  testCase: QuestionIDTestCase;
  actualOutput: any;
  pass: boolean;
  failures: string[];
}

async function runTest(
  testCase: QuestionIDTestCase,
  llmClient: LLMClient
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

  // Call LLM
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

  // Validate: minimum questions
  if (output.questions.length < testCase.expected.minQuestions) {
    failures.push(
      `Expected at least ${testCase.expected.minQuestions} questions, got ${output.questions.length}`
    );
  }

  // Validate: conflict detection
  if (testCase.expected.hasConflict) {
    for (const category of testCase.expected.hasConflict) {
      const question = output.questions.find((q: any) => q.category === category);
      if (!question) {
        failures.push(`Expected question with category "${category}" but not found`);
      } else if (!question.hasConflict) {
        failures.push(`Expected "${category}" to have conflict, but hasConflict=false`);
      }
    }
  }

  // Validate: no conflict where expected
  if (testCase.expected.noConflict) {
    for (const category of testCase.expected.noConflict) {
      const question = output.questions.find((q: any) => q.category === category);
      if (question && question.hasConflict) {
        failures.push(`Expected "${category}" to have no conflict, but hasConflict=true`);
      }
    }
  }

  // Validate: couplings
  if (testCase.expected.couplings && testCase.expected.couplings.length > 0) {
    if (!output.couplings || output.couplings.length === 0) {
      failures.push(`Expected couplings but none detected`);
    } else {
      for (const [cat1, cat2] of testCase.expected.couplings) {
        const hasCoupling = output.couplings.some((c: any) => {
          const categories = c.categories || [];
          return (
            (categories.includes(cat1) && categories.includes(cat2)) ||
            (categories.includes(cat2) && categories.includes(cat1))
          );
        });
        if (!hasCoupling) {
          failures.push(`Expected coupling between "${cat1}" and "${cat2}" but not found`);
        }
      }
    }
  }

  // Validate: consensus items contain keywords
  if (testCase.expected.consensusItems && testCase.expected.consensusItems.length > 0) {
    const consensusText = (output.consensusItems || []).join(' ').toLowerCase();
    for (const keyword of testCase.expected.consensusItems) {
      if (!consensusText.includes(keyword.toLowerCase())) {
        failures.push(`Expected consensus items to include "${keyword}"`);
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
  console.log('QUESTION IDENTIFICATION TEST HARNESS');
  console.log('================================================================================');
  console.log(`Running ${TEST_CASES.length} test(s)\n`);

  // Start logging session
  startNewSession('question-id-tests');

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

    const result = await runTest(testCase, llmClient);
    results.push(result);

    console.log(`\n--- Output ---`);
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
