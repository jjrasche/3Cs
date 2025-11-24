/**
 * Test Runner Entry Point
 *
 * Usage:
 *   npx ts-node run.ts                         # run all tests with default model
 *   npx ts-node run.ts extraction              # run extraction tests only
 *   npx ts-node run.ts --model llama-8b        # use different model
 *   npx ts-node run.ts extraction --model llama-8b  # combine options
 */

import { runTests } from './framework/runner';

runTests().catch(console.error);
