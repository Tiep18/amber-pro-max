import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve} from 'node:path';
import process from 'node:process';

const [rehearsalArgument] = process.argv.slice(2);

if (!rehearsalArgument) {
  console.error('Usage: node scripts/run-db-rehearsal.mjs <rehearsal.sql>');
  process.exit(2);
}

const workspaceRoot = process.cwd();
const rehearsalPath = resolve(workspaceRoot, rehearsalArgument);
const includedPaths = new Set();

function assertWorkspacePath(filePath) {
  const workspaceRelativePath = relative(workspaceRoot, filePath);

  if (workspaceRelativePath.startsWith('..') || isAbsolute(workspaceRelativePath)) {
    throw new Error(`Rehearsal include escapes the workspace: ${workspaceRelativePath}`);
  }
}

function expandRelativeIncludes(filePath) {
  assertWorkspacePath(filePath);

  if (includedPaths.has(filePath)) {
    throw new Error(`Recursive rehearsal include detected: ${relative(workspaceRoot, filePath)}`);
  }

  includedPaths.add(filePath);
  const source = readFileSync(filePath, 'utf8');
  const expanded = source.replace(/^\\ir\s+(.+?)\s*$/gm, (_line, includeArgument) => {
    const unquotedArgument = includeArgument.replace(/^['"]|['"]$/g, '');
    const includePath = resolve(dirname(filePath), unquotedArgument);
    return expandRelativeIncludes(includePath);
  });
  includedPaths.delete(filePath);

  return expanded;
}

const configSource = readFileSync(resolve(workspaceRoot, 'supabase/config.toml'), 'utf8');
const projectId = configSource.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];

if (!projectId) {
  throw new Error('supabase/config.toml does not declare project_id');
}

const containerName = `supabase_db_${projectId.replace(/[^A-Za-z0-9]/g, '_')}`;
const inspectResult = spawnSync('docker', ['inspect', '--format', '{{.State.Running}}', containerName], {
  encoding: 'utf8'
});

if (inspectResult.status !== 0 || inspectResult.stdout.trim() !== 'true') {
  throw new Error(`Local Supabase database container is not running for project ${projectId}`);
}

const rehearsalSql = expandRelativeIncludes(rehearsalPath);
const result = spawnSync(
  'docker',
  ['exec', '-i', containerName, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'],
  {
    input: rehearsalSql,
    stdio: ['pipe', 'inherit', 'inherit']
  }
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
