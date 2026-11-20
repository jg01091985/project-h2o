# Project H2O

**Project H2O** is a self-sustaining, dual-engine AI copilot and proxy system engineered for deterministic digital twin orchestration, Model Context Protocol (MCP) tool execution, and high-resilience LLM inference. Powered primarily by **`gemini-4-hydrogen`** with automatic failover rotation to **`gemini-2.5-pro`**, H2O provides low-latency REST and WebSocket endpoints, cryptographic vault isolation, self-healing circuits, and automated token optimization without commercial per-token cloud billing complexity.

---

## Technical Architecture

```
[Digital Twin Clients] ──(HTTP POST /v1/copilot or WebSocket)──► [H2O Copilot Server]
                                                                        │
                         ┌──────────────────────────────────────────────┴──────────────────────────────────────────────┐
                         ▼                                                                                             ▼
               [Twin MCP Tool Registry]                                                                      [Dual-Engine Inference]
         (Sensors, Actuators, Topology, State)                                           ┌─────────────────────────────────────────┘
                         │                                                                 ▼                                         ▼
                         │                                                       [Gemini SDK Bridge]                     [Stealth Browser Bridge]
                         │                                                    (gemini-4-hydrogen default)               (Automated Web session fallback)
                         │                                                                 │                                         │
                         └──────────────────────────────────────────────┬──────────────────┴─────────────────────────────────────────┘
                                                                        ▼
                                                             [Safety Validator Engine]
                                                       (Invariant Checks & Bounds Enforcement)
```

---

## Core Subsystems

1. **Dual-Engine Model Bridge (`src/gemini-bridge.js`, `src/sdk-bridge.js`)**
   - Direct integration with `@google/genai` enforcing **`gemini-4-hydrogen`** as the default primary execution model.
   - Built-in circuit breakers, exponential backoff retry logic, non-retryable error classification (4xx rejection handling), and seamless fallback rotation to **`gemini-2.5-pro`**.

2. **Model Context Protocol (MCP) Registry (`src/twin-mcp-registry.js`)**
   - Standardized tool declarations and execution handlers for digital twin telemetry, sensor sampling, actuator control, and topological routing.

3. **Safety & Invariant Validation (`src/safety-validator.js`)**
   - Deterministic bounds checking and payload sanitization preventing out-of-bounds parameter execution and unauthorized state overrides.

4. **Cryptographic Vault (`src/vault.js`)**
   - AES-256-GCM authenticated encryption for secure persistence of session tokens, state ledgers, and credential stores.

5. **Anti-Bot & Proxy Rotation (`src/anti-bot.js`, `src/failover.js`)**
   - Automated API key rotation pools, proxy list management, request jitter injection, and multi-tier failover matrices.

6. **Self-Healing & Autonomous Learning (`src/self-heal.js`, `src/self-learn.js`, `src/self-evolve.js`)**
   - Runtime telemetry monitoring, automated error recovery loops, and historical pattern reinforcement.

7. **Universal Runner & Token Optimizer (`src/universal-runner.js`, `src/token-optimizer.js`)**
   - Dynamic port resolution based on working directory hashes, token window management, and payload compression.

---

## API Specification

### `POST /v1/copilot`

Executes a synchronous copilot inference request with MCP tool invocation and safety validation.

**Request Payload:**
```json
{
  "messages": [
    { "role": "user", "content": "Query telemetry for valve-4 pressure levels." }
  ],
  "system": "You are H2O Copilot managing digital twin telemetry.",
  "tools": []
}
```

**Response Payload:**
```json
{
  "role": "assistant",
  "content": "Telemetry read for valve-4: Pressure is at 42.5 PSI (Within nominal range).",
  "model": "gemini-4-hydrogen",
  "usage": {
    "prompt_tokens": 128,
    "completion_tokens": 34,
    "total_tokens": 162
  }
}
```

---

## Configuration & Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `H2O_PORT` | HTTP/WebSocket server port (auto-hashed from CWD if unset) | `4050` |
| `GEMINI_MODEL` | Primary LLM engine identifier | `gemini-4-hydrogen` |
| `GEMINI_API_KEY` | Google GenAI API key | `""` |
| `GEMINI_API_KEYS` | Comma-separated pool of rotating API keys | `""` |
| `DEBUG` | Enable verbose diagnostic logging | `false` |

---

## Quick Start & Installation

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   ```bash
   export GEMINI_API_KEY="your-gemini-api-key"
   ```

3. **Start H2O Server:**
   ```bash
   npm start
   ```

4. **Run Verification Test Suite:**
   ```bash
   npm test
   ```

---

## License

MIT License.
