# Count Me In — persoonlijke checklist

## Huidige status
We zitten in fase 2 van het project: echte Supabase-authenticatie en profielopslag zijn in de app gebouwd. De code is al in de repo, maar er zijn nog een paar dingen die jij nog zelf moet doen in Supabase en in Vercel.

### Al klaar
- Supabase project aangemaakt
- `.env.local` aangemaakt met de browser-variabelen
- schema SQL voorbereid in `supabase/schema.sql`
- e-mail OTP login gemaakt in `src/screens/AuthScreen.tsx`
- onboarding met profielsave en foto-upload gemaakt in `src/screens/OnboardingScreen.tsx`
- lokaal build werkt (`npm run build`)

---

## Wat jij nu nog moet doen

### 1. Zet de juiste Supabase-keys in de app
Open het bestand `.env.local` in de projectroot en controleer dat dit staat:

```env
VITE_SUPABASE_URL=https://kpeequbmwlkcgmyloeyi.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_wITUl3ERXHRsGNW-BXh4eg_9KfAi1RL
```

Gebruik alleen de public anon key in de browser. De secret key niet in frontend of Vercel frontend-variabelen.

### 2. Zet de SQL in Supabase
Ga in Supabase naar:
1. `SQL Editor`
2. `New query`
3. plak de inhoud van `supabase/schema.sql`
4. klik op `Run`

Controleer daarna of deze tabellen zijn aangemaakt:
- `profiles`
- `sports`
- `profile_sports`
- `profile_availability`

### 3. Zet Row Level Security (RLS) goed
Controleer in Supabase dat voor elke tabel `Enable RLS` aan staat.

Check deze tabellen:
- `profiles`
- `profile_sports`
- `profile_availability`
- `sports`

Als er policies ontbreken, zet dan de policies uit `supabase/schema.sql` opnieuw aan.

### 4. Maak een Storage bucket aan
Ga naar:
1. `Storage`
2. `Create a new bucket`
3. naam: `avatars`
4. zet `Public bucket` aan
5. sla op

Dit is nodig voor de profielfoto upload.

### 5. Controleer Auth-instellingen
Ga naar:
1. `Authentication`
2. `Providers`
3. controleer `Email` is aan
4. controleer dat `Email OTP` beschikbaar is

De app gebruikt een eenmalige code via e-mail, niet SMS.

### 6. Zet env-variabelen in Vercel
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

### 7. Start de app lokaal
Open een terminal en voer uit:

```bash
cd "/Users/jai/Count Me In -CMI app"
npm run dev -- --host 0.0.0.0 --port 4173
```

Wat deze opdracht doet: de app starten in de browser op `http://localhost:4173/`.

### 8. Test de login-flow
Open de app in de browser.

1. Ga naar de loginpagina.
2. Vul je e-mailadres in.
3. Klik op `Verstuur code`.
4. Controleer je inbox.
5. Vul de code in.
6. Klik op `Inloggen`.
7. Je komt in de onboarding.

### 9. Test de onboarding
Vul de onboarding volledig in:
1. upload een profielfoto
2. vul `Voornaam` in
3. vul `Leeftijd` in
4. vul `Woonplaats` in
5. schrijf een bio
6. kies minimaal 1 sport
7. kies per sport een niveau
8. kies je beschikbaarheid
9. klik op `Profiel opslaan`

Controleer daarna in Supabase:
- `profiles`
- `profile_sports`
- `profile_availability`
- `Storage` → `avatars`

### 10. Controleer of het werkt
Je weet dat de setup goed is als:
- login met e-mailcode werkt
- onboarding opslaat
- foto upload in Storage zichtbaar is
- profielraden in Supabase verschijnen

---

## Volgende fase (na deze checklist)
Als dit werkt, gaan we verder met fase 3:
- echte activiteiten in de database
- create activity opslaan
- Home feed uit Supabase halen
- requests en accept/decline flow
- "Mijn activiteiten" en filters

---

## Korte samenvatting voor jou
Je hoeft nu vooral deze 5 dingen zelf te doen:
1. SQL draaien in Supabase
2. avatars bucket aanmaken
3. Vercel env-variabelen zetten
4. app lokaal testen met e-mail OTP
5. onboarding met foto opslaan controleren

Als je wilt, maak ik hierna direct de volgende checklist voor fase 3, zodat jij precies weet wat je daarna nog moet doen in Supabase en in de app.
