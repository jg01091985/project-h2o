import http from 'http';
import assert from 'assert';
import { spawn } from 'child_process';
import { authManager } from '../src/auth.js';

console.log('Starting H2O AI Inference Server Authentication, Models & Streaming Tests...');

const serverProcess = spawn('node', ['src/h2o-server.js'], {
  env: { ...process.env, DEBUG: 'true', H2O_INSTANCE_KEY: 'h2o_live_test_secret_key_123' },
  stdio: 'pipe'
});

let serverStarted = false;
let activePort = null;

serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  const match = output.match(/Running on http:\/\/localhost:(\d+)/);
  if (match) {
    activePort = parseInt(match[1], 10);
    serverStarted = true;
  }
});

serverProcess.stderr.on('data', (data) => {});

function makeRequest(port, method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const dataStr = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr),
        ...headers
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: responseBody ? JSON.parse(responseBody) : null
          });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: responseBody });
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
    console.error('Server failed to start.');
    serverProcess.kill();
    process.exit(1);
  }

  console.log(`[Verified Server Port]: ${activePort}`);

  // Test 1: Unauthenticated request should return 401
  const unauthRes = await makeRequest(activePort, 'POST', '/v1/chat/completions', {}, {
    messages: [{ role: 'user', content: 'Hello' }]
  });
  console.log('Unauthenticated Status (Expected 401):', unauthRes.statusCode);
  assert.strictEqual(unauthRes.statusCode, 401);

  // Test 2: Authenticated request to OpenAI-compatible endpoint
  const authRes = await makeRequest(activePort, 'POST', '/v1/chat/completions', {
    'Authorization': 'Bearer h2o_live_test_secret_key_123'
  }, {
    model: 'gemini-4-hydrogen',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Give status telemetry.' }
    ]
  });
  console.log('OpenAI-Compatible Status (Expected 200):', authRes.statusCode);
  console.log('OpenAI-Compatible Response Body:', JSON.stringify(authRes.body, null, 2));
  assert.strictEqual(authRes.statusCode, 200);
  assert.strictEqual(authRes.body.object, 'chat.completion');
  assert(authRes.body.choices[0].message.content.length > 0);

  // Test 3: GET /v1/models
  const modelsRes = await makeRequest(activePort, 'GET', '/v1/models', {
    'Authorization': 'Bearer h2o_live_test_secret_key_123'
  });
  console.log('GET /v1/models Status (Expected 200):', modelsRes.statusCode);
  assert.strictEqual(modelsRes.statusCode, 200);
  assert.strictEqual(modelsRes.body.object, 'list');
  assert(modelsRes.body.data.length > 0);

  // Test 4: Streaming POST /v1/chat/completions (stream: true)
  const streamRes = await new Promise((resolve, reject) => {
    const dataStr = JSON.stringify({
      model: 'gemini-4-hydrogen',
      messages: [{ role: 'user', content: 'Stream test' }],
      stream: true
    });
    const req = http.request({
      hostname: 'localhost',
      port: activePort,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer h2o_live_test_secret_key_123',
        'Content-Length': Buffer.byteLength(dataStr)
      }
    }, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: rawData
        });
      });
    });
    req.on('error', reject);
    req.write(dataStr);
    req.end();
  });

  console.log('Streaming POST Status (Expected 200):', streamRes.statusCode);
  assert.strictEqual(streamRes.statusCode, 200);
  assert(streamRes.body.includes('data: '));
  assert(streamRes.body.includes('[DONE]'));

  console.log('\n==================================================');
  console.log('ALL INFERENCE SERVER, MODELS & STREAMING TESTS PASSED!');
  console.log('==================================================');

  serverProcess.kill();
  process.exit(0);
}

runTests().catch(err => {
  console.error('Inference server test failed:', err);
  serverProcess.kill();
  process.exit(1);
});
