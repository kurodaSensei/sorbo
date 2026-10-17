import { defineConfig } from 'vitest/config'

// Unitarias puras, sin emulador (npm test). Las reglas van en vitest.rules.config.ts.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
})
