
import { defineConfig } from 'tsup'
export default defineConfig({
  entry: ['index.ts'],
  outDir: 'dist',
  format: ['cjs'],
  // 统一到 Node 16 运行时
  target: 'node16',
  minify: false,
  sourcemap: true,
  clean: true
})
