#!/usr/bin/env node
/**
 * Generate extension resource snippets for CloudBase private extension.
 * Output: output/extension-resources.{json,yaml}
 * Each function maps to a block with CodeUri pointing to ./artifacts/extensions/<name>.zip
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.join(process.cwd())
const artDir = path.join(root, 'artifacts', 'extensions')
const outDir = path.join(root, 'output')
fs.mkdirSync(outDir, { recursive: true })

// timeouts per root cloudbaserc.json
const TIMEOUTS = {
  'import-xlsx': 120,
  'init-db': 120,
}
const DEFAULT_TIMEOUT = 60

const FUNCTIONS = [
  'patients',
  'services',
  'activities',
  'permissions',
  'registrations',
  'tenancies',
  'users',
  'exports',
  'stats',
  'import-xlsx',
  'init-db',
  'relations',
]

const resources = FUNCTIONS.map((name) => {
  const zipRel = `./artifacts/extensions/${name}.zip`
  const zipAbs = path.join(artDir, `${name}.zip`)
  const exists = fs.existsSync(zipAbs)
  return {
    name,
    CodeUri: zipRel,
    exists,
    Runtime: 'Nodejs16.13',
    Timeout: TIMEOUTS[name] ?? DEFAULT_TIMEOUT,
    InstallDependency: true,
    Handler: 'index.main',
    MemorySize: 256,
    Ignore: [
      'node_modules/**/*',
      '.git/**/*',
      '*.ts',
      'tsconfig.json',
      'tsup.config.ts',
    ],
  }
})

const jsonOut = path.join(outDir, 'extension-resources.json')
fs.writeFileSync(jsonOut, JSON.stringify({ functions: resources }, null, 2))

// minimal YAML (no external lib)
const yamlEsc = (s) => s.replace(/"/g, '\\"')
const yaml = [
  'functions:',
  ...resources.map((r) =>
    [
      `  - name: ${r.name}`,
      `    CodeUri: ${r.CodeUri}`,
      `    Runtime: ${r.Runtime}`,
      `    Timeout: ${r.Timeout}`,
      `    InstallDependency: ${r.InstallDependency}`,
      `    Handler: ${r.Handler}`,
      `    MemorySize: ${r.MemorySize}`,
      `    Ignore:`,
      ...r.Ignore.map((p) => `      - "${yamlEsc(p)}"`),
    ].join('\n')
  ),
].join('\n')

const yamlOut = path.join(outDir, 'extension-resources.yaml')
fs.writeFileSync(yamlOut, yaml)

console.log(`Wrote:\n- ${jsonOut}\n- ${yamlOut}`)

