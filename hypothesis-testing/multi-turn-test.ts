/**
 * Multi-Turn Conversation Test
 *
 * Tests whether extraction evolves correctly through dialogue,
 * using dig deeper questions to refine understanding.
 *
 * Usage:
 *   npx ts-node multi-turn-test.ts
 */

import 'dotenv/config';
import Groq from 'groq-sdk';
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionUserPrompt,
  POTLUCK_INITIAL
} from './extraction-test';
import { ExtractionInput, ExtractionOutput, Collaboration } from './types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const MODEL = 'llama-3.3-70b-versatile';

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 2000
  });

  return response.choices[0]?.message?.content || '';
}

function parseJSON<T>(text: string): T | null {
  try {
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

// --- Multi-Turn Test Scenario ---

interface ConversationTurn {
  turnNumber: number;
  participant: string;
  message: string;
  expectedBehavior: string;
  collaboration: Collaboration;
}

// Sarah's multi-turn scenario about transit
const SARAH_MULTI_TURN: ConversationTurn[] = [
  // Turn 1: Initial message
  {
    turnNumber: 1,
    participant: "Sarah",
    message: "I thought it would be nice to get the neighborhood together for a potluck. I don't have a car so wherever we do it needs to be on a bus line. Afternoons work best for me since I work mornings.",
    expectedBehavior: "Should extract transit concern at intensity 4 (stated as requirement), afternoon desire at intensity 2-3",
    collaboration: POTLUCK_INITIAL
  },

  // Turn 2: Response to dig deeper question about transit
  // Dig deeper was: "How would you feel if we couldn't find a location on a bus line?"
  {
    turnNumber: 2,
    participant: "Sarah",
    message: "I'd really prefer to avoid relying on someone else for a ride, but if someone offered I guess I could manage. It's more about not wanting to impose on people or be stuck waiting for them. I've had bad experiences with that before.",
    expectedBehavior: "Transit concern should evolve: intensity drops to 3, underlying reveals autonomy/not-imposing need. May add new extraction about past bad experiences.",
    collaboration: {
      ...POTLUCK_INITIAL,
      concerns: [
        {
          participant: "Sarah",
          text: "I don't have a car so wherever we do it needs to be on a bus line",
          need: "transit_access",
          intensity: "high"
        }
      ],
      desires: [
        {
          participant: "Sarah",
          text: "Afternoons work best for me since I work mornings",
          want: "afternoon_timing",
          intensity: "medium"
        }
      ]
    }
  },

  // Turn 3: Response to dig deeper about autonomy/imposing
  // Expected dig deeper: "What happened in those past experiences that made them difficult?"
  {
    turnNumber: 3,
    participant: "Sarah",
    message: "Last time I had to wait over an hour when someone forgot to pick me up. I felt terrible having to call and remind them, and then I was late and missed part of the event. I just want to be able to get myself there on my own schedule.",
    expectedBehavior: "Should now fully understand: underlying need is reliability/punctuality/self-sufficiency, not just transportation. Intensity might stay at 3 but underlying should be crystal clear.",
    collaboration: {
      ...POTLUCK_INITIAL,
      concerns: [
        {
          participant: "Sarah",
          text: "I don't have a car so wherever we do it needs to be on a bus line",
          need: "autonomy/not wanting to impose",
          intensity: "high"
        }
      ],
      desires: [
        {
          participant: "Sarah",
          text: "Afternoons work best for me since I work mornings",
          want: "afternoon_timing",
          intensity: "medium"
        }
      ]
    }
  }
];

async function runMultiTurnTest() {
  console.log('='.repeat(80));
  console.log('MULTI-TURN TEST: Sarah Transit Concern Evolution');
  console.log('='.repeat(80));
  console.log(`Model: ${MODEL}\n`);

  const results: { turn: number; result: ExtractionOutput | null }[] = [];

  for (const turn of SARAH_MULTI_TURN) {
    console.log('-'.repeat(80));
    console.log(`TURN ${turn.turnNumber}`);
    console.log('-'.repeat(80));

    console.log('\n📝 INPUT:');
    console.log(`"${turn.message}"\n`);

    console.log('📋 EXPECTED:');
    console.log(`${turn.expectedBehavior}\n`);

    const input: ExtractionInput = {
      collaboration: turn.collaboration,
      participant: turn.participant,
      conversation: turn.message
    };

    const userPrompt = buildExtractionUserPrompt(input);

    try {
      const rawResponse = await callLLM(EXTRACTION_SYSTEM_PROMPT, userPrompt);
      const result = parseJSON<ExtractionOutput>(rawResponse);

      if (result) {
        results.push({ turn: turn.turnNumber, result });

        console.log('📤 ACTUAL OUTPUT:\n');

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
      } else {
        results.push({ turn: turn.turnNumber, result: null });
        console.log('❌ Failed to parse response');
        console.log('Raw response:', rawResponse);
      }
    } catch (error) {
      results.push({ turn: turn.turnNumber, result: null });
      console.error('❌ Error:', error);
    }

    console.log('\n');
  }

  // Summary analysis
  console.log('='.repeat(80));
  console.log('EVOLUTION ANALYSIS');
  console.log('='.repeat(80));

  console.log('\n📈 TRANSIT CONCERN EVOLUTION:\n');

  results.forEach(({ turn, result }) => {
    if (result && result.extractions) {
      const transitConcern = result.extractions.find(
        e => e.type === 'concern' &&
        (e.summary.toLowerCase().includes('transit') ||
         e.summary.toLowerCase().includes('car') ||
         e.summary.toLowerCase().includes('bus') ||
         e.summary.toLowerCase().includes('ride') ||
         e.underlying.toLowerCase().includes('transport'))
      );

      if (transitConcern) {
        console.log(`Turn ${turn}:`);
        console.log(`  Intensity: ${transitConcern.intensity}/4`);
        console.log(`  Underlying: ${transitConcern.underlying}`);
        console.log('');
      } else {
        // Look for related concerns
        const relatedConcern = result.extractions.find(e => e.type === 'concern');
        if (relatedConcern) {
          console.log(`Turn ${turn}:`);
          console.log(`  (Related concern found)`);
          console.log(`  Intensity: ${relatedConcern.intensity}/4`);
          console.log(`  Underlying: ${relatedConcern.underlying}`);
          console.log('');
        }
      }
    }
  });

  console.log('\n🔍 EVALUATION QUESTIONS:\n');
  console.log('1. Did the underlying need become clearer through turns?');
  console.log('   - Turn 1: Should be about transportation');
  console.log('   - Turn 2: Should reveal autonomy/not-imposing');
  console.log('   - Turn 3: Should crystallize as reliability/self-sufficiency');
  console.log('');
  console.log('2. Did the scripted responses make sense given the dig deeper questions?');
  console.log('   - Turn 2 response should feel like natural answer to "what if no bus line?"');
  console.log('   - Turn 3 response should feel like natural answer to "what happened before?"');
  console.log('');
  console.log('3. Did intensity appropriately adjust?');
  console.log('   - Should drop from 4 to 3 once carpool is mentioned as acceptable');
  console.log('');
}

// Main
async function main() {
  if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY environment variable not set');
    process.exit(1);
  }

  await runMultiTurnTest();
}

main().catch(console.error);
