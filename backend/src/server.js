import app from './app.js';
import env from './config/env.js';
import { warmUpPdfEngine, shutdownPdfEngine } from './services/pdf.service.js';

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `\n  Medical Receipt API\n` +
      `  ------------------------------------------\n` +
      `  env      : ${env.nodeEnv}\n` +
      `  port     : ${env.port}\n` +
      `  frontend : ${env.frontendUrls.join(', ')}\n` +
      `  health   : http://localhost:${env.port}/health\n`
  );

  // Start Chromium in the background so the first receipt is not slow.
  warmUpPdfEngine();
});

async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`\n[server] ${signal} received, shutting down...`);
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log('[server] http closed');
  });
  await shutdownPdfEngine();
  setTimeout(() => process.exit(0), 500).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[server] unhandled rejection:', reason);
});
