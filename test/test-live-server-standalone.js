import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runLiveTest() {
  console.log('[H2O Standalone Test] Starting H2O Inference Server process...');
  const serverProcess = spawn('node', ['src/h2o-copilot-server.js'], {
    env: { ...process.env, PORT: '39999', H2O_HEADLESS: 'true' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let serverOutput = '';
  serverProcess.stdout.on('data', (data) => {
    serverOutput += data.toString();
  });
  serverProcess.stderr.on('data', (data) => {
    serverOutput += data.toString();
  });

  // Wait for server to boot
  await sleep(3000);

  try {
    // Read instance key
    const keyPath = path.resolve(process.cwd(), '.h2o-instance-key');
    let instanceKey = 'gsk_test';
    if (fs.existsSync(keyPath)) {
      instanceKey = fs.readFileSync(keyPath, 'utf8').trim();
    }

    console.log(`[H2O Standalone Test] Server boot output:\n${serverOutput.trim()}`);
    console.log(`[H2O Standalone Test] Firing real HTTP request to http://localhost:39999/v1/chat/completions...`);

    const response = await fetch('http://localhost:39999/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${instanceKey}`
      },
      body: JSON.stringify({
        model: 'gemini-4-hydrogen',
        messages: [
          { role: 'user', content: 'Autonomous standalone server test prompt.' }
        ]
      })
    });

    const status = response.status;
    const body = await response.json();

    console.log(`\n========================================`);
    console.log(`REAL SERVER TEST RESULT:`);
    console.log(`HTTP Status: ${status}`);
    console.log(`Response Body:\n${JSON.stringify(body, null, 2)}`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error('[H2O Standalone Test] Error during test execution:', err);
  } finally {
    serverProcess.kill();
    process.exit(0);
  }
}

runLiveTest();
