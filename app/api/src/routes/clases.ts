import { Context } from 'hono'
import { JSDOM } from 'jsdom'

export async function clases(c: Context) {
	const sourceUrl = 'https://www.fing.edu.uy/tecnoinf/mvd/cursos/cursos.htm'
	const cursosRootPath = '/tecnoinf/mvd/cursos/'

	const res = await fetch(sourceUrl)
	const html = await res.text()
	const doc = new JSDOM(html).window.document

	interface CursoItem {
		text: string
		link: string
	}

	interface CursoPorSemestre {
		year: string
		items: CursoItem[]
	}

	const limpiarTexto = (s: string) => {
		return s
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/\r?\n|\r/g, ' ')
			.replace(/[^A-Za-z0-9\s+/().-]/g, '')
			.replace(/\s+/g, ' ')
			.trim()
	}

	const normalizarLinkCurso = (rawHref: string) => {
		const href = rawHref.trim()
		if (!href) return ''

		try {
			const parsed = new URL(href)
			const isSameSite = parsed.hostname.toLowerCase() === 'www.fing.edu.uy'

			if (isSameSite && parsed.pathname.startsWith(cursosRootPath)) {
				const relativePath = parsed.pathname.slice(cursosRootPath.length)
				return `${relativePath}${parsed.search}${parsed.hash}`
			}
		} catch {
			// Href relativo u otro formato no parseable como URL absoluta.
		}

		return href
	}

	const semesterHeaders = Array.from(doc.querySelectorAll('h2')).filter((h2) =>
		/semestre/i.test(h2.textContent ?? ''),
	)
	const orderedNodes = Array.from(doc.querySelectorAll('body *'))
	const nodeOrder = new Map<Element, number>()
	orderedNodes.forEach((node, index) => {
		nodeOrder.set(node, index)
	})
	const anchors = Array.from(doc.querySelectorAll('a'))

	const dataByYear = new Map<string, CursoItem[]>()

	semesterHeaders.forEach((header, headerIndex) => {
		const year = limpiarTexto(header.textContent ?? '')
		if (!year) return

		const startOrder = nodeOrder.get(header)
		if (startOrder === undefined) return

		const nextHeader = semesterHeaders[headerIndex + 1]
		const endOrder = nextHeader ? nodeOrder.get(nextHeader) : undefined

		// El HTML de origen tiene estructura inconsistente. En vez de depender de
		// hermanos directos, tomamos todos los links entre este encabezado y el
		// siguiente encabezado de semestre.
		const items = anchors
			.filter((anchor) => {
				const anchorOrder = nodeOrder.get(anchor)
				if (anchorOrder === undefined) return false
				if (anchorOrder <= startOrder) return false
				if (endOrder !== undefined && anchorOrder >= endOrder) return false
				if (!anchor.closest('li')) return false
				return true
			})
			.map((anchor): CursoItem | null => {
				const text = limpiarTexto(anchor.textContent ?? '')
				const rawHref = anchor.getAttribute('href') ?? ''

				if (!text) return null
				const link = normalizarLinkCurso(rawHref)

				return {
					text,
					link: link
				}
			})
			.filter((item): item is CursoItem => item !== null)

		if (items.length === 0) return

		const currentItems = dataByYear.get(year) ?? []
		const seen = new Set(currentItems.map((item) => `${item.text}|${item.link}`))

		items.forEach((item) => {
			const key = `${item.text}|${item.link}`
			if (seen.has(key)) return
			seen.add(key)
			currentItems.push(item)
		})

		dataByYear.set(year, currentItems)
	})

	const data: CursoPorSemestre[] = Array.from(dataByYear.entries()).map(
		([year, items]) => ({ year, items }),
	)

	return c.json(data)
}