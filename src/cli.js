#!/usr/bin/env node
import readline from 'readline';
import { authManager } from './auth.js';
import { CONFIG } from './config.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('==================================================');
console.log(' H2O AI Interactive CLI (Powered by Project Hydrogen)');
console.log(` Model: ${CONFIG.GEMINI_MODEL}`);
console.log(` Endpoint: http://localhost:${CONFIG.PORT}/v1/chat/completions`);
console.log('==================================================\n');

const messages = [];

function promptUser() {
  rl.question('\x1b[36mYou:\x1b[0m ', async (input) => {
    const text = input.trim();
    if (!text || text === 'exit' || text === 'quit') {
      console.log('Exiting H2O CLI. Goodbye!');
      rl.close();
      process.exit(0);
    }

    messages.push({ role: 'user', content: text });

    process.stdout.write('\x1b[32mH2O AI:\x1b[0m Thinking...');

    try {
      const res = await fetch(`http://localhost:${CONFIG.PORT}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authManager.instanceKey}`
        },
        body: JSON.stringify({
          model: CONFIG.GEMINI_MODEL,
          messages: messages
        })
      });

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || 'Error: No response generated.';

      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      console.log(`\x1b[32mH2O AI:\x1b[0m ${reply}\n`);

      messages.push({ role: 'assistant', content: reply });
    } catch (err) {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      console.log(`\x1b[31mError:\x1b[0m ${err.message}\n`);
    }

    promptUser();
  });
}

promptUser();
