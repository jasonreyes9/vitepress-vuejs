// Modified from https://github.com/egoist/markdown-it-highlight-lines
import MarkdownIt from 'markdown-it'

const wrapperRE = /^<pre .*?><code>/

export const highlightLinePlugin = (md: MarkdownIt) => {
  const fence = md.renderer.rules.fence!
  md.renderer.rules.fence = (...args) => {
    const [tokens, idx, options] = args
    const token = tokens[idx]

    // due to use of markdown-it-attrs, the {0} syntax would have been converted
    // to attrs on the token
    const attr = token.attrs && token.attrs[0]
    if (!attr) {
      return fence(...args)
    }

    const lines = attr[0]
    if (!lines || !/[\d,-]+/.test(lines)) {
      return fence(...args)
    }

    const lineNumbers = lines
      .split(',')
      .map((v) => v.split('-').map((v) => parseInt(v, 10)))

    const code = options.highlight
      ? options.highlight(token.content, token.info, '')
      : token.content

    const rawCode = code.replace(wrapperRE, '')
    const highlightLinesCode = rawCode
      .split('\n')
      .map((split, index) => {
        const lineNumber = index + 1
        const inRange = lineNumbers.some(([start, end]) => {
          if (start && end) {
            return lineNumber >= start && lineNumber <= end
          }
          return lineNumber === start
        })
        if (inRange) {
          return `<div class="highlighted">&nbsp;</div>`
        }
        return '<br>'
      })
      .join('')

    const highlightLinesWrapperCode = `<div class="highlight-lines">${highlightLinesCode}</div>`

    return highlightLinesWrapperCode + code
  }
}
