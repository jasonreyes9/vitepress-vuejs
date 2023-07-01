# Last Updated

The update time of the last content will be displayed in the lower right corner of the page. To enable it, add `lastUpdated` options to your config.

## Site-Level Config

```js
export default {
  lastUpdated: true
}
```

## Frontmatter Config

This can be disabled per-page using the `lastUpdated` option on frontmatter:

```yaml
---
lastUpdated: false
---
```

Also refer [Default Theme: Last Updated](./default-theme-last-updated#last-updated) for more details. Any truthy value at theme-level will also enable the feature unless explicitly disabled at site or page level.
