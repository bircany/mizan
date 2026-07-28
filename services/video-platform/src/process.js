import { spawn } from "node:child_process";

export function runProcess(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const logLimit = options.logLimit ?? 128 * 1024;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    const append = (current, chunk) => {
      const next = Buffer.concat([current, chunk]);
      return next.length > logLimit ? next.subarray(next.length - logLimit) : next;
    };
    child.stdout.on("data", (chunk) => { stdout = append(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderr = append(stderr, chunk); });
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      const force = setTimeout(() => child.kill("SIGKILL"), 5_000);
      force.unref();
    }, timeoutMs);
    timer.unref();
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      const result = {
        code,
        signal,
        stdout: stdout.toString("utf8"),
        stderr: stderr.toString("utf8"),
      };
      if (code === 0) resolve(result);
      else {
        const error = new Error(`${command} exited with ${code ?? signal}`);
        error.processResult = result;
        reject(error);
      }
    });
  });
}
