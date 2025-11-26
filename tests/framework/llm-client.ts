/**
 * LLM Client - Abstraction over multiple LLM providers
 *
 * Supports easy model switching for comparison testing
 * Includes intelligent quota management for Groq API with:
 * - Proactive quota checking
 * - Zero artificial delays
 * - Real-time quota state tracking
 */

import Groq from 'groq-sdk';
import * as fs from 'fs';
import * as path from 'path';

export interface LLMConfig {
  provider: 'groq' | 'openai' | 'anthropic';
  model: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;  // Force JSON output
}

export interface LLMResponse {
  content: string;
  latencyMs: number;
}

// =============================================================================
// LLM CALL LOGGING - Captures all inputs, outputs, and metadata for analysis
// =============================================================================

export interface LLMCallLog {
  // Identifiers
  id: string;
  sessionId: string;
  timestamp: string;

  // Input
  systemPrompt: string;
  userPrompt: string;
  config: LLMConfig;

  // Output
  response: string;
  parsedResponse?: any;  // If JSON mode, the parsed object
  parseError?: string;   // If JSON parsing failed

  // Metadata
  latencyMs: number;
  promptTokensEstimate: number;  // Estimated from char count
  responseTokensEstimate: number;

  // Retry/Error tracking
  attempt: number;
  retryReason?: string;
  error?: string;

  // Context (optional - set by caller)
  context?: {
    phase?: string;      // e.g., 'extraction', 'synthesis', 'response-decision'
    scenarioId?: string;
    personaId?: string;
    round?: number;
  };
}

// Global call log store
const callLogs: LLMCallLog[] = [];
let currentSessionId: string = `session-${Date.now()}`;
let callCounter = 0;

// Current context for logging (set by callers)
let currentLogContext: LLMCallLog['context'] = {};

/**
 * Set the current logging context (call before LLM calls)
 */
export function setLogContext(context: LLMCallLog['context']): void {
  currentLogContext = context;
}

/**
 * Clear the current logging context
 */
export function clearLogContext(): void {
  currentLogContext = {};
}

/**
 * Start a new logging session
 */
export function startNewSession(sessionName?: string): string {
  currentSessionId = sessionName || `session-${Date.now()}`;
  return currentSessionId;
}

/**
 * Get all call logs for the current session
 */
export function getCallLogs(): LLMCallLog[] {
  return [...callLogs];
}

/**
 * Get call logs filtered by criteria
 */
export function getCallLogsByPhase(phase: string): LLMCallLog[] {
  return callLogs.filter(log => log.context?.phase === phase);
}

/**
 * Save call logs to file (JSONL format for easy streaming)
 */
export function saveCallLogs(outputDir?: string): string {
  const dir = outputDir || path.join(__dirname, '..', 'output', 'llm-logs');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(dir, `llm-calls-${timestamp}.jsonl`);

  // Write as JSONL (one JSON object per line)
  const content = callLogs.map(log => JSON.stringify(log)).join('\n');
  fs.writeFileSync(filename, content);

  console.log(`\n📝 LLM call logs saved: ${filename} (${callLogs.length} calls)`);
  return filename;
}

/**
 * Get summary statistics for call logs
 */
export function getCallLogStats(): {
  totalCalls: number;
  byModel: Record<string, number>;
  byPhase: Record<string, number>;
  totalLatencyMs: number;
  avgLatencyMs: number;
  errorCount: number;
  retryCount: number;
} {
  const stats = {
    totalCalls: callLogs.length,
    byModel: {} as Record<string, number>,
    byPhase: {} as Record<string, number>,
    totalLatencyMs: 0,
    avgLatencyMs: 0,
    errorCount: 0,
    retryCount: 0
  };

  for (const log of callLogs) {
    // By model
    const model = log.config.model;
    stats.byModel[model] = (stats.byModel[model] || 0) + 1;

    // By phase
    const phase = log.context?.phase || 'unknown';
    stats.byPhase[phase] = (stats.byPhase[phase] || 0) + 1;

    // Latency
    stats.totalLatencyMs += log.latencyMs;

    // Errors
    if (log.error) stats.errorCount++;
    if (log.attempt > 1) stats.retryCount++;
  }

  stats.avgLatencyMs = stats.totalCalls > 0
    ? Math.round(stats.totalLatencyMs / stats.totalCalls)
    : 0;

  return stats;
}

