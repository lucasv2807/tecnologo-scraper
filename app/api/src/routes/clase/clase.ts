import { Context } from 'hono'
import { JSDOM } from 'jsdom'

type LinkItem = {
	text: string
	href: string
}

type ListItem = {
	text: string
	items?: ListItem[]
}

type TableField = {
	label: string
	key: string
	text: string
	paragraphs: string[]
	lists: ListItem[]
	links: LinkItem[]
	html: string
}

type ContentBlock =
	| { type: 'heading'; level: number; text: string }
	| { type: 'paragraph'; text: string }
	| { type: 'list'; items: ListItem[] }

function normalizeInlineWhitespace(value: string): string {
	return value
		.replace(/\u00a0/g, ' ')
		.replace(/[ \t]+/g, ' ')
		.trim()
}

function normalizeMultiline(value: string): string {
	return value
		.replace(/\u00a0/g, ' ')
		.replace(/\r/g, '\n')
		.split('\n')
		.map((line) => normalizeInlineWhitespace(line))
		.filter(Boolean)
		.join('\n')
}

function extractText(node: Element): string {
	const clone = node.cloneNode(true) as Element
	clone.querySelectorAll('br').forEach((br) => {
		br.replaceWith('\n')
	})

	return normalizeMultiline(clone.textContent || '')
}

function slugifyLabel(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
}

function parseList(list: Element): ListItem[] {
	const items = Array.from(list.children).filter((child) => child.tagName.toLowerCase() === 'li')

	return items.map((li) => {
		const nestedLists = Array.from(li.children).filter((child) => {
			const tag = child.tagName.toLowerCase()
			return tag === 'ul' || tag === 'ol'
		})

		const clone = li.cloneNode(true) as Element
		clone.querySelectorAll('ul, ol').forEach((nested) => nested.remove())

		const text = extractText(clone)
		const children = nestedLists.flatMap(parseList)

		return {
			text,
			...(children.length > 0 ? { items: children } : {})
		}
	})
}

function extractLinks(node: Element): LinkItem[] {
	return Array.from(node.querySelectorAll('a'))
		.map((anchor) => {
			const text = normalizeInlineWhitespace(anchor.textContent || '')
			const href = normalizeInlineWhitespace(anchor.getAttribute('href') || '')
			if (!text && !href) return null
			return { text, href }
		})
		.filter((link): link is LinkItem => link !== null)
}

function parseTableFields(doc: Document): TableField[] {
	const rows = Array.from(doc.querySelectorAll('table tr'))
	const parsedRows = rows
		.map((row) => {
			const cells = row.querySelectorAll('td')
			if (cells.length < 2) return null

			const label = extractText(cells[0])
			if (!label) return null

			const valueCell = cells[1]
			const paragraphs = Array.from(valueCell.querySelectorAll('p'))
				.map((p) => extractText(p))
				.filter(Boolean)

			const lists = Array.from(valueCell.querySelectorAll('ul, ol')).flatMap(parseList)
			const text = extractText(valueCell)
			const key = slugifyLabel(label)
			const links = extractLinks(valueCell)

			return {
				label,
				key,
				text,
				paragraphs,
				lists,
				links,
				html: valueCell.innerHTML.trim()
			}
		})
		.filter((field): field is TableField => field !== null)

	const seen = new Set<string>()
	const unique: TableField[] = []

	for (const field of parsedRows) {
		const dedupeKey = `${field.key}|${field.text}`
		if (seen.has(dedupeKey)) continue
		seen.add(dedupeKey)
		unique.push(field)
	}

	return unique
}

function parseBlocksAfterTable(doc: Document): ContentBlock[] {
	const blocks: ContentBlock[] = []
	const body = doc.querySelector('body')
	if (!body) return blocks

	const firstTable = body.querySelector('table')
	let startCollecting = !firstTable

	for (const child of Array.from(body.children)) {
		if (!startCollecting) {
			if (child === firstTable) {
				startCollecting = true
			}
			continue
		}

		if (child.tagName.toLowerCase() === 'table') continue

		const tag = child.tagName.toLowerCase()
		if (/^h[1-6]$/.test(tag)) {
			const text = extractText(child)
			if (!text) continue
			blocks.push({
				type: 'heading',
				level: Number(tag.substring(1)),
				text
			})
			continue
		}

		if (tag === 'p') {
			const text = extractText(child)
			if (!text) continue
			blocks.push({ type: 'paragraph', text })
			continue
		}

		if (tag === 'ul' || tag === 'ol') {
			const items = parseList(child)
			if (items.length === 0) continue
			blocks.push({ type: 'list', items })
		}
	}

	return blocks
}

