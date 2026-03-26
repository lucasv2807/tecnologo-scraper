import { Context } from 'hono'
import { JSDOM } from 'jsdom'

export async function revalidas(c: Context){
	const url = 'https://www.fing.edu.uy/tecnoinf/mvd/revalidas.htm'
	const res = await fetch(url)
	const html = await res.text()
	const doc = new JSDOM(html).window.document
	const table = doc.querySelector('table')
	const rows = Array.from(table?.querySelectorAll('tr') ?? [])

	const limpiarTexto = (s: string) =>{
		return s.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/\r?\n|\r/g, ' ')
			.replace(/[^A-Za-z0-9\s+/().-]/g, '')
			.replace(/\s+/g, ' ')
			.trim()
	}

	type SpanCell = { text: string; remaining: number }
	const spanCarry: Array<SpanCell | null> = [null, null]

	const takeFromSpan = (col: number): string | null => {
		const active = spanCarry[col]
		if (!active) return null

		const value = active.text
		active.remaining -= 1
		if (active.remaining <= 0) {
			spanCarry[col] = null
		}

		return value
	}

	type ExpandedRow = {
		left: string
		right: string
		rightFromCarry: boolean
	}

	const expandToTwoColumns = (row: Element): ExpandedRow => {
		const values: string[] = ['', '']
		const fromCarry = [false, false]

		for (let col = 0; col < 2; col += 1) {
			const carried = takeFromSpan(col)
			if (carried) {
				values[col] = carried
				fromCarry[col] = true
			}
		}

		let nextCol = 0
		const cells = Array.from(row.querySelectorAll('th, td'))

		for (const cell of cells) {
			while (nextCol < 2 && values[nextCol]) {
				nextCol += 1
			}
			if (nextCol >= 2) break

			const text = limpiarTexto(cell.textContent ?? '')
			const colSpan = Number(cell.getAttribute('colspan') ?? '1') || 1
			const rowSpan = Number(cell.getAttribute('rowspan') ?? '1') || 1

			for (let i = 0; i < colSpan && nextCol < 2; i += 1) {
				values[nextCol] = text
				if (rowSpan > 1) {
					spanCarry[nextCol] = { text, remaining: rowSpan - 1 }
				}
				nextCol += 1
			}
		}

		return {
			left: values[0] ?? '',
			right: values[1] ?? '',
			rightFromCarry: fromCarry[1],
		}
	}

	const normalizedRows = rows
		.map(expandToTwoColumns)
		.filter((row) => row.left || row.right)

	if (normalizedRows.length === 0) {
		return c.json({ error: 'No se pudo parsear la tabla de revalidas' }, 500)
	}

	const headerUdelar = normalizedRows[0]?.left ?? ''
	const headerTecnologo = normalizedRows[0]?.right ?? ''
	const bodyRows = normalizedRows.slice(1)

	type Equivalencia = {
		tecnologo: string
		udelar: string[]
	}

	const equivalencias: Equivalencia[] = []
	let current: Equivalencia | null = null

	for (const row of bodyRows) {
		const udelarMateria = row.left
		const tecnologoMateria = row.right

		if (!udelarMateria && !tecnologoMateria) continue

		if (tecnologoMateria && !row.rightFromCarry) {
			current = { tecnologo: tecnologoMateria, udelar: [] }
			equivalencias.push(current)
		}

		if (!current && tecnologoMateria) {
			current = equivalencias[equivalencias.length - 1] ?? null
		}

		if (!current) {
			current = { tecnologo: 'Sin asignar', udelar: [] }
			equivalencias.push(current)
		}

		if (udelarMateria) {
			current.udelar.push(udelarMateria)
		}
	}

	const data = {
		udelar: {
			titulo: headerUdelar,
			revalidas: equivalencias.flatMap((item) => item.udelar),
			total: equivalencias.reduce((acc, item) => acc + item.udelar.length, 0),
			totalMaterias: equivalencias.reduce((acc, item) => acc + item.udelar.length, 0)
		},
		tecnologo: {
			titulo: headerTecnologo,
			revalidas: equivalencias.map((item) => item.tecnologo),
			total: equivalencias.length,
			totalMaterias: equivalencias.length
		},
		equivalencias
	}


	return c.json(data)
}