#!/usr/bin/env bash
export PORT="3000"
export HEADLESS="true"
export H2O_DEBUG="true"

if [ -z "$H2O_INSTANCE_KEY" ]; then
  echo "[H2O Deployment Error] H2O_INSTANCE_KEY environment variable is required."
  exit 1
fi

echo "[H2O Deployment] Initializing H2O Copilot Inference Server..."
npm install
npm start
