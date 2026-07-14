import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const paydunyaProxy = {
  '/paydunya-sandbox-api': {
    target: 'https://app.paydunya.com',
    changeOrigin: true,
    secure: true,
    rewrite: (path: string) => path.replace(/^\/paydunya-sandbox-api/, '/sandbox-api'),
  },
  '/paydunya-production-api': {
    target: 'https://app.paydunya.com',
    changeOrigin: true,
    secure: true,
    rewrite: (path: string) => path.replace(/^\/paydunya-production-api/, '/api'),
  },
} as const;

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'PAYDUNIA_'],
  server: {
    proxy: { ...paydunyaProxy },
  },
  /** Même proxy qu’en dev pour `npm run preview` (évite CORS + même comportement que le serveur de dev). */
  preview: {
    proxy: { ...paydunyaProxy },
  },
});
