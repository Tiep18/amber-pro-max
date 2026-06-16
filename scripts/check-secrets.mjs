import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {pathToFileURL} from 'node:url';

const root = process.cwd();
const sourceTargets = ['src', '.env.example', 'next.config.ts', 'playwright.config.ts'];
const buildTargets = ['.next/static'];
const secretPatterns = [
  /service_role/i,
  /SUPABASE_SECRET/i,
  /SECRET_KEY/i,
  /SERVICE_ROLE/i,
  /sb_secret_/i,
  /NEXT_PUBLIC_[A-Z0-9_]*SECRET/i
];
const serverSecretNameFiles = new Set(['src/lib/env/server.ts', 'src/lib/supabase/admin.ts', '.env.example']);
const serverSecretNamePatterns = new Set(secretPatterns.slice(0, 4));
const literalSecretValuePatterns = [/sb_secret_[A-Za-z0-9._-]+/i, /^SUPABASE_SECRET_KEY=\S+/m, /^SUPABASE_SERVICE_ROLE_KEY=\S+/m];
const privilegedImportPatterns = [
  /from ['"]@\/lib\/supabase\/server['"]/,
  /from ['"]@\/lib\/supabase\/proxy['"]/,
  /from ['"]@\/auth\/guards['"]/
];
const textExtensions = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx', '.json', '.env', '.example', '.yml', '.yaml']);

function extensionOf(file) {
  const index = file.lastIndexOf('.');
  return index === -1 ? '' : file.slice(index);
}

function walk(target) {
  const absolute = join(root, target);
  if (!existsSync(absolute)) {
    return [];
  }

  const stat = statSync(absolute);
  if (stat.isFile()) {
    return [absolute];
  }

  return readdirSync(absolute).flatMap((entry) => walk(join(target, entry)));
}

function isClientModule(content) {
  return /^['"]use client['"];?/m.test(content);
}

function scanFiles(targets, {build = false} = {}) {
  const findings = [];

  for (const file of targets.flatMap(walk)) {
    if (!textExtensions.has(extensionOf(file))) {
      continue;
    }

    const content = readFileSync(file, 'utf8');
    const rel = relative(root, file).replaceAll('\\', '/');
    for (const pattern of secretPatterns) {
      const allowedServerReference = serverSecretNameFiles.has(rel) && serverSecretNamePatterns.has(pattern);
      if (pattern.test(content) && !allowedServerReference) {
        findings.push(`${rel}: matched ${pattern}`);
      }
    }
    for (const pattern of literalSecretValuePatterns) {
      if (pattern.test(content)) {
        findings.push(`${rel}: contains literal secret-shaped value`);
      }
    }

    if (!build && isClientModule(content)) {
      for (const pattern of privilegedImportPatterns) {
        if (pattern.test(content)) {
          findings.push(`${rel}: client module imports privileged server boundary`);
        }
      }
    }
  }

  return findings;
}

export function runSecretScan() {
  return [...scanFiles(sourceTargets), ...scanFiles(buildTargets, {build: true})];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const findings = runSecretScan();
  if (findings.length > 0) {
    console.error(findings.join('\n'));
    process.exitCode = 1;
  }
}
