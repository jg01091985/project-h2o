import { GoogleGenAI } from '@google/genai';
import { CONFIG } from './config.js';

export class GeminiBridge {
  constructor(apiKey = null) {
    this.apiKey = apiKey || CONFIG.GEMINI_API_KEY;
  }

  getClient(apiKey) {
    const key = apiKey || this.apiKey;
    if (!key) {
      throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY environment variable.');
    }
    return new GoogleGenAI({ apiKey: key });
  }

  isRetryableError(err) {
    if (!err) return true;
    const status = err.status || err.statusCode || (err.response && err.response.status);
    if (status && status >= 400 && status < 500 && status !== 429) {
      return false;
    }
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('bad request') || msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('not found')) {
      return false;
    }
    return true;
  }

  async generateContent(contents, systemInstruction = null, tools = [], apiKey = null) {
    const ai = this.getClient(apiKey);
    const primaryModel = CONFIG.GEMINI_MODEL || 'gemini-4-hydrogen';
    const modelsToTry = [...new Set([primaryModel, 'gemini-2.5-pro'])];

    let lastErr = null;
    for (const model of modelsToTry) {
      let attempts = 0;
      while (attempts < CONFIG.MAX_RETRIES) {
        try {
          const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              tools: tools.length > 0 ? tools : undefined
            }
          });
          return response;
        } catch (err) {
          lastErr = err;
          if (!this.isRetryableError(err)) {
            if (CONFIG.DEBUG) {
              console.warn(`[H2O GeminiBridge] Model ${model} non-retryable error:`, err.message);
            }
            break;
          }
          attempts++;
          const backoff = Math.min(10000, 300 * Math.pow(2, attempts) + Math.random() * 200);
          await new Promise(r => setTimeout(r, backoff));
        }
      }
      if (CONFIG.DEBUG) {
        console.warn(`[H2O GeminiBridge] Model ${model} exhausted retries, falling back if available...`);
      }
    }
    throw lastErr || new Error('GeminiBridge generation failed across all models after max retries');
  }

  async generateContentStream(contents, systemInstruction = null, tools = [], onChunk, apiKey = null) {
    const ai = this.getClient(apiKey);
    const primaryModel = CONFIG.GEMINI_MODEL || 'gemini-4-hydrogen';
    const modelsToTry = [...new Set([primaryModel, 'gemini-2.5-pro'])];

    let lastErr = null;
    for (const model of modelsToTry) {
      let attempts = 0;
      while (attempts < CONFIG.MAX_RETRIES) {
        try {
          const responseStream = await ai.models.generateContentStream({
            model: model,
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              tools: tools.length > 0 ? tools : undefined
            }
          });

          let accumulatedText = '';
          for await (const chunk of responseStream) {
            const text = chunk.text || '';
            if (text) {
              accumulatedText += text;
              if (onChunk) onChunk(text);
            }
          }
          return accumulatedText;
        } catch (err) {
          lastErr = err;
          if (!this.isRetryableError(err)) break;
          attempts++;
          const backoff = Math.min(10000, 300 * Math.pow(2, attempts) + Math.random() * 200);
          await new Promise(r => setTimeout(r, backoff));
        }
      }
      if (CONFIG.DEBUG) {
        console.warn(`[H2O GeminiBridge] Model ${model} stream exhausted retries, falling back if available...`);
      }
    }
    throw lastErr || new Error('GeminiBridge stream failed across all models after max retries');
  }
}
