import { createApp as createClientApp, createSSRApp, ref, readonly } from 'vue'
import { createRouter, RouterSymbol } from './router'
import { useUpdateHead } from './composables/head'
import { pageDataSymbol } from './composables/pageData'
import { Content } from './components/Content'
import Debug from './components/Debug.vue'
import Theme from '/@theme/index'
import { inBrowser, pathToFile } from './utils'
import { useSiteDataByRoute } from './composables/siteDataByRoute'
import { siteDataRef } from './composables/siteData'

const NotFound = Theme.NotFound || (() => '404 Not Found')

export function createApp() {
  // unlike site data which is static across all requests, page data is
  // distinct per-request.
  const pageDataRef = ref()

  if (import.meta.hot) {
    // hot reload pageData
    import.meta.hot!.on('vitepress:pageData', (data) => {
      if (
        data.path.replace(/(\bindex)?\.md$/, '') ===
        location.pathname.replace(/(\bindex)?\.html$/, '')
      ) {
        pageDataRef.value = data.pageData
      }
    })
  }

  let isInitialPageLoad = inBrowser
  let initialPath: string

  const router = createRouter((route) => {
    let pagePath = pathToFile(route.path)

    if (isInitialPageLoad) {
      initialPath = pagePath
    }

    // use lean build if this is the initial page load or navigating back
    // to the initial loaded path (the static vnodes already adopted the
    // static content on that load so no need to re-fetch the page)
    if (isInitialPageLoad || initialPath === pagePath) {
      pagePath = pagePath.replace(/\.js$/, '.lean.js')
    }

    if (inBrowser) {
      isInitialPageLoad = false
      // in browser: native dynamic import
      return import(pagePath).then((page) => {
        if (page.__pageData) {
          pageDataRef.value = readonly(JSON.parse(page.__pageData))
        }
        return page.default
      })
    } else {
      // SSR, sync require
      const page = require(pagePath)
      pageDataRef.value = JSON.parse(page.__pageData)
      return page.default
    }
  }, NotFound)

  const app =
    process.env.NODE_ENV === 'production'
      ? createSSRApp(Theme.Layout)
      : createClientApp(Theme.Layout)

  app.provide(RouterSymbol, router)
  app.provide(pageDataSymbol, pageDataRef)

  app.component('Content', Content)
  app.component(
    'Debug',
    process.env.NODE_ENV === 'production' ? () => null : Debug
  )

  const siteDataByRouteRef = useSiteDataByRoute(router.route)

  if (inBrowser) {
    // dynamically update head tags
    useUpdateHead(pageDataRef, siteDataByRouteRef)
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
        return pageDataRef.value
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
