const { spawn } = require('node:child_process');

const electronBinary = require('electron');
const args = process.argv.slice(2);

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, args, {
  stdio: 'inherit',
  env,
  windowsVerbatimArguments: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('[run-electron] Failed to launch Electron:', error);
  process.exit(1);
});