/**
 * Log an LLM call (internal use)
 */
function logCall(
  systemPrompt: string,
  userPrompt: string,
  config: LLMConfig,
  response: string,
  latencyMs: number,
  attempt: number = 1,
  retryReason?: string,
  error?: string
): LLMCallLog {
  callCounter++;

  const log: LLMCallLog = {
    id: `call-${callCounter}`,
    sessionId: currentSessionId,
    timestamp: new Date().toISOString(),
    systemPrompt,
    userPrompt,
    config,
    response,
    latencyMs,
    promptTokensEstimate: Math.ceil((systemPrompt.length + userPrompt.length) / 4),
    responseTokensEstimate: Math.ceil(response.length / 4),
    attempt,
    retryReason,
    error,
    context: { ...currentLogContext }
  };

  // Try to parse JSON response
  if (config.jsonMode && response) {
    try {
      log.parsedResponse = JSON.parse(response);
    } catch (e) {
      log.parseError = (e as Error).message;
    }
  }

  callLogs.push(log);
  return log;
}

// Quota tracking for rate limiting
interface QuotaState {
  // Request limits
  limitRequests: number;
  remainingRequests: number;
  resetRequestsAt: number;  // Unix timestamp

  // Token limits (per minute)
  limitTokens: number;
  remainingTokens: number;
  resetTokensAt: number;  // Unix timestamp

  // Daily token limit (TPD)
  limitTokensDaily: number;
  remainingTokensDaily: number;
  resetTokensDailyAt: number;  // Unix timestamp

  // Last updated
  lastUpdated: number;
}

// STATIC per-model quota tracking - shared across ALL LLMClient instances
// This is critical because Groq rate limits are per-account, not per-connection
const globalQuotaByModel: Map<string, QuotaState> = new Map();
const modelInitialized: Set<string> = new Set();

export class LLMClient {
  private groq: Groq | null = null;

