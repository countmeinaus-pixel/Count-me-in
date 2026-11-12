# Takenlijst: klaar voor echte gebruikers

Gemaakt op 13 november 2026. Alles wat nodig is voordat Count Me In live gaat voor echte mensen.
Werk van boven naar beneden. Vink af met `[x]` als iets klaar is.

**Wie doet wat:** 🧑 = Jai zelf · 🤖 = Claude bouwt het · 🤝 = samen

---

## 1. Blokkades (eerst)

- [ ] 🧑 **Domeinnaam kiezen en kopen** (bijv. `countmein.com.au`, ca. AUD 15–30 per jaar). Enige kostenpost. Nodig voor e-mail en een nette link.
- [ ] 🤝 **Eigen mailprovider (SMTP) instellen.** De ingebouwde mail van Supabase stuurt alleen naar je eigen team en maar een paar per uur, dus nieuwe gebruikers krijgen nu geen inlogcode.
  - Opties (gratis): Resend (3000 mails per maand) of Brevo (300 per dag).
  - Claude geeft stap voor stap de instellingen voor Supabase en de domeinnaam.
- [ ] 🤖 **Account verwijderen.** Knop in More > Privacy and safety. Verwijdert profiel, foto's, PR's, berichten en aanmeldingen, met een bevestigingsstap.
- [ ] 🤖 **Privacy policy** (eerste versie): wat we bewaren (naam, foto, geboortedatum, suburb, locatie bij delen), waarom, hoe lang, en hoe je het laat verwijderen.
- [ ] 🤖 **Terms of use** (eerste versie).
- [ ] 🤖 **Community guidelines**: respect, geen haat, geen verkoop/spam, veilig afspreken.
- [ ] 🧑 **Teksten laten nalezen** door iemand met juridische kennis (bijv. gratis juridisch spreekuur).
- [ ] 🤖 **Links naar deze pagina's** bij het aanmelden ("By continuing you agree to…") en in More > About.
- [ ] 🤖 **Verificatie eerlijk maken.** Telefoon- en selfiecheck zijn nagebootst. Haal teksten en vinkjes weg die suggereren dat leden gecontroleerd zijn, tot dat echt zo is.

## 2. Veiligheid

- [ ] 🤖 **Veiligheidstips**: kort scherm bij je eerste activiteit en een vaste plek in Help. Bijv. spreek af op een openbare plek, laat iemand weten waar je bent, vertrouw je gevoel, bel 000 bij nood.
- [ ] 🤖 **Report en Block in de chat**: vanuit een groepschat een lid of bericht melden of blokkeren (nu alleen via een profiel).
- [ ] 🧑 **Moderators vinden**: 1 of 2 vertrouwde mensen die je in Moderation > Team moderator maakt.
- [ ] 🤝 **Beslissen over Open activities**: blijven ze op goedkeuring wachten (dan moet er dagelijks iemand kijken) of gaan ze direct live en kan je ze achteraf verwijderen?

## 3. Betrouwbaarheid

- [ ] 🤖 **Foutmeldingen bijhouden** met Sentry (gratis plan). Je krijgt een mail als de app bij iemand vastloopt.
- [ ] 🤖 **Back-up maken**: het gratis plan van Supabase heeft geen automatische back-ups. Claude maakt een stappenplan om zelf een export te maken (bijv. eens per week).
- [ ] 🧑 **Supabase wakker houden tijdens stille periodes**: een gratis project pauzeert na 7 dagen zonder gebruik. Open de app minstens eens per week tot er vaste gebruikers zijn.
- [ ] 🤖 **Alle flows nalopen op fouten**, met duidelijke foutmeldingen en lege staten (fase 6).

## 4. Testen met echte mensen (fase 6)

- [ ] 🤖 **Testchecklist voor op je telefoon**: aanmelden, profiel, activiteit maken, meedoen, chat, QR-check-in, patches, PR, vriendschapsverzoek, pushmelding, account verwijderen.
- [ ] 🧑 **5 tot 10 vrienden uitnodigen** om de app een week of twee te gebruiken.
- [ ] 🤝 **Feedback verzamelen en verwerken** in een nieuwe takenlijst.

## 5. Live

- [ ] 🤝 **Domeinnaam koppelen aan Vercel** (Claude geeft de stappen).
- [ ] 🤖 **Laatste controle**: teksten, links, deelafbeelding, app-icoon, installeren op het beginscherm (iPhone en Android).
- [ ] 🧑 **Live!** Delen in je eigen netwerk en lokale groepen.

---

## Later (na de start)

- [ ] 🤖 Herinneringen een dag en een uur voor een activiteit (pushmelding).
- [ ] 🤝 Echte verificatie (telefoon of selfie). Kost geld per controle, dus pas als de app groeit. Claude zet eerst de opties en kosten op een rij.
