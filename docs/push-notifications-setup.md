# Pushmeldingen aanzetten (eenmalig)

Hiermee krijg je een melding op je telefoon, ook als de app dicht is. Alles is gratis (Supabase free plan).

Wat er gemeld wordt:
- vriendschapsverzoeken en geaccepteerde verzoeken
- iemand wil meedoen aan jouw activiteit (join request)
- nieuwe chatberichten
- een activiteit is geannuleerd, uitnodigingen, iemand kan niet komen
- PR's die bevestigd, geflagd of verified zijn

## Stap 1: database (SQL 15)

Draai `supabase/migrations/20261112170000_push_subscriptions.sql` in de SQL Editor, zoals in `docs/sql-to-run.md`.

## Stap 2: geheime sleutels in Supabase

Claude heeft je een bestand gegeven met 4 geheimen (`push-secrets.txt`). Zet die **nooit** in GitHub.

1. Open [supabase.com](https://supabase.com) en kies je project **count-me-in**.
2. Klik links op **Edge Functions**, dan op **Secrets**.
3. Vul bij **Name** `VAPID_PUBLIC_KEY` in en bij **Value** de tekst eronder uit het bestand.
4. Klik op **Add another** en doe hetzelfde voor `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` en `WEBHOOK_SECRET`.
5. Klik op **Save**.

## Stap 3: de functie maken

1. Klik links op **Edge Functions**, dan rechtsboven op **Deploy a new function** en kies **Via Editor**.
2. Open op GitHub het bestand `supabase/functions/send-push/index.ts` en klik op het **kopieer-icoon**.
3. Haal in de Supabase-editor alle voorbeeldcode weg en plak de code.
4. Zet de naam van de functie (onderaan) op `send-push`.
5. Klik op **Deploy function**.
6. Open de functie, ga naar **Details** en zet **Enforce JWT verification** (of "Verify JWT") **uit**. Klik op **Save changes**. (De functie controleert zelf het `WEBHOOK_SECRET`.)

## Stap 4: drie webhooks maken

Deze laten de database de functie aanroepen als er iets nieuws is.

1. Klik links op **Database** (of **Integrations**) en dan op **Webhooks**. Zie je **Enable webhooks**? Klik daar eerst op.
2. Klik op **Create a new hook**.
3. Vul in:
   - **Name:** `push_notifications`
   - **Table:** `notifications`
   - **Events:** alleen **Insert** aanvinken
   - **Type of webhook:** **Supabase Edge Functions**
   - **Edge Function:** `send-push`, method **POST**
   - **HTTP Headers:** klik op **Add a new header**. Name: `x-webhook-secret`, Value: de waarde van `WEBHOOK_SECRET` uit het bestand.
4. Klik op **Create webhook**.
5. Herhaal stap 2 tot en met 4 nog twee keer, met:
   - Name `push_chat_messages`, Table `activity_chat_messages`
   - Name `push_join_requests`, Table `activity_join_requests`

## Stap 5: op je telefoon

**Android**
1. Open de app in **Chrome**.
2. Tik rechtsboven op de **drie puntjes** en dan op **App installeren** (of **Toevoegen aan startscherm** > **Installeren**).
3. Open de app vanaf je startscherm en log in.
4. Ga naar **More** > **Notification settings** en zet **Push notifications on this device** aan. Tik op **Toestaan**.
5. Nu staat **Count Me In** ook in de lijst bij Android-instellingen > Meldingen.

**iPhone**
1. Open de app in **Safari**, tik op **Deel** en dan **Zet op beginscherm**.
2. Open de app vanaf het beginscherm, en volg stap 3 en 4 hierboven.

## Testen

Laat iemand anders (of een tweede account) je een vriendschapsverzoek sturen of een chatbericht in een gedeelde activiteit. Binnen een paar seconden krijg je een melding.

Werkt het niet? In Supabase > **Edge Functions** > **send-push** > **Logs** staat wat er misging. Maak er een screenshot van voor Claude.
