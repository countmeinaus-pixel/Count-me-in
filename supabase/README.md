# Supabase migration workflow

This project uses migration-based database changes instead of manually editing the live Supabase database.

## Local workflow

1. Edit or add SQL files in `supabase/migrations/`
2. Run:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

3. If needed, add the project ref and access token as environment variables.

## Automated workflow

Every push to `main` triggers the GitHub Action in `.github/workflows/supabase-db-push.yml`.

Set these repository secrets before enabling it:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`

This keeps the production schema synced automatically.
