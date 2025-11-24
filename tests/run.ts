/**
 * Test Runner Entry Point
 *
 * Usage:
 *   npx ts-node tests/run.ts                         # run all tests with default model
 *   npx ts-node tests/run.ts extraction              # run extraction tests only
 *   npx ts-node tests/run.ts --model llama-8b        # use different model
 */

import { runTests } from './framework/runner';

runTests().catch(console.error);
