# Count Me In: bouwplan met Claude Code

Werk fase voor fase. Plak per keer één prompt in Claude Code, controleer het resultaat en ga pas daarna verder.

---

## Fase 0: project klaarzetten (eenmalig)

### Wat je zelf doet
1. **Code uit Figma Make halen.** Open je Make-bestand, klik bovenaan op **Code** (het `</>`-icoon). Klik links bovenaan de bestandenlijst op het **downloadpijltje** ("Download code"). Je krijgt een .zip-bestand. Lukt dat niet omdat je credits op zijn, laat het me weten, dan bouwen we het vanaf de guidelines opnieuw op.
2. **Uitpakken.** Dubbelklik op de zip en zet de map op een vaste plek, bijvoorbeeld `Documenten/Projecten/count-me-in`.
3. **Bestanden toevoegen.** Zet in die map:
   - `CLAUDE.md` in de hoofdmap (naast `package.json`)
   - `build-plan.md` in een nieuwe map `docs`
   - Controleer of `guidelines/Guidelines.md` en `guidelines/app-spec.md` er al in zitten (ze komen mee uit Figma Make). Zo niet, zet ze daar neer.
4. **Openen in VS Code.** File > Open Folder > kies de map.
5. **Claude Code starten** in VS Code zoals je bij je portfolio deed.

### Prompt 0
```
Lees CLAUDE.md en docs/build-plan.md. Dit project is geëxporteerd uit Figma Make.
1. Bekijk de projectstructuur en vertel me in gewone taal wat je ziet en wat er nog ontbreekt.
2. Installeer de dependencies en zorg dat de app lokaal draait. Vertel me hoe ik hem in mijn browser open.
3. Zet git op, maak een .gitignore (met .env.local) en een eerste commit.
4. Help me stap voor stap een nieuwe GitHub-repository "count-me-in" aan te maken onder JaiBoekhout en de code te pushen.
5. Leg me daarna stap voor stap uit hoe ik het project in Vercel importeer (Hobby plan), zodat elke push automatisch online komt.
```

Klaar als: de app draait online op een `.vercel.app`-adres en je kunt hem op je telefoon openen.

---

## Fase 1: opschonen en compleet maken met testdata

```
We zitten in fase 1. Vergelijk de huidige code met guidelines/Guidelines.md en guidelines/app-spec.md.
1. Maak een lijst van wat er al is, wat afwijkt van het design system en welke schermen of flows ontbreken. Laat me die lijst eerst zien.
2. Ruim daarna de code op: alle kleuren via de tokens, herbruikbare componenten in src/components, één scherm per bestand in src/screens, routing met React Router.
3. Bouw de ontbrekende schermen en flows met de testdata, zodat ik de hele app kan doorklikken.
4. Maak de app installeerbaar als PWA (manifest, icoon, naam "Count Me In", donkere themakleur).
Commit en push na elk afgerond onderdeel.
```

Klaar als: je de hele app kunt doorklikken op je telefoon en hem op je beginscherm kunt zetten.

---

## Fase 2: echte accounts en profielen (Supabase)

### Wat je zelf doet
1. Maak een gratis account op supabase.com en een nieuw project "count-me-in" (regio: Sydney).
2. Claude Code vertelt je welke twee gegevens je moet kopiëren (Project URL en anon key) en waar je ze plakt.

### Prompt 2
```
We zitten in fase 2. Ik heb een Supabase-project aangemaakt.
1. Leg me stap voor stap uit welke gegevens ik uit Supabase moet kopiëren en waar ik ze neerzet (lokaal in .env.local en in Vercel).
2. Ontwerp de database voor gebruikers, profielen, sporten met niveau en beschikbaarheid. Zet Row Level Security aan met duidelijke regels. Geef me de SQL en vertel me waar ik die in Supabase plak, of voer het uit als dat kan.
3. Vervang de gesimuleerde SMS-login door inloggen met een eenmalige code via e-mail. Telefoon- en selfieverificatie blijven gesimuleerd in de UI.
4. Laat de onboarding het profiel echt opslaan, inclusief een profielfoto (verkleind in de browser voor het uploaden).
Commit en push na elk onderdeel en vertel me hoe ik het test.
```

---

## Fase 3: echte activiteiten

```
We zitten in fase 3. Maak activiteiten echt:
1. Database-tabellen voor activiteiten (met de presetvelden per sport) en aanmeldverzoeken, met Row Level Security.
2. De flow "Nieuwe activiteit" slaat echt op. De feed op Home toont echte activiteiten, met werkende sportfilters.
3. "Count me in" stuurt een echt verzoek. De organisator kan accepteren of weigeren in "Manage activity". Auto-accept werkt.
4. "Mijn activiteiten" toont Hosting, Going, Requested en Confirmed.
Houd de testdata als optie, zodat de feed niet leeg is tijdens het testen.
```

---

## Fase 4: chat

```
We zitten in fase 4. Bouw de groepschat per activiteit met Supabase Realtime. Alleen tekst. Alleen geaccepteerde deelnemers en de organisator kunnen de chat lezen en schrijven (Row Level Security). Systeemberichten als iemand meedoet. Ongelezen-stip in de navigatie.
```

---

## Fase 5: QR-check-in, statistieken en patches

```
We zitten in fase 5. Bouw de QR-check-in zoals in app-spec.md: elke deelnemer heeft een QR-code per activiteit, de ander scant hem met de camera van de telefoon. Een geslaagde scan bevestigt de meetup voor beide. Koppel daar de statistieken (bevestigde meetups, lolly-grafiek per maand) en de achievement patches aan. Gebruik alleen gratis libraries die in de browser werken.
```

---

## Fase 6: testen met echte mensen

```
We zitten in fase 6. Help me de app klaar te maken om met een paar vrienden te testen: loop alle flows na op fouten, voeg duidelijke foutmeldingen en lege staten toe, voeg Report en Block toe, en maak een korte checklist van wat ik zelf moet testen op mijn telefoon.
```
