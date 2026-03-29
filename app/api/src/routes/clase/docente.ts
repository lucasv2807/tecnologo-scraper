import { Context } from 'hono'
import { JSDOM } from 'jsdom'

export async function docente(c: Context) {
	const materia = c.req.param('materia')
	const res = await fetch(`https://www.fing.edu.uy/tecnoinf/mvd/cursos/${materia}/docentes.htm`)
	const html = await res.text()
	const doc = new JSDOM(html).window.document
	const uls = doc.querySelectorAll('body > ul')
	const docentes = Array.from(uls)
		.flatMap(ul => Array.from(ul?.querySelectorAll('li') || [])
			.map(li => li.textContent?.trim() || ''))

	return c.json(docentes)
}