/**
 * H2O AI Frontend Client
 * Drop-in frontend library for web applications.
 */
export class H2OClient {
  constructor(endpoint = '/v1/chat/completions', apiKey = '', timeoutMs = 30000) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  async ask(prompt, systemInstruction = '', messages = []) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const payloadMessages = [];
      if (systemInstruction) {
        payloadMessages.push({ role: 'system', content: systemInstruction });
      }
      payloadMessages.push(...messages, { role: 'user', content: prompt });

      const headers = {
        'Content-Type': 'application/json'
      };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'gemini-4-hydrogen',
          messages: payloadMessages
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`H2O AI HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      return {
        role: choice?.message?.role || 'assistant',
        content: choice?.message?.content || '',
        engine: data.h2o_routing?.engine || 'browser-bridge',
        cached: data.h2o_routing?.cached || false,
        success: true
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const errorMessage = err.name === 'AbortError' ? 'Request timed out after ' + this.timeoutMs + 'ms' : err.message;
      console.error('[H2O Client Error]', errorMessage);
      return {
        role: 'assistant',
        content: `Error connecting to H2O AI: ${errorMessage}`,
        success: false
      };
    }
  }
}

// Backwards compatibility alias
export class H2OCopilotClient extends H2OClient {}
