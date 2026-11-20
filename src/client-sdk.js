/**
 * H2O Copilot Client SDK
 * Drop-in frontend library for web applications.
 */
export class H2OCopilotClient {
  constructor(endpoint = 'http://localhost:4050/v1/copilot', timeoutMs = 30000) {
    this.endpoint = endpoint;
    this.timeoutMs = timeoutMs;
  }

  async ask(prompt, systemInstruction = '', messages = []) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const payloadMessages = [...messages, { role: 'user', content: prompt }];
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: payloadMessages,
          system: systemInstruction
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`H2O Copilot HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      const errorMessage = err.name === 'AbortError' ? 'Request timed out after ' + this.timeoutMs + 'ms' : err.message;
      console.error('[H2O Client SDK Error]', errorMessage);
      return {
        role: 'assistant',
        content: `Error connecting to H2O Copilot: ${errorMessage}`,
        success: false
      };
    }
  }
}
