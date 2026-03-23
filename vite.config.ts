import path from 'path';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import fs from 'fs';

function copyPdfWorker(): Plugin {
  return {
    name: 'copy-pdf-worker',
    apply: 'build',
    closeBundle() {
      const src = path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.mjs');
      const dest = path.resolve(__dirname, 'dist/pdf.worker.mjs');
      fs.copyFileSync(src, dest);
      console.log('Copied pdf.worker.mjs to dist');
    }
  };
}

function moveScriptToBody(): Plugin {
  return {
    name: 'move-script-to-body',
    apply: 'build',
    transformIndexHtml(html) {
      const match = html.match(/<script[^>]*type="module"[^>]*src="[^"]*"[^>]*><\/script>/);
      if (match) {
        const cleaned = match[0].replace(/ type="module"/g, '').replace(/ crossorigin/g, '');
        html = html.replace(match[0], '');
        html = html.replace('</body>', `${cleaned}</body>`);
      }
      return html;
    }
  };
}

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [
    react(),
    copyPdfWorker(),
    moveScriptToBody(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(args) {
          args.startup();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'http', 'https', 'path', 'url'],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
  ],
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
