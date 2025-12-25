import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'build'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html', 'json', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.config.ts',
        'src/db/migrations/',
        'scripts/'
      ],
      lines: 75,
      functions: 75,
      branches: 70,
      statements: 75
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
})

