import { Context } from 'hono'
import { JSDOM } from 'jsdom'

type PerfilBloque = {
	titulos: string[]
	items: string[]
	subItems: string[]
}

type SeccionPerfil = {
	bloques: PerfilBloque[]
	totalTitulos: number
	totalItems: number
	totalSubItems: number
}

export async function perfilDeIngreso(c: Context) {
	const url = 'https://www.fing.edu.uy/tecnoinf/mvd/perfil.htm'
	const res = await fetch(url)
	const html = await res.text()
	const doc = new JSDOM(html).window.document
	const perfilIngreso = doc.querySelectorAll('table')[0]
	const perfilEgreso = doc.querySelectorAll('table')[1]

	const datosPerfil = {
		ingreso: {
			bloques: [] as PerfilBloque[],
			totalTitulos: 0,
			totalItems: 0,
			totalSubItems: 0,
		} as SeccionPerfil,
		egreso: {
			bloques: [] as PerfilBloque[],
			totalTitulos: 0,
			totalItems: 0,
			totalSubItems: 0,
		} as SeccionPerfil,
	}

	const limpiarTexto = (value: string): string => {
		return value
			.replace(/\u00a0/g, ' ')
			.replace(/\r?\n|\r/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
	}

	const extraerTextoLiSinSublistas = (li: Element): string => {
		const copia = li.cloneNode(true) as Element
		copia.querySelectorAll('ul, ol').forEach((nested) => nested.remove())
		return limpiarTexto(copia.textContent ?? '')
	}

	const profundidadLista = (li: Element, limite: Element): number => {
		let depth = 0
		let parent = li.parentElement

		while (parent && parent !== limite) {
			const tag = parent.tagName.toLowerCase()
			if (tag === 'ul' || tag === 'ol') depth += 1
			parent = parent.parentElement
		}

		return depth
	}

	const procesarSeccion = (tabla: Element | undefined, seccion: 'ingreso' | 'egreso') => {
		if (!tabla) return

		const celdas = Array.from(tabla.querySelectorAll('tr > td'))
		if (celdas.length === 0) return

		for (const celda of celdas) {
			const bloque: PerfilBloque = {
				titulos: [],
				items: [],
				subItems: [],
			}

			const spans = Array.from(celda.querySelectorAll(':scope > span'))
			for (const span of spans) {
				const texto = limpiarTexto(span.textContent ?? '')
				if (texto) bloque.titulos.push(texto)
			}

			const lis = Array.from(celda.querySelectorAll('li'))
			for (const li of lis) {
				const texto = extraerTextoLiSinSublistas(li)
				if (!texto) continue

				const depth = profundidadLista(li, celda)
				if (depth <= 1) {
					bloque.items.push(texto)
				} else {
					bloque.subItems.push(texto)
				}
			}

			if (bloque.titulos.length || bloque.items.length || bloque.subItems.length) {
				datosPerfil[seccion].bloques.push(bloque)
				datosPerfil[seccion].totalTitulos += bloque.titulos.length
				datosPerfil[seccion].totalItems += bloque.items.length
				datosPerfil[seccion].totalSubItems += bloque.subItems.length
			}
		}
	}

	procesarSeccion(perfilIngreso, 'ingreso')
	procesarSeccion(perfilEgreso, 'egreso')

	return c.json(datosPerfil)
}