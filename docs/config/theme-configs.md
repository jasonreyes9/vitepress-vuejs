# Theme Configs

Theme configs let you customize your theme. You can define theme configs by adding `themeConfig` key to the config file.

```ts
export default {
  lang: 'en-US',
  title: 'VitePress',
  description: 'Vite & Vue powered static site generator.',

  // Theme related configurations.
  themeConfig: {
    logo: '/logo.svg',
    nav: [...],
    sidebar: { ... }
  }
}
```

Here it describes the settings for the VitePress default theme. If you're using a custom theme created by others, these settings may not have any effect, or might behave differently.

## logo

- Type: `string`

Logo file to display in nav bar, right before the site title.

```ts
export default {
  themeConfig: {
    logo: '/logo.svg'
  }
}
```

## siteTitle

- Type: `string | false`

You can customize this item to replace the default site title (`title` in app config) in nav. When set to `false`, title in nav will be disabled. Useful when you have `logo` that already contains the site title text.

```ts
export default {
  themeConfig: {
    siteTitle: 'Hello World'
  }
}
```

## nav

- Type: `NavItem`

The configuration for the nav menu item. You may learn more details at [Theme: Nav](../guide/theme-nav#navigation-links).

```js
export default {
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide' },
      {
        text: 'Dropdown Menu',
        items: [
          { text: 'Item A', link: '/item-1' },
          { text: 'Item B', link: '/item-2' },
          { text: 'Item C', link: '/item-3' }
        ]
      }
    ]
  }
}
```

```ts
type NavItem = NavItemWithLink | NavItemWithChildren

type NavItemWithLink = {
  text: string
  link: string
  activeMatch?: string
}

interface NavItemWithChildren {
  text?: string
  items: NavItemWithLink[]
}
```

## sidebar

- Type: `Sidebar`

The configuration for the sidebar menu item. You may learn more details at [Theme: Nav](../guide/theme-sidebar).

```js
export default {
  themeConfig: {
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/introduction' },
          { text: 'Getting Started', link: '/getting-started' },
          ...
        ]
      }
    ]
  }
}
```

```ts
type Sidebar = SidebarGroup[] | SidebarMulti

interface SidebarMulti {
  [path: string]: SidebarGroup[]
}

interface SidebarGroup {
  text: string
  items: SidebarItem[]
  collapsible?: boolean
  collapsed?: boolean
}

interface SidebarItem {
  text: string
  link: string
}
```

## socialLinks

- Type: `SocialLink`

You may define this option to show your social account links with icons in nav.

```js
export default {
  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' },
      { icon: 'twitter', link: '...' },
      { icon: 'discord', link: '...' }
    ]
  }
}
```

```ts
interface SocialLink {
  icon: SocialLinkIcon
  link: string
}

type SocialLinkIcon =
  | 'discord'
  | 'facebook'
  | 'github'
  | 'instagram'
  | 'linkedin'
  | 'slack'
  | 'twitter'
  | 'youtube'
```

## footer

- Type: `Footer`

Footer configuration. You can add a message and copyright. The footer will displayed only when the page doesn't contain sidebar due to design reason.

```ts
export default {
  themeConfig: {
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2019-present Evan You'
    }
  }
}
```

```ts
export interface Footer {
  message?: string
  copyright?: string
}
```

## lastUpdatedText

- Type: `string`
- Default: `Last updated`

The prefix text showing right before the last updated time.

```ts
export default {
  themeConfig: {
    lastUpdatedText: 'Updated Date'
  }
}
```

## carbonAds

- Type: `CarbonAds`

A option to display [Carbon Ads](https://www.carbonads.net/).

```ts
export default {
  themeConfig: {
    carbonAds: {
      code: 'your-carbon-code',
      placement: 'your-carbon-placement'
    }
  }
}
```

```ts
export interface CarbonAds {
  code: string,
  placement: string
}
```

Learn more in [Theme: Carbon Ads](../guide/theme-carbon-ads)
