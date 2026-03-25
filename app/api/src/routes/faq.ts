import { Context } from 'hono'
import { JSDOM } from 'jsdom'

interface FaqItem {
	question: string
	answer: string
}

interface FaqSection {
	topic: string
	items: FaqItem[]
}

const normalizeText = (value: string | null | undefined): string => {
	return (value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

const cleanQuestion = (text: string): string => {
	return normalizeText(text).replace(/^P\s*:?\s*/i, '')
}

const cleanAnswer = (text: string): string => {
	return normalizeText(text).replace(/^R\s*:?\s*/i, '')
}

export async function faq(c: Context) {
	const url = 'https://www.fing.edu.uy/tecnoinf/mvd/faq.htm'
	const res = await fetch(url)
	const html = await res.text()
	const body = new JSDOM(html).window.document.body
	const sections: FaqSection[] = []
	let currentSection: FaqSection | null = null

	Array.from(body.children).forEach((node) => {
		const tag = node.tagName.toLowerCase()

		if (tag === 'span') {
			const topic = normalizeText(node.textContent)
			if (!topic) {
				return
			}

			currentSection = { topic, items: [] }
			sections.push(currentSection)
			return
		}

		if (tag === 'ul' && currentSection) {
			const lis = Array.from(node.querySelectorAll(':scope > li'))
			if (lis.length < 2) {
				return
			}

			const question = cleanQuestion(lis[0].textContent)
			const answer = cleanAnswer(lis.slice(1).map((li) => li.textContent ?? '').join(' '))

			if (!question || !answer) {
				return
			}

			currentSection.items.push({ question, answer })
		}
	})

	const data = sections.filter((section) => section.items.length > 0)

	return c.json(data)
}