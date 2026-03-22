import path from 'path';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

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
  plugins: [react(), moveScriptToBody()],
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
