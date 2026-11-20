import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { CONFIG } from './config.js';

class SelfHealEngine {
  constructor() {
    this.telemetryFile = path.resolve(process.cwd(), '.h2o-telemetry.json');
    this.selectorFallbacks = new Map([
      ['textarea', ['textarea', 'div[contenteditable="true"]', '[role="textbox"]', 'input[type="text"]']],
      ['submit_button', ['button[aria-label*="Send"]', 'button.send-button', 'button[type="submit"]', '#send-btn']]
    ]);
  }

  runPreflightChecks() {
    if (CONFIG.DEBUG) {
      console.log('[H2O Self-Heal] Running preflight system diagnostics & immunity checks...');
    }

    const nodeModulesPath = path.resolve(process.cwd(), 'node_modules');
    // Only run npm install if node_modules does not exist AND package.json exists
    if (!fs.existsSync(nodeModulesPath) && fs.existsSync(path.resolve(process.cwd(), 'package.json'))) {
      console.log('[H2O Self-Heal] Missing dependencies detected. Auto-installing...');
      try {
        execSync('npm install --no-audit --no-fund', { stdio: 'inherit' });
      } catch (err) {
        console.error('[H2O Self-Heal] Auto-install skipped or failed:', err.message);
      }
    }

    const profileDir = path.resolve(process.cwd(), '.browser-profile');
    if (!fs.existsSync(profileDir)) {
      try {
        fs.mkdirSync(profileDir, { recursive: true });
      } catch (e) {}
    }

    this.recordInvocation();
  }

  getSelectors(elementKey) {
    return this.selectorFallbacks.get(elementKey) || [elementKey];
  }

  registerFallback(elementKey, selector) {
    if (!this.selectorFallbacks.has(elementKey)) {
      this.selectorFallbacks.set(elementKey, []);
    }
    const list = this.selectorFallbacks.get(elementKey);
    if (!list.includes(selector)) {
      list.unshift(selector);
    }
  }

  recordInvocation() {
    try {
      let telemetry = { invocations: 0, lastRun: null, errorCount: 0 };
      if (fs.existsSync(this.telemetryFile)) {
        try {
          telemetry = JSON.parse(fs.readFileSync(this.telemetryFile, 'utf8'));
        } catch (e) {}
      }
      telemetry.invocations += 1;
      telemetry.lastRun = new Date().toISOString();
      fs.writeFileSync(this.telemetryFile, JSON.stringify(telemetry, null, 2));
    } catch (e) {}
  }

  reportError(errorType) {
    try {
      if (fs.existsSync(this.telemetryFile)) {
        const telemetry = JSON.parse(fs.readFileSync(this.telemetryFile, 'utf8'));
        telemetry.errorCount = (telemetry.errorCount || 0) + 1;
        telemetry.lastError = { type: errorType, time: new Date().toISOString() };
        fs.writeFileSync(this.telemetryFile, JSON.stringify(telemetry, null, 2));
      }
    } catch (e) {}
  }
}

export const selfHeal = new SelfHealEngine();
