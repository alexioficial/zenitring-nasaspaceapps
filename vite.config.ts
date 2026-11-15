import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    {
      name: 'zenit-crew-websocket',
      async configureServer(server) {
        if (!server.httpServer) return;
        // Keep Bun-only persistence outside config evaluation by Node's svelte-check.
        const moduleUrl = pathToFileURL(resolve('server/hub.ts')).href;
        const { attachHub } = await import(/* @vite-ignore */ moduleUrl);
        const hub = attachHub(
          server.httpServer,
          process.env.MISSION_DB_PATH ?? 'data/zenit.sqlite',
        );
        server.middlewares.use('/api/mission-export', (req, res, next) => {
          if (req.method !== 'GET') return next();
          res.writeHead(200, {
            'content-type': 'application/json',
            'content-disposition': 'attachment; filename="zenit-complete-log.json"',
            'cache-control': 'no-store',
          });
          res.end(hub.exportLog());
        });
        server.httpServer.once('close', () => {
          void hub.close();
        });
      },
    },
  ],
  server: {
    watch: {
      // Browser profiles and generated design reports are not application inputs.
      ignored: ['**/.taste-skill/**'],
      // Docker Desktop on Windows may not forward filesystem events.
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
    },
  },
});
