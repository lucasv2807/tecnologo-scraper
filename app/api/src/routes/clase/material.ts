import { Context } from 'hono'
import { JSDOM } from 'jsdom'

interface ListItem {
	title?: string
	link?: string
	items?: ListItem[]
}

function parseListElement(element: Element): ListItem[] {
	const result: ListItem[] = []
	const childrenArray = Array.from(element.children)
	let i = 0

	while (i < childrenArray.length) {
		const child = childrenArray[i]

		if (child.tagName === 'LI') {
			const li: ListItem = {}
			let hasContent = false

			// Look for anchor tag first
			const anchor = (child as Element).querySelector('a')
			if (anchor) {
				const href = anchor.getAttribute('href')
				const text = anchor.textContent?.trim()
				if (href) {
					li.link = href
					hasContent = true
				}
				if (text) {
					li.title = text
					hasContent = true
				}
			} else {
				// If no anchor, get text content (excluding nested lists)
				const text = extractTextContent(child)
				if (text) {
					li.title = text
					hasContent = true
				}
			}

			// Look for nested UL directly after this LI (as sibling)
			let nextIndex = i + 1
			const nestedItems: ListItem[] = []

			while (nextIndex < childrenArray.length) {
				const nextChild = childrenArray[nextIndex]
				if (nextChild.tagName === 'UL') {
					nestedItems.push(...parseListElement(nextChild as Element))
					nextIndex++
				} else if (nextChild.tagName === 'LI') {
					break
				} else {
					nextIndex++
				}
			}

			// Update i to skip the UL elements we already processed
			i = nextIndex

			if (nestedItems.length > 0) {
				li.items = nestedItems
				hasContent = true
			}

			if (hasContent) {
				result.push(li)
			}
		} else {
			i++
		}
	}

	return result
}

function extractTextContent(element: Element): string {
	let text = ''
	
	for (const node of Array.from(element.childNodes)) {
		if (node.nodeType === 3) {
			// Text node
			const nodeText = (node.textContent || '').trim()
			if (nodeText) {
				text += nodeText
			}
		} else if ((node as Element).tagName !== 'UL' && (node as Element).tagName !== 'A') {
			// Recurse into non-list, non-anchor elements (like span, p, etc.)
			const childText = extractTextContent(node as Element)
			if (childText) {
				text += childText
			}
		} else if ((node as Element).tagName === 'A') {
			// For anchors, just extract text if we haven't found one already
			if (!text) {
				text = (node as Element).textContent?.trim() || ''
			}
		}
	}
	
	return text.trim()
}

export async function material(c: Context) {
	const materia = c.req.param('materia')
	const res = await fetch(`https://www.fing.edu.uy/tecnoinf/mvd/cursos/${materia}/material.htm`)
	const html = await res.text()
	const doc = new JSDOM(html).window.document
	const body = doc.querySelector('body')
	const uls = doc.querySelectorAll('body > ul')
    
	if (!body) {
		return c.json({ error: 'No se pudo obtener el material' }, 500)
	}

	const items: ListItem[] = []
	for (const ul of Array.from(uls)) {
		items.push(...parseListElement(ul))
	}

	return c.json({ items })
}