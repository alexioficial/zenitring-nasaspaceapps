import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    watch: {
      // Docker Desktop on Windows may not forward filesystem events.
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true'
    }
  }
});