async function resolveContentDocument(initialHtml: string, baseUrl: string): Promise<{
	doc: Document
	contentUrl: string
}> {
	const initialDoc = new JSDOM(initialHtml).window.document
	const frameElements = Array.from(initialDoc.querySelectorAll('frame'))

	if (frameElements.length < 2) {
		return { doc: initialDoc, contentUrl: baseUrl }
	}

	const secondFrameSrc = normalizeInlineWhitespace(frameElements[1].getAttribute('src') || '')
	if (!secondFrameSrc) {
		return { doc: initialDoc, contentUrl: baseUrl }
	}

	const contentUrl = new URL(secondFrameSrc, baseUrl).toString()
	const contentRes = await fetch(contentUrl)

	if (!contentRes.ok) {
		throw new Error(`No se pudo obtener el frame de contenido: ${contentRes.status} (${contentUrl})`)
	}

	const contentHtml = await contentRes.text()
	const doc = new JSDOM(contentHtml).window.document

	return { doc, contentUrl }
}

function buildSourceCandidates(materia: string, rawPagina: string): string[] {
	const pagina = normalizeInlineWhitespace(rawPagina).replace(/^\/+|\/+$/g, '')
	if (!pagina) return []

	const base = `https://www.fing.edu.uy/tecnoinf/mvd/cursos/${materia}`
	const paginaPathname = new URL(pagina, `${base}/`).pathname
	const hasKnownExtension = /\.html?$/i.test(paginaPathname)
	const hasAnyExtension = /\.[a-z0-9]+$/i.test(paginaPathname)

	if (hasKnownExtension) {
		return [`${base}/${pagina}`]
	}

	if (hasAnyExtension) {
		return [`${base}/${pagina}`]
	}

	return [
		`${base}/${pagina}.htm`,
		`${base}/${pagina}.html`
	]
}

async function fetchFirstAvailableSource(sourceCandidates: string[]): Promise<{
	sourceUrl: string
	html: string
}> {
	let lastStatus = 0

	for (const sourceUrl of sourceCandidates) {
		const res = await fetch(sourceUrl)
		if (!res.ok) {
			lastStatus = res.status
			continue
		}

		const html = await res.text()
		return { sourceUrl, html }
	}

	throw new Error(String(lastStatus || 404))
}

export async function clase(c: Context) {
	const materia = c.req.param('materia') || ''
	const index = c.req.param('pagina') || ''

	if (!materia) {
		return c.json({
			error: 'Parametro de materia invalido',
			status: 400
		}, 400)
	}

	const sourceCandidates = buildSourceCandidates(materia, index)
	if (sourceCandidates.length === 0) {
		return c.json({
			error: 'Parametro de pagina invalido',
			status: 400
		}, 400)
	}

	let sourceUrl: string
	let html: string

	try {
		const source = await fetchFirstAvailableSource(sourceCandidates)
		sourceUrl = source.sourceUrl
		html = source.html
	} catch (error) {
		const statusFromError = Number(error instanceof Error ? error.message : 0)
		const status = Number.isFinite(statusFromError) && statusFromError > 0 ? statusFromError : 404

		return c.json({
			error: 'No se pudo obtener la pagina solicitada',
			status,
			sourceUrl: sourceCandidates[0],
			sourceCandidates
		}, 502)
	}

	let doc: Document
	let contentUrl: string

	try {
		const resolved = await resolveContentDocument(html, sourceUrl)
		doc = resolved.doc
		contentUrl = resolved.contentUrl
	} catch (error) {
		return c.json({
			error: error instanceof Error ? error.message : 'No se pudo resolver el frame de contenido',
			status: 502,
			sourceUrl
		}, 502)
	}

	const title = extractText(doc.querySelector('h1') || doc.querySelector('title') || doc.body)
	const fields = parseTableFields(doc)
	const fieldsByKey = Object.fromEntries(fields.map((field) => [field.key, field]))
	const blocks = parseBlocksAfterTable(doc)

	return c.json({
		materia,
		pagina: index,
		sourceUrl,
		contentUrl,
		title,
		fields,
		fieldsByKey,
		blocks
	})
}