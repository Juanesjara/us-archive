# CLAUDE.md

"us." — archivo privado de fotos para dos personas. React 19 + Vite 8 + TypeScript + Tailwind 4 + Firebase (Auth + Firestore + Cloud Storage, plan Blaze dentro de la cuota gratis), desplegado en Vercel. El README tiene el setup completo de Firebase/Vercel; aquí solo va lo que importa para cambiar código.

## Comandos

```bash
npm run dev          # http://localhost:5173 (necesita .env con VITE_FIREBASE_*)
npm run build        # tsc -b && vite build — es la verificación principal
npm run lint         # oxlint
npx tsc -p api       # type-check de la función serverless; `npm run build` NO la cubre
```

No hay tests. Verificar = `build` + `lint` (+ `tsc -p api` si tocas `api/`). Node 24 (`engines`).

## Arquitectura

- `src/services/archive.ts` — **todas** las escrituras a Firestore pasan por aquí. `clean()` quita `undefined` (Firestore los rechaza); `withImage()` borra la imagen si la escritura que la referencia falla.
- `src/hooks/useCollection.ts` — lecturas en vivo (`useCollection`, `useDocument`), siempre ordenadas por un solo campo; por eso no hay índices.
- `src/hooks/useAuth.tsx` — usuario + doc `members/{uid}` + `isAdmin`.
- `src/routes/guards.tsx` — `RequireConfig`, `RequireAuth`, `RequireAdmin`, `RequireIntro`. Rutas en `src/App.tsx`.
- `src/lib/` — lógica pura: `albums.ts` (agrupa por día local + ciudad), `places.ts` (ciudad → barrios), `photoMeta.ts` (EXIF con `exifr` + geocoding inverso con Nominatim, cola de 1 req/s con caché), `compress.ts`, `format.ts`, `username.ts`, `passkey.ts`.
- `api/passkey.ts` — única función de Vercel: Face ID vía WebAuthn → Firebase custom token.
- Comentarios: `photos/{id}/comments`, se muestran y escriben en `Lightbox.tsx` (`Comments`). El nombre se copia al escribir (`member.name` o el nombre de login). Borrar una foto borra antes sus comentarios (Firestore no borra subcolecciones solo).

### Imágenes
En Cloud Storage (bucket `us-archive-jj.firebasestorage.app`, us-central1): `images/{id}/full.jpg` (≤4096 px, límite de canvas de iOS) y `images/{id}/thumb.jpg` (≤640 px), ambas generadas en el navegador por `compress.ts`. `photos` solo guarda `imageId`. Cuadrículas y mapa usan `size="thumb"`; visor y Home la completa. Se descargan con `getBlob` (aplica `storage.rules` en cada request), **no** con `getDownloadURL` (sus URLs son públicas); por eso el bucket tiene CORS. Las imágenes son **inmutables** (las reglas prohíben `update`); reemplazar = crear nueva + borrar vieja. `ArchiveImage.tsx` cachea object URLs a nivel de módulo (miniaturas siempre, completas solo las 8 últimas); si borras una, llama `forgetImage` (ya lo hace `deleteImage`). EXIF se lee del archivo **original antes** de comprimir (el canvas lo borra). La colección Firestore `images/{id}` es la copia vieja (data URLs) de antes de la mudanza; ya no se lee.

## Reglas que hay que respetar

- **Cambiar un campo de Firestore = tocar 3 sitios:** `src/types.ts`, `src/services/archive.ts` y `firestore.rules` (`validPhoto()` etc.). Las reglas validan forma y longitudes; si no coinciden, la escritura falla en producción sin error de compilación. Las reglas se despliegan aparte: `firebase deploy --only firestore:rules,storage` (proyecto `us-archive-jj`). `storage.rules` consulta `members` en Firestore con `firestore.exists/get`.
- Permisos: miembros leen todo, crean fotos y solo cambian `caption`; admin edita/borra y cambia `settings/official`. `members`, `passkeys` y `passkeyChallenges` son inaccesibles desde el cliente. Hay un deny-all final.
- Fechas: días sin hora se guardan a mediodía local (`fromInputDate`) para que el día no cambie por zona horaria. Usa los helpers de `format.ts`, no `new Date(string)`.
- Login por nombre: `nombre` → `nombre@members.us-archive.app` (`username.ts`). La contraseña se manda `trim().toLowerCase()`.
- `api/passkey.ts`: **no importar `firebase-admin/auth`** — rompe el loader de Vercel (jwks-rsa + jose ESM). Tokens se verifican/firman con `jose`. Sin `FIREBASE_SERVICE_ACCOUNT` la función responde `{enabled:false}` y la UI oculta Face ID. El rpID del dominio propio es `alejayjuanesgallery.site`.
- `vercel.json` reescribe todo excepto `/api/` a `index.html`.

## Convenciones

- Código y comentarios en inglés; **todo texto visible al usuario en español** (es-CO), incluidos mensajes de error lanzados desde `services`/`api` (se muestran tal cual vía `errorMessage`).
- Estilo: sin punto y coma, comillas simples, 2 espacios, componentes con `export function` nombrado. Sin librerías de UI ni de estado.
- Diseño: tokens en `src/index.css` (`paper`, `ink`, `body`, `muted`, `faint`, `rule`, `well`, `accent`, `danger`; tamaños `text-display/title/lead/prose/ui/meta`). Serif (`.serif`) para lo que se lee como escritura, sans para UI. Animación de entrada solo con `.enter*`; nada más se mueve.
- Overlays fijos se renderizan con `createPortal` a `body` (ver `Lightbox.tsx`) — un `transform` en un ancestro los descoloca.
- Reusar `useAction`, `errorMessage`, `Row`, `FormFooter` de `src/routes/admin/shared.tsx` y `Button`/`LinkButton`/`Arrow` de `components/ui/Button.tsx`.
- Commits: frase imperativa en inglés, sin prefijo (`Let every member upload photos`). Trabajo vía PR a `main`.

## GitHub

Este repo (`Juanesjara/us-archive`) siempre se opera con la cuenta **Juanesjara**. `gh` tiene dos cuentas logueadas y la activa global es otra (`juanesjarar`); no la cambies con `gh auth switch`, pasa el token por comando:

```bash
GH_TOKEN="$(gh auth token --user Juanesjara)" gh pr create ...
GH_TOKEN="$(gh auth token --user Juanesjara)" gh pr merge ...
```

La identidad de git ya está en la config local del repo (`Juan Esteban Jaramillo <68408427+Juanesjara@users.noreply.github.com>`); si falta: `git config user.name "Juan Esteban Jaramillo" && git config user.email "68408427+Juanesjara@users.noreply.github.com"`.

Para que el Git Credential Manager no pregunte qué cuenta usar en `push`/`fetch`, el repo tiene en su config local `credential.https://github.com.username = Juanesjara`. Si reaparece la ventana de escoger cuenta: `git config credential.https://github.com.username Juanesjara`.

## Firebase CLI

El CLI tiene varias cuentas de Google; este proyecto (`us-archive-jj`) usa **juanesteban0607bmx@gmail.com**, fijada para esta carpeta con `firebase login:use juanesteban0607bmx@gmail.com`. Si un deploy da 403, revisa `firebase login:list` y vuelve a fijarla. Despliega las reglas **antes** de mergear código que dependa de ellas: `firebase deploy --only firestore:rules`.
