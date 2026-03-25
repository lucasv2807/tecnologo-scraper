const URL_ATTRIBUTE_REGEX_SOURCE = /<(?:[^>]+?)\s(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/
const DEFAULT_MAX_DEPTH = 3
const NON_HTML_ASSET_EXTENSIONS = new Set([
	'.css',
	'.bmp',
	'.js',
	'.mjs',
	'.png',
	'.jpg',
	'.jpeg',
	'.gif',
	'.svg',
	'.webp',
	'.ico',
	'.woff',
	'.woff2',
	'.ttf',
	'.map',
	'.pdf',
	'.zip',
])

function normalizeLink(rawLink: string, baseUrl: string): string | null {
	const href = rawLink.trim()

	if (!href) return null
	if (href.startsWith('#')) return null
	if (/^(javascript:|mailto:|tel:)/i.test(href)) return null

	try {
		const normalizedUrl = new URL(href, baseUrl)

		const extension = getPathExtension(normalizedUrl.pathname)
		if (extension && NON_HTML_ASSET_EXTENSIONS.has(extension)) {
			return null
		}

		return normalizedUrl.toString()
	} catch {
		return null
	}
}

function getPathExtension(pathname: string): string {
	const cleanPath = pathname.toLowerCase()
	const lastDot = cleanPath.lastIndexOf('.')
	const lastSlash = cleanPath.lastIndexOf('/')

	if (lastDot === -1 || lastDot < lastSlash) {
		return ''
	}

	return cleanPath.slice(lastDot)
}

function shouldCrawl(url: string): boolean {
	let parsed: URL
	try {
		parsed = new URL(url)
	} catch {
		return false
	}

	if (!['http:', 'https:'].includes(parsed.protocol)) {
		return false
	}

	const extension = getPathExtension(parsed.pathname)
	if (!extension) {
		return true
	}

	return !NON_HTML_ASSET_EXTENSIONS.has(extension)
}

function isSameHostname(url: string, expectedHostname: string): boolean {
	try {
		return new URL(url).hostname === expectedHostname
	} catch {
		return false
	}
}

function extractLinksFromHtml(html: string, baseUrl: string): string[] {
	const links = new Set<string>()
	const urlAttributeRegex = new RegExp(URL_ATTRIBUTE_REGEX_SOURCE.source, 'gi')
	let match: RegExpExecArray | null

	while ((match = urlAttributeRegex.exec(html)) !== null) {
		const href = (match[1] ?? match[2] ?? match[3] ?? '').trim()
		const normalized = normalizeLink(href, baseUrl)

		if (normalized) {
			links.add(normalized)
		}
	}

	return Array.from(links)
}

export async function extractPageLinks(url: string): Promise<string[]> {
	return extractPageLinksRecursive(url, DEFAULT_MAX_DEPTH)
}

async function extractPageLinksRecursive(startUrl: string, maxDepth: number): Promise<string[]> {
	let startHostname: string
	try {
		startHostname = new URL(startUrl).hostname
	} catch {
		throw new Error('Invalid start URL')
	}

	const discoveredLinks = new Set<string>()
	const crawledPages = new Set<string>()
	let currentLevelUrls = [startUrl]

	for (let depth = 0; depth <= maxDepth; depth += 1) {
		const nextLevelUrls = new Set<string>()

		for (const pageUrl of currentLevelUrls) {
			if (crawledPages.has(pageUrl)) {
				continue
			}

			crawledPages.add(pageUrl)

			let response: Response
			try {
				response = await fetch(pageUrl)
			} catch {
				continue
			}

			if (!response.ok) {
				continue
			}

			const contentType = response.headers.get('content-type') ?? ''
			if (!contentType.toLowerCase().includes('text/html')) {
				continue
			}

			const html = await response.text()
			const pageLinks = extractLinksFromHtml(html, pageUrl)

			for (const link of pageLinks) {
				if (!isSameHostname(link, startHostname)) {
					continue
				}

				discoveredLinks.add(link)

				if (depth < maxDepth && shouldCrawl(link) && !crawledPages.has(link)) {
					nextLevelUrls.add(link)
				}
			}
		}

		currentLevelUrls = Array.from(nextLevelUrls)
	}

	return Array.from(discoveredLinks)
}