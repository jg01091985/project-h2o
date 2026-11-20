import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export class H2OAuthManager {
  constructor(keyFilePath = path.resolve(process.cwd(), '.h2o-instance-key')) {
    this.keyFilePath = keyFilePath;
    this.instanceKey = this.resolveKey();
  }

  resolveKey() {
    if (process.env.H2O_INSTANCE_KEY) {
      return process.env.H2O_INSTANCE_KEY;
    }

    try {
      if (fs.existsSync(this.keyFilePath)) {
        const storedKey = fs.readFileSync(this.keyFilePath, 'utf8').trim();
        if (storedKey) return storedKey;
      }
    } catch (e) {}

    // Generate Groq-pattern undetectable instance access key (gsk_[44 random chars])
    const randomPart = crypto.randomBytes(33).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').substring(0, 44);
    const newKey = `gsk_${randomPart}`;

    try {
      fs.writeFileSync(this.keyFilePath, newKey, 'utf8');
    } catch (e) {}
    return newKey;
  }

  verifyRequest(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authorized: false, reason: 'Missing or malformed Authorization Bearer token.' };
    }

    const token = authHeader.split(' ')[1];
    if (token !== this.instanceKey) {
      return { authorized: false, reason: 'Invalid H2O instance access key.' };
    }

    return { authorized: true };
  }
}

export const authManager = new H2OAuthManager();
