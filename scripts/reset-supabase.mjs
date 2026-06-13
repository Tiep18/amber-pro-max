import {spawn} from 'node:child_process';

const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55431';
const healthUrls = [`${apiUrl}/auth/v1/health`, `${apiUrl}/rest/v1/`, `${apiUrl}/storage/v1/status`];
const resetAttempts = 3;
const healthTimeoutMs = 60_000;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function runReset() {
  return new Promise((resolve) => {
    const child = spawn('supabase', ['db', 'reset'], {stdio: 'inherit'});
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

async function servicesAreHealthy() {
  return Promise.all(
    healthUrls.map(async (url) => {
      try {
        const response = await fetch(url, {signal: AbortSignal.timeout(5_000)});
        return response.ok;
      } catch {
        return false;
      }
    })
  ).then((results) => results.every(Boolean));
}

async function waitForServices() {
  const deadline = Date.now() + healthTimeoutMs;
  while (Date.now() < deadline) {
    if (await servicesAreHealthy()) {
      return true;
    }
    await delay(1_000);
  }
  return false;
}

let ready = false;
for (let attempt = 1; attempt <= resetAttempts; attempt += 1) {
  const resetSucceeded = await runReset();
  if (resetSucceeded && (await waitForServices())) {
    console.log('Supabase Auth, PostgREST, and Storage are ready.');
    ready = true;
    break;
  }

  if (attempt < resetAttempts) {
    console.warn(`Supabase reset attempt ${attempt} did not become ready; retrying.`);
    await delay(2_000);
  }
}

if (!ready) {
  console.error('Supabase did not become ready after three reset attempts.');
  process.exitCode = 1;
}
