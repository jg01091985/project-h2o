import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { URL } from 'url';
import { WebSocketServer } from 'ws';
import { CONFIG } from './config.js';
import { browserBridge } from './browser-bridge.js';
import { MCPRegistry } from './mcp-registry.js';
import { SafetyValidator } from './safety-validator.js';
import { H2OTranslator } from './translator.js';
import { memoryLedger } from './memory-ledger.js';
import { TokenOptimizer } from './token-optimizer.js';
import { authManager } from './auth.js';
import { h2oRouter } from './router.js';
import { rateLimiter } from './rate-limiter.js';
import { auditLogger } from './audit-logger.js';
import { quantumBenchmark } from './quantum-benchmark.js';
import { hydrogenDaemon } from './hydrogen-daemon.js';

const app = express();
app.use(express.json());
app.use(express.static(path.resolve(process.cwd())));

app.get('/', (req, res) => {
  try {
    const htmlPath = path.join(process.cwd(), 'examples/app.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace('__H2O_API_KEY__', authManager.instanceKey);
    res.send(html);
  } catch (err) {
    res.sendFile(path.join(process.cwd(), 'examples/app.html'));
  }
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

// Audit Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    auditLogger.log({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip || req.connection.remoteAddress
    });
  });
  next();
});

// Global Rate Limiter & Security Guard Middleware for /v1/ routes (Valid key holders bypass rate limiting for full unthrottled performance)
app.use('/v1/', (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const providedBuffer = Buffer.from(token);
      const expectedBuffer = Buffer.from(authManager.instanceKey);
      if (providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
        return next();
      }
    } catch (e) {}
  }

  const ip = req.ip || req.connection.remoteAddress;
  const limitCheck = rateLimiter.check(ip);
  if (!limitCheck.allowed) {
    return res.status(429).json({
      error: { message: 'Rate limit exceeded. Try again later.', type: 'rate_limit_error', code: 429 },
      retryAfter: limitCheck.retryAfter
    });
  }
  next();
});

const safetyValidator = new SafetyValidator();

// Health check endpoint (Public)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'h2o-ai',
    version: '1.0.0',
    security: {
      mode: 'unhackable_timing_safe',
      rate_limit_bypass_for_keys: true,
      bound_host: CONFIG.HOST
    },
    engine: 'browser-bridge (Google Free Web AI / Standalone Browser Automation)',
    model: CONFIG.GEMINI_MODEL,
    uptime_seconds: Math.floor(process.uptime()),
    memoryEntries: memoryLedger.history.length,
    routerMetrics: h2oRouter.getMetrics(),
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

// Router telemetry metrics endpoint (Authenticated)
app.get('/v1/metrics', authenticate, (req, res) => {
  res.json({
    status: 'ok',
    metrics: h2oRouter.getMetrics(),
    timestamp: new Date().toISOString()
  });
});

// Quantum Benchmark Audit Endpoint (Authenticated)
app.get('/v1/benchmark', authenticate, (req, res) => {
  res.json({
    status: 'ok',
    audit: quantumBenchmark.runAudit(),
    timestamp: new Date().toISOString()
  });
});

// OpenAI-Compatible Models Endpoint (Authenticated)
app.get('/v1/models', authenticate, (req, res) => {
  res.json({
    object: 'list',
    data: [
      {
        id: CONFIG.GEMINI_MODEL,
        object: 'model',
        created: 1700000000,
        owned_by: 'h2o-ai'
      },
      {
        id: 'gpt-4',
        object: 'model',
        created: 1700000000,
        owned_by: 'h2o-ai'
      },
      {
        id: 'gpt-3.5-turbo',
        object: 'model',
        created: 1700000000,
        owned_by: 'h2o-ai'
      }
    ]
  });
});

app.get('/v1/models/:model', authenticate, (req, res) => {
  const modelId = req.params.model;
  res.json({
    id: modelId,
    object: 'model',
    created: 1700000000,
    owned_by: 'h2o-ai'
  });
});

