import http from 'http';
import assert from 'assert';
import { spawn } from 'child_process';

console.log('Starting Clean Live Integration Verification for H2O Copilot...');

const serverProcess = spawn('node', ['src/h2o-copilot-server.js'], {
  env: { ...process.env, DEBUG: 'true', HYDROGEN_USE_SDK: 'false' },
  stdio: 'pipe'
});

let serverStarted = false;
let activePort = null;

serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('[Server Output]:', output.trim());
  const match = output.match(/Running on http:\/\/localhost:(\d+)/);
  if (match) {
    activePort = parseInt(match[1], 10);
    serverStarted = true;
  }
});

serverProcess.stderr.on('data', (data) => {
  console.error('[Server Error Output]:', data.toString());
});

function makeRequest(port, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const dataStr = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: responseBody ? JSON.parse(responseBody) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: responseBody
          });
        }
      });
    });

    req.on('error', reject);
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

async function runTests() {
  let attempts = 0;
  while (!serverStarted && attempts < 30) {
    await new Promise(r => setTimeout(r, 200));
    attempts++;
  }

  if (!serverStarted || !activePort) {
    console.error('Server failed to start or detect active port within timeout.');
    serverProcess.kill();
    process.exit(1);
  }

  console.log(`\n[Verified Active Port]: ${activePort}`);

  console.log('\n--- VERIFYING GET /health ---');
  const healthRes = await makeRequest(activePort, 'GET', '/health');
  console.log('Status:', healthRes.statusCode);
  console.log('Body:', JSON.stringify(healthRes.body, null, 2));
  assert.strictEqual(healthRes.statusCode, 200);
  assert.strictEqual(healthRes.body.status, 'ok');
  assert.strictEqual(healthRes.body.model, 'gemini-4-hydrogen');

  console.log('\n--- VERIFYING POST /v1/copilot (API-less Bridge) ---');
  const copilotRes = await makeRequest(activePort, 'POST', '/v1/copilot', {
    messages: [
      { role: 'user', content: 'Give status telemetry for turbine-3 in kik-twin.' }
    ]
  });
  console.log('Status:', copilotRes.statusCode);
  console.log('Body:', JSON.stringify(copilotRes.body, null, 2));
  assert.strictEqual(copilotRes.statusCode, 200);
  assert.strictEqual(copilotRes.body.role, 'assistant');
  assert(copilotRes.body.content.length > 0);

  console.log('\n========================================');
  console.log('ALL LIVE INTEGRATION PROOF TESTS PASSED!');
  console.log('========================================');
  serverProcess.kill();
  process.exit(0);
}

runTests().catch(err => {
  console.error('Integration test failed:', err);
  serverProcess.kill();
  process.exit(1);
});
