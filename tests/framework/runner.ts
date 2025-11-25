/**
 * Test Runner Framework
 *
 * Data-driven test execution for all 4 prompts
 *
 * Usage:
 *   npx ts-node tests/run.ts                    # run all tests
 *   npx ts-node tests/run.ts briefing           # run briefing tests
 *   npx ts-node tests/run.ts --model llama-8b   # use specific model
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
import { LLMClient, LLMConfig, MODEL_CONFIGS } from './llm-client';
import { Judge } from './judge';
import {
  PromptType,
  TestScenario,
  TestResult,
  JudgmentResult,
  SynthesisInput,
  QuestionIdentificationInput,
  QuestionIdentificationOutput
} from '../types';

// Import prompts and scenarios
import { PROMPTS, buildUserPrompt } from '../prompts';
import { getScenariosByType } from '../scenarios';

export class TestRunner {
  private llmClient: LLMClient;
  private judge: Judge;
  private results: TestResult<any>[] = [];

  constructor() {
    this.llmClient = new LLMClient();
    this.judge = new Judge(this.llmClient);
  }

  async runAll(modelConfig: LLMConfig): Promise<TestResult<any>[]> {
    const promptTypes: PromptType[] = ['briefing', 'extraction', 'synthesis', 'contextualization', 'questionIdentification'];

    for (const promptType of promptTypes) {
      await this.runPromptTests(promptType, modelConfig);
    }

    return this.results;
  }

  async runPromptTests(
    promptType: PromptType,
    modelConfig: LLMConfig
  ): Promise<TestResult<any>[]> {
    const scenarios = this.loadScenarios(promptType);
    const promptResults: TestResult<any>[] = [];

    console.log(`\n${'='.repeat(80)}`);
    console.log(`${promptType.toUpperCase()} TESTS`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Model: ${modelConfig.model}`);
    console.log(`Scenarios: ${scenarios.length}\n`);

    for (const scenario of scenarios) {
      const result = await this.runScenario(scenario, modelConfig);
      promptResults.push(result);
      this.results.push(result);
      this.printResult(result);
    }

    return promptResults;
  }

  private async runScenario<TInput, TOutput>(
    scenario: TestScenario<TInput, TOutput>,
    modelConfig: LLMConfig
  ): Promise<TestResult<TOutput>> {
    console.log(`\n${'-'.repeat(80)}`);
    console.log(`TEST: ${scenario.name}`);
    console.log(`${scenario.description}`);
    console.log(`${'-'.repeat(80)}\n`);

    // For synthesis tests, run Question Identification first
    if (scenario.promptType === 'synthesis') {
      await this.enrichSynthesisInput(scenario.input as any, modelConfig);
    }

    const systemPrompt = PROMPTS[scenario.promptType];
    const userPrompt = buildUserPrompt(scenario.promptType, scenario.input);

    // Call LLM
    const response = await this.llmClient.call(systemPrompt, userPrompt, modelConfig);

    // Parse response
    const { output, parseSuccess } = this.parseResponse<TOutput>(response.content);

    // Judge the output
    let judgment: JudgmentResult;
    if (parseSuccess && output) {
      judgment = await this.judge.evaluate(
        scenario.promptType,
        scenario.input,
        output,
        scenario.expectedBehavior,
        modelConfig
      );
    } else {
      judgment = {
        pass: false,
        score: 0,
        criteria: [],
        summary: 'Failed to parse LLM response as valid JSON'
      };
    }

    return {
      scenarioId: scenario.id,
      model: modelConfig.model,
      output,
      rawResponse: response.content,
      parseSuccess,
      judgment,
      timestamp: new Date(),
      latencyMs: response.latencyMs
    };
  }

  /**
   * Enrich synthesis input by running Question Identification first
   * This implements the documented architecture: Structure first, solve second
   */
  private async enrichSynthesisInput(
    synthesisInput: SynthesisInput,
    modelConfig: LLMConfig
  ): Promise<void> {
    console.log('  🔍 Running Question Identification first...\n');

    // Build QI input from synthesis input
    const qiInput: QuestionIdentificationInput = {
      collaboration: synthesisInput.collaboration
    };

    // Run Question Identification
    const qiSystemPrompt = PROMPTS.questionIdentification;
    const qiUserPrompt = buildUserPrompt('questionIdentification', qiInput);
    const qiResponse = await this.llmClient.call(qiSystemPrompt, qiUserPrompt, modelConfig);

    // Parse QI output
    const { output: qiOutput, parseSuccess } = this.parseResponse<QuestionIdentificationOutput>(qiResponse.content);

    if (parseSuccess && qiOutput) {
      // Attach QI output to synthesis input
      synthesisInput.questionIdentification = qiOutput;

      console.log(`  ✅ Question Identification complete:`);
      console.log(`     - ${qiOutput.questions.length} questions identified`);
      console.log(`     - ${qiOutput.couplings.length} couplings detected`);
      console.log(`     - ${qiOutput.consensusItems.length} consensus items\n`);
    } else {
      console.warn('  ⚠️  Question Identification failed to parse, synthesis will proceed without it\n');
    }
  }

  private parseResponse<T>(content: string): { output: T | null; parseSuccess: boolean } {
    try {
      // Extract JSON from response (might have markdown wrapping)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return {
          output: JSON.parse(jsonMatch[0]) as T,
          parseSuccess: true
        };
      }
      return { output: null, parseSuccess: false };
    } catch (e) {
      return { output: null, parseSuccess: false };
    }
  }

  private loadScenarios<TInput, TOutput>(
    promptType: PromptType
  ): TestScenario<TInput, TOutput>[] {
    return getScenariosByType(promptType) as TestScenario<TInput, TOutput>[];
  }

  private printResult(result: TestResult<any>): void {
    const passEmoji = result.judgment.pass ? '✅' : '❌';
    const scoreColor = result.judgment.score >= 4 ? '🟢' : result.judgment.score >= 3 ? '🟡' : '🔴';

    console.log(`\n${passEmoji} Result: ${result.judgment.pass ? 'PASS' : 'FAIL'}`);
    console.log(`${scoreColor} Score: ${result.judgment.score}/5`);
    console.log(`⏱️  Latency: ${result.latencyMs}ms`);
    console.log(`\n📋 Summary: ${result.judgment.summary}`);

    if (result.judgment.criteria.length > 0) {
      console.log('\nCriteria:');
      for (const criterion of result.judgment.criteria) {
        const emoji = criterion.pass ? '✅' : '❌';
        console.log(`  ${emoji} ${criterion.name}: ${criterion.score}/5`);
        console.log(`     ${criterion.explanation}`);
      }
    }

    if (!result.parseSuccess) {
      console.log('\n⚠️  Parse failed. Raw response:');
      console.log(result.rawResponse.substring(0, 500) + '...');
    }
  }

  printSummary(): void {
    console.log(`\n${'='.repeat(80)}`);
    console.log('TEST SUMMARY');
    console.log(`${'='.repeat(80)}\n`);

    const passed = this.results.filter(r => r.judgment.pass).length;
    const total = this.results.length;
    const avgScore = this.results.reduce((sum, r) => sum + r.judgment.score, 0) / total;

    console.log(`Total: ${total} tests`);
    console.log(`Passed: ${passed} (${Math.round(passed / total * 100)}%)`);
    console.log(`Average Score: ${(Math.round(avgScore * 10) / 10)}/5`);

    // Group by prompt type
    const byType: Record<string, TestResult<any>[]> = {};
    for (const result of this.results) {
      const type = result.scenarioId.split('-')[0];
      if (!byType[type]) byType[type] = [];
      byType[type].push(result);
    }

    console.log('\nBy Prompt Type:');
    for (const [type, results] of Object.entries(byType)) {
      const typePassed = results.filter(r => r.judgment.pass).length;
      const typeAvg = results.reduce((sum, r) => sum + r.judgment.score, 0) / results.length;
      console.log(`  ${type}: ${typePassed}/${results.length} passed, avg ${(Math.round(typeAvg * 10) / 10)}/5`);
    }
  }

  saveResults(outputPath?: string): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = outputPath || path.join(__dirname, '..', '..', 'tests', 'output', `test-results-${timestamp}.json`);

    // Ensure output directory exists
    const outputDir = path.dirname(filename);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const output = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.judgment.pass).length,
        avgScore: this.results.reduce((sum, r) => sum + r.judgment.score, 0) / this.results.length
      },
      results: this.results
    };

    fs.writeFileSync(filename, JSON.stringify(output, null, 2));
    console.log(`\n📁 Results saved to: ${filename}`);
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let promptType: PromptType | 'all' = 'all';
  let modelKey = 'llama-70b';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) {
      modelKey = args[i + 1];
      i++;
    } else if (['briefing', 'extraction', 'synthesis', 'contextualization'].includes(args[i])) {
      promptType = args[i] as PromptType;
    }
  }

  const modelConfig = MODEL_CONFIGS[modelKey];
  if (!modelConfig) {
    console.error(`Unknown model: ${modelKey}`);
    console.log('Available models:', Object.keys(MODEL_CONFIGS).join(', '));
    process.exit(1);
  }

  if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY environment variable not set');
    process.exit(1);
  }

  const runner = new TestRunner();

  if (promptType === 'all') {
    await runner.runAll(modelConfig);
  } else {
    await runner.runPromptTests(promptType, modelConfig);
  }

  runner.printSummary();
  runner.saveResults();
}

// Export for programmatic use
export { main as runTests };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
