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

export class LLMClient {
  private groq: Groq | null = null;
  private quotaState: QuotaState | null = null;
  private quotaInitialized: boolean = false;

  constructor() {
    // Initialize Groq if key is available
    if (process.env.GROQ_API_KEY) {
      this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
  }

  /**
   * Get current quota state (for debugging/display)
   */
  getQuotaState(): QuotaState | null {
    return this.quotaState;
  }

  /**
   * Proactively check quota by making a minimal API call
   * This populates quota state before doing real work
   */
  async initializeQuota(): Promise<void> {
    if (!this.groq || this.quotaInitialized) return;

    console.log('📊 Initializing quota state...');

    try {
      // Make minimal API call to get quota headers
      const { data: _, response: rawResponse } = await this.groq.chat.completions
        .create({
          model: 'llama-3.1-8b-instant',  // Smallest/fastest model
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1  // Absolute minimum
        })
        .withResponse();

      // Extract headers
      const headers: Record<string, string> = {};
      rawResponse.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      this.updateQuotaFromHeaders(headers);
      this.quotaInitialized = true;

      console.log(`✅ Quota initialized: ${this.quotaState?.remainingRequests}/${this.quotaState?.limitRequests} requests, ${this.quotaState?.remainingTokens}/${this.quotaState?.limitTokens} tokens`);
    } catch (error: any) {
      console.warn('⚠️  Could not initialize quota, will update on first real request');
      this.quotaInitialized = true; // Don't retry initialization
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
   * Update quota state from response headers
   */
  private updateQuotaFromHeaders(headers: Record<string, string>): void {
    const now = Date.now();

    if (!this.quotaState) {
      this.quotaState = {
        limitRequests: 0,
        remainingRequests: 0,
        resetRequestsAt: 0,
        limitTokens: 0,
        remainingTokens: 0,
        resetTokensAt: 0,
        limitTokensDaily: 100000, // Default Groq free tier
        remainingTokensDaily: 100000,
        resetTokensDailyAt: now + 24 * 60 * 60 * 1000,
        lastUpdated: now
      };
    }

    // Parse headers
    if (headers['x-ratelimit-limit-requests']) {
      this.quotaState.limitRequests = parseInt(headers['x-ratelimit-limit-requests']);
    }
    if (headers['x-ratelimit-remaining-requests']) {
      this.quotaState.remainingRequests = parseInt(headers['x-ratelimit-remaining-requests']);
    }
    if (headers['x-ratelimit-reset-requests']) {
      const resetMs = this.parseDuration(headers['x-ratelimit-reset-requests']);
      this.quotaState.resetRequestsAt = now + resetMs;
    }

    if (headers['x-ratelimit-limit-tokens']) {
      this.quotaState.limitTokens = parseInt(headers['x-ratelimit-limit-tokens']);
    }
    if (headers['x-ratelimit-remaining-tokens']) {
      this.quotaState.remainingTokens = parseInt(headers['x-ratelimit-remaining-tokens']);
    }
    if (headers['x-ratelimit-reset-tokens']) {
      const resetMs = this.parseDuration(headers['x-ratelimit-reset-tokens']);
      this.quotaState.resetTokensAt = now + resetMs;
    }

    this.quotaState.lastUpdated = now;
  }

  /**
   * Update quota state from rate limit error
   */
  private updateQuotaFromError(error: any): void {
    const now = Date.now();

    // Initialize if needed
    if (!this.quotaState) {
      this.quotaState = {
        limitRequests: 1000,
        remainingRequests: 0,
        resetRequestsAt: now,
        limitTokens: 12000,
        remainingTokens: 0,
        resetTokensAt: now,
        limitTokensDaily: 100000,
        remainingTokensDaily: 0,
        resetTokensDailyAt: now,
        lastUpdated: now
      };
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
        this.quotaState.remainingTokensDaily = 0;
        this.quotaState.resetTokensDailyAt = now + waitMs;
      } else {
        this.quotaState.remainingTokens = 0;
        this.quotaState.resetTokensAt = now + waitMs;
      }
    }

    // Parse from headers if available
    if (error.headers) {
      const headers = error.headers as Record<string, string>;
      this.updateQuotaFromHeaders(headers);

      // Retry-after header (in seconds)
      if (headers['retry-after']) {
        const retrySeconds = parseInt(headers['retry-after']);
        const resetAt = now + retrySeconds * 1000;

        // Update the most restrictive reset time
        if (errorMsg.includes('TPD') || errorMsg.includes('per day')) {
          this.quotaState.resetTokensDailyAt = resetAt;
          this.quotaState.remainingTokensDaily = 0;
        } else {
          this.quotaState.resetTokensAt = resetAt;
          this.quotaState.remainingTokens = 0;
        }
      }
    }

    this.quotaState.lastUpdated = now;
  }

  /**
   * Check if we should wait before making a request
   * Returns wait time in ms, or 0 if ready
   */
  private getWaitTime(): number {
    if (!this.quotaState) return 0;

    const now = Date.now();
    let maxWait = 0;

    // Check per-minute token limit
    if (this.quotaState.remainingTokens <= 0 && this.quotaState.resetTokensAt > now) {
      maxWait = Math.max(maxWait, this.quotaState.resetTokensAt - now);
    }

    // Check request limit
    if (this.quotaState.remainingRequests <= 0 && this.quotaState.resetRequestsAt > now) {
      maxWait = Math.max(maxWait, this.quotaState.resetRequestsAt - now);
    }

    // Check daily token limit (most restrictive)
    if (this.quotaState.remainingTokensDaily <= 0 && this.quotaState.resetTokensDailyAt > now) {
      maxWait = Math.max(maxWait, this.quotaState.resetTokensDailyAt - now);
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
   * Wait for quota to reset if needed
   */
  private async waitForQuota(): Promise<void> {
    const waitTime = this.getWaitTime();

    if (waitTime > 0) {
      console.log(`\n⏳ Quota limit reached. Waiting ${this.formatWaitTime(waitTime)} for reset...`);

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

  async call(
    systemPrompt: string,
    userPrompt: string,
    config: LLMConfig
  ): Promise<LLMResponse> {
    // Initialize quota on first call (proactive)
    if (!this.quotaInitialized && config.provider === 'groq') {
      await this.initializeQuota();
    }

    // Wait ONLY if quota requires it (no arbitrary delays)
    await this.waitForQuota();

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
   */
  private async callGroqWithRetry(
    systemPrompt: string,
    userPrompt: string,
    config: LLMConfig,
    attempt: number = 1
  ): Promise<string> {
    try {
      return await this.callGroq(systemPrompt, userPrompt, config);
    } catch (error: any) {
      // Check if it's a rate limit error
      if (error.status === 429) {
        console.log(`\n⚠️  Rate limit hit (attempt ${attempt})`);

        // Update quota state from error
        this.updateQuotaFromError(error);

        // Wait for exact reset time (no buffer)
        await this.waitForQuota();

        // Retry (max 3 attempts)
        if (attempt < 3) {
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

    const requestOptions: any = {
      model: config.model,
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

    // Update quota from response headers (real-time tracking)
    const headers: Record<string, string> = {};
    rawResponse.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    this.updateQuotaFromHeaders(headers);

    // Log quota status occasionally
    if (this.quotaState && this.quotaState.remainingRequests % 50 === 0) {
      console.log(`📊 Quota: ${this.quotaState.remainingRequests}/${this.quotaState.limitRequests} requests, ${this.quotaState.remainingTokens}/${this.quotaState.limitTokens} tokens`);
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
   * Display current quota status
   */
  displayQuotaStatus(): void {
    if (!this.quotaState) {
      console.log('📊 No quota data yet (make a request first)');
      return;
    }

    const now = Date.now();
    console.log('\n📊 Groq API Quota Status:');
    console.log(`   Requests: ${this.quotaState.remainingRequests}/${this.quotaState.limitRequests}`);
    console.log(`   Tokens/min: ${this.quotaState.remainingTokens}/${this.quotaState.limitTokens}`);

    if (this.quotaState.resetTokensAt > now) {
      console.log(`   Token reset in: ${this.formatWaitTime(this.quotaState.resetTokensAt - now)}`);
    }
    if (this.quotaState.resetRequestsAt > now) {
      console.log(`   Request reset in: ${this.formatWaitTime(this.quotaState.resetRequestsAt - now)}`);
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
