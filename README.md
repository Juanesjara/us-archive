# us.

A private archive for two people: photos, grouped into albums and places. React, Vite, TypeScript, Tailwind and Firebase, deployed on Vercel.

Everything private lives behind Firebase Authentication plus Firestore and Cloud Storage security rules. It runs on the **Blaze** plan, inside its no-cost quota: photos are stored in Cloud Storage at close to full resolution, with a small preview for grids and the map. Only accounts listed in the `members` collection can read the archive, any member can add photos, and only accounts with the `admin` role can edit or delete them or change anything else.

## Contents

1. [Installation](#installation)
2. [Firebase setup](#firebase-setup)
3. [Environment variables](#environment-variables)
4. [Authentication setup](#authentication-setup)
5. [Firestore setup](#firestore-setup)
6. [How photos are stored](#how-photos-are-stored)
7. [Security rules](#security-rules)
8. [Local development](#local-development)
9. [Vercel deployment](#vercel-deployment)
10. [How the app is organised](#how-the-app-is-organised)

## Installation

Requires Node 20 or newer.

```bash
npm install
cp .env.example .env   # then fill it in, see below
npm run dev
```

## Firebase setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project and upgrade it to the Blaze plan (Cloud Storage needs it).
2. Add a **Web app** to the project (Project settings, Your apps, `</>`). Do not enable Firebase Hosting. Copy the `firebaseConfig` values into `.env`.

Or, with the Firebase CLI installed and signed in:

```bash
firebase projects:create us-archive --display-name "us archive"
firebase apps:create web "us." --project us-archive
firebase apps:sdkconfig web --project us-archive
```

## Environment variables

Copy `.env.example` to `.env` and fill in the values from the Firebase web app config:

| Variable                            | Where it comes from                     |
| ----------------------------------- | --------------------------------------- |
| `VITE_FIREBASE_API_KEY`             | `apiKey`                                |
| `VITE_FIREBASE_AUTH_DOMAIN`         | `authDomain`                            |
| `VITE_FIREBASE_PROJECT_ID`          | `projectId`                             |
| `VITE_FIREBASE_APP_ID`              | `appId`                                 |

These values ship to the browser by design. They identify the project; they do not grant access. Access is enforced by the Firestore security rules below. `.env` is git-ignored. Never commit it.

When any of the required variables is missing, the app renders a "Firebase is not configured yet" screen listing what is missing instead of crashing.

## Authentication setup

1. Enable **Email/Password** sign-in. Either run `firebase deploy --only auth` (the provider is declared in `firebase.json`), or in the console open **Authentication**, click **Get started**, then **Sign-in method**, **Email/Password**. Leave "Email link" off.
2. People sign in with a **name**, not an email. Internally each name maps to `<name>@members.us-archive.app`, an address nobody receives mail for and that never appears in the interface (see `src/lib/username.ts`). Names are lowercased and accents are stripped, so "Juan" and "juan" are the same account. To add someone, open **Authentication**, **Users**, **Add user**, and enter `<name>@members.us-archive.app` with a password. There is no sign-up form in the app on purpose. Password resets are done from the console, since there is no real inbox. The sign-in form lowercases and trims the password before sending it, so every password must be set in lowercase.
3. Copy each account's **User UID**. You need them in the next step.

## Firestore setup

1. Create the database with `firebase firestore:databases:create "(default)" --location us-east1`, or in the console open **Firestore Database**, **Create database**, **production mode**.
2. Create the `members` collection by hand. Add one document per account, with the **document ID equal to the user's UID**:

   | Document ID  | Fields                                           |
   | ------------ | ------------------------------------------------ |
   | `<your UID>` | `role` (string) `admin`, `name` (string, optional) |
   | `<other UID>`| `role` (string) `member`, `name` (string, optional) |

   Nothing in the app can write to `members`. It is managed from the console only.

The remaining collections are created automatically the first time you add something from the admin section:

| Collection          | Purpose                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `images`            | One compressed JPEG per document, as a data URL. `data`, `width`, `height` |
| `photos`            | Gallery. `imageId`, `date`, `caption?`, `location?`                 |
| `photos/{id}/comments` | Comments on a photo. `uid`, `name`, `text`, `createdAt`         |
| `settings/official` | On/off switch and photo for the "Nuevo recuerdo agregado." block on the home page |

No indexes are needed: every query orders by a single field.

## How photos are stored

Photos live in Cloud Storage, in the default bucket `PROJECT_ID.firebasestorage.app` (created in `us-central1`, the region with a no-cost quota):

- Before upload, the browser decodes the image, applies its EXIF rotation and re-encodes it twice as JPEG: `images/{id}/full.jpg`, at most 4096 px on the long edge (iOS Safari's canvas limit), and `images/{id}/thumb.jpg`, at most 640 px. HEIC photos picked on an iPhone are converted along the way. Photos and the official state only store the id.
- Grids, Lugares and the map show the thumbnail; the viewer and the home page show the full photo.
- Images are downloaded with `getBlob`, which checks `storage.rules` on every request. `getDownloadURL` is not used: its URLs work for anyone who has the link. `getBlob` needs CORS on the bucket: `gcloud storage buckets update gs://PROJECT_ID.firebasestorage.app --cors-file=cors.json` with `[{"origin":["*"],"method":["GET"],"maxAgeSeconds":3600}]` (any origin is fine, the rules still require a member).
- `storage.rules` reads `members/{uid}` from Firestore, which needs the role **Firebase Rules Firestore Service Agent** on the Storage service agent (`service-PROJECT_NUMBER@gcp-sa-firebasestorage.iam.gserviceaccount.com`). The console offers to grant it the first time; otherwise add it in IAM.
- Images are immutable. Replacing a photo stores a new image and deletes the old one. Deleting an entry deletes its image.
- Uploading is a single step: pick one or many photos at the top of Fotos (any member) or in `/admin/photos`, and they upload right away. Before compressing, the app reads each file's metadata with `exifr`: the time it was taken and its GPS position. Coordinates are turned into a short place name ("El Poblado, Medellín") through OpenStreetMap's public Nominatim service, one request per second, cached. Photos without metadata get today's date and no place.
- The gallery groups photos into albums by local day and city automatically. There is nothing to name or manage.
- Lugares is derived from the same data: one entry per city or town with photos, and inside it the photos grouped by neighbourhood. Photos without a location only appear in Fotos.
- A description is optional and added afterwards, either from the photo viewer ("Añadir descripción") or from the admin list ("Editar"). Any member can add or change a description from the viewer; only admins can change the date and time.
- On an iPhone, the photo picker may leave out the location. If photos arrive without a place, tap "Opciones" at the top of the picker and turn on location.

No-cost Cloud Storage quota on Blaze, for reference: 5 GB stored, 1 GB downloaded a day, 20,000 uploads and 50,000 downloads a day. A full photo is about 2 to 5 MB, so roughly 1,000 to 2,000 photos fit before storage costs a few cents a month. A budget alert on the billing account warns by email before anything adds up.

Photos uploaded before the move were compressed into Firestore `images/{id}` documents (at most 1600 px). They were copied to Storage as they were; the Firestore copies are no longer read.

## Security rules

The rules live in `firestore.rules` and `storage.rules` at the project root. Deploy them with the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules,storage
```

Or paste the file into the **Rules** tab of Firestore in the console.

What they enforce:

- Nothing is readable or writable without signing in.
- Signed-in accounts without a `members/{uid}` document get nothing. They see an "This account isn't on the list" screen in the app.
- Members can read every archive collection, including `images`.
- Any member can add photos (create in `photos` and `images`) and change a photo's `caption`. Only `role == "admin"` can change other fields, delete, or change `settings/official`.
- Any member can comment on a photo as themselves (`uid` must match, text up to 500 characters). Comments cannot be edited; the author or an admin can delete them. Deleting a photo deletes its comments first.
- Writes are shape-checked: required fields, string length limits, timestamps where dates are expected, and images must be JPEG data URLs under 1 MB. Images cannot be edited, only created and deleted.
- `members` cannot be written from the client at all.
- A final catch-all denies anything not listed.

## Local development

```bash
npm run dev       # http://localhost:5173
npm run build     # type-checks, then builds to dist/
npm run preview   # serves dist/ locally
npm run lint      # oxlint
```

The intro is shown once per device. To see it again, open the admin section and use "Replay the intro on this device" at the bottom, or clear the `us.intro.seen` key from localStorage.

## Vercel deployment

1. Push the project to a Git repository and import it in Vercel. The framework preset is **Vite**; the defaults (`npm run build`, output `dist`) are right.
2. Add the four `VITE_FIREBASE_*` variables in **Settings, Environment Variables** for Production (and Preview if you use preview deployments).
3. Deploy. `vercel.json` already rewrites every path to `index.html` so client-side routes work on refresh, marks the site `noindex`, and sets a few defensive headers.
4. Back in Firebase, open **Authentication, Settings, Authorized domains** and add your Vercel domain (for example `us-yourname.vercel.app`, plus any custom domain). Sign-in is refused from domains that are not listed.

## How the app is organised

```
src/
  index.css                 design tokens (colors, type scale) and the few global styles
  App.tsx                   routes and guards
  types.ts                  Firestore document shapes
  lib/firebase.ts           Firebase init; tolerant of missing config
  lib/format.ts             date helpers (Timestamp <-> input, display formats)
  lib/onboarding.ts         the "intro seen" flag
  hooks/useAuth.tsx         AuthProvider: user, member doc, role
  hooks/useCollection.ts    live Firestore subscriptions
  services/archive.ts       every write: uploads, adds, updates, deletes
  components/ui/            Button, fields, ImagePicker, Lightbox, Screen, Wordmark, empty states
  components/layout/        AppShell (header + nav) and the closing FinalSection
  routes/Login.tsx
  routes/onboarding/        the three intro screens
  routes/archive/           Home, Photos, Places, Place
  routes/OneMoreThing.tsx   the two closing screens
  routes/admin/             admin shell and one page per collection, plus Official
  routes/guards.tsx         RequireConfig, RequireAuth, RequireAdmin, RequireIntro
```

Flow: `/login` → `/intro` → `/intro/why` → `/intro/inside` → `/archive`. The intro is only reachable signed in, and the archive is only reachable after the intro has been seen once on that device. Admin lives at `/admin` and is linked from the header for admin accounts only.