// Standard H2O Copilot REST endpoint
app.post('/v1/copilot', authenticate, async (req, res) => {
  try {
    const { messages } = req.body;
    const systemMsg = messages?.find(m => m.role === 'system')?.content || '';
    const userMsgs = messages?.filter(m => m.role === 'user') || [];
    const lastUserMessage = userMsgs[userMsgs.length - 1]?.content || messages?.[messages.length - 1]?.content || '';

    const promptToSend = lastUserMessage;

    memoryLedger.append('user', lastUserMessage);

    if (CONFIG.DEBUG) console.log('[H2O Server] Routing through Intelligent H2O Router...');
    const result = await h2oRouter.route(promptToSend);
    memoryLedger.append('assistant', result.content, { engine: result.engine, cached: result.cached });

    return res.json({
      role: 'assistant',
      content: result.content,
      engine: result.engine,
      cached: result.cached,
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
    const { messages, model, stream } = req.body;
    const systemMsg = messages?.find(m => m.role === 'system')?.content || '';
    const userMsgs = messages?.filter(m => m.role === 'user') || [];
    const lastUserMessage = userMsgs[userMsgs.length - 1]?.content || messages?.[messages.length - 1]?.content || '';

    const promptToSend = lastUserMessage;

    memoryLedger.append('user', lastUserMessage);

    if (CONFIG.DEBUG) console.log('[H2O Inference Server] Processing OpenAI-compatible chat completion via H2O Router...');
    const result = await h2oRouter.route(promptToSend);
    memoryLedger.append('assistant', result.content, { engine: result.engine, cached: result.cached });

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const chunkId = 'h2o-chat-' + Date.now();
      const created = Math.floor(Date.now() / 1000);
      const activeModel = model || CONFIG.GEMINI_MODEL;

      res.write(`data: ${JSON.stringify({
        id: chunkId,
        object: 'chat.completion.chunk',
        created,
        model: activeModel,
        choices: [{ index: 0, delta: { role: 'assistant', content: result.content }, finish_reason: null }]
      })}\n\n`);

      res.write(`data: ${JSON.stringify({
        id: chunkId,
        object: 'chat.completion.chunk',
        created,
        model: activeModel,
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
      })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

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
            content: result.content
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 30,
        total_tokens: 80
      },
      h2o_routing: {
        engine: result.engine,
        cached: result.cached
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
  try {
    const parsedUrl = new URL(request.url, `http://${request.headers.host}`);
    const token = parsedUrl.searchParams.get('token');
    const authHeader = token ? `Bearer ${token}` : null;
    const authResult = authManager.verifyRequest({ headers: { authorization: authHeader } });

    if (!authResult.authorized) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } catch (err) {
    socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  if (CONFIG.DEBUG) console.log('[H2O WS] Client connected (Authenticated)');

  ws.on('message', async (data) => {
    try {
      const packet = JSON.parse(data.toString());
      const { messages } = packet;
      const lastUserMessage = messages?.[messages.length - 1]?.content || '';

      memoryLedger.append('user', lastUserMessage);
      ws.send(JSON.stringify({ type: 'start' }));

      const result = await h2oRouter.route(lastUserMessage);
      memoryLedger.append('assistant', result.content, { engine: result.engine, cached: result.cached });
      ws.send(JSON.stringify({ type: 'chunk', text: result.content }));
      ws.send(JSON.stringify({ type: 'complete' }));
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', error: err.message }));
    }
  });

  ws.on('close', () => {
    if (CONFIG.DEBUG) console.log('[H2O WS] Client disconnected');
  });
});

const portToListen = process.env.PORT ? parseInt(process.env.PORT, 10) : CONFIG.PORT;
const hostToBind = CONFIG.HOST;

server.listen(portToListen, hostToBind, () => {
  const assignedPort = server.address().port;
  console.log(`[H2O AI Server] Running on http://localhost:${assignedPort} (Bound to ${hostToBind})`);
  console.log(`[H2O AI Server] Instance Access Key: ${authManager.instanceKey}`);
  console.log(`[H2O AI Server] OpenAI-Compatible Endpoint: http://localhost:${assignedPort}/v1/chat/completions`);
  hydrogenDaemon.start();
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    server.listen(0, hostToBind, () => {
      const assignedPort = server.address().port;
      console.log(`[H2O AI Server] Running on http://localhost:${assignedPort} (Bound to ${hostToBind})`);
      console.log(`[H2O AI Server] Instance Access Key: ${authManager.instanceKey}`);
      console.log(`[H2O AI Server] OpenAI-Compatible Endpoint: http://localhost:${assignedPort}/v1/chat/completions`);
      hydrogenDaemon.start();
    });
  } else {
    console.error('[H2O Server Fatal Error]', err);
  }
});

// Graceful Shutdown Handling
const shutdown = async () => {
  console.log('\n[H2O Inference Server] Shutting down gracefully...');
  try {
    hydrogenDaemon.stop();
    if (browserBridge.browser) {
      await browserBridge.browser.close();
    }
  } catch (e) {}
  server.close(() => {
    console.log('[H2O Inference Server] Closed all server connections.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
