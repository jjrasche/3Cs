/**
 * Entry point for running simulations
 *
 * Usage:
 *   ts-node tests/simulation/run-simulation.ts [scenario-id]
 *
 * If no scenario-id provided, runs all scenarios.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { SimulationRunner } from './runner';
import { LLMClient } from '../framework/llm-client';
import { SimulationConfig, SimulationResultSerialized } from './types';
import {
  ALL_SCENARIOS,
  SCENARIOS_BY_DIFFICULTY
} from './scenarios';
import * as fs from 'fs';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Safely convert a value to string, handling objects that LLM may return
 */
function safeString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    // Try to extract meaningful text from common patterns
    if (value.text) return value.text;
    if (value.proposal) return value.proposal;
    if (value.description) return value.description;
    // Fallback to JSON
    return JSON.stringify(value);
  }
  return String(value);
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: SimulationConfig = {
  maxRounds: 3,
  timeoutMs: 600000, // 10 minutes
  extractionModel: 'llama-3.1-8b-instant',
  synthesisModel: 'llama-3.1-8b-instant',
  personaModel: 'llama-3.1-8b-instant',
  extractionMaxTurns: 5,
  allowForking: false,
  verbose: true,
  saveConversations: true
};

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const scenarioId = args[0];

  // Initialize LLM client
  const llmClient = new LLMClient();

  // Initialize runner
  const runner = new SimulationRunner(llmClient, DEFAULT_CONFIG);

  // Determine which scenarios to run
  let scenarios = ALL_SCENARIOS;

  if (scenarioId) {
    const scenario = ALL_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) {
      console.error(`Scenario not found: ${scenarioId}`);
      console.error(`Available scenarios:`);
      for (const s of ALL_SCENARIOS) {
        console.error(`  - ${s.id}: ${s.name}`);
      }
      process.exit(1);
    }
    scenarios = [scenario];
  } else {
    console.log(`Running all ${scenarios.length} scenarios\n`);
  }

  // Run scenarios
  const results: SimulationResultSerialized[] = [];

  for (const scenario of scenarios) {
    try {
      const result = await runner.runSimulation(scenario);
      results.push(result);

      // Print summary
      printResultSummary(result);

    } catch (error) {
      console.error(`\n❌ Simulation failed for ${scenario.id}:`, error);
    }
  }

  // Save results
  saveResults(results);

  // Print overall summary
  printOverallSummary(results);
}

// =============================================================================
// OUTPUT FORMATTING
// =============================================================================

function printResultSummary(result: SimulationResultSerialized) {
  const { scenario, success, convergence, participation } = result;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`RESULT: ${scenario.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`\nSuccess: ${success ? '✅ YES' : '❌ NO'}`);
  console.log(`\nConvergence:`);
  console.log(`  - Converged: ${convergence.converged ? 'Yes' : 'No'}`);
  console.log(`  - Rounds: ${convergence.rounds}`);
  console.log(`  - Final Status: ${convergence.finalStatus}`);
  console.log(`\nParticipation:`);
  console.log(`  - Acceptances: ${participation.acceptances}`);
  console.log(`  - With Reservations: ${participation.acceptancesWithReservations}`);
  console.log(`  - Objections: ${participation.objections}`);
  console.log(`  - Opt Outs: ${participation.optOuts}`);
  console.log(`  - Acceptance Rate: ${(participation.acceptanceRate * 100).toFixed(1)}%`);

  if (result.history.finalProposal && result.history.finalProposal.length > 0) {
    console.log(`\nFinal Proposal:`);
    for (const proposal of result.history.finalProposal) {
      console.log(`  Q: ${safeString(proposal.question)}`);
      console.log(`  A: ${safeString(proposal.proposal)}`);
    }
  }

  // Constraint validation
  console.log(`\nConstraint Satisfaction:`);
  console.log(`  - Total Non-Negotiable: ${result.constraints.totalNonNegotiable}`);
  console.log(`  - Satisfied: ${result.constraints.satisfiedNonNegotiable}`);
  if (result.constraints.satisfiedConstraints.length > 0) {
    console.log(`  - Satisfied Constraints:`);
    for (const c of result.constraints.satisfiedConstraints) {
      console.log(`    ✅ ${c}`);
    }
  }
  if (result.constraints.violatedConstraints.length > 0) {
    console.log(`  - Violated Constraints:`);
    for (const c of result.constraints.violatedConstraints) {
      console.log(`    ❌ ${c}`);
    }
  }

  // Conversation transcripts summary
  console.log(`\nExtraction Summary:`);
  for (const transcript of result.history.conversationTranscripts) {
    console.log(`  - ${transcript.personaName}: ${transcript.turns.length} turns, ${transcript.extractedTags.length} tags`);
  }

  console.log(`\nTiming:`);
  console.log(`  - Total: ${result.timing.totalMs}ms`);
  console.log(`  - Extraction: ${result.timing.extractionMs}ms`);

  console.log(`\n${'='.repeat(80)}\n`);
}

function printOverallSummary(results: SimulationResultSerialized[]) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`OVERALL SUMMARY`);
  console.log(`${'='.repeat(80)}`);

  const total = results.length;
  const successful = results.filter(r => r.success).length;
  const converged = results.filter(r => r.convergence.converged).length;

  console.log(`\nTotal Scenarios: ${total}`);
  console.log(`Successful: ${successful} (${(successful / total * 100).toFixed(1)}%)`);
  console.log(`Converged: ${converged} (${(converged / total * 100).toFixed(1)}%)`);

  // Group by difficulty
  const byDifficulty = {
    easy: results.filter(r => r.scenario.difficulty.level === 'easy'),
    moderate: results.filter(r => r.scenario.difficulty.level === 'moderate'),
    hard: results.filter(r => r.scenario.difficulty.level === 'hard'),
    impossible: results.filter(r => r.scenario.difficulty.level === 'impossible')
  };

  console.log(`\nBy Difficulty:`);
  for (const [level, scenarios] of Object.entries(byDifficulty)) {
    if (scenarios.length === 0) continue;
    const successRate = scenarios.filter(s => s.success).length / scenarios.length * 100;
    console.log(`  - ${level}: ${successRate.toFixed(1)}% success (${scenarios.length} scenarios)`);
  }

  console.log(`\n${'='.repeat(80)}\n`);
}

// =============================================================================
// SAVE RESULTS
// =============================================================================

function saveResults(results: SimulationResultSerialized[]) {
  const outputDir = path.join(__dirname, '../output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `simulation-results-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);

  const output = {
    timestamp: new Date().toISOString(),
    config: DEFAULT_CONFIG,
    summary: {
      total: results.length,
      successful: results.filter(r => r.success).length,
      converged: results.filter(r => r.convergence.converged).length
    },
    results
  };

  fs.writeFileSync(filepath, JSON.stringify(output, null, 2));

  console.log(`\n✓ Results saved to: ${filepath}\n`);
}

// =============================================================================
// RUN
// =============================================================================

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
