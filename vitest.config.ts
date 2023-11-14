import { defineConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig(() => ({
  name: 'streamwire',
  test: {
    globals: true,
  },
}));
