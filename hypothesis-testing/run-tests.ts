/**
 * Test Runner for Hypothesis Testing
 *
 * Runs extraction and synthesis tests against an LLM and outputs results
 * for evaluation.
 *
 * Usage:
 *   npx ts-node run-tests.ts extraction   # run extraction tests
 *   npx ts-node run-tests.ts synthesis    # run synthesis test
 *   npx ts-node run-tests.ts all          # run all tests
 */

import 'dotenv/config';
import Groq from 'groq-sdk';
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionUserPrompt,
  TEST_CASES,
  EVALUATION_CRITERIA
} from './extraction-test';
import {
  SYNTHESIS_SYSTEM_PROMPT,
  buildSynthesisUserPrompt,
  SYNTHESIS_TEST_INPUT,
  SYNTHESIS_EVALUATION
} from './synthesis-test';
import { ExtractionOutput, SynthesisOutput } from './types';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Model to use - can switch for comparison
const MODEL = 'llama-3.3-70b-versatile';

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,  // Lower for more consistent extraction
    max_tokens: 2000
  });

  return response.choices[0]?.message?.content || '';
}

function parseJSON<T>(text: string): T | null {
  try {
    // Try to extract JSON from response (might have markdown wrapping)
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

// --- Extraction Tests ---

async function runExtractionTests() {
  console.log('=' .repeat(80));
  console.log('EXTRACTION TESTS');
  console.log('=' .repeat(80));
  console.log(`Model: ${MODEL}\n`);

  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    const testNum = i + 1;

    console.log('-'.repeat(80));
    console.log(`TEST ${testNum}: ${testCase.participant}`);
    console.log('-'.repeat(80));

    console.log('\n📝 INPUT:');
    console.log(`"${testCase.conversation}"\n`);

    const userPrompt = buildExtractionUserPrompt(testCase);

    try {
      const rawResponse = await callLLM(EXTRACTION_SYSTEM_PROMPT, userPrompt);
      const result = parseJSON<ExtractionOutput>(rawResponse);

      if (result) {
        console.log('📤 OUTPUT:\n');

        if (result.extractions && result.extractions.length > 0) {
          result.extractions.forEach((e, i) => {
            const typeEmoji = e.type === 'concern' ? '⚠️' : '✨';
            console.log(`${typeEmoji} EXTRACTION ${i + 1}: ${e.type.toUpperCase()}`);
            console.log(`   Quote: "${e.quote}"`);
            console.log(`   Summary: ${e.summary}`);
            console.log(`   Underlying: ${e.underlying}`);
            console.log(`   Intensity: ${e.intensity}/4`);
            console.log(`   Dig deeper: "${e.digDeeper}"`);
            console.log('');
          });
        } else {
          console.log('  (no extractions)');
        }

        if (result.newConstraints && result.newConstraints.length > 0) {
          console.log('🔒 NEW CONSTRAINTS:');
          result.newConstraints.forEach(c => console.log(`   • ${c}`));
          console.log('');
        }

        // Show evaluation criteria for this test
        const criteriaKey = `test${testNum}_${testCase.participant.toLowerCase()}` as keyof typeof EVALUATION_CRITERIA;
        const criteria = EVALUATION_CRITERIA[criteriaKey];
        if (criteria) {
          console.log('\n📋 EVALUATION CRITERIA:');
          Object.entries(criteria).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
        }
      } else {
        console.log('❌ Failed to parse response');
        console.log('Raw response:', rawResponse);
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }

    console.log('\n');
  }
}

// --- Synthesis Test ---

async function runSynthesisTest() {
  console.log('='.repeat(80));
  console.log('SYNTHESIS TEST');
  console.log('='.repeat(80));
  console.log(`Model: ${MODEL}\n`);

  console.log('📥 INPUT SUMMARY:');
  console.log(`Participants: ${SYNTHESIS_TEST_INPUT.collaboration.participants.join(', ')}`);
  console.log(`Concerns: ${SYNTHESIS_TEST_INPUT.collaboration.concerns.length}`);
  console.log(`Desires: ${SYNTHESIS_TEST_INPUT.collaboration.desires.length}`);
  console.log(`Questions to resolve: ${SYNTHESIS_TEST_INPUT.questionsToResolve.join(', ')}\n`);

  const userPrompt = buildSynthesisUserPrompt(SYNTHESIS_TEST_INPUT);

  try {
    const rawResponse = await callLLM(SYNTHESIS_SYSTEM_PROMPT, userPrompt);
    const result = parseJSON<SynthesisOutput>(rawResponse);

    if (result) {
      console.log('📤 OUTPUT:\n');

      console.log('PROPOSALS:');
      result.proposals.forEach((p, i) => {
        console.log(`\n${i + 1}. ${p.question}`);
        console.log(`   Proposal: ${p.proposal}`);
        console.log(`   Rationale: ${p.rationale}`);
        console.log(`   Addresses concerns: ${p.addressedConcerns.join(', ') || 'none listed'}`);
        console.log(`   Incorporates desires: ${p.addressedDesires.join(', ') || 'none listed'}`);
      });

      if (result.unresolvedTensions.length > 0) {
        console.log('\nUNRESOLVED TENSIONS:');
        result.unresolvedTensions.forEach(t => {
          console.log(`\n  • ${t.description}`);
          console.log(`    Concerns involved: ${t.concernsInvolved.join(', ')}`);
          console.log(`    Possible resolutions: ${t.possibleResolutions.join('; ')}`);
        });
      }

      console.log('\n📋 EVALUATION CRITERIA:');
      console.log('\nWhen:');
      Object.entries(SYNTHESIS_EVALUATION.when).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
      console.log('\nWhere:');
      Object.entries(SYNTHESIS_EVALUATION.where).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
      console.log('\nWhat to bring:');
      Object.entries(SYNTHESIS_EVALUATION.whatToBring).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
      console.log('\nOverall:');
      Object.entries(SYNTHESIS_EVALUATION.overallQuality).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

    } else {
      console.log('❌ Failed to parse response');
      console.log('Raw response:', rawResponse);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// --- Main ---

async function main() {
  const testType = process.argv[2] || 'all';

  if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY environment variable not set');
    console.log('Set it with: export GROQ_API_KEY=your_key_here');
    process.exit(1);
  }

  if (testType === 'extraction' || testType === 'all') {
    await runExtractionTests();
  }

  if (testType === 'synthesis' || testType === 'all') {
    await runSynthesisTest();
  }
}

main().catch(console.error);
