import assert from 'assert';
import { SafetyValidator } from '../src/safety-validator.js';
import { TwinMCPRegistry } from '../src/twin-mcp-registry.js';
import { H2OTranslator } from '../src/translator.js';
import { h2oVault } from '../src/vault.js';
import { selfHeal } from '../src/self-heal.js';
import { selfEvolve } from '../src/self-evolve.js';
import { selfLearn } from '../src/self-learn.js';
import { TokenOptimizer } from '../src/token-optimizer.js';
import { MemoryLedger } from '../src/memory-ledger.js';
import { UniversalRunner } from '../src/universal-runner.js';

console.log('Running Self-Healing, Self-Evolving & Self-Learning H2O Unit Tests...');

// 1. Safety Validator
const validator = new SafetyValidator();
assert.strictEqual(validator.validateAction('set_actuator_state', { actuatorId: 'valve-1', state: 'OPEN' }).allowed, true);
assert.strictEqual(validator.validateAction('set_actuator_state', { actuatorId: 'core-override', state: 'OPEN' }).allowed, false);
console.log('✓ Safety Validator tests passed');

// 2. Twin MCP Registry
const registry = new TwinMCPRegistry();
registry.registerTool('custom_twin_diagnostic', 'Run diagnostics', { type: 'OBJECT' }, async () => ({ status: 'nominal' }));
assert(registry.getToolDeclarations()[0].functionDeclarations.some(f => f.name === 'custom_twin_diagnostic'));
console.log('✓ Twin MCP Registry tests passed');

// 3. Translator
const translated = H2OTranslator.translateChatRequest({ messages: [{ role: 'user', content: 'Hi' }] });
assert.strictEqual(translated.contents.length, 1);
console.log('✓ Translator tests passed');

// 4. Vault
const enc = h2oVault.encrypt('secret');
assert.strictEqual(h2oVault.decrypt(enc), 'secret');
console.log('✓ Vault tests passed');

// 5. Self-Heal & Self-Evolve & Self-Learn
selfHeal.runPreflightChecks();
const mutation = selfEvolve.analyzeAndMutate('src/safety-validator.js');
assert(mutation.mutationId);

selfLearn.recordRun(true, 120);
selfLearn.recordLesson('DOM shift detected', 'Applied fallback selector', 'Successfully recovered', true);
const metrics = selfLearn.getMetricsSummary();
assert(metrics.generationCount > 0);
console.log('✓ Self-Healing, Self-Evolving, and Self-Learning tests passed');

console.log('All Self-Improving H2O Copilot tests completed successfully!');
