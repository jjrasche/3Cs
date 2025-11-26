/**
 * Response Decision Isolated Tests
 *
 * Tests the ResponseDecider's ability to correctly validate constraint satisfaction
 * and decide on appropriate response types (accept, object, accept-with-reservations).
 *
 * This is CRITICAL because it's the constraint validator - if this is wrong,
 * the whole system fails to catch violations.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { LLMClient, setLogContext, startNewSession } from '../framework/llm-client';
import { ResponseDecider } from '../simulation/persona-player';
import { Persona } from '../simulation/types';

// =============================================================================
// TEST CASE DEFINITIONS
// =============================================================================

interface ResponseDecisionTestCase {
  id: string;
  name: string;
  description: string;

  // Persona with constraints
  persona: Persona;

  // Proposal to evaluate
  proposal: {
    question: string;
    proposal: string;
    rationale: string;
    addressedConcerns?: string[];
  };

  // Mock contextualization
  contextualization: {
    summary: string;
    confidence: 'high' | 'medium' | 'low';
    highlights: string[];
    concerns: string[];
  };

  // Expected outcome
  expected: {
    type: 'accept' | 'accept-with-reservations' | 'object' | 'opt-out';
    nonNegotiablesSatisfied: boolean;
    reasoning?: string; // Keywords that should appear in reasoning
  };
}

const TEST_CASES: ResponseDecisionTestCase[] = [
  // =============================================================================
  // CLEAR ACCEPTANCE - All constraints satisfied
  // =============================================================================
  {
    id: 'accept-all-satisfied',
    name: 'Accept - All Non-Negotiables Satisfied',
    description: 'Proposal explicitly addresses all non-negotiable constraints',
    persona: {
      id: 'test-vegan',
      name: 'Pat',
      demographics: { ageRange: '30s', lifestage: 'young professional', location: 'urban' },
      persistentConstraints: [
        {
          text: 'Must be fully vegan restaurant',
          type: 'concern',
          severity: 'non-negotiable',
          reason: 'Ethical dietary requirement',
          flexibility: 0
        },
        {
          text: 'Transit accessible location',
          type: 'concern',
          severity: 'non-negotiable',
          reason: 'No car',
          flexibility: 0
        }
      ],
      personality: { flexibility: 0.3, assertiveness: 0.7, detailOrientation: 0.6, socialStyle: 'direct' },
      communication: { verbosity: 'moderate', emotionality: 'moderate', examplePhrases: [] }
    },
    proposal: {
      question: 'Where should we have dinner?',
      proposal: 'Veggie Galaxy, a fully vegan restaurant located on Massachusetts Avenue with direct bus access (Route 1 and 47 stop right outside)',
      rationale: 'This restaurant is 100% vegan and easily accessible by public transit',
      addressedConcerns: ['Must be fully vegan restaurant', 'Transit accessible location']
    },
    contextualization: {
      summary: 'This proposal fully addresses your requirements for a vegan restaurant with transit access',
      confidence: 'high',
      highlights: ['100% vegan menu', 'Direct bus access'],
      concerns: []
    },
    expected: {
      type: 'accept',
      nonNegotiablesSatisfied: true
      // No strict reasoning check - LLM's explanation may vary
    }
  },

  // =============================================================================
  // CLEAR VIOLATION - Non-negotiable violated
  // =============================================================================
  {
    id: 'object-vegan-violated',
    name: 'Object - Vegan Requirement Violated',
    description: 'Proposal suggests non-vegan restaurant when vegan is non-negotiable',
    persona: {
      id: 'test-vegan',
      name: 'Pat',
      demographics: { ageRange: '30s', lifestage: 'young professional', location: 'urban' },
      persistentConstraints: [
        {
          text: 'Must be fully vegan restaurant',
          type: 'concern',
          severity: 'non-negotiable',
          reason: 'Ethical dietary requirement',
          flexibility: 0
        }
      ],
      personality: { flexibility: 0.3, assertiveness: 0.7, detailOrientation: 0.6, socialStyle: 'direct' },
      communication: { verbosity: 'moderate', emotionality: 'moderate', examplePhrases: [] }
    },
    proposal: {
      question: 'Where should we have dinner?',
      proposal: 'The Steakhouse on Main Street - they have some vegetarian options on the menu',
      rationale: 'Popular restaurant with variety for everyone',
      addressedConcerns: []
    },
    contextualization: {
      summary: 'This is a steakhouse with limited vegetarian options, which does not meet your vegan requirement',
      confidence: 'low',
      highlights: [],
      concerns: ['Not a vegan restaurant', 'Only has vegetarian options']
    },
    expected: {
      type: 'object',
      nonNegotiablesSatisfied: false,
      reasoning: 'vegan|steakhouse'
    }
  },

  // =============================================================================
  // EDGE CASE - Vegetarian vs Vegan confusion
  // =============================================================================
  {
    id: 'object-vegetarian-not-vegan',
    name: 'Object - Vegetarian Not Sufficient for Vegan',
    description: 'Common mistake: vegetarian options ≠ vegan restaurant',
    persona: {
      id: 'test-vegan',
      name: 'Pat',
      demographics: { ageRange: '30s', lifestage: 'young professional', location: 'urban' },
      persistentConstraints: [
        {
          text: 'Must be fully vegan restaurant',
          type: 'concern',
          severity: 'non-negotiable',
          reason: 'Ethical dietary requirement',
          flexibility: 0
        }
      ],
      personality: { flexibility: 0.3, assertiveness: 0.7, detailOrientation: 0.6, socialStyle: 'direct' },
      communication: { verbosity: 'moderate', emotionality: 'moderate', examplePhrases: [] }
    },
    proposal: {
      question: 'Where should we have dinner?',
      proposal: 'Cafe Gratitude - vegetarian restaurant with extensive plant-based menu',
      rationale: 'Plant-based options for everyone',
      addressedConcerns: []
    },
    contextualization: {
      summary: 'This is a vegetarian restaurant, but may not be fully vegan (could have dairy/eggs)',
      confidence: 'medium',
      highlights: ['Plant-based menu'],
      concerns: ['Says vegetarian not vegan', 'May have dairy products']
    },
    expected: {
      type: 'object',
      nonNegotiablesSatisfied: false,
      reasoning: 'vegan|vegetarian'
    }
  },

  // =============================================================================
  // ACCEPT WITH RESERVATIONS - Non-negotiables met, preferences not
  // =============================================================================
  {
    id: 'accept-reservations-preference-unmet',
    name: 'Accept with Reservations - Preference Not Met',
    description: 'Non-negotiables satisfied but strong preference ignored',
    persona: {
      id: 'test-budget',
      name: 'Taylor',
      demographics: { ageRange: '20s', lifestage: 'student', location: 'urban' },
      persistentConstraints: [
        {
          text: 'Must have vegetarian options',
          type: 'concern',
          severity: 'non-negotiable',
          reason: 'Dietary requirement',
          flexibility: 0
        },
        {
          text: 'Budget under $20 per person',
          type: 'concern',
          severity: 'strong-preference',
          reason: 'Student budget',
          flexibility: 0.2
        }
      ],
      personality: { flexibility: 0.6, assertiveness: 0.4, detailOrientation: 0.5, socialStyle: 'collaborative' },
      communication: { verbosity: 'moderate', emotionality: 'moderate', examplePhrases: [] }
    },
    proposal: {
      question: 'Where should we have dinner?',
      proposal: 'Modern Italian restaurant with extensive vegetarian pasta options, average $35 per person',
      rationale: 'High-quality food with vegetarian choices',
      addressedConcerns: ['Must have vegetarian options']
    },
    contextualization: {
      summary: 'This restaurant has vegetarian options but exceeds your budget preference',
      confidence: 'medium',
      highlights: ['Good vegetarian menu'],
      concerns: ['Price is higher than your $20 budget']
    },
    expected: {
      type: 'accept-with-reservations',
      nonNegotiablesSatisfied: true,
      reasoning: 'budget|expensive'
    }
  },

  // =============================================================================
  // IMPLICIT vs EXPLICIT - Tests response to vague proposals
  // =============================================================================
  {
    id: 'object-implicit-not-explicit',
    name: 'Object - Implicit Not Sufficient',
    description: 'Proposal implies but does not explicitly state constraint is met',
    persona: {
      id: 'test-allergy',
      name: 'Jordan',
      demographics: { ageRange: '30s', lifestage: 'young professional', location: 'urban' },
      persistentConstraints: [
        {
          text: 'Nut-free food or clear allergen labeling',
          type: 'concern',
          severity: 'non-negotiable',
          reason: 'Severe nut allergy',
          flexibility: 0
        }
      ],
      personality: { flexibility: 0.2, assertiveness: 0.7, detailOrientation: 0.8, socialStyle: 'direct' },
      communication: { verbosity: 'terse', emotionality: 'reserved', examplePhrases: [] }
    },
    proposal: {
      question: 'What food should we have at the potluck?',
      proposal: 'Everyone bring a dish to share, with a variety of options',
      rationale: 'Potluck style gives everyone flexibility',
      addressedConcerns: []
    },
    contextualization: {
      summary: 'This proposal does not mention allergen labeling or nut-free requirements',
      confidence: 'low',
      highlights: [],
      concerns: ['No mention of allergen safety', 'Could be unsafe for your nut allergy']
    },
    expected: {
      type: 'object',
      nonNegotiablesSatisfied: false,
      reasoning: 'allergen|nut|labeling'
    }
  },

  // =============================================================================
  // MULTIPLE CONSTRAINTS - Some met, some not
  // =============================================================================
  {
    id: 'object-partial-satisfaction',
    name: 'Object - Partial Constraint Satisfaction',
    description: 'Some non-negotiables met, but one critical constraint violated',
    persona: {
      id: 'test-multi',
      name: 'Alex',
      demographics: { ageRange: '40s', lifestage: 'parent', location: 'suburban' },
      persistentConstraints: [
        {
          text: 'Must end by 8pm for childcare pickup',
          type: 'concern',
          severity: 'non-negotiable',
          reason: 'Childcare constraint',
          flexibility: 0
        },
        {
          text: 'Transit accessible or ample parking',
          type: 'concern',
          severity: 'non-negotiable',
          reason: 'Transportation need',
          flexibility: 0
        }
      ],
      personality: { flexibility: 0.4, assertiveness: 0.6, detailOrientation: 0.7, socialStyle: 'direct' },
      communication: { verbosity: 'moderate', emotionality: 'moderate', examplePhrases: [] }
    },
    proposal: {
      question: 'When and where should we meet?',
      proposal: 'Downtown venue with garage parking, event from 7pm-10pm',
      rationale: 'Central location with parking available',
      addressedConcerns: ['Transit accessible or ample parking']
    },
    contextualization: {
      summary: 'This venue has parking but the event ends at 10pm, past your 8pm deadline',
      confidence: 'low',
      highlights: ['Garage parking available'],
      concerns: ['Ends at 10pm, you need to leave by 8pm']
    },
    expected: {
      type: 'object',
      nonNegotiablesSatisfied: false,
      reasoning: '8pm|10pm|childcare'
    }
  }
];

// =============================================================================
// TEST RUNNER
// =============================================================================

interface TestResult {
  testCase: ResponseDecisionTestCase;
  actualResponse: any;
  pass: boolean;
  failures: string[];
}

async function runTest(
  testCase: ResponseDecisionTestCase,
  decider: ResponseDecider
): Promise<TestResult> {
  const failures: string[] = [];

  // Set logging context
  setLogContext({
    phase: 'response-decision-test',
    personaId: testCase.persona.id
  });

  // Run decision
  const response = await decider.decideResponse(
    testCase.persona,
    testCase.contextualization,
    testCase.proposal
  );

  // Validate response type
  if (response.type !== testCase.expected.type) {
    failures.push(`Expected type "${testCase.expected.type}" but got "${response.type}"`);
  }

  // Validate nonNegotiablesSatisfied flag
  if (response.nonNegotiablesSatisfied !== testCase.expected.nonNegotiablesSatisfied) {
    failures.push(
      `Expected nonNegotiablesSatisfied=${testCase.expected.nonNegotiablesSatisfied} but got ${response.nonNegotiablesSatisfied}`
    );
  }

  // Validate reasoning contains expected keywords
  if (testCase.expected.reasoning) {
    const regex = new RegExp(testCase.expected.reasoning, 'i');
    if (!regex.test(response.reasoning)) {
      failures.push(
        `Expected reasoning to match pattern "${testCase.expected.reasoning}" but got: "${response.reasoning}"`
      );
    }
  }

  return {
    testCase,
    actualResponse: response,
    pass: failures.length === 0,
    failures
  };
}

async function main() {
  console.log('================================================================================');
  console.log('RESPONSE DECISION TEST HARNESS');
  console.log('================================================================================');
  console.log(`Running ${TEST_CASES.length} test(s)\n`);

  // Start logging session
  startNewSession('response-decision-tests');

  // Initialize LLM client
  const llmClient = new LLMClient();
  await llmClient.initializeQuota('llama-3.1-8b-instant');

  // Initialize response decider
  const decider = new ResponseDecider(llmClient);

  // Run tests
  const results: TestResult[] = [];

  for (const testCase of TEST_CASES) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`TEST: ${testCase.name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Description: ${testCase.description}`);
    console.log(`\nPersona: ${testCase.persona.name}`);
    console.log(`Constraints:`);
    for (const c of testCase.persona.persistentConstraints) {
      console.log(`  - [${c.severity}] ${c.text}`);
    }
    console.log(`\nProposal: ${testCase.proposal.proposal}`);

    const result = await runTest(testCase, decider);
    results.push(result);

    console.log(`\n--- Response ---`);
    console.log(`Type: ${result.actualResponse.type}`);
    console.log(`Non-Negotiables Satisfied: ${result.actualResponse.nonNegotiablesSatisfied}`);
    console.log(`Reasoning: ${result.actualResponse.reasoning}`);

    if (result.actualResponse.constraintAnalysis && result.actualResponse.constraintAnalysis.length > 0) {
      console.log(`\nConstraint Analysis:`);
      for (const analysis of result.actualResponse.constraintAnalysis) {
        const icon = analysis.satisfied ? '✅' : '❌';
        console.log(`  ${icon} ${analysis.constraint}: ${analysis.satisfied ? 'SATISFIED' : 'NOT SATISFIED'}`);
        console.log(`     Evidence: ${analysis.evidence}`);
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

  // Exit with proper code
  process.exit(passed === total ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
