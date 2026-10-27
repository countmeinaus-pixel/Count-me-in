# Count Me In — persoonlijke checklist

## Huidige status
We zitten nu in fase 2 met een werkende basis: Supabase is gekoppeld, de database migratie is verzonden, en de app kan lokaal bouwen. De belangrijkste resterende taak is de live Vercel-deploy met de juiste environment variables.

### ✅ Al klaar
- GitHub repo gemaakt en pushed
- Supabase project aangemaakt
- Supabase CLI werkend op deze Mac
- geldig `sbp_...` token gebruikt
- project gelinkt met project-ref `kpeequbmwlkcgmyloeyi`
- database migratie uitgevoerd via `npm run db:push`
- tabelen en RLS zijn in Supabase live
- `.env.local` aanwezig met browser-variabelen
- e-mail OTP login gebouwd
- onboarding + profielsave + foto-upload gebouwd
- lokaal build gecontroleerd (`npm run build`)

---

## Nog over

### 1. Zet de Vercel env-variabelen neer
Ga in Vercel naar:
1. `Project`
2. `Settings`
3. `Environment Variables`
4. voeg toe:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. kies `Production`, `Preview`, `Development`
6. klik op `Save`
7. voer een redeploy uit

### 2. Controleer de live app één keer
Open de deployed app en test:
- e-mail OTP login
- onboarding-save
- foto-upload
- profiel in Supabase

### 3. Daarna: fase 3
Als de live app werkt, start fase 3:
- echte activiteiten in de database
- create activity opslaan
- Home feed uit Supabase halen
- requests en accept/decline flow
- "Mijn activiteiten" en filters

---

## Urgent?
Niet echt. De echte blockers zijn weg. De enige echte remaining task is de Vercel deploy en een snelle live smoke test.

---

## Korte samenvatting
De checklist is nu vooral:
- [x] Supabase project + schema + token + migrate
- [x] app build en login/onboarding flow
- [x] repo + GitHub klaar
- [ ] Vercel deploy + live test

Als je wilt, ga ik direct de volgende fase voor je in kleinere taken uitschrijven, zodat je precies weet wat daarna moet gebeuren in Supabase en in de app.
