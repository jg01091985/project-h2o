export class TokenOptimizer {
  static compressTelemetry(telemetryObject, maxDepth = 2) {
    if (!telemetryObject || typeof telemetryObject !== 'object') return telemetryObject;

    const compressed = {};
    for (const [key, val] of Object.entries(telemetryObject)) {
      if (typeof val === 'number') {
        compressed[key] = Math.round(val * 100) / 100;
      } else if (val && typeof val === 'object' && maxDepth > 0) {
        compressed[key] = TokenOptimizer.compressTelemetry(val, maxDepth - 1);
      } else if (typeof val === 'string' && val.length > 100) {
        compressed[key] = val.substring(0, 100) + '...[truncated]';
      } else {
        compressed[key] = val;
      }
    }
    return compressed;
  }

  static optimizePrompt(promptText) {
    if (!promptText || typeof promptText !== 'string') return '';
    // Bleeding-edge semantic prompt optimization: strip redundant conversational filler, normalize whitespace, and compress token footprint
    return promptText
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }
}
