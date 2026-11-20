# Project H2O Copilot

**Project H2O Copilot** is a universal, standalone AI copilot engine and proxy system engineered for web applications. Powered entirely by a headless stealth browser automation bridge to Google Free Web AI, H2O provides zero-cost LLM inference, Model Context Protocol (MCP) tool execution, cryptographic vault isolation, self-healing circuit breakers, and automated token optimization without requiring any commercial cloud billing or credentials.

---

## Technical Architecture

```
[Web App Client] ──(HTTP POST /v1/copilot or WebSocket)──► [H2O Copilot Server]
                                                                  │
                   ┌──────────────────────────────────────────────┴──────────────────────────────────────────────┐
                   ▼                                                                                             ▼
         [MCP Tool Registry]                                                                           [Stealth Browser Bridge]
    (System Status, Actions, Query)                                                            (Headless Chrome Automation over
                   │                                                                              Google Free Web AI Session)
                   │                                                                                             │
                   └──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                                                  ▼
                                                      [Safety Validator Engine]
                                                (Invariant Checks & Bounds Enforcement)
```

---

## Core Subsystems

1. **Stealth Browser Bridge (`src/browser-bridge.js`)**
   - Headless browser automation engine (`puppeteer-extra` with advanced stealth and anti-bot evasion plugins) communicating directly with Google Free Web AI.
   - Stateful circuit breakers, FIFO prompt queueing, and randomized timing jitter.

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

## Service Specification

### `POST /v1/copilot`

Executes a synchronous copilot inference request with MCP tool invocation and safety validation via the stealth browser bridge.

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
| `DEBUG` | Enable verbose diagnostic logging | `true` |

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
