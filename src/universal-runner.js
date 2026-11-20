import path from 'path';
import crypto from 'crypto';

export class UniversalRunner {
  static resolvePort(basePort = 4050) {
    const cwd = process.cwd();
    const hash = crypto.createHash('md5').update(cwd).digest('hex');
    const offset = parseInt(hash.substring(0, 4), 16) % 100;
    return basePort + offset;
  }

  static getEnvironmentInfo() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      workingDirectory: process.cwd(),
      timestamp: new Date().toISOString()
    };
  }
}
