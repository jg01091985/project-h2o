/**
 * H2O Copilot Client SDK
 * Drop-in frontend library for web apps and digital twins (e.g. kik-twin).
 */
export class H2OCopilotClient {
  constructor(endpoint = 'http://localhost:4050/v1/copilot') {
    this.endpoint = endpoint;
  }

  async ask(prompt, systemInstruction = '', messages = []) {
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
        })
      });

      if (!response.ok) {
        throw new Error(`H2O Copilot HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('[H2O Client SDK Error]', err);
      return {
        role: 'assistant',
        content: `Error connecting to H2O Copilot: ${err.message}`,
        success: false
      };
    }
  }
}
