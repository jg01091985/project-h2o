import fs from 'fs';
import path from 'path';
import { selfHeal } from './self-heal.js';
import { selfEvolve } from './self-evolve.js';
import { inferenceCache } from './cache.js';
import { CONFIG } from './config.js';

class HydrogenDaemon {
  constructor(intervalMs = 300000) { // 5 minutes default heartbeat
    this.intervalMs = intervalMs;
    this.timer = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    if (CONFIG.DEBUG) {
      console.log('[Hydrogen Autonomous Daemon] Initializing agentic control plane (Interval: 5m)...');
    }

    // Run initial cycle after 10 seconds
    setTimeout(() => this.runMaintenanceCycle(), 10000);

    // Schedule recurring heartbeat
    this.timer = setInterval(() => {
      this.runMaintenanceCycle();
    }, this.intervalMs);

    // Prevent interval from blocking process exit
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    if (CONFIG.DEBUG) {
      console.log('[Hydrogen Autonomous Daemon] Control plane stopped.');
    }
  }

  runMaintenanceCycle() {
    try {
      if (CONFIG.DEBUG) {
        console.log('[Hydrogen Autonomous Daemon] Executing background maintenance & self-healing cycle...');
      }

      // 1. Run self-heal diagnostics
      selfHeal.runPreflightChecks();

      // 2. Trigger self-evolution analysis on core server module
      const evolution = selfEvolve.analyzeAndMutate('src/h2o-server.js');

      // 3. Prune stale cache entries
      inferenceCache.pruneStale();

      // 4. Log audit event
      const auditLogPath = path.resolve(process.cwd(), '.h2o-audit.log');
      const auditEntry = JSON.stringify({
        timestamp: new Date().toISOString(),
        agent: 'hydrogen-autonomous-daemon',
        action: 'maintenance_cycle_completed',
        evolutionId: evolution.mutationId
      }) + '\n';

      try {
        fs.appendFileSync(auditLogPath, auditEntry);
      } catch (e) {}

      if (CONFIG.DEBUG) {
        console.log('[Hydrogen Autonomous Daemon] Maintenance cycle completed successfully.');
      }
    } catch (err) {
      console.error('[Hydrogen Autonomous Daemon Error]', err.message);
      selfHeal.reportError('hydrogen_daemon_cycle_error');
    }
  }
}

export const hydrogenDaemon = new HydrogenDaemon();
