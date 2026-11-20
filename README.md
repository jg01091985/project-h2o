# Project H2O Inference Server

**Project H2O** is a high-performance, undetectable, standalone AI inference server and drop-in gateway. Engineered to replace commercial per-token cloud billing APIs, H2O provides zero-cost LLM inference powered by Google Free Web AI via a stealth browser automation bridge, reinforced with intelligent request routing, prompt memoization caching, concurrency load balancing, cryptographic bearer token authentication, and full OpenAI API compatibility (`POST /v1/chat/completions`).

---

## Architecture & Request Routing

```
[Client Application] ──(Bearer Token + POST /v1/chat/completions)──► [H2O Inference Server]
                                                                             │
                   ┌─────────────────────────────────────────────────────────┴─────────────────────────────────────────┐
                   ▼                                                                                                   ▼
        [LRU Inference Cache]                                                                                 [Intelligent H2O Router]
    (0ms Response for Repeat Prompts)                                                                                  │
                                                                       ┌───────────────────────────────────────────────┴───────────────────────────────────────────────┐
                                                                       ▼                                                                                               ▼
                                                            [Dynamic Worker Pool]                                                                              [Safety Validator]
                                                       (Least-Busy Load Balancing)                                                                     (Invariant Bounds Check)
                                                                       │
                                                                       ▼
                                                      [Stealth Browser Bridge Engine]
                                                     (Headless Chrome over Google Free Web AI)
```

---

## Core Capabilities

1. **Intelligent Request Router & Caching (`src/router.js`, `src/cache.js`)**
   - **LRU Memoization Caching**: Instantaneous 0ms responses for repeat prompts, eliminating redundant browser overhead.
   - **Least-Busy Load Balancing**: Distributes concurrent inference requests evenly across isolated stealth browser worker pools (`H2O_POOL_SIZE`).

2. **OpenAI-Compatible Drop-In Gateway (`POST /v1/chat/completions`)**
   - Drop-in replacement for standard LLM APIs. Configure any existing application or framework with H2O's server URL and instance access key with zero code modifications.

3. **Cryptographic Instance Access Control (`src/auth.js`)**
   - Automatically generates a secure bearer token (`h2o_live_[hex]`) on first boot, enforcing strict `Authorization: Bearer <token>` authentication across all inference endpoints.

4. **Stealth Anti-Bot Browser Bridge (`src/browser-bridge.js`, `src/anti-bot.js`)**
   - Headless evasion suite (`puppeteer-extra` stealth, WebGL vendor/renderer spoofing, canvas fingerprint noise injection, and behavioral jitter) ensuring requests appear as legitimate user activity.

5. **Self-Healing & Autonomous Resilience (`src/self-heal.js`, `src/self-evolve.js`, `src/self-learn.js`)**
   - Runtime telemetry monitoring, smart multi-selector DOM probing, circuit breakers, and automatic worker page recovery.

---

## Service Specification

### `POST /v1/chat/completions` (OpenAI Compatible)

**Request Headers:**
```http
Authorization: Bearer h2o_live_...
Content-Type: application/json
```

**Request Body:**
```json
{
  "model": "gemini-4-hydrogen",
  "messages": [
    { "role": "user", "content": "Explain quantum computing in 3 sentences." }
  ]
}
```

**Response Body:**
```json
{
  "id": "h2o-chat-1795143908547",
  "object": "chat.completion",
  "created": 1795143908,
  "model": "gemini-4-hydrogen",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Quantum computing leverages qubits..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 30,
    "total_tokens": 80
  },
  "h2o_routing": {
    "engine": "browser-bridge",
    "cached": false
  }
}
```

---

## Configuration & Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `H2O_PORT` | HTTP/WebSocket server port (auto-resolved if unset) | `4050` |
| `H2O_INSTANCE_KEY` | Custom bearer access token (auto-generated if unset) | `auto` |
| `H2O_POOL_SIZE` | Number of concurrent stealth browser workers | `2` |
| `GEMINI_MODEL` | Primary model identifier | `gemini-4-hydrogen` |
| `DEBUG` | Enable verbose diagnostic logging | `true` |

---

## Quick Start & Installation

```bash
# Install dependencies
npm install

# Start H2O Inference Server (generates instance access key on boot)
npm start

# Run comprehensive test suites & stress verification
npm test && node test/test-inference-server.js && node test/test-stress.js
```

## License
MIT
