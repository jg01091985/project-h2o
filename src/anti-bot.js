import { CONFIG } from './config.js';

class AntiBotManager {
  constructor() {
    this.keyIndex = 0;
    this.keyFailures = new Map();
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0'
    ];
    this.stealthScript = `
      // God-tier H2O / Hydrogen anti-bot stealth injections
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });

      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };

      // WebGL Vendor & Renderer Masking
      const getParameterProxyHandler = {
        apply: function(target, ctx, args) {
          const param = args[0];
          if (param === 37445) return 'Intel Inc.';
          if (param === 37446) return 'Intel Iris OpenGL Engine';
          return Reflect.apply(target, ctx, args);
        }
      };
      try {
        WebGLRenderingContext.prototype.getParameter = new Proxy(WebGLRenderingContext.prototype.getParameter, getParameterProxyHandler);
        WebGL2RenderingContext.prototype.getParameter = new Proxy(WebGL2RenderingContext.prototype.getParameter, getParameterProxyHandler);
      } catch (e) {}

      // Canvas Fingerprint Noise Injection
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type) {
        try {
          const ctx = this.getContext('2d');
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, this.width || 10, this.height || 10);
            imageData.data[0] = imageData.data[0] ^ 1;
            ctx.putImageData(imageData, 0, 0);
          }
        } catch (e) {}
        return originalToDataURL.apply(this, arguments);
      };
    `;
  }

  async applyStealthToPage(page) {
    try {
      await page.evaluateOnNewDocument(this.stealthScript);
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Chromium";v="125", "Google Chrome";v="125", "Not-A.Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Linux"'
      });
    } catch (e) {
      if (CONFIG.DEBUG) {
        console.warn('[H2O Anti-Bot] Failed to apply stealth script to page:', e.message);
      }
    }
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  async applyJitter(minMs = 50, maxMs = 200) {
    const jitter = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise(r => setTimeout(r, jitter));
  }
}

export const antiBot = new AntiBotManager();
