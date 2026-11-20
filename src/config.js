import { UniversalRunner } from './universal-runner.js';

export const CONFIG = {
  PORT: process.env.H2O_PORT ? parseInt(process.env.H2O_PORT, 10) : UniversalRunner.resolvePort(4050),
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-4-hydrogen',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_FALLBACK || '',
  MAX_RETRIES: 3,
  DEBUG: process.env.DEBUG === 'true' || true
};
