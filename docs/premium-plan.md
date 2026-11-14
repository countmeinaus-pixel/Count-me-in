# Premium (Supporter) plan

Doel: alle Supporter-functies **en de partner-slider voor sponsors** bouwen, maar eerst alleen zichtbaar voor **admins en moderators**, zodat Jai ze kan testen. Later (na verhuizing van Vercel Hobby naar bijvoorbeeld Cloudflare Pages, en met betalingen) zetten we ze aan voor betalende leden.

Werk: S = klein (een kwartiertje tot een uur), M = middel (een paar uur), L = groot (een halve tot hele dag).

| # | Onderdeel | Werk | SQL nodig | Opmerking |
| --- | --- | --- | --- | --- |
| 0 | **Premium-schakelaar** (`has_premium()` in de database + `usePremium()` in de app) | S | ja | Nu: alleen admin/moderator. Later: ook betalende leden. Alle andere onderdelen gebruiken deze ene schakelaar. |
| 1 | Supporter-badge en -patch op je profiel | S | nee | |
| 2 | Profiel: eigen omslagfoto en favoriete spots | S–M | ja | Foto verkleind in de browser (max 800 px) |
| 3 | Jaaroverzicht "Your year outside" + uitgebreide statistieken | M | nee | Uit bestaande meetups; deelbaar als afbeelding |
| 4 | Slimme meldingen ("spearfishing binnen 10 km, in het weekend") | M | ja | Database-trigger bij een nieuwe activiteit; push via bestaande webhook. Wind/weer niet (geen gratis commerciële weer-API) |
| 5 | Privé-crews en activiteiten alleen voor je crew | L | ja | Nieuwe tabellen + aanpassing wie welke activiteit mag zien (voorzichtig testen) |
| 6 | **Stories** (verhalen met foto, lezen voor iedereen, plaatsen voor Supporters) | L | ja | Nieuw scherm, opslagmap voor foto's, melden en modereren. Geen likes-race of reacties-chaos: simpel houden |
| 7 | Early access | S | nee | Is eigenlijk de schakelaar uit 0 |
| 8 | Partner-slider (sponsors) + "geen partnerbanners" voor Supporters | M | ja | Beheer via Moderation; telt views en tikken. Eerst alleen zichtbaar voor admin/moderator (demo voor bedrijven), met een schakelaar per banner: **Concept** (alleen team) of **Live** (iedereen, pas na verhuizing van Vercel) |
| 9 | Betalen met Stripe (later) | M | ja | Pas na verhuizing van Vercel Hobby. Stripe Payment Links + webhook |

**Totaal (zonder 9):** ongeveer 5 tot 7 werkdagen zoals onze sessies nu.

**Volgorde:** 0 → 8 → 1 → 3 → 4 → 2 → 6 → 5. De partner-slider komt vroeg, zodat Jai hem kan laten zien als hij bij bedrijven langsgaat.
