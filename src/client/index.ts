// exports in this file are exposed to themes and md files via 'vitepress'
// so the user can do `import { useRoute, useSiteData } from 'vitepress'`

// generic types
export type { Router, Route } from './app/router'
export type { VitePressData } from './app/data'
// theme types
export type { Theme, EnhanceAppContext } from './app/theme'
// shared types
export type {
  PageData,
  SiteData,
  HeadConfig,
  Header,
  LocaleConfig
} from '../../types/shared'

// composables
export { useData } from './app/data'
export { useRouter, useRoute } from './app/router'

// utilities
export { inBrowser, withBase } from './app/utils'

// components
export { Content } from './app/components/Content'

import _Debug from './app/components/Debug.vue'
export const Debug = _Debug as import('vue').ComponentOptions
