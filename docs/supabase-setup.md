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
The Vercel rewrite in `vercel.json` sends app routes such as `/reset-password` to the React app, while preserving the URL fragment Supabase uses for recovery tokens.

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

## 7) Profile table permissions

If onboarding or profile saving reports `permission denied for table profiles`, the tables have Row Level Security policies but are missing the SQL privileges required by the signed-in app role. Apply this migration:

1. Open Supabase **SQL Editor** and choose **New query**.
2. Copy the full contents of `supabase/migrations/20261103110000_grant_authenticated_profile_access.sql`.
3. Paste the SQL into the editor and choose **Run**.

These grants allow authenticated users to perform the profile and sport-table operations used by the app. Existing Row Level Security policies continue to restrict profile, sport, and availability rows to the signed-in user's own records where applicable.

## 8) Moderation roles, reports and blocks

This migration adds protected user roles, a report queue for profiles and activities, retained report evidence, and block records. RLS hides blocked users' profiles, sports, availability and activities from each other, and prevents invitations between them. The app now provides profile/activity reporting, a staff-only report queue, and persisted profile blocks. Chat blocking will be connected when chat data is stored in Supabase.

1. Open Supabase **SQL Editor** and choose **New query**.
2. Copy the full contents of `supabase/migrations/20261103120000_moderation_roles_reports_blocks.sql`.
3. Paste the SQL into the editor and choose **Run**.
4. To make your own account an admin, replace `YOUR_LOGIN_EMAIL` in the query below with the email used for your Supabase sign-in, then run it in a new query:

   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin'
   from auth.users
   where lower(email) = lower('YOUR_LOGIN_EMAIL')
   on conflict (user_id) do update set role = excluded.role;
   ```

The app cannot grant admin roles to itself. Only a project administrator using SQL Editor can assign or change roles. Moderator appointments, sanctions, chat moderation and activity-image management are still separate remaining work.

## 9) Activity join requests

This migration adds private join requests with host-only accept/decline actions, capacity checks, and support for auto-accept. Requests are changed through database functions so users cannot accept themselves or bypass the activity's available spots.

1. Open Supabase **SQL Editor** and choose **New query**.
2. Copy the full contents of `supabase/migrations/20261103130000_activity_join_requests.sql`.
3. Paste the SQL into the editor and choose **Run**.

This migration depends on the existing `activities`, `profiles`, and moderation `blocked_users` schema.
Requests on saved activities are stored in Supabase; their status is visible on the activity detail and Home cards. Demo activities use browser-only storage and clearly indicate that they do not contact a host.

## 10) Full activity catalogue in create flow

The create-activity flow lists every sport in the shared catalogue, not only sports saved on the user's profile. This migration adds any missing catalogue entries, grants the table privileges the signed-in flow needs, and lets signed-in users host an activity using any catalogue sport, including **Open activity**. Row Level Security still restricts activity changes to the host. Profile sports remain listed first as a convenience.

1. Open Supabase **SQL Editor** and choose **New query**.
2. Copy the full contents of `supabase/migrations/20261103140000_activity_catalog_options.sql`.
3. Paste the SQL into the editor and choose **Run**.

## 11) Activity banner images

This migration creates a public `activity-covers` storage bucket for activity banners. Signed-in users can upload and remove images only in their own user-ID folder. The browser resizes the long edge to 1200 px and compresses the image to JPEG before upload.

1. Open Supabase **SQL Editor** and choose **New query**.
2. Copy the full contents of `supabase/migrations/20261103143000_activity_cover_images.sql`.
3. Paste the SQL into the editor and choose **Run**.
