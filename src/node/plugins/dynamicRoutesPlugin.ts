import { loadConfigFromFile, type Plugin, type ViteDevServer } from 'vite'
import fs from 'fs-extra'
import c from 'picocolors'
import path from 'path'

export const dynamicRouteRE = /\[(\.\.\.)?\w+\]/

interface UserRouteConfig {
  params: Record<string, string>
  content?: string
}

interface RouteModule {
  path: string
  config: {
    paths:
      | UserRouteConfig[]
      | (() => UserRouteConfig[] | Promise<UserRouteConfig[]>)
  }
  dependencies: string[]
}

type ResolvedRouteConfig = UserRouteConfig & {
  /**
   * the raw route, e.g. foo/[bar].md
   */
  route: string
  /**
   * the actual path with params resolved, e.g. foo/1.md
   */
  path: string
}

export const dynamicRoutesPlugin = async (
  initialRoutes: string[]
): Promise<Plugin> => {
  let server: ViteDevServer
  let [resolvedRoutes, routeFileToModulesMap] = await resolveRoutes(
    initialRoutes
  )

  return {
    name: 'vitepress:dynamic-routes',

    configureServer(_server) {
      server = _server
    },

    load(id) {
      const matched = resolvedRoutes.find((r) => r.path === id)
      if (matched) {
        const { route, params, content } = matched
        const routeFile = path.resolve(route)
        routeFileToModulesMap[routeFile].push(id)

        let baseContent = fs.readFileSync(routeFile, 'utf-8')

        // inject raw content
        // this is intended for integration with CMS
        // we use a speical injection syntax so the content is rendered as
        // static local content instead of included as runtime data.
        if (content) {
          baseContent = baseContent.replace(/<!--\s*@content\s*-->/, content)
        }

        // params are injected with special markers and extracted as part of
        // __pageData in ../markdownTovue.ts
        return `__VP_PARAMS_START${JSON.stringify(
          params
        )}__VP_PARAMS_END__${baseContent}`
      }
    },

    async handleHotUpdate(ctx) {
      const mods = routeFileToModulesMap[ctx.file]
      if (mods) {
        // path loader module updated, reset loaded routes
        // TODO: make this more efficient by only reloading the invalidated route
        // TODO: invlidate modules for paths that are no longer present
        if (/\.paths\.[jt]s$/.test(ctx.file)) {
          ;[resolvedRoutes, routeFileToModulesMap] = await resolveRoutes(
            initialRoutes
          )
        }
        for (const id of mods) {
          ctx.modules.push(server.moduleGraph.getModuleById(id)!)
        }
      }
    }
  }
}

async function resolveRoutes(routes: string[]) {
  const pendingResolveRoutes: Promise<ResolvedRouteConfig[]>[] = []
  const routeFileToModulesMap: Record<string, string[]> = {}

  for (const route of routes) {
    // locate corresponding route paths file
    const jsPathsFile = route.replace(/\.md$/, '.paths.js')
    let pathsFile = jsPathsFile
    if (!fs.existsSync(jsPathsFile)) {
      pathsFile = route.replace(/\.md$/, '.paths.ts')
      if (!fs.existsSync(pathsFile)) {
        console.warn(
          c.yellow(
            `missing paths file for dynamic route ${route}: ` +
              `a corresponding ${jsPathsFile} or ${pathsFile} is needed.`
          )
        )
        continue
      }
    }

    // load the paths loader module
    let mod: RouteModule
    try {
      mod = (await loadConfigFromFile(
        {} as any,
        path.resolve(pathsFile)
      )) as RouteModule
    } catch (e) {
      console.warn(`invalid paths file export in ${pathsFile}.`)
      continue
    }

    if (mod) {
      // route md file and route paths loader file point to the same array
      routeFileToModulesMap[mod.path] = routeFileToModulesMap[
        path.resolve(route)
      ] = []

      const resolveRoute = async (): Promise<ResolvedRouteConfig[]> => {
        const loader = mod.config.paths
        const paths = await (typeof loader === 'function' ? loader() : loader)
        return paths.map((userConfig) => {
          return {
            path:
              '/' +
              route.replace(/\[(\w+)\]/g, (_, key) => userConfig.params[key]),
            route,
            ...userConfig
          }
        })
      }
      pendingResolveRoutes.push(resolveRoute())
    }
  }

  return [
    (await Promise.all(pendingResolveRoutes)).flat(),
    routeFileToModulesMap
  ] as const
}
