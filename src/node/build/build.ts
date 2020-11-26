import fs from 'fs-extra'
import { bundle, okMark, failMark } from './bundle'
import { BuildConfig as ViteBuildOptions } from 'vite'
import { resolveConfig } from '../config'
import { renderPage } from './render'
import { OutputChunk, OutputAsset } from 'rollup'
import ora from 'ora'

export type BuildOptions = Pick<
  Partial<ViteBuildOptions>,
  | 'root'
  | 'rollupInputOptions'
  | 'rollupOutputOptions'
  | 'rollupPluginVueOptions'
>

export async function build(buildOptions: BuildOptions = {}) {
  const start = Date.now()

  process.env.NODE_ENV = 'production'
  const siteConfig = await resolveConfig(buildOptions.root)

  try {
    const [clientResult, , pageToHashMap] = await bundle(
      siteConfig,
      buildOptions
    )

    const spinner = ora()
    spinner.start('rendering pages...')

    try {
      const appChunk = clientResult.assets.find(
        (chunk) =>
          chunk.type === 'chunk' && chunk.fileName.match(/^app\.\w+\.js$/)
      ) as OutputChunk

      const cssChunk = clientResult.assets.find(
        (chunk) => chunk.type === 'asset' && chunk.fileName.endsWith('.css')
      ) as OutputAsset

      // We embed the hash map string into each page directly so that it doesn't
      // alter the main chunk's hash on every build. It's also embedded as a
      // string and JSON.parsed from the client because it's faster than embedding
      // as JS object literal.
      const hashMapStirng = JSON.stringify(JSON.stringify(pageToHashMap))

      for (const page of siteConfig.pages) {
        await renderPage(
          siteConfig,
          page,
          clientResult,
          appChunk,
          cssChunk,
          pageToHashMap,
          hashMapStirng
        )
      }
    } catch (e) {
      spinner.stopAndPersist({
        symbol: failMark
      })
      throw e
    }
    spinner.stopAndPersist({
      symbol: okMark
    })
  } finally {
    await fs.remove(siteConfig.tempDir)
  }

  console.log(`build complete in ${((Date.now() - start) / 1000).toFixed(2)}s.`)
}
