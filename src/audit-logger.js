import fs from 'fs';
import path from 'path';

export class AuditLogger {
  constructor(logPath = path.resolve(process.cwd(), '.h2o-audit.log')) {
    this.logPath = logPath;
  }

  log(entry) {
    const record = {
      timestamp: new Date().toISOString(),
      ...entry
    };
    try {
      fs.appendFileSync(this.logPath, JSON.stringify(record) + '\n', 'utf8');
    } catch (e) {}
  }
}

export const auditLogger = new AuditLogger();
