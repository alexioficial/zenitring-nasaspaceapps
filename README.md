# Zenitring

Base mínima con Bun 1.3.14, SvelteKit 2, Svelte 5, Vite 7, TypeScript, Tailwind CSS 4 y PostgreSQL 17. Vite se ejecuta con Bun; producción usa `adapter-node` ejecutado también con Bun.

## Desarrollo local con Docker

Requisitos: Docker con Compose y contenedores Linux.

```powershell
Copy-Item .env.example .env
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up --build -d
```

En Linux/macOS, copia el archivo con `cp .env.example .env`.

- App con recarga automática: http://localhost:3000
- Health check del servidor: http://localhost:3000/health (no comprueba consultas a la base).
- PostgreSQL desde el host: `localhost:5432`; credenciales en `.env`.
- Dentro de la red Docker, PostgreSQL se llama `postgres`, puerto `5432`.
- `DATABASE_URL` se construye e inyecta en la app desde Compose. Úsala solo en código de servidor (`$env/dynamic/private`), nunca en el navegador. La base no incluye ORM, tablas ni migraciones.

Los cambios del código se montan en el contenedor. Las dependencias y `.svelte-kit` usan volúmenes Linux independientes para evitar mezclar binarios Windows/Linux. Después de modificar dependencias, actualiza `bun.lock` con `bun install` y reinicia `app`.

```sh
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml logs -f app
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml exec app bun run check
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml exec postgres psql -U zenitring -d zenitring
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml down
```

Los datos persisten en `postgres_data`. `down` conserva los volúmenes; `down -v` elimina todos los volúmenes de esta base, incluidos los datos de PostgreSQL. Cambiar las variables `POSTGRES_*` no modifica usuarios o bases ya inicializados en un volumen existente.

Si cambias `APP_PORT`, cambia también `ORIGIN` para que coincida con la URL del navegador. `POSTGRES_PORT` solo cambia el puerto publicado en local; dentro de Docker sigue siendo `5432`. Usa nombres de usuario/base y contraseñas con caracteres seguros para una URL (por ejemplo, una contraseña hexadecimal), porque Compose los incluye en `DATABASE_URL`.

## Comprobaciones y compilación sin Docker

```sh
bun install --frozen-lockfile
bun run check
bun run build
bun run dev
```

El servidor mínimo no consulta PostgreSQL todavía; estas comprobaciones no requieren una base activa. Para añadir consultas puedes usar el cliente SQL de Bun desde módulos de servidor; la conexión desde el host debe usar `localhost` en lugar de `postgres`.

## Imagen de producción en local

```sh
docker compose build app
docker compose run --rm --service-ports -p 127.0.0.1:3000:3000 app
```

Esto inicia PostgreSQL como dependencia y publica la app en `localhost:3000` para probar la imagen de producción. Al terminar, detén PostgreSQL con `docker compose down`.

## Configuración futura de Coolify

No se ha creado ni desplegado ningún recurso en Coolify.

Cuando decidas desplegar, crea una aplicación desde Git con el build pack **Docker Compose**, usando `/docker-compose.yaml` (sin el archivo de desarrollo). Configura:

- `POSTGRES_PASSWORD`: una contraseña nueva y segura para producción.
- `POSTGRES_USER` y `POSTGRES_DB`: `zenitring` o tus propios valores.
- `ORIGIN`: la URL pública exacta, por ejemplo `https://app.example.com`, sin barra final.
- Dominio del servicio `app`: con puerto interno `3000`; por ejemplo `https://app.example.com:3000` en el campo de dominios de Coolify. El visitante accederá mediante HTTPS normal.

El Compose base expone `3000` solo a la red de contenedores para el proxy de Coolify. PostgreSQL no publica ningún puerto al host en producción. Coolify administra el proxy y TLS; no hacen falta etiquetas manuales ni una red `coolify` fija. El volumen de PostgreSQL es persistente y debe tener su propia política de backups.

Referencias: [Docker Compose en Coolify](https://coolify.io/docs/applications/builds/docker-compose), [SvelteKit con Bun](https://bun.sh/guides/ecosystem/sveltekit), [Tailwind con SvelteKit](https://tailwindcss.com/docs/installation/framework-guides/sveltekit).
