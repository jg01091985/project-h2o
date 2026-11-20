import { UniversalRunner } from './universal-runner.js';

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : (process.env.H2O_PORT ? parseInt(process.env.H2O_PORT, 10) : 3000),
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-4-hydrogen',
  MAX_RETRIES: 3,
  DEBUG: process.env.DEBUG === 'true' || true
};
