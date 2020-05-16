import path from 'path'
import slash from 'slash'
import fs from 'fs-extra'
import { APP_PATH, createResolver, SITE_DATA_REQUEST_PATH } from '../resolver'
import { BuildOptions, ASSETS_DIR } from './build'
import { SiteConfig } from '../config'
import { Plugin } from 'rollup'
import { createMarkdownToVueRenderFn } from '../markdownToVue'
import {
  build,
  ssrBuild,
  BuildConfig as ViteBuildOptions,
  BuildResult
} from 'vite'

// bundles the VitePress app for both client AND server.
export async function bundle(
  config: SiteConfig,
  options: BuildOptions
): Promise<BuildResult[]> {
  const root = config.root
  const resolver = createResolver(config.themeDir)
  const markdownToVue = createMarkdownToVueRenderFn(root)

  let isClientBuild = true

  const VitePressPlugin: Plugin = {
    name: 'vitepress',
    resolveId(id) {
      if (id === SITE_DATA_REQUEST_PATH || id.endsWith('.md.vue')) {
        return id
      }
    },
    async load(id) {
      if (id === SITE_DATA_REQUEST_PATH) {
        return `export default ${JSON.stringify(JSON.stringify(config.site))}`
      }
      // compile md into vue src for .md.vue virtual files
      if (id.endsWith('.md')) {
        const filePath = id.replace(/\.vue$/, '')
        const content = await fs.readFile(filePath, 'utf-8')
        const lastUpdated = (await fs.stat(filePath)).mtimeMs
        const { vueSrc } = markdownToVue(content, filePath, lastUpdated)
        return vueSrc
      }
    },
    generateBundle(_options, bundle) {
      // for each .md entry chunk, adjust its name to its correct path.
      for (const name in bundle) {
        const chunk = bundle[name]
        if (
          chunk.type === 'chunk' &&
          chunk.isEntry &&
          chunk.facadeModuleId &&
          chunk.facadeModuleId.endsWith('.md')
        ) {
          // foo/bar.md -> foo_bar.md.js
          chunk.fileName =
            slash(path.relative(root, chunk.facadeModuleId)).replace(
              /\//g,
              '_'
            ) + '.js'

          if (isClientBuild) {
            // inject another chunk with the content stripped
            bundle[name + '-lean'] = {
              ...chunk,
              fileName: chunk.fileName.replace(/\.js$/, '.lean.js'),
              code: chunk.code.replace(
                /createStaticVNode\([^)]+, (\d+)\)/g,
                `createStaticVNode("", $1)`
              )
            }
          }
        }
      }
    }
  }

  const appEntry = path.resolve(APP_PATH, 'index.js')
  // convert page files to absolute paths
  const pages = config.pages.map((file) => path.resolve(root, file))

  // resolve options to pass to vite
  const { rollupInputOptions = {}, rollupOutputOptions = {} } = options
  const viteOptions: ViteBuildOptions = {
    ...options,
    resolvers: [resolver],
    outDir: config.outDir,
    assetsDir: ASSETS_DIR,
    // let rollup-plugin-vue compile .md files as well
    rollupPluginVueOptions: {
      include: /\.(vue|md)$/
    },
    rollupInputOptions: {
      ...rollupInputOptions,
      // use our custom input
      // this is a multi-entry build - every page is considered an entry chunk
      // the loading is done via filename conversion rules so that the
      // metadata doesn't need to be included in the main chunk.
      input: [appEntry, ...pages],
      // important so that each page chunk and the index export things for each
      // other
      preserveEntrySignatures: 'allow-extension',
      plugins: [VitePressPlugin, ...(rollupInputOptions.plugins || [])]
    },
    rollupOutputOptions,
    silent: !process.env.DEBUG,
    minify: !process.env.DEBUG
  }

  console.log('building client bundle...')
  const clientResult = await build(viteOptions)

  console.log('building server bundle...')
  isClientBuild = false
  const serverResult = await ssrBuild({
    ...viteOptions,
    outDir: config.tempDir
  })

  return [clientResult, serverResult]
}
