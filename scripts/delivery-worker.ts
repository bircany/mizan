console.error(
  "Legacy Next.js delivery worker is disabled. Use services/video-platform message-worker, video-worker and retention-worker.",
);
process.exitCode = 1;