  constructor() {
    // Initialize Groq if key is available
    if (process.env.GROQ_API_KEY) {
      this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
  }

  /**
   * Get current quota state for a model (for debugging/display)
   */
  getQuotaState(model?: string): QuotaState | null {
    if (!model) return null;
    return globalQuotaByModel.get(model) || null;
  }

  /**
   * Proactively check quota by making a minimal API call
   * This populates quota state before doing real work
   *
   * NOTE: Different models have different rate limits on Groq.
   * Each model gets its own quota tracking.
   */
  async initializeQuota(targetModel?: string): Promise<void> {
    const model = targetModel || 'llama-3.1-8b-instant';

    // Skip if already initialized for this specific model
    if (!this.groq || modelInitialized.has(model)) return;

    console.log(`📊 Initializing quota state for ${model}...`);

    try {
      // Make minimal API call to get quota headers
      const { data: _, response: rawResponse } = await this.groq.chat.completions
        .create({
          model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1  // Absolute minimum
        })
        .withResponse();

      // Extract headers
      const headers: Record<string, string> = {};
      rawResponse.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      this.updateQuotaFromHeaders(model, headers);
      modelInitialized.add(model);

      const quota = globalQuotaByModel.get(model);
      console.log(`✅ Quota initialized for ${model}: ${quota?.remainingRequests}/${quota?.limitRequests} requests, ${quota?.remainingTokens}/${quota?.limitTokens} tokens`);
    } catch (error: any) {
      console.warn(`⚠️  Could not initialize quota for ${model}, will update on first real request`);
      modelInitialized.add(model); // Don't retry initialization
    }
  }

  /**
   * Parse duration string like "2h26m52.8s" or "50.06s" to milliseconds
   */
  private parseDuration(duration: string): number {
    let ms = 0;

    const hours = duration.match(/(\d+)h/);
    const minutes = duration.match(/(\d+)m/);
    const seconds = duration.match(/(\d+\.?\d*)s/);

    if (hours) ms += parseInt(hours[1]) * 60 * 60 * 1000;
    if (minutes) ms += parseInt(minutes[1]) * 60 * 1000;
    if (seconds) ms += parseFloat(seconds[1]) * 1000;

    return ms;
  }

  /**
   * Update quota state from response headers (per-model)
   */
  private updateQuotaFromHeaders(model: string, headers: Record<string, string>): void {
    const now = Date.now();

    let quotaState = globalQuotaByModel.get(model);
    if (!quotaState) {
      quotaState = {
        limitRequests: 0,
        remainingRequests: 0,
        resetRequestsAt: 0,
        limitTokens: 0,
        remainingTokens: 0,
        resetTokensAt: 0,
        limitTokensDaily: 500000, // Groq paid tier default
        remainingTokensDaily: 500000,
        resetTokensDailyAt: now + 24 * 60 * 60 * 1000,
        lastUpdated: now
      };
      globalQuotaByModel.set(model, quotaState);
    }

    // Parse headers
    if (headers['x-ratelimit-limit-requests']) {
      quotaState.limitRequests = parseInt(headers['x-ratelimit-limit-requests']);
    }
    if (headers['x-ratelimit-remaining-requests']) {
      quotaState.remainingRequests = parseInt(headers['x-ratelimit-remaining-requests']);
    }
    if (headers['x-ratelimit-reset-requests']) {
      const resetMs = this.parseDuration(headers['x-ratelimit-reset-requests']);
      quotaState.resetRequestsAt = now + resetMs;
    }

    if (headers['x-ratelimit-limit-tokens']) {
      quotaState.limitTokens = parseInt(headers['x-ratelimit-limit-tokens']);
    }
    if (headers['x-ratelimit-remaining-tokens']) {
      quotaState.remainingTokens = parseInt(headers['x-ratelimit-remaining-tokens']);
    }
    if (headers['x-ratelimit-reset-tokens']) {
      const resetMs = this.parseDuration(headers['x-ratelimit-reset-tokens']);
      quotaState.resetTokensAt = now + resetMs;
    }

    quotaState.lastUpdated = now;
  }

  /**
   * Update quota state from rate limit error (per-model)
   */
  private updateQuotaFromError(model: string, error: any): void {
    const now = Date.now();

    // Initialize if needed
    let quotaState = globalQuotaByModel.get(model);
    if (!quotaState) {
      quotaState = {
        limitRequests: 14400,         // Groq default
        remainingRequests: 0,
        resetRequestsAt: now,
        limitTokens: 6000,            // Conservative default (8B limit)
        remainingTokens: 0,
        resetTokensAt: now,
        limitTokensDaily: 500000,     // Paid tier default
        remainingTokensDaily: 0,
        resetTokensDailyAt: now,
        lastUpdated: now
      };
      globalQuotaByModel.set(model, quotaState);
    }

    // Parse error message for TPD (tokens per day) info
    const errorMsg = error.error?.error?.message || error.message || '';

    // Extract "Please try again in Xm Ys" from error
    const retryMatch = errorMsg.match(/try again in (\d+m)?(\d+\.?\d*s)?/);
    if (retryMatch) {
      let waitMs = 0;
      if (retryMatch[1]) waitMs += parseInt(retryMatch[1]) * 60 * 1000;
      if (retryMatch[2]) waitMs += parseFloat(retryMatch[2]) * 1000;

      // Determine if this is daily or per-minute limit
      if (errorMsg.includes('TPD') || errorMsg.includes('per day')) {
        quotaState.remainingTokensDaily = 0;
        quotaState.resetTokensDailyAt = now + waitMs;
      } else {
        quotaState.remainingTokens = 0;
        quotaState.resetTokensAt = now + waitMs;
      }
    }

    // Parse from headers if available
    if (error.headers) {
      const headers = error.headers as Record<string, string>;
      this.updateQuotaFromHeaders(model, headers);

      // Retry-after header (in seconds)
      if (headers['retry-after']) {
        const retrySeconds = parseInt(headers['retry-after']);
        const resetAt = now + retrySeconds * 1000;

        // Update the most restrictive reset time
        if (errorMsg.includes('TPD') || errorMsg.includes('per day')) {
          quotaState.resetTokensDailyAt = resetAt;
          quotaState.remainingTokensDaily = 0;
        } else {
          quotaState.resetTokensAt = resetAt;
          quotaState.remainingTokens = 0;
        }
      }
    }

    quotaState.lastUpdated = now;
  }

  /**
   * Check if we should wait before making a request (per-model)
   * Returns wait time in ms, or 0 if ready
   */
  private getWaitTime(model: string): number {
    const quotaState = globalQuotaByModel.get(model);
    if (!quotaState) return 0;

    const now = Date.now();
    let maxWait = 0;

    // Check per-minute token limit
    if (quotaState.remainingTokens <= 0 && quotaState.resetTokensAt > now) {
      maxWait = Math.max(maxWait, quotaState.resetTokensAt - now);
    }

    // Check request limit
    if (quotaState.remainingRequests <= 0 && quotaState.resetRequestsAt > now) {
      maxWait = Math.max(maxWait, quotaState.resetRequestsAt - now);
    }

    // Check daily token limit (most restrictive)
    if (quotaState.remainingTokensDaily <= 0 && quotaState.resetTokensDailyAt > now) {
      maxWait = Math.max(maxWait, quotaState.resetTokensDailyAt - now);
    }

    return maxWait;
  }

  /**
   * Format wait time for display
   */
  private formatWaitTime(ms: number): string {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Wait for quota to reset if needed (per-model)
   * Adds jitter for parallel requests to prevent thundering herd
   */
  private async waitForQuota(model: string, addJitter: boolean = false): Promise<void> {
    let waitTime = this.getWaitTime(model);

    if (waitTime > 0) {
      // Add random jitter (0-2s) for parallel requests to avoid thundering herd
      if (addJitter) {
        const jitter = Math.floor(Math.random() * 2000);
        waitTime += jitter;
      }

      console.log(`\n⏳ Quota limit reached for ${model}. Waiting ${this.formatWaitTime(waitTime)} for reset...`);

      // Show countdown for long waits
      if (waitTime > 60000) {
        const endTime = Date.now() + waitTime;
        while (Date.now() < endTime) {
          const remaining = endTime - Date.now();
          process.stdout.write(`\r⏳ Resuming in ${this.formatWaitTime(remaining)}...    `);
          await new Promise(resolve => setTimeout(resolve, Math.min(10000, remaining)));
        }
        console.log('\n✅ Quota reset, resuming...');
      } else {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        console.log('✅ Quota reset, resuming...');
      }
    }
  }

  /**
   * Estimate token count for a prompt (~4 chars per token)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  async call(
    systemPrompt: string,
    userPrompt: string,
    config: LLMConfig
  ): Promise<LLMResponse> {
    const model = config.model;

    // Initialize quota on first call for this model (proactive)
    if (config.provider === 'groq' && !modelInitialized.has(model)) {
      await this.initializeQuota(model);
    }

    // Proactive token check - estimate if this request will fit
    const quotaState = globalQuotaByModel.get(model);
    const estimatedTokens = this.estimateTokens(systemPrompt + userPrompt) + (config.maxTokens ?? 500);
    if (quotaState && quotaState.remainingTokens < estimatedTokens) {
      console.log(`\n⏳ Proactive wait: need ~${estimatedTokens} tokens, have ${quotaState.remainingTokens}`);
      // Force wait for token reset
      const now = Date.now();
      if (quotaState.resetTokensAt > now) {
        const waitTime = quotaState.resetTokensAt - now + 1000; // +1s buffer
        console.log(`   Waiting ${this.formatWaitTime(waitTime)} for token quota reset...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        // Reset quota state
        quotaState.remainingTokens = quotaState.limitTokens;
        console.log('✅ Quota reset, proceeding...');
      }
    }

    // Wait ONLY if quota requires it (no arbitrary delays)
    await this.waitForQuota(model);

    const startTime = Date.now();
    let content: string;
    let error: string | undefined;

    try {
      switch (config.provider) {
        case 'groq':
          content = await this.callGroqWithRetry(systemPrompt, userPrompt, config);
          break;
        case 'openai':
          content = await this.callOpenAI(systemPrompt, userPrompt, config);
          break;
        case 'anthropic':
          content = await this.callAnthropic(systemPrompt, userPrompt, config);
          break;
        default:
          throw new Error(`Unknown provider: ${config.provider}`);
      }
    } catch (e) {
      error = (e as Error).message;
      content = '';
      // Log failed call
      logCall(systemPrompt, userPrompt, config, '', Date.now() - startTime, 1, undefined, error);
      throw e;
    }

    const latencyMs = Date.now() - startTime;

    // Log successful call
    logCall(systemPrompt, userPrompt, config, content, latencyMs);

    return {
      content,
      latencyMs
    };
  }

  /**
   * Call Groq with automatic retry on rate limit and JSON validation errors
   * Uses jitter on retries to prevent thundering herd when parallel requests all hit limits
   */
  private async callGroqWithRetry(
    systemPrompt: string,
    userPrompt: string,
    config: LLMConfig,
    attempt: number = 1
  ): Promise<string> {
    const model = config.model;

    try {
      return await this.callGroq(systemPrompt, userPrompt, config);
    } catch (error: any) {
      // Check if it's a rate limit error
      if (error.status === 429) {
        console.log(`\n⚠️  Rate limit hit (attempt ${attempt})`);

        // Update quota state from error (per-model)
        this.updateQuotaFromError(model, error);

        // Wait for reset time WITH jitter (prevents all parallel requests from retrying at once)
        await this.waitForQuota(model, true);

        // Retry (max 10 attempts - needed for parallel persona extraction)
        if (attempt < 10) {
          console.log(`🔄 Retrying request (attempt ${attempt + 1})...`);
          return this.callGroqWithRetry(systemPrompt, userPrompt, config, attempt + 1);
        }
      }

      // Check if it's a JSON validation error (LLM generated invalid JSON)
      // This happens when the LLM uses improper quote escaping
      if (error.status === 400 && error.error?.error?.code === 'json_validate_failed') {
        console.log(`\n⚠️  JSON validation failed (attempt ${attempt}) - LLM generated malformed JSON`);

        // Retry up to 3 times - often the LLM will produce valid JSON on retry
        if (attempt < 3) {
          console.log(`🔄 Retrying request (attempt ${attempt + 1})...`);
          // Small delay to avoid immediate retry
          await new Promise(resolve => setTimeout(resolve, 500));
          return this.callGroqWithRetry(systemPrompt, userPrompt, config, attempt + 1);
        }

        // If still failing, try to salvage the failed generation
        const failedJson = error.error?.error?.failed_generation;
        if (failedJson) {
          console.log(`⚠️  Attempting to salvage malformed JSON...`);
          const sanitized = this.sanitizeJsonOutput(failedJson);
          if (sanitized) {
            console.log(`✅ Successfully salvaged JSON output`);
            return sanitized;
          }
        }
      }

      throw error;
    }
  }

  /**
   * Attempt to fix common JSON formatting issues from LLM output
   */
  private sanitizeJsonOutput(malformedJson: string): string | null {
    try {
      // First, try parsing as-is (maybe it's actually valid)
      JSON.parse(malformedJson);
      return malformedJson;
    } catch {
      // Try common fixes
      let fixed = malformedJson;

      // Fix double-double-quotes: ""text"" -> "text"
      fixed = fixed.replace(/""([^"]+)""/g, '"$1"');

      // Fix unescaped quotes inside strings (risky but worth trying)
      // This is a simplified fix - real JSON parsers are more complex
      fixed = fixed.replace(/"([^"]*)"([^,:}\]]*)"([^"]*)"/g, '"$1\\"$2\\"$3"');

      try {
        JSON.parse(fixed);
        return fixed;
      } catch {
        return null;
      }
    }
  }

  private async callGroq(
    systemPrompt: string,
    userPrompt: string,
    config: LLMConfig
  ): Promise<string> {
    if (!this.groq) {
      throw new Error('GROQ_API_KEY not set');
    }

    const model = config.model;
    const requestOptions: any = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: config.temperature ?? 0.3,
      max_tokens: config.maxTokens ?? 2000
    };

    // Force JSON output if requested
    if (config.jsonMode) {
      requestOptions.response_format = { type: 'json_object' };
    }

    // Use withResponse to get headers
    const { data: response, response: rawResponse } = await this.groq.chat.completions
      .create(requestOptions)
      .withResponse();

    // Update quota from response headers (real-time tracking, per-model)
    const headers: Record<string, string> = {};
    rawResponse.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    this.updateQuotaFromHeaders(model, headers);

    // Log quota status occasionally
    const quotaState = globalQuotaByModel.get(model);
    if (quotaState && quotaState.remainingRequests % 50 === 0) {
      console.log(`📊 Quota [${model}]: ${quotaState.remainingRequests}/${quotaState.limitRequests} requests, ${quotaState.remainingTokens}/${quotaState.limitTokens} tokens`);
    }

    return response.choices[0]?.message?.content || '';
  }

  private async callOpenAI(
    systemPrompt: string,
    userPrompt: string,
    config: LLMConfig
  ): Promise<string> {
    // Placeholder for OpenAI implementation
    // Would use openai SDK similarly to Groq
    throw new Error('OpenAI provider not yet implemented');
  }

  private async callAnthropic(
    systemPrompt: string,
    userPrompt: string,
    config: LLMConfig
  ): Promise<string> {
    // Placeholder for Anthropic implementation
    // Would use @anthropic-ai/sdk
    throw new Error('Anthropic provider not yet implemented');
  }

  /**
   * Display current quota status for all tracked models
   */
  displayQuotaStatus(model?: string): void {
    const now = Date.now();

    if (model) {
      // Show specific model
      const quotaState = globalQuotaByModel.get(model);
      if (!quotaState) {
        console.log(`📊 No quota data for ${model} yet (make a request first)`);
        return;
      }

      console.log(`\n📊 Groq API Quota Status [${model}]:`);
      console.log(`   Requests: ${quotaState.remainingRequests}/${quotaState.limitRequests}`);
      console.log(`   Tokens/min: ${quotaState.remainingTokens}/${quotaState.limitTokens}`);

      if (quotaState.resetTokensAt > now) {
        console.log(`   Token reset in: ${this.formatWaitTime(quotaState.resetTokensAt - now)}`);
      }
      if (quotaState.resetRequestsAt > now) {
        console.log(`   Request reset in: ${this.formatWaitTime(quotaState.resetRequestsAt - now)}`);
      }
    } else {
      // Show all models
      if (globalQuotaByModel.size === 0) {
        console.log('📊 No quota data yet (make a request first)');
        return;
      }

      console.log('\n📊 Groq API Quota Status (all models):');
      globalQuotaByModel.forEach((quotaState, modelName) => {
        console.log(`   [${modelName}]`);
        console.log(`     Requests: ${quotaState.remainingRequests}/${quotaState.limitRequests}`);
        console.log(`     Tokens/min: ${quotaState.remainingTokens}/${quotaState.limitTokens}`);
      });
    }
    console.log('');
  }
}

// Default configurations for easy testing
export const MODEL_CONFIGS: Record<string, LLMConfig> = {
  'llama-70b': {
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    jsonMode: true
  },
  'llama-8b': {
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    temperature: 0.3,
    jsonMode: true
  },
  'mixtral': {
    provider: 'groq',
    model: 'mixtral-8x7b-32768',
    temperature: 0.3,
    jsonMode: true
  }
};
