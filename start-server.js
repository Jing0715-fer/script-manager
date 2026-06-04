#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const projectDir = '/Users/lijing/Projects/script-manager';
const nextBin = path.join(projectDir, 'node_modules', '.bin', 'next');

const child = spawn(nextBin, ['dev', '-p', '3003'], {
  cwd: projectDir,
  stdio: 'inherit',
  detached: true,
});

child.unref();
console.log(`Next.js dev server started with PID: ${child.pid}`);
