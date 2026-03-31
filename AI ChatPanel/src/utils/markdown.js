const SAFE_SCHEMES = ['https://', 'http://', 'mailto:', 'tel:']

export function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#'
  const trimmed = url.trim()
  const lower = trimmed.toLowerCase()
  for (const scheme of SAFE_SCHEMES) {
    if (lower.startsWith(scheme)) return trimmed
  }
  if (trimmed.startsWith('/') || trimmed.startsWith('.')) return trimmed
  return '#'
}

export function renderMarkdown(text) {
  if (!text) return ''

  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '')
  cleaned = cleaned.replace(/<\/?think>/gi, '').trim()

  let html = escapeHtml(cleaned)

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, _lang, code) => {
    return `<pre class="sc-code-block"><code>${code.trim()}</code></pre>`
  })
  html = html.replace(/`([^`]+)`/g, '<code class="sc-inline-code">$1</code>')
  html = html.replace(/^(#{1,6})\s+(.+)$/gm, (_, _h, heading) => `<strong>${heading}</strong>`)
  html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li class="ul-item">$1</li>')
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="ol-item">$1</li>')
  html = html.replace(/((?:<li class="(?:ul|ol)-item">.*?<\/li>(?:\n+)?)+)/g, (match) => {
    const compacted = match.replace(/<\/li>\n+<li/g, '</li><li').replace(/<\/li>\n+$/, '</li>')
    const isOrdered = compacted.includes('class="ol-item"')
    const tag = isOrdered ? 'ol' : 'ul'
    const c = compacted.replace(/ class="(?:ul|ol)-item"/g, '')
    return `<${tag} class="sc-list">${c}</${tag}>`
  })
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const safeUrl = sanitizeUrl(url)
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`
  })
  html = html.replace(/\n{3,}/g, '\n\n')
  html = html.replace(/\n\n/g, '</p><p>')
  html = html.replace(/\n/g, '<br>')
  html = `<p>${html}</p>`
  html = html.replace(/<p>\s*<\/p>/g, '')

  return html
}
