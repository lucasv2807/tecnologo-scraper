import { API_URL } from './consts'

type CacheEntry = {
	data?: unknown
	promise?: Promise<unknown>
	expiry: number
}

type FetchWrapperOptions = {
	cacheMs?: number
	useCache?: boolean
}

const DEFAULT_CACHE_MS = 60_000

const cache = new Map<string, CacheEntry>()

export async function fetchWrapper<T = unknown>(route: string, options: FetchWrapperOptions = {}): Promise<T> {
	const { cacheMs = DEFAULT_CACHE_MS, useCache = true } = options

	if (!useCache || cacheMs <= 0) {
		const res = await fetch(`${API_URL}${route}`)
		return res.json() as Promise<T>
	}

	const now = Date.now()
	const cached = cache.get(route)

	if (cached) {
		if (cached.data && cached.expiry > now) {
			return cached.data as T
		}

		if (cached.promise) {
			return cached.promise as Promise<T>
		}
	}

	const promise = fetch(`${API_URL}${route}`)
		.then((res) => res.json())
		.then((data) => {
			cache.set(route, {
				data,
				expiry: Date.now() + cacheMs,
			})
			return data
		})
		.catch((error) => {
			cache.delete(route)
			throw error
		})

	cache.set(route, {
		promise,
		expiry: now + cacheMs,
	})

	return promise as Promise<T>
}