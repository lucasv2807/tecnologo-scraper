# Deployment en Dokploy

## Arquitectura

```
Dockerfiles separados:
├─ Dockerfile.api:      API Hono en Bun (puerto 3000)
└─ Dockerfile.web:      Build Astro + runtime Nginx (puerto 80)

Flujo Build:
1. API: bun install + start:api
2. Web builder: bun install + bun run build (genera dist/)
3. Web runtime: copia dist/ a nginx (production-ready)

Docker Compose:
├─ api: usa Dockerfile.api → puerto 3000 (Bun runtime)
└─ web: usa Dockerfile.web → puerto 80 (Nginx serving static files)
```

## ✅ Configuración Validada Según Astro Docs

- **Output mode**: `static` (default, genera `dist/` con HTML/CSS/JS)
- **Web server**: Nginx en Alpine (imagen oficial, ~15MB)
- **Build command**: `astro build` durante builder stage
- **Production runtime**: Nginx (recomendado por Astro, no `astro preview`)
- **Astro preview** ❌: NO se usa en producción (violaba recomendación oficial)

## Requisito Importante: Código de Astro

⚠️ **Tu código Astro NO debe hacer requests a la API durante build time.**

**❌ MAL** (fallará el build):
```javascript
// Layout.astro o pages/*.astro
export const prerender = true;
const data = await fetch(import.meta.env.API_URL + '/endpoint');
```

**✅ BIEN** (funciona):
```javascript
// components/Data.astro (renderiza en el cliente)
<script>
  const data = await fetch(import.meta.env.API_URL + '/endpoint');
</script>
```

**Regla**: Os requests a la API deben estar en **JavaScript del cliente** o **endpoints server**, NO en el código Astro durante build.

## Setup en Dokploy

### Paso 1: New Service
```
Type: Docker Compose
```

### Paso 2: Copiar docker-compose.yml
Copy/paste el contenido en el editor, o conecta tu repositorio con auto-deploy Git.

### Paso 3: Environment Variables
Solo necesitas:
```
NODE_ENV=production
```

Opcional (si quieres custom domain en sitemap):
```
ASTRO_SITE=https://www.tudominio.com
```

### Paso 4: Puertos (Auto-detectado)
- 3000 (API)
- 80 (Web)

### Paso 5: Dominios con SSL
```
api.tudominio.com → 3000 (SSL auto)
www.tudominio.com → 80 (SSL auto)
```
Dokploy crea certificados Let's Encrypt automáticamente.

### Paso 6: Deploy
Click **Deploy** y espera a que termine.

## Test Local

```bash
# 1. Build el proyecto
bun run build    # Genera app/web/dist/ con archivos estáticos

# 2. Docker compose
docker compose up --build

# 3. Verificar
curl http://localhost:3000/             # API
curl http://localhost/                  # Web (Nginx)
curl http://localhost/api/revalidas     # Astro page via Nginx
```

## Troubleshooting

| Error | Solución |
|-------|----------|
| Nginz 404 en rutas | Revisa que `dist/` tiene los archivos. Si no, `astro build` falló |
| Astro build: "Unable to connect" a API | Código hace requests a API durante build. Ver sección "Código de Astro" |
| "502 Bad Gateway" en Dokploy | API no está respondiendo. Revisa logs del servicio api |
| No se ve el sitio | Revisa que nginx.conf está siendo copiado en Dockerfile.web |

## FAQ

**P: ¿Por qué Nginx en lugar de `astro preview`?**  
R: La documentación oficial de Astro dice que `astro preview` "is not designed to be run in production". Nginx es el estándar industrial para static sites.

**P: ¿Puedo hacer requests a la API en Astro?**  
R: Sí, pero EN EL CLIENTE (en etiquetas `<script>`), no durante build (en layouts/pages).

**P: ¿Dónde voy los archivos compilados?**  
R: En `app/web/dist/`. Dockerfile.web copia esos archivos a nginx durante build.

**P: ¿Cómo verifico que mi deploy funcionó?**  
R: Entra a www.tudominio.com y verifica que se carga. Luego verifica www.tudominio.com/api/revalidas (debe tirar la página HTML, no JSON).



