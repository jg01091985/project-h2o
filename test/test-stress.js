import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { spawn } from 'child_process';

console.log('Starting H2O Inference Server Concurrency & Stress Test (10 Parallel Requests)...');

const serverProcess = spawn('node', ['src/h2o-server.js'], {
  env: { ...process.env, DEBUG: 'false', H2O_POOL_SIZE: '3' },
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
    const startTime = Date.now();
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
        const duration = Date.now() - startTime;
        try {
          resolve({
            statusCode: res.statusCode,
            duration,
            body: responseBody ? JSON.parse(responseBody) : null
          });
        } catch (e) {
          resolve({ statusCode: res.statusCode, duration, body: responseBody });
        }
      });
    });

    req.on('error', reject);
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

async function runStressTest() {
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

  const keyFilePath = path.resolve(process.cwd(), '.h2o-instance-key');
  const realToken = fs.readFileSync(keyFilePath, 'utf8').trim();

  console.log(`[Verified Server Port]: ${activePort}`);
  console.log(`[Executing 10 Concurrent Parallel Inference Requests]...`);

  const totalRequests = 10;
  const promises = [];

  const startTime = Date.now();
  for (let i = 0; i < totalRequests; i++) {
    promises.push(
      makeRequest(activePort, 'POST', '/v1/chat/completions', {
        'Authorization': `Bearer ${realToken}`
      }, {
        model: 'gemini-4-hydrogen',
        messages: [{ role: 'user', content: `Stress test request #${i + 1}` }]
      })
    );
  }

  const results = await Promise.all(promises);
  const totalDuration = Date.now() - startTime;

  let successCount = 0;
  let totalLatency = 0;

  results.forEach((res, index) => {
    console.log(`Request #${index + 1}: Status ${res.statusCode} | Duration ${res.duration}ms`);
    if (res.statusCode === 200) successCount++;
    totalLatency += res.duration;
  });

  const avgLatency = Math.round(totalLatency / totalRequests);
  const successRate = (successCount / totalRequests) * 100;

  console.log('\n==================================================');
  console.log('BRUTALLY HONEST STRESS TEST SCORECARD:');
  console.log(`- Total Requests Fired: ${totalRequests}`);
  console.log(`- Success Rate: ${successRate}% (${successCount}/${totalRequests})`);
  console.log(`- Average Latency per Request: ${avgLatency}ms`);
  console.log(`- Total Execution Time: ${totalDuration}ms`);
  console.log('==================================================');

  assert.strictEqual(successCount, totalRequests, 'All stress test requests must succeed.');

  serverProcess.kill();
  process.exit(0);
}

runStressTest().catch(err => {
  console.error('Stress test failed:', err);
  serverProcess.kill();
  process.exit(1);
});
