import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: 'popup.html',
      },
    },
  },
  define: {
    __BACKEND_URL__: JSON.stringify(process.env.BACKEND_URL ?? 'http://localhost:3000'),
  },
});
