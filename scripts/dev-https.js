import { createServer } from 'vite';

(async () => {
  try {
    const server = await createServer({
      server: {
        https: true,
        port: 5173,
      },
    });
    await server.listen();
    const info = server.config.server;
    console.log('Vite HTTPS dev server started on', info.host || 'localhost', 'port', info.port || 5173);
  } catch (err) {
    console.error('Failed to start vite dev server with HTTPS:', err);
    process.exit(1);
  }
})();
