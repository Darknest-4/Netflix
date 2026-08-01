#!/usr/bin/env node
/**
 * Development runner.
 *
 * Builds `@nova/shared` once, then starts the API and the web app together with
 * prefixed, colourised output. Replaces a `concurrently` dependency with ~60
 * lines of Node, and makes sure a single Ctrl+C stops both processes.
 */
import { spawn } from 'node:child_process';

/** ANSI colours per child process. */
const COLOURS = { api: '[36m', web: '[35m', reset: '[0m' };

/** Child processes started by this script. */
const children = [];

/**
 * Starts a workspace script and prefixes its output.
 *
 * @param {string} name - Label shown in the log prefix.
 * @param {string[]} args - Arguments passed to `npm`.
 * @returns {import('node:child_process').ChildProcess} The spawned process.
 */
function start(name, args) {
  const child = spawn('npm', args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
  const colour = COLOURS[name] ?? '';

  /**
   * Writes a chunk to the console with the process prefix.
   *
   * @param {Buffer} chunk - Raw output chunk.
   */
  const write = (chunk) => {
    for (const line of chunk.toString().split('\n')) {
      if (line.trim().length > 0) {
        console.log(`${colour}[${name}]${COLOURS.reset} ${line}`);
      }
    }
  };

  child.stdout.on('data', write);
  child.stderr.on('data', write);
  child.on('exit', (code) => {
    console.log(`${colour}[${name}]${COLOURS.reset} kilépett (${code})`);
    stopAll();
    process.exitCode = code ?? 0;
  });

  children.push(child);
  return child;
}

/** Terminates every child process. */
function stopAll() {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
}

process.on('SIGINT', () => {
  stopAll();
  process.exit(0);
});

console.log('NOVA fejlesztői környezet indítása…\n');

const build = spawn('npm', ['run', 'build', '--workspace', '@nova/shared'], { stdio: 'inherit' });
build.on('exit', (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }
  start('api', ['run', 'dev', '--workspace', '@nova/api']);
  start('web', ['run', 'dev', '--workspace', '@nova/web']);
});
