# Database-stappen voor Jai (Supabase)

Deze stappen moet je zelf in Supabase doen. Zolang ze niet gedaan zijn, laat de app een nette melding zien ("This needs a database update…") of valt hij terug op testdata.

## Zo voer je een SQL-bestand uit

1. Open [supabase.com](https://supabase.com) en log in. Kies het project **count-me-in**.
2. Klik links op **SQL Editor**.
3. Klik op **New query**.
4. Open in VS Code het bestand dat hieronder staat, selecteer alles (Cmd+A) en kopieer (Cmd+C).
5. Plak het in de SQL Editor (Cmd+V) en klik rechtsonder op **Run**.
6. Je ziet "Success. No rows returned". Klaar.

Doe de bestanden in de volgorde van deze lijst.

## Open stappen

- [ ] **1. Afmelden, uitnodigingen en notificaties** (taak 3 en 8)
  Bestand: `supabase/migrations/20261110120000_leave_activity_invites_notifications.sql`
  Wat het doet: een tabel `notifications` (met Row Level Security), de functie "Can't make it" (`leave_activity`), een melding als iemand je uitnodigt, en de functie om op een uitnodiging te antwoorden (`respond_to_activity_invite`).
  Testen daarna:
  - Doe met account B mee aan een activiteit van account A (niet vandaag). Tik op **Can't make it** → **Yes, I'm out**. B verdwijnt uit "Who's going" en uit de chat, in de chat staat "[naam] can't make it anymore.", en A ziet een melding onder de bel.
  - Nodig met A account B uit bij het maken van een activiteit. B ziet een melding met **Count me in** / **Not this time** en de activiteit onder **My activities → Invited**.

## Pushen naar GitHub (nodig om het online te zien)

De commits staan alleen op je Mac. Claude kan niet pushen, want deze Mac is via SSH ingelogd als **JaiBoekhout** en de repo staat onder **countmeinaus-pixel**.

1. Open in VS Code de tab **Source Control** (icoon met vertakkende lijntjes, links).
2. Klik op **Sync Changes** (of de drie puntjes → **Push**).
3. Vraagt hij om in te loggen bij GitHub, log dan in met het account **countmeinaus-pixel**.
4. Vercel zet de nieuwe versie daarna binnen een paar minuten online.
