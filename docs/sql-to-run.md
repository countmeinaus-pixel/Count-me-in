# SQL om te runnen in Supabase

De automatische database-update via GitHub werkt nog niet (de geheime instellingen ontbreken). Plak deze bestanden daarom zelf in Supabase, **in deze volgorde**, één per keer.

Alle bestanden zijn veilig om opnieuw te draaien. Weet je niet zeker of je er een al gedaan hebt? Draai hem gewoon nog een keer.

| # | Bestand | Wat het doet |
| --- | --- | --- |
| 1 | `supabase/migrations/20261110120000_leave_activity_invites_notifications.sql` | Meldingen, "Can't make it" en uitnodigingen beantwoorden |
| 2 | `supabase/migrations/20261110180000_host_cancel_activity.sql` | Host kan een activiteit annuleren (Cancel activity) |
| 3 | `supabase/migrations/20261110200000_challenge_enrollments.sql` | Aanmelden voor challenges op het Patches-scherm |
| 4 | `supabase/migrations/20261110220000_personal_records.sql` | Personal records (PR's) claimen, bevestigen en flaggen, plus de fotomap `pr-proofs` |
| 5 | `supabase/migrations/20261111090000_staff_verify_personal_records.sql` | Admins en moderators kunnen een PR direct verifiëren (Moderation > PRs to check) |
| 6 | `supabase/migrations/20261111100000_pr_photo_cleanup.sql` | Bewijsfoto van een PR wordt verwijderd zodra de PR verified is |
| 7 | `supabase/migrations/20261111110000_activity_location.sql` | Adres en kaartpin bij een activiteit, zodat hij op de kaart op Home staat |
| 8 | `supabase/migrations/20261111120000_friend_requests.sql` | Vriendschapsverzoeken: Add friend, Accept/Decline, echte vriendenlijst |

## Zo doe je het (per bestand)

1. Open het bestand op GitHub: ga naar je repository **Count-me-in**, klik op de map **supabase**, dan **migrations**, en dan op het bestand.
2. Klik rechtsboven op het **kopieer-icoon** ("Copy raw file").
3. Open [supabase.com](https://supabase.com), kies je project **count-me-in** en klik links op **SQL Editor**.
4. Klik op **New query**.
5. Plak de tekst (Ctrl+V of Cmd+V) en klik rechtsonder op **Run**.
6. Onderaan moet **Success. No rows returned** staan. Zie je een rode foutmelding? Maak een screenshot en stuur hem naar Claude. Ga dan nog niet door naar het volgende bestand.

## Zo controleer je of het werkt

- **Na 2:** open een eigen activiteit, tik op **Edit activity**, scroll naar beneden en tik op **Cancel activity**. Je krijgt geen melding "This needs a database update" meer. Tik op **Keep it** als je niet echt wilt annuleren.
- **Na 3:** ga naar **More** > **Patches** en tik bij een challenge op **Join challenge**. Er verschijnt een voortgangsbalk.
- **Na 4:** ga naar **More** > **Personal records**. De rode melding is weg en je kunt op **Claim a PR** tikken.
- **Na 6:** open **More** > **Personal records**. Bij een verified PR staat geen **View proof** meer.
- **Na 5:** ga naar **More** > **Moderation** en tik op **PRs to check**. Je ziet PR's die nog niet verified zijn, met de knoppen **Verify** en **Remove**.
- **Na 7:** maak een activiteit en plak bij **Map pin** bijvoorbeeld `-34.9799, 138.5144` (Glenelg). Open daarna Home > **Map**: je activiteit staat als oranje pin op de kaart.
- **Na 8:** open het profiel van een ander lid. Onder zijn naam staat **Add friend**.
