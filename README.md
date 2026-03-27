# Tecnologo API

Monorepo que transforma contenido del sitio oficial del Tecnólogo en Informática (HTML + RSS) a JSON consumible, y lo publica junto con una web en Astro.

## Por qué

La información académica oficial suele estar distribuida en HTML con estructura variable y feeds RSS con contenido incrustado. Esto complica integración con apps. La solución: API que normaliza fuentes heterogéneas en contratos JSON estables.

## Stack

- **API**: Hono en Bun (TypeScript)
- **Web**: Astro (estático compilado)
- **Deploy**: Docker + Dokploy
- **Parsing**: JSDOM, fast-xml-parser

## Endpoints

```
GET /              → Bienvenida + listado
GET /novedades     → Noticias RSS
GET /faq           → Preguntas frecuentes
GET /oportunidades-laborales → Oportunidades laborales
GET /revalidas     → Equivalencias revalidas
GET /perfil-de-ingreso → Perfil ingreso/egreso
```

## Desarrollo

```bash
# Instalar
bun install

# Ambas apps
bun run dev

# Solo API o web
bun run dev:api
bun run dev:web
```

**Puertos**: API `3000`, Web `4321`, Variable `API_URL=http://localhost:3000`

## Producción

```bash
# Build
bun run build

# Start API
bun run start:api

# Docker
docker-compose up --build
```

**Lee [DEPLOYMENT.md](./DEPLOYMENT.md) para Dokploy.**

## URLs

- Dev: API http://localhost:3000, Web http://localhost:4321
- Prod: Variable de entorno `API_URL` (importante para la web)
- Fuente: https://www.fing.edu.uy/tecnoinf/mvd/

# En .env o variables Dokploy:
API_URL=https://api.tudominio.com
```

### Build de Astro falla

```sh
# Test localmente
bun run build

# Ve logs detallados
bun run --filter 'web' build
```
