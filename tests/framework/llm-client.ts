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

    return {
      content,
      latencyMs: Date.now() - startTime
    };
  }

  /**
   * Call Groq with automatic retry on rate limit
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

      throw error;
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
