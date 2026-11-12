# Checklist: Count Me In voor heel Australië

Gecontroleerd op 12 november 2026, op de code die op GitHub (`main`) staat.

Status: ✅ klaar · ❌ nog niet gedaan · ⚠️ werkt, maar moet anders

## 0. Eerst: staat het werk uit VS Code op GitHub?

- [x] ✅ **Ja** (13 nov). Op GitHub staat nog geen werk over meerdere steden of tijdzones. Wat je gisteren in VS Code hebt gedaan, staat waarschijnlijk alleen op je laptop.

Zo zet je het op GitHub:
1. Open VS Code met het project **Count-me-in**.
2. Klik links op het icoon **Source Control** (drie bolletjes met lijntjes).
3. Typ bovenin een korte omschrijving, bijvoorbeeld `Australia wide: start`.
4. Klik op **Commit** (zegt VS Code "no staged changes"? Klik dan op **Yes**).
5. Klik op **Sync Changes**.
6. Laat Claude daarna deze checklist opnieuw nalopen.

## 1. Tijdzones

Afspraak: tijden worden in de database in UTC opgeslagen. Een activiteit wordt getoond in de tijdzone van de **plek** van de activiteit, niet van de telefoon.

- [x] ✅ Activiteiten hebben een tijdzone: afgeleid uit de staat in de plek ("Cottesloe, WA" → `Australia/Perth`), in de app (`src/lib/timeZones.ts`) en in de database (`place_time_zone`). Geen extra kolom nodig.
- [x] ✅ Create activity en Edit activity rekenen de ingevulde tijd om met de tijdzone van de plek, met de hint "Times are in Perth time (AWST)" als die anders is dan die van je telefoon.
- [x] ✅ Kaarten, kaartweergave en detailpagina tonen de tijd van de plek, met een label zoals "AWST" als die anders is dan jouw eigen tijd. (Chattijden blijven in je eigen tijd: dat is wanneer jij het bericht kreeg.)
- [x] ✅ "Vandaag" bij inchecken gebruikt de tijdzone van de plek van de activiteit (app: `src/lib/timeZones.ts`, database: SQL 17 `20261113090000_place_time_zones.sql`).
- [x] ✅ Het annuleerbericht toont de tijd in de tijdzone van de plek (SQL 17).
- [x] ✅ Zomertijd klopt: NSW, VIC, TAS, ACT en SA hebben zomertijd; QLD, WA en NT niet (getest, ook de nacht van de overgang).

## 2. Locatie en steden

- [x] ✅ Lijst met steden of staten (bijvoorbeeld Adelaide, Melbourne, Sydney, Brisbane, Perth, Hobart, Canberra, Darwin, Gold Coast).
- [x] ✅ Suburbs: alle 17.000+ plaatsen in Australië (`public/au-localities.json`); voorheen alleen 65 Adelaide-suburbs (`src/data/adelaideSuburbs.ts`). Gebruikt bij onboarding, Edit profile, locatiekeuze en afstanden.
- [x] ✅ Profiel heeft een stad of staat naast de suburb.
- [x] ✅ Kaartpin mag overal in Australië (`isInAustralia`); voorheen alleen in Zuid-Australië liggen (`isInSouthAustralia` in `src/lib/location.ts`). Moet heel Australië worden.
- [x] ✅ Kaart op Home start boven je gekozen plek, de pinkiezer bij je suburb; voorheen altijd boven Adelaide (`src/components/ActivityMap.tsx`, `src/components/MapPinPicker.tsx`). Moet starten bij jouw stad.
- [x] ✅ Google Maps-link opent bij de ingevulde suburb (het voorbeeld-getal mag Adelaide blijven); voorheen altijd Adelaide (`src/components/LocationFields.tsx`).
- [x] ✅ Home en Friends starten (eerste keer op een toestel, ingelogd) rond de suburb uit je profiel, 25 km. Kies je zelf iets anders of "Anywhere", dan blijft die keuze staan.

## 3. Patches

- [x] ✅ Places patches per staat (Interstate, State hopper, All of Australia); voorheen zes Adelaide-regio's (`src/lib/regions.ts`). Moet per stad of staat.

## 4. Teksten

- [x] ✅ "All of Adelaide" is weg: `LocationControls.tsx`, `HomeScreen.tsx`, `AllActivitiesScreen.tsx`
- [x] ✅ Knop linksboven op Home toont je plek of "Anywhere"; voorheen standaard "Adelaide": `HomeScreen.tsx`
- [x] ✅ "New around Adelaide" is weg / "New mates around Adelaide": `CrewSection.tsx`, `MatesScreen.tsx`
- [x] ✅ Standaardtitel gebruikt de gekozen plek; voorheen "Sport at Adelaide": `CreateActivityScreen.tsx`
- [x] ✅ Welkomstslides: beschrijving van de foto zegt niet meer "Adelaide Hills"
- [x] ✅ "Made in Adelaide" op About (mag blijven, dat is waar je het maakt)

## 5. Projectregels

- [x] ✅ `CLAUDE.md` en `guidelines/app-spec.md` zeggen nog "for Adelaide". Aanpassen naar heel Australië, zodat Claude niet terug bouwt naar alleen Adelaide.

## 6. Testen op je telefoon (als alles hierboven ✅ is)

1. Zet in Edit profile je stad op **Perth**. Op Home zie je alleen activiteiten uit Perth.
2. Maak een activiteit in Perth om 18:00. Open hem op een tweede account in Sydney: er staat **6:00 PM AWST**.
3. Maak een activiteit in Brisbane in december. De tijd verschuift niet een uur (Queensland heeft geen zomertijd).
4. Zet een kaartpin in Melbourne. Je krijgt geen melding "not in South Australia".
5. Open de kaart op Home: hij start boven jouw stad.
