import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    // Split CSS so the admin panel's styles load only with the admin chunk.
    cssCodeSplit: true,
  },
  ssr: {
    // Bundle these into the SSR build so the prerender step runs without
    // resolving ESM/CJS interop at runtime.
    noExternal: ['motion', 'framer-motion', 'motion-dom', 'motion-utils', 'lenis'],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
