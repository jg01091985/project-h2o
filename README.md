# Project H2O Copilot

**Project H2O Copilot** is a universal, API-less AI copilot engine and proxy system engineered for web applications. Powered by dual-engine inference (`gemini-4-hydrogen` via official SDK and a headless stealth browser automation bridge to Google Free Web AI), H2O provides zero-cost LLM inference, Model Context Protocol (MCP) tool execution, cryptographic vault isolation, self-healing circuit breakers, and automated token optimization without requiring commercial per-token cloud billing APIs.

---

## Technical Architecture

```
[Web App Client] ──(HTTP POST /v1/copilot or WebSocket)──► [H2O Copilot Server]
                                                                  │
                   ┌──────────────────────────────────────────────┴──────────────────────────────────────────────┐
                   ▼                                                                                             ▼
         [MCP Tool Registry]                                                                           [Dual-Engine Inference]
    (System Status, Actions, Query)                                              ┌─────────────────────────────────────────┘
                   │                                                             ▼                                         ▼
                   │                                                   [Gemini SDK Bridge]                     [Stealth Browser Bridge]
                   │                                                (gemini-4-hydrogen default)               (Automated Web session fallback)
                   │                                                             │                                         │
                   └──────────────────────────────────────────────┬──────────────┴─────────────────────────────────────────┘
                                                                  ▼
                                                      [Safety Validator Engine]
                                                (Invariant Checks & Bounds Enforcement)
```

---

## Core Subsystems

1. **Dual-Engine Model Bridge (`src/gemini-bridge.js`, `src/browser-bridge.js`)**
   - Direct integration with `@google/genai` executing **`gemini-4-hydrogen`**.
   - Automated fallback to a headless stealth browser automation bridge (`puppeteer-extra` with anti-detection plugins) interacting with Google Free Web AI when API keys are absent.
   - Stateful circuit breakers, FIFO prompt queueing, and request rate-limiting.

2. **Model Context Protocol (MCP) Registry (`src/mcp-registry.js`)**
   - Standardized tool declarations and execution handlers supporting system telemetry, action dispatch, data querying, and runtime custom tool registration.

3. **Safety & Invariant Validation (`src/safety-validator.js`)**
   - Deterministic bounds checking and payload sanitization preventing out-of-bounds parameter execution and unauthorized state overrides.

4. **Cryptographic Vault (`src/vault.js`)**
   - AES-256-GCM authenticated encryption for secure persistence of session tokens, state ledgers, and credentials.

5. **Anti-Bot & Stealth Automation (`src/anti-bot.js`, `src/failover.js`)**
   - Headless evasion techniques including WebGL vendor/renderer spoofing, canvas fingerprint noise injection, navigator overrides, randomized user-agent rotation, and timing jitter.

6. **Self-Healing & Autonomous Learning (`src/self-heal.js`, `src/self-learn.js`, `src/self-evolve.js`)**
   - Runtime telemetry monitoring, automated error recovery loops, dependency checking, and historical pattern reinforcement.

7. **Universal Runner & Token Optimizer (`src/universal-runner.js`, `src/token-optimizer.js`)**
   - Dynamic port resolution based on working directory hashes, token window management, and telemetry compression.

---

## API Specification

### `POST /v1/copilot`

Executes a synchronous copilot inference request with MCP tool invocation and safety validation.

**Request Payload:**
```json
{
  "messages": [
    { "role": "user", "content": "Retrieve current system status." }
  ],
  "system": "You are H2O Copilot.",
  "tools": []
}
```

**Response Payload:**
```json
{
  "role": "assistant",
  "content": "System status nominal. Uptime: 3600s.",
  "engine": "browser-bridge",
  "model": "gemini-4-hydrogen"
}
```

### WebSocket Streaming

Connect via WebSocket to send JSON packets (`{ messages: [...] }`) and receive real-time token chunks (`{ type: 'chunk', text: '...' }`).

---

## Configuration & Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `H2O_PORT` | HTTP/WebSocket server port (auto-resolved if unset) | `4050` |
| `GEMINI_MODEL` | Primary LLM engine identifier | `gemini-4-hydrogen` |
| `GEMINI_API_KEY` | Google GenAI API key (optional) | `""` |
| `HYDROGEN_USE_SDK` | Force SDK mode (`true`/`false`) | `true` |
| `DEBUG` | Enable verbose diagnostic logging | `false` |

---

## Quick Start & Installation

```bash
# Install dependencies
npm install

# Start H2O Copilot server
npm start

# Run test suite
npm test
```

## License
MIT
