# CleverGames

Juego diario web con React/Vite: 10 sudokus diarios, una prueba diaria de Cifras y una prueba diaria de Letras. Los jugadores entran con email, crean grupos privados, compiten por resultados diarios y hablan en un chat del grupo.

## Stack

- React + Vite + TypeScript
- Supabase Auth con email OTP
- Supabase Postgres + RLS
- Generación determinista por fecha local
- Sudoku con 10 niveles diarios
- Cifras con 6 números, objetivo y validación de expresión
- Letras con 9 letras y diccionario local provisional
- Grupos privados, chat y clasificaciones por grupo/día

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Secrets y credenciales

No se suben credenciales a Git. El repo incluye `.env.example` sin secretos y `.gitignore` ignora `.env`, `.env.local`, `.env.production`, `.vercel`, claves, certificados y ficheros nativos sensibles.

```bash
cp .env.example .env.local
```

Rellena `VITE_SUPABASE_ANON_KEY` solo en `.env.local` y en las variables de entorno de Vercel. Aunque la anon key de Supabase es una clave publicable, se mantiene fuera del repo para que cada persona pueda clonar el proyecto y montar su propia instancia.

`VITE_AUTH_REDIRECT_URL` controls where Supabase email links return during local development. Use `http://localhost:5173` locally. In production the app uses the current deployed origin, for example `https://clever-games.vercel.app`.

## Supabase setup

1. Run SQL migrations in order:
   - `sql/20260516-001_create_daily_results.sql`
   - `sql/20260518-002_create_social_groups_auth.sql`
   - `sql/20260519-003_create_group_rpc.sql`
   - `sql/20260519-004_repair_create_group_rpc_cache.sql`
2. Enable Email provider in Supabase Auth.
3. In Supabase Auth URL Configuration, set:
   - Site URL: `https://clever-games.vercel.app`
   - Redirect URLs: `https://clever-games.vercel.app/**` and `http://localhost:5173/**`.
   - Do not leave `http://localhost:3000` unless you are actually running the app there.
4. Copy `.env.example` to `.env.local`.
5. Fill in `VITE_SUPABASE_ANON_KEY` and `VITE_AUTH_REDIRECT_URL`.

Without Supabase credentials, results are saved locally in the browser.

## Database model

The full schema is in `sql/` so anyone can clone the repository and create their own database:

- `profiles`: Supabase-authenticated player profile mirror.
- `groups`: private competition groups with invite codes.
- `group_members`: group membership and roles.
- `group_messages`: chat visible only to group members.
- `daily_results`: daily game results, optionally attached to a group.

RLS keeps group data private to members. Results and chat messages are immutable in the first version.

## Vercel setup

Set these environment variables in the Vercel project:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The repository includes `vercel.json` with the Vite build configuration.

## Apps Android, iOS y Stick TV

The lowest-friction path is to keep the web as the core product and wrap it. Android already uses Capacitor, so the APK packages the same React/Vite build from `dist` and does not reimplement game mechanics.

- Android app: Capacitor/WebView package over the Vite app.
- iOS app: Capacitor/WebView package over the same responsive web app.
- Stick TV app: TV-friendly wrapper over the web app with remote-control navigation.

Usability and responsive behavior are first-class requirements. The web UI must work well on mobile, desktop, tablet and TV-like layouts before native wrappers are shipped.

### Android APK

```bash
npm run android:apk
```

The debug APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

For Android Studio:

```bash
npm run android:sync
npm run android:open
```

Before building a real APK, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your local environment so Vite embeds the right public Supabase configuration. Native signing files such as `.jks` and `.keystore` are ignored by Git.

The Android manifest declares touch as optional and includes a Leanback launcher entry, so the same APK can be installed on phones/tablets and Android TV or stick devices. The UI keeps keyboard/remote focus outlines visible for TV navigation.
