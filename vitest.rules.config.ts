import { defineConfig } from 'vitest/config'

// Integración: reglas de Firestore contra el emulador (npm run test:rules).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
  },
})
