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

## 5) Activity creation database

The create-activity flow needs two additional tables: `activities` stores the activity details and optional sport presets, and `activity_invites` stores invitations. Both tables have Row Level Security policies. Activity hosts can manage their own activities; people can only read invitations addressed to them or created by them.

To apply the migration manually:

1. Open your Supabase project and choose **SQL Editor**.
2. Choose **New query**.
3. Open `supabase/migrations/20261101150000_create_activities.sql` in the project and copy its full contents.
4. Paste the SQL into the new query and choose **Run**.

The repository also has a GitHub Actions workflow that applies migrations when code is pushed to `main`, provided the Supabase GitHub secrets are configured. Do not apply this SQL manually as well if that workflow has already run successfully.

## 6) Profile date of birth

Profile editing and new onboarding saves the date of birth and calculates the age from it. Existing profiles keep their current age; the new date column remains empty until the user enters their date of birth. This migration also creates the public `avatars` bucket, limits uploads to compressed JPEGs up to 5 MB, and allows authenticated users to manage files only in their own user-ID folder.

To enable this:

1. Open Supabase **SQL Editor** and choose **New query**.
2. Copy the full contents of `supabase/migrations/20261103100000_add_profile_date_of_birth.sql`.
3. Paste it into the editor and choose **Run**.

The migration only adds a nullable `date_of_birth` column. It does not guess existing users' birthdays from their age.
