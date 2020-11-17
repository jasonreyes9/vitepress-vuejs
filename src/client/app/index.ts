import { createApp as createClientApp, createSSRApp } from 'vue'
import { inBrowser, pathToFile } from './utils'
import { createRouter, RouterSymbol } from './router'
import { siteDataRef } from './composables/siteData'
import { useSiteDataByRoute } from './composables/siteDataByRoute'
import { useUpdateHead } from './composables/head'
import { Content } from './components/Content'
import Debug from './components/Debug.vue'
import Theme from '/@theme/index'

const NotFound = Theme.NotFound || (() => '404 Not Found')

export function createApp() {
  let isInitialPageLoad = inBrowser
  let initialPath: string

  const router = createRouter((path) => {
    let pageFilePath = pathToFile(path)

    if (isInitialPageLoad) {
      initialPath = pageFilePath
    }

    // use lean build if this is the initial page load or navigating back
    // to the initial loaded path (the static vnodes already adopted the
    // static content on that load so no need to re-fetch the page).
    if (isInitialPageLoad || initialPath === pageFilePath) {
      pageFilePath = pageFilePath.replace(/\.js$/, '.lean.js')
    }

    if (inBrowser) {
      isInitialPageLoad = false
      // in browser: native dynamic import
      return import(/*@vite-ignore*/ pageFilePath)
    } else {
      // SSR, sync require
      return require(pageFilePath)
    }
  }, NotFound)

  // update route.data on HMR updates of active page
  if (import.meta.hot) {
    // hot reload pageData
    import.meta.hot!.on('vitepress:pageData', (payload) => {
      if (
        payload.path.replace(/(\bindex)?\.md$/, '') ===
        location.pathname.replace(/(\bindex)?\.html$/, '')
      ) {
        router.route.data = payload.pageData
      }
    })
  }

  const app =
    process.env.NODE_ENV === 'production'
      ? createSSRApp(Theme.Layout)
      : createClientApp(Theme.Layout)

  app.provide(RouterSymbol, router)

  app.component('Content', Content)
  app.component(
    'Debug',
    process.env.NODE_ENV === 'production' ? () => null : Debug
  )

  const siteDataByRouteRef = useSiteDataByRoute(router.route)

  if (inBrowser) {
    // dynamically update head tags
    useUpdateHead(router.route, siteDataByRouteRef)
  }

  Object.defineProperties(app.config.globalProperties, {
    $site: {
      get() {
        return siteDataRef.value
      }
    },
    $siteByRoute: {
      get() {
        return siteDataByRouteRef.value
      }
    },
    $page: {
      get() {
        return router.route.data
      }
    },
    $theme: {
      get() {
        return siteDataByRouteRef.value.themeConfig
      }
    }
  })

  if (Theme.enhanceApp) {
    Theme.enhanceApp({
      app,
      router,
      siteData: siteDataByRouteRef
    })
  }

  return { app, router }
}

if (inBrowser) {
  const { app, router } = createApp()
  // wait unitl page component is fetched before mounting
  router.go().then(() => {
    app.mount('#app')
  })
}
