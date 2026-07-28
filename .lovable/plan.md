# Brunet Asesores — Gestión Documental

Aplicación web con dos zonas: subida pública para clientes y panel privado para Montse.

## Backend (Lovable Cloud)

Activaré Lovable Cloud para base de datos, autenticación y almacenamiento de archivos.

**Tablas:**
- `clients`: `id`, `phone` (único), `display_name`, `created_at`
- `documents`: `id`, `client_id` (FK), `category` (enum), `month` (fecha YYYY-MM-01), `file_path`, `file_name`, `mime_type`, `size_bytes`, `uploaded_at`

**Storage:** bucket privado `documents`. Rutas: `{client_id}/{category}/{YYYY-MM}/{uuid}-{filename}`.

**Categorías:** Facturas emitidas, Facturas recibidas, Recibos, Nóminas, Extractos bancarios, Documentación, Justificantes, Otros.

**RLS y seguridad:**
- `clients` y `documents`: solo Montse (usuario autenticado) puede SELECT/UPDATE.
- INSERT público a `clients` y `documents` vía server function pública (sin auth) que hace upsert por teléfono. Nadie anónimo puede leer datos existentes.
- Storage `documents`: bucket privado. Subida vía server function pública que usa admin client tras validar tipo/tamaño. Descarga solo con URL firmada generada desde el panel autenticado.

**Auth:** email + contraseña. Cuenta de Montse creada manualmente (le indicaré cómo hacerlo tras publicar, o la creo yo si me da su email).

## Pantalla 1 — Subida pública (`/`)

**Vista simple (un archivo):**
- Formulario: Nombre, Teléfono, Tipo de documento, Mes, Archivo (PDF/JPG/PNG, máx 20 MB).
- Tras primera subida guarda `{name, phone}` en `localStorage`.
- En visitas posteriores muestra "Hola, {nombre}" con botones: "No soy yo, cambiar datos" (borra y pide de nuevo) y "He cambiado de teléfono" (permite actualizar el teléfono manteniendo la misma carpeta — usa el teléfono antiguo como identificador de la carpeta a actualizar).
- Enlace discreto abajo: "Tengo varios archivos que subir" → `/multi`.

**Vista múltiple (`/multi`):**
- Nombre y Teléfono arriba (una vez).
- Selector multi-archivo. Lista con una fila por archivo: nombre del archivo, desplegable de tipo, selector de mes.
- Al rellenar el primer tipo, se copia al resto (respetando ediciones posteriores).
- Botón "Subir todo": crea/actualiza cliente por teléfono e inserta un documento por fila.

## Pantalla 2 — Panel de Montse (`/admin`, protegido)

- `/auth`: login email + contraseña.
- `/admin`: lista de carpetas de clientes (nombre + teléfono), orden alfabético, buscador simple.
- `/admin/cliente/$id`: documentos agrupados por categoría y dentro de cada categoría por mes descendente. Cada archivo abre en pestaña nueva vía URL firmada. Botón editar cliente para cambiar `display_name` y `phone` (sin duplicar carpeta, sin mover archivos: los paths usan `client_id`).

## Diseño

Tokens en `src/styles.css` con la paleta de marca:
- `--primary: #5B2C91` (morado), hover `#3B1D63`
- `--background: #F6F1EA` (crema)
- `--foreground: #1C1A1E`
- `--accent: #EEE7F8` (lila claro)
- Tipografía: Manrope (títulos) + Inter (cuerpo) vía `<link>` en `__root.tsx`.
- Sobrio, cercano, mobile-first. Formularios grandes y claros. Sin gradientes llamativos.

## Rutas

```text
src/routes/
  __root.tsx           (fuentes, layout base)
  index.tsx            (subida simple)
  multi.tsx            (subida múltiple)
  auth.tsx             (login Montse)
  _authenticated/
    route.tsx          (gate — gestionado por la integración)
    admin.tsx          (lista de clientes)
    admin.cliente.$id.tsx  (detalle cliente)
```

## Detalles técnicos

- Server functions públicas (`createServerFn`, sin middleware auth): `upsertClientAndUploadDoc`, `upsertClientAndUploadBatch`, `updateClientPhone` (usan `supabaseAdmin` tras validar mime/tamaño).
- Server functions protegidas (`requireSupabaseAuth`): `listClients`, `getClientWithDocs`, `updateClient`, `getSignedUrl`.
- Metadatos SEO por ruta con `head()`; sitemap y robots al final.
- No expondré datos de clientes existentes a anónimos: las funciones públicas solo aceptan escritura (upsert por teléfono, sin devolver otros clientes).

Voy a implementarlo directamente.
