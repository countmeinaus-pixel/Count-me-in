# Supabase setup for Count Me In

## 1) Copy the correct values from Supabase

In the Supabase dashboard:

1. Open your project.
2. Go to Project settings.
3. Open the API tab.
4. Copy:
   - Project URL
   - anon public key

Use those values in the app and in Vercel.

## 2) Local environment

Create a file named `.env.local` in the project root and paste the values like this:

```bash
VITE_SUPABASE_URL=https://your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

This file is already ignored by git.

## 3) Vercel environment variables

In Vercel:

1. Open the project.
2. Go to Settings > Environment Variables.
3. Add the exact same two variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Choose Production, Preview, and Development.
5. Redeploy.

Important: in Vite, browser variables must start with `VITE_`.

## 4) Password reset redirect URLs

In Supabase, open Authentication > URL Configuration and add these Redirect URLs:

- `http://localhost:8443/reset-password`
- `https://count-me-in-nine.vercel.app/reset-password`

If the production domain changes, add its `/reset-password` URL here as well.
