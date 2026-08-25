import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  // The extension popup uses inline styles only; skip the root app's
  // Tailwind PostCSS config, which Vite would otherwise discover upstream.
  css: { postcss: { plugins: [] } },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'manifest.json', dest: '.' },
        { src: 'icons/*', dest: 'icons', rename: { stripBase: 1 } },
      ],
    }),
  ],
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
