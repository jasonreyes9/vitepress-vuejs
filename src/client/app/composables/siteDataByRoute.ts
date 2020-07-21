import { computed } from 'vue'
import { resolveSiteDataByRoute } from '/@shared/config'
import { siteDataRef } from './siteData'
import { useRoute } from '../router'

export function useSiteDataByRoute(route = useRoute()) {
  return computed(() => {
    return resolveSiteDataByRoute(siteDataRef.value, route.path)
  })
}
