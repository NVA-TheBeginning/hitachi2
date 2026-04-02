import { type Subprocess, spawn } from "bun";

const ROOT_DIR = new URL("../../", import.meta.url).pathname;

async function isServerRunning(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(url: string, maxAttempts = 60): Promise<void> {
  const attempt = async (remaining: number): Promise<void> => {
    if (remaining <= 0) throw new Error(`Server at ${url} failed to start`);
    const isRunning = await isServerRunning(url);
    if (isRunning) return;
    await Bun.sleep(1000);
    return attempt(remaining - 1);
  };
  return attempt(maxAttempts);
}

let serverProc: Subprocess | null = null;
let webProc: Subprocess | null = null;

async function startServers(): Promise<void> {
  console.log("Killing existing servers...");
  await spawn(["sh", "-c", "lsof -ti :3000 -ti :3001 | xargs -r kill -9"]).exited;

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const [serverRunning, webRunning] = await Promise.all([
    isServerRunning("http://localhost:3000"),
    isServerRunning("http://localhost:3001"),
  ]);

  if (serverRunning && webRunning) {
    console.log("Servers already running");
    return;
  }

  console.log("Starting servers...");

  if (!serverRunning) {
    serverProc = spawn(["bun", "run", "--filter", "server", "dev"], {
      cwd: ROOT_DIR,
      stdout: "inherit",
      stderr: "inherit",
      env: {
        ...process.env,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
        CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3001",
      },
    });
  }

  if (!webRunning) {
    webProc = spawn(["bun", "run", "--filter", "web", "dev"], {
      cwd: ROOT_DIR,
      stdout: "inherit",
      stderr: "inherit",
      env: {
        ...process.env,
        NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000",
      },
    });
  }

  await Promise.all([waitForServer("http://localhost:3000"), waitForServer("http://localhost:3001")]);

  console.log("Servers ready!");
}

function stopServers(): void {
  serverProc?.kill();
  webProc?.kill();
}

async function runTests(): Promise<number> {
  const proc = spawn(["bun", "test", "--timeout", "90000"], {
    cwd: import.meta.dir,
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env },
  });

  return proc.exited;
}

try {
  await startServers();
  const exitCode = await runTests();
  stopServers();
  process.exit(exitCode);
} catch (error) {
  console.error(error);
  stopServers();
  process.exit(1);
}
