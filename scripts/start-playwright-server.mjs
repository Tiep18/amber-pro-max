import {spawn} from 'node:child_process';
import {access, rm} from 'node:fs/promises';
import {basename, dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export function nextBuildDirectory(projectRoot) {
  const root = resolve(projectRoot);
  const buildDirectory = resolve(root, '.next');

  if (dirname(buildDirectory) !== root || basename(buildDirectory) !== '.next') {
    throw new Error(`Refusing to clean unexpected Next.js build directory: ${buildDirectory}`);
  }

  return buildDirectory;
}

export async function cleanPlaywrightBuildArtifacts(projectRoot) {
  await rm(nextBuildDirectory(projectRoot), {recursive: true, force: true});
}

export async function startPlaywrightServer({
  projectRoot = process.cwd(),
  port = process.env.PLAYWRIGHT_PORT ?? '3210'
} = {}) {
  const root = resolve(projectRoot);
  const nextCli = resolve(root, 'node_modules', 'next', 'dist', 'bin', 'next');

  await access(nextCli);
  await cleanPlaywrightBuildArtifacts(root);

  const child = spawn(process.execPath, [nextCli, 'dev', '--port', String(port)], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => child.kill(signal));
  }

  child.once('error', (error) => {
    console.error(error);
    process.exitCode = 1;
  });
  child.once('exit', (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });

  return child;
}

const isMain =
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === pathToFileURL(fileURLToPath(import.meta.url)).href;

if (isMain) {
  await startPlaywrightServer();
}
