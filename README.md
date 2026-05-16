# CleverGames

Juego diario web con React/Vite: 10 sudokus diarios, una prueba diaria de Cifras y una prueba diaria de Letras. La web está preparada para Supabase, GitHub, Vercel y una futura app Android.

## Enlaces del proyecto

- Supabase: https://supabase.com/dashboard/project/pxrglryplngacswthrhv
- GitHub: https://github.com/aiagent2eu-git/CleverGames
- Vercel: https://vercel.com/aiagent2eus-projects/clever-games

## Stack

- React + Vite + TypeScript
- Generación determinista por fecha local
- Sudoku con 10 niveles diarios
- Cifras con 6 números, objetivo y validación de expresión
- Letras con 9 letras y diccionario local provisional
- Supabase para clasificaciones diarias

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Supabase setup

1. Run `sql/20260516-001_create_daily_results.sql` in the Supabase SQL editor.
2. Copy `.env.example` to `.env.local`.
3. Fill in `VITE_SUPABASE_ANON_KEY`.

Without Supabase credentials, results are saved locally in the browser.

## Vercel setup

Set these environment variables in the Vercel project:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The repository includes `vercel.json` with the Vite build configuration.

## Android path

The lowest-friction path is Capacitor because the game is web-first and responsive. Once the web gameplay is stable, add Capacitor, configure the Android package, and reuse the Vite build output.
