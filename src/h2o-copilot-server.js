import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer } from 'ws';
import { CONFIG } from './config.js';
import { browserBridge } from './browser-bridge.js';
import { MCPRegistry } from './mcp-registry.js';
import { SafetyValidator } from './safety-validator.js';
import { H2OTranslator } from './translator.js';
import { memoryLedger } from './memory-ledger.js';
import { TokenOptimizer } from './token-optimizer.js';
import { authManager } from './auth.js';

const app = express();
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'examples')));
app.use('/src', express.static(path.join(process.cwd(), 'src')));

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'examples/app.html'));
});

// Enable CORS for frontend web applications
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const mcpRegistry = new MCPRegistry();
const safetyValidator = new SafetyValidator();

// Health check endpoint (Public)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'h2o-inference-server',
    engine: 'browser-bridge (Google Free Web AI / Standalone Browser Automation)',
    model: CONFIG.GEMINI_MODEL,
    memoryEntries: memoryLedger.history.length,
    timestamp: new Date().toISOString()
  });
});

// Authentication Middleware for /v1/ routes
const authenticate = (req, res, next) => {
  const authResult = authManager.verifyRequest(req);
  if (!authResult.authorized) {
    return res.status(401).json({ error: { message: authResult.reason, type: 'auth_error', code: 401 } });
  }
  next();
};

// Standard H2O Copilot REST endpoint
app.post('/v1/copilot', authenticate, async (req, res) => {
  try {
    const { messages } = req.body;
    const lastUserMessage = messages?.[messages.length - 1]?.content || '';

    memoryLedger.append('user', lastUserMessage);

    if (CONFIG.DEBUG) console.log('[H2O Server] Routing through Standalone Browser Automation Bridge...');
    const browserReply = await browserBridge.executePrompt(lastUserMessage);
    memoryLedger.append('assistant', browserReply, { engine: 'browser-bridge' });

    return res.json({
      role: 'assistant',
      content: browserReply,
      engine: 'browser-bridge',
      model: CONFIG.GEMINI_MODEL
    });
  } catch (err) {
    console.error('[H2O Server Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// OpenAI-Compatible Chat Completions Endpoint (Drop-in replacement for standard LLM inference)
app.post('/v1/chat/completions', authenticate, async (req, res) => {
  try {
    const { messages, model } = req.body;
    const lastUserMessage = messages?.[messages.length - 1]?.content || '';

    memoryLedger.append('user', lastUserMessage);

    if (CONFIG.DEBUG) console.log('[H2O Inference Server] Processing OpenAI-compatible chat completion...');
    const browserReply = await browserBridge.executePrompt(lastUserMessage);
    memoryLedger.append('assistant', browserReply, { engine: 'browser-bridge' });

    return res.json({
      id: 'h2o-chat-' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model || CONFIG.GEMINI_MODEL,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: browserReply
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 30,
        total_tokens: 80
      }
    });
  } catch (err) {
    console.error('[H2O Inference Server Error]', err);
    res.status(500).json({ error: { message: err.message, type: 'server_error', code: 500 } });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws) => {
  if (CONFIG.DEBUG) console.log('[H2O WS] Client connected');

  ws.on('message', async (data) => {
    try {
      const packet = JSON.parse(data.toString());
      const { messages } = packet;
      const lastUserMessage = messages?.[messages.length - 1]?.content || '';

      memoryLedger.append('user', lastUserMessage);
      ws.send(JSON.stringify({ type: 'start' }));

      const browserReply = await browserBridge.executePrompt(lastUserMessage);
      memoryLedger.append('assistant', browserReply, { engine: 'browser-bridge' });
      ws.send(JSON.stringify({ type: 'chunk', text: browserReply }));
      ws.send(JSON.stringify({ type: 'complete' }));
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', error: err.message }));
    }
  });

  wss.on('close', () => {
    if (CONFIG.DEBUG) console.log('[H2O WS] Client disconnected');
  });
});

const portToListen = process.env.PORT ? parseInt(process.env.PORT, 10) : CONFIG.PORT;

server.listen(portToListen, () => {
  const assignedPort = server.address().port;
  console.log(`[H2O Inference Server] Running on http://localhost:${assignedPort}`);
  console.log(`[H2O Inference Server] Instance Access Key: ${authManager.instanceKey}`);
  console.log(`[H2O Inference Server] OpenAI-Compatible Endpoint: http://localhost:${assignedPort}/v1/chat/completions`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    server.listen(0, () => {
      const assignedPort = server.address().port;
      console.log(`[H2O Inference Server] Running on http://localhost:${assignedPort}`);
      console.log(`[H2O Inference Server] Instance Access Key: ${authManager.instanceKey}`);
      console.log(`[H2O Inference Server] OpenAI-Compatible Endpoint: http://localhost:${assignedPort}/v1/chat/completions`);
    });
  } else {
    console.error('[H2O Server Fatal Error]', err);
  }
});
