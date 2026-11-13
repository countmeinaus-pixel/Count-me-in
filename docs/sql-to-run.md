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
| 9 | `supabase/migrations/20261112090000_profile_shared_location.sql` | Leden kunnen hun afgeronde locatie (~1 km) delen voor afstanden in km |
| 10 | `supabase/migrations/20261112120000_add_freediving.sql` | Freediving als nieuwe sport (kiezen bij Edit my sports en Create activity) |
| 11 | `supabase/migrations/20261112130000_sport_suggestions.sql` | Leden kunnen een nieuwe sport voorstellen; die activiteit wacht op een moderator. Alleen admins kunnen nog sporten toevoegen |
| 12 | `supabase/migrations/20261112140000_manage_moderators.sql` | Admin kan leden moderator maken en weer verwijderen (More > Moderation > Team) |
| 13 | `supabase/migrations/20261112150000_open_activity_review.sql` | Elke Open activity wacht op een moderator; uitgelogde bezoekers zien activiteiten weer |
| 14 | `supabase/migrations/20261112160000_review_suggest_sport.sql` | Bij goedkeuren kiezen: alleen de activiteit, of ook de sport voorstellen aan de admin |
| 15 | `supabase/migrations/20261112170000_push_notifications.sql` | Pushmeldingen: push-adressen per toestel en meldingsinstellingen per lid |
| 16 | `supabase/migrations/20261112180000_service_role_read_access.sql` | De push-functie mag de chat, activiteiten en instellingen lezen (anders komt er geen push) |
| 17 | `supabase/migrations/20261113090000_place_time_zones.sql` | Inchecken op de dag zelf en de tijd in het annuleerbericht gebruiken de tijdzone van de plek (Perth, Brisbane…) in plaats van altijd Adelaide |
| 18 | `supabase/migrations/20261113120000_direct_chats.sql` | Privéchats tussen vrienden (1-op-1): tabellen, wie mag lezen/sturen, live-updates. Daarna ook de 4e webhook `push-direct` maken (zie onder) |
| 19 | `supabase/migrations/20261113140000_avatar_size_limit.sql` | Profielfoto's max. 3 MB per bestand in de opslag (was 5 MB) |
| 20 | `supabase/migrations/20261113160000_admin_edit_profile.sql` | Admins kunnen het profiel van een lid aanpassen (username, geboortedatum, locatie, bio, foto weghalen); het lid krijgt een melding |

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
- **Na 9:** tik op Home linksboven op de locatie, vink **Also share my approximate location** aan en tik op **Use my current location**. Je krijgt geen foutmelding.
- **Na 10:** ga naar **More** > **My sports** en tik op **Edit**. In de lijst staat **Freediving** met een schelp-icoon.
- **Na 11:** ga naar **Create activity**. Onder de sporten staat **Can't find your sport? Suggest one**.
- **Na 12:** ga als admin naar **Moderation** > **Team**, zoek een lid en klik op **Make moderator**. Je krijgt geen foutmelding.
- **Na 13:** maak een Open activity. Je ziet "Waiting for review", en hij staat bij **Moderation** > **Review activities**.
- **Na 14:** klik bij **Review activities** op **Approve** en kies **Approve activity only**. De admin krijgt dan géén melding "New sport suggested".
- **Na 15:** ga naar **More** > **Notification settings** en zet **Push notifications on this device** aan. Je krijgt geen melding "This needs a database update".
- **Na 17:** plak in de SQL Editor `select public.place_time_zone('Cottesloe, WA');` en klik op **Run**. Je ziet `Australia/Perth`.
- **Na 18:** open het profiel van een vriend en tik op **Message**. Er opent een chat zonder foutmelding.
- **Na 20:** open als admin het profiel van een lid, tik rechtsboven op het menu en kies **Edit profile (admin)**. Het formulier laadt zonder foutmelding.
