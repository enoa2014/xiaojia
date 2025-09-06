import { defineConfig } from 'tsup'
export default defineConfig({
  entry: ['index.ts'],
  outDir: 'dist',
  format: ['cjs'],
  target: 'node10',
  minify: false,
  sourcemap: true,
  clean: true
})

