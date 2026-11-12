# Checklist: Count Me In voor heel Australië

Gecontroleerd op 12 november 2026, op de code die op GitHub (`main`) staat.

Status: ✅ klaar · ❌ nog niet gedaan · ⚠️ werkt, maar moet anders

## 0. Eerst: staat het werk uit VS Code op GitHub?

- [ ] ❌ **Nog niet.** Op GitHub staat nog geen werk over meerdere steden of tijdzones. Wat je gisteren in VS Code hebt gedaan, staat waarschijnlijk alleen op je laptop.

Zo zet je het op GitHub:
1. Open VS Code met het project **Count-me-in**.
2. Klik links op het icoon **Source Control** (drie bolletjes met lijntjes).
3. Typ bovenin een korte omschrijving, bijvoorbeeld `Australia wide: start`.
4. Klik op **Commit** (zegt VS Code "no staged changes"? Klik dan op **Yes**).
5. Klik op **Sync Changes**.
6. Laat Claude daarna deze checklist opnieuw nalopen.

## 1. Tijdzones

Afspraak: tijden worden in de database in UTC opgeslagen. Een activiteit wordt getoond in de tijdzone van de **plek** van de activiteit, niet van de telefoon.

- [ ] ❌ Activiteiten hebben een tijdzone (bijvoorbeeld een kolom `time_zone` met `Australia/Perth`), ingevuld op basis van de stad of kaartpin.
- [ ] ❌ Create activity en Edit activity rekenen de ingevulde tijd om met de tijdzone van de plek. Nu gebruiken ze de tijdzone van de telefoon (`src/screens/EditActivityScreen.tsx`).
- [ ] ❌ Datums en tijden op kaarten, detailpagina, kalender en chat tonen de tijd van de plek, met een label zoals "AWST" als die anders is dan jouw eigen tijd.
- [x] ✅ "Vandaag" bij inchecken gebruikt de tijdzone van de plek van de activiteit (app: `src/lib/timeZones.ts`, database: SQL 17 `20261113090000_place_time_zones.sql`).
- [x] ✅ Het annuleerbericht toont de tijd in de tijdzone van de plek (SQL 17).
- [ ] ❌ Zomertijd klopt: NSW, VIC, TAS, ACT en SA hebben zomertijd; QLD, WA en NT niet. (Werkt vanzelf als we tijdzone-namen zoals `Australia/Brisbane` gebruiken, geen vaste +10:00.)

## 2. Locatie en steden

- [ ] ❌ Lijst met steden of staten (bijvoorbeeld Adelaide, Melbourne, Sydney, Brisbane, Perth, Hobart, Canberra, Darwin, Gold Coast).
- [ ] ⚠️ Suburbs: alleen 65 Adelaide-suburbs (`src/data/adelaideSuburbs.ts`). Gebruikt bij onboarding, Edit profile, locatiekeuze en afstanden.
- [ ] ❌ Profiel heeft een stad of staat naast de suburb.
- [ ] ⚠️ Kaartpin mag alleen in Zuid-Australië liggen (`isInSouthAustralia` in `src/lib/location.ts`). Moet heel Australië worden.
- [ ] ⚠️ Kaarten starten altijd boven Adelaide (`src/components/ActivityMap.tsx`, `src/components/MapPinPicker.tsx`). Moet starten bij jouw stad.
- [ ] ⚠️ Voorbeeld-coördinaten en Google Maps-link wijzen naar Adelaide (`src/components/LocationFields.tsx`).
- [ ] ❌ Home en Friends tonen standaard alleen activiteiten en leden uit jouw eigen stad (niet die uit Perth als je in Sydney woont).

## 3. Patches

- [ ] ⚠️ Places patches gebruiken zes Adelaide-regio's (`src/lib/regions.ts`). Moet per stad of staat.

## 4. Teksten

- [ ] ⚠️ "All of Adelaide": `LocationControls.tsx`, `HomeScreen.tsx`, `AllActivitiesScreen.tsx`
- [ ] ⚠️ Knop linksboven op Home toont standaard "Adelaide": `HomeScreen.tsx`
- [ ] ⚠️ "New around Adelaide" / "New mates around Adelaide": `CrewSection.tsx`, `MatesScreen.tsx`
- [ ] ⚠️ Standaardtitel "Sport at Adelaide": `CreateActivityScreen.tsx`
- [ ] ⚠️ Welkomstslides "Adelaide Hills": `AuthScreen.tsx`
- [ ] ⚠️ "Made in Adelaide" op About (mag blijven, dat is waar je het maakt)

## 5. Projectregels

- [ ] ❌ `CLAUDE.md` en `guidelines/app-spec.md` zeggen nog "for Adelaide". Aanpassen naar heel Australië, zodat Claude niet terug bouwt naar alleen Adelaide.

## 6. Testen op je telefoon (als alles hierboven ✅ is)

1. Zet in Edit profile je stad op **Perth**. Op Home zie je alleen activiteiten uit Perth.
2. Maak een activiteit in Perth om 18:00. Open hem op een tweede account in Sydney: er staat **6:00 PM AWST**.
3. Maak een activiteit in Brisbane in december. De tijd verschuift niet een uur (Queensland heeft geen zomertijd).
4. Zet een kaartpin in Melbourne. Je krijgt geen melding "not in South Australia".
5. Open de kaart op Home: hij start boven jouw stad.
