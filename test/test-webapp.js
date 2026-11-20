import assert from 'assert';
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';

console.log('Starting Real Web App Browser Integration Test for H2O Copilot...');

// Start H2O Copilot Backend Server (which now also serves static web app files)
const serverProcess = spawn('node', ['src/h2o-copilot-server.js'], {
  env: { ...process.env, DEBUG: 'true', HYDROGEN_USE_SDK: 'false' },
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

serverProcess.stderr.on('data', (data) => {
  // Suppress stderr logs during test
});

async function runWebAppTest() {
  let attempts = 0;
  while (!serverStarted && attempts < 30) {
    await new Promise(r => setTimeout(r, 200));
    attempts++;
  }

  if (!serverStarted || !activePort) {
    console.error('H2O Copilot server failed to start within timeout.');
    serverProcess.kill();
    process.exit(1);
  }

  console.log(`[H2O Web App Server Running on Port]: ${activePort}`);

  // Launch Puppeteer browser to test the real web app frontend
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(`http://localhost:${activePort}/`, { waitUntil: 'networkidle2' });

  // Type message into chat input
  await page.type('#user-input', 'Give system status telemetry.');
  await page.click('#send-btn');

  // Wait for assistant response to appear in chat box UI
  await page.waitForFunction(
    () => {
      const messages = document.querySelectorAll('.message.assistant');
      return messages.length > 1 && messages[messages.length - 1].textContent.length > 0;
    },
    { timeout: 15000 }
  );

  const assistantReply = await page.evaluate(() => {
    const messages = document.querySelectorAll('.message.assistant');
    return messages[messages.length - 1].textContent;
  });

  console.log('Real Web App Copilot UI Response Received:', assistantReply);
  assert(assistantReply.length > 0);

  console.log('\n==================================================');
  console.log('REAL WEB APP BROWSER INTEGRATION TEST PASSED!');
  console.log('==================================================');

  await browser.close();
  serverProcess.kill();
  process.exit(0);
}

runWebAppTest().catch(err => {
  console.error('Real web app test failed:', err);
  serverProcess.kill();
  process.exit(1);
});
