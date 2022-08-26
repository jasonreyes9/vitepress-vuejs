import { promises as fs } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { RollupOptions, defineConfig } from 'rollup'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import esbuild from 'rollup-plugin-esbuild'
import json from '@rollup/plugin-json'
import replace from '@rollup/plugin-replace'
import alias from '@rollup/plugin-alias'
import dts from 'rollup-plugin-dts'
import pkg from './package.json'

const DEV = !!process.env.DEV
const PROD = !DEV

const ROOT = fileURLToPath(import.meta.url)
const r = (p: string) => resolve(ROOT, '..', p)

const external = [...Object.keys(pkg.dependencies)]

const plugins = [
  alias({
    entries: {
      'readable-stream': 'stream'
    }
  }),
  replace({
    // polyfill broken browser check from bundled deps
    'navigator.userAgentData': 'undefined',
    'navigator.userAgent': 'undefined',
    preventAssignment: true
  }),
  commonjs(),
  nodeResolve({ preferBuiltins: true }),
  esbuild({ target: 'node14' }),
  json()
]

const esmBuild: RollupOptions = {
  input: [r('src/node/index.ts'), r('src/node/cli.ts')],
  output: {
    format: 'esm',
    entryFileNames: `[name].js`,
    chunkFileNames: 'serve-[hash].js',
    dir: r('dist/node')
  },
  external,
  plugins,
  onwarn(warning, warn) {
    if (warning.code !== 'EVAL') warn(warning)
  }
}

const cjsBuild: RollupOptions = {
  input: [r('src/node/index.ts'), r('src/node/cli.ts')],
  output: {
    format: 'cjs',
    dir: r('dist/node-cjs'),
    entryFileNames: `[name].cjs`,
    chunkFileNames: 'serve-[hash].cjs'
  },
  external,
  plugins,
  onwarn(warning, warn) {
    if (warning.code !== 'EVAL') warn(warning)
  }
}

const nodeTypes: RollupOptions = {
  input: r('src/node/index.ts'),
  output: {
    format: 'esm',
    file: 'dist/node/index.d.ts'
  },
  plugins: [dts()]
}

const clientTypes: RollupOptions = {
  input: r('dist/client-types/index.d.ts'),
  output: {
    format: 'esm',
    file: 'dist/client/index.d.ts'
  },
  plugins: [
    dts(),
    {
      name: 'cleanup',
      async closeBundle() {
        if (PROD) {
          await fs.rm(r('dist/client-types'), { recursive: true })
        }
      }
    }
  ]
}

const config = defineConfig([])

config.push(esmBuild)

if (PROD) {
  config.push(cjsBuild)
}

config.push(nodeTypes)
config.push(clientTypes)

export default config
