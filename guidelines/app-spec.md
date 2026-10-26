# Count Me In: App Specification

## What the app is

Count Me In helps men in Adelaide find a mate for the sports and outdoor activities they love. You post a callout ("Saturday, spearfishing at Port Noarlunga, who's in?"), other men nearby tap "Count me in", you meet up and do it together. Friendships grow from doing things side by side.

- Audience: men only, 18 and older, living in or around Adelaide, South Australia.
- Typical user: an expat or newcomer with few local friends, or a local whose partner and friends don't share his hobbies.
- Mission (not shown in the UI): men's mental health, through real-world friendship. The app itself feels like a sports and mates app, never a support app.
- Tagline: "Find your mates for the things you love."
- Region: all of Adelaide and surrounds. Users show a suburb, never an exact address.

## Navigation

Bottom navigation with 5 tabs:
1. **Home**: feed of upcoming activities in Adelaide.
2. **My activities**: activities I'm hosting or have joined (Upcoming / Past).
3. **Create** (center orange button): start a new activity.
4. **Chats**: one group chat per activity I'm part of.
5. **Profile**: my profile, stats, achievement patches, settings, About.

## Activities and presets

Every activity has the **common fields** plus the **preset fields** of its sport.

### Common fields (all activities)
- Sport (or Open activity)
- Title (auto-suggested from sport + location, editable)
- Date
- Start time
- Meeting point (free text, for example "Car park at Port Noarlunga jetty") and suburb
- Group size: "1 buddy" or "Small group" (2 to 8 spots, stepper)
- Level wanted: Any, Beginner friendly, Intermediate, Experienced
- Notes (optional, max 300 characters)

### Sport presets

| Sport | lucide icon | Preset fields |
| --- | --- | --- |
| Running | `footprints` | Distance (km), Pace (Easy 6:30+ /km, Steady 5:30 to 6:30, Fast under 5:30), Terrain (Road, Trail, Track) |
| Hiking | `mountain` | Trail or destination, Distance (km), Elevation (Flat, Moderate, Steep), Est. duration (hrs) |
| Spearfishing | `fish` | Spot, Depth (0 to 5 m, 5 to 10 m, 10 to 15 m, 15 m+), Entry (Shore dive, Boat dive), Duration (hrs), Own gear needed (Yes/No) |
| Kitesurfing | `wind` | Spot, Discipline (Freeride, Freestyle, Foil, Wave), Duration (hrs) |
| Surfing | `waves` | Spot, Board (Shortboard, Longboard, Any), Duration (hrs) |
| Swimming | `waves` (seafoam tint) | Location (Ocean, Pool), Distance (m), Pace (Relaxed, Steady, Training) |
| Gym | `dumbbell` | Gym name, Focus (Strength, Hypertrophy, Cardio, Functional), Duration (mins) |
| Mountain biking | `bike` | Trail park, Distance (km), Trail grade (Green, Blue, Black) |
| Road cycling | `bike` (accent tint) | Route, Distance (km), Avg speed (Social under 25 km/h, Steady 25 to 30, Fast 30+) |
| SUP / kayak | `sailboat` | Location, Craft (SUP, Kayak), Distance (km) |
| Scuba diving | `anchor` | Dive site, Max depth (m), Certification needed (Open Water, Advanced, Rescue or higher) |
| Climbing / bouldering | `mountain-snow` | Venue, Setting (Indoor, Outdoor), Grade range (free text) |
| Open activity | `plus` | Activity name (free text), Description |

The ActivityCard shows the 2 or 3 most useful preset facts, for example:
- Spearfishing: "5 to 10 m · Shore dive · 2 hrs"
- Hiking: "12 km · Steep · 4 hrs"
- Running: "8 km · Steady pace · Trail"

### Levels (per sport, in the profile)
Beginner, Intermediate, Experienced.

## Trust and safety

- Every user verifies with a mobile number (SMS code) and a selfie check before joining or hosting.
- Phone numbers are never shown to other users.
- Verified users show a seafoam tick next to their name.
- Contact happens through in-app chat only (text only, no photos).
- Each profile shows "Confirmed meetups" (count of QR check-ins), which builds trust.
- Report and block options live in the profile "more" menu (simple UI only).

## Joining and chat rules

- Tapping "Count me in" sends a join request with an optional short message.
- The host accepts or declines. Hosts can switch on "Auto-accept" when creating the activity.
- Once accepted, you join the activity's group chat (host plus all accepted members).
- When an activity is full, the button changes to "Full" (disabled) with a "Join waitlist" ghost button.

## QR check-in (confirming a meetup)

- On the day of the activity, the activity detail screen shows a "Check in" button.
- Check in opens the QRCard with my code and a "Scan their code" button (simulate the scan in the prototype: show a camera frame, then a success state).
- Either person can scan. A successful scan confirms the meetup for both users and counts towards stats and achievement patches.
- Success state: "Meetup confirmed. Enjoy it, mate." plus any patch earned.

## Achievement patches (gamification)

Patches are about doing things together, never about collecting people. Initial set:
- First meetup: 1 confirmed meetup
- Regular: 5 confirmed meetups
- Crew: 10 confirmed meetups
- Early bird: 3 meetups starting before 7 am
- Salt water: 5 ocean activities (spearfishing, surfing, kitesurfing, swimming ocean, SUP, scuba)
- Trailhead: 5 hikes or trail runs
- Host: hosted 3 activities with at least one confirmed meetup
- All rounder: confirmed meetups in 4 different sports

## Screens

### Onboarding (first launch)
1. **Welcome**: full-bleed coastal photo with dark gradient, logo wordmark "Count Me In" in Barlow Condensed, tagline, "Get started" (primary) and "I already have an account" (ghost).
2. **Phone number**: Australian number input (+61 prefix). "Send code".
3. **Verify code**: 6-digit code boxes, resend timer. Any 6 digits work in the prototype.
4. **Community check**: two required checkboxes: "I'm 18 or older" and "I'm a man joining a community for men". Short community rules below (Show up when you say you will. Respect each other. Look out for your mates, especially in risky sports). "Agree and continue".
5. **Your profile**: photo upload (circle placeholder), first name, age, suburb (search field with Adelaide suburbs), short bio (optional, 150 characters).
6. **Selfie check**: camera frame with face outline, "Take selfie", then a verifying spinner, then "You're verified" with the seafoam tick.
7. **Pick your sports**: SportTile grid, multi-select, minimum 1. Search at top. "Continue (3 selected)".
8. **Your level**: one row per selected sport with three Chips (Beginner, Intermediate, Experienced).
9. **When are you usually free?**: Chips: Weekday mornings, Weekday evenings, Saturdays, Sundays, Flexible. Multi-select.
10. **All set**: "You're in, [name]." Short line, "See activities" button, lands on Home.

Use ProgressSteps on steps 2 to 9.

### Home (feed)
- TopBar: "Adelaide" with a small location icon on the left, bell icon on the right.
- Greeting line in `h1`: "Morning, Jai" (time-based).
- Horizontal scroll of filter Chips: "My sports" (default selected), then each sport.
- Section "This week" then "Coming up", each with ActivityCards.
- EmptyState when no matches: "Nothing on for this sport yet", "Be the first. Post a callout." with "Create activity".

### Activity detail
- Large header image for the sport or spot, back button and share icon over it.
- Sport label, title `h1`, date and time in seafoam.
- Facts grid: preset fields as 2-column tiles (label + value in Barlow Condensed).
- Meeting point row with suburb.
- Level wanted (LevelPill) and SpotsIndicator.
- Host card: Avatar 48, name, verified tick, "12 confirmed meetups", their level in this sport, "View profile".
- "Who's going": row of avatars.
- Notes from the host.
- Sticky bottom bar: "Count me in" (primary, lg). If already joined: "You're in" state with "Open chat" secondary. On activity day: "Check in". If I'm the host: "Manage activity".

### Join flow
1. Activity detail, tap "Count me in".
2. BottomSheet: "Join [host]'s activity?", optional message field ("Keen as, I've dived there a few times"), "Send request".
3. Toast "Request sent to Matt". Button state: "Requested" (secondary, disabled look) with "Cancel request" ghost.
4. Simulate host acceptance after 3 seconds: Toast "You're in", button becomes "Open chat", activity appears in My activities, chat appears in Chats with a system message "You joined the activity".

### Create activity flow (from the center + button)
1. **What are you up to?**: SportTile grid including "Open activity".
2. **The details**: preset fields for the chosen sport (see table), using Inputs, Chips and steppers.
3. **When and where**: date picker (next 30 days), start time, meeting point, suburb.
4. **Who are you after?**: "1 buddy" or "Small group" toggle; spots stepper if group; level wanted Chips; Auto-accept toggle; notes.
5. **Review**: preview of the ActivityCard exactly as others will see it, plus all details. "Post activity" (primary). "Edit" links per section.
6. **Posted**: "Your callout is live." with the card, "View activity" and "Back to home".

Use ProgressSteps on steps 1 to 5. The Next button stays disabled-looking until required fields are filled, and shows which field is missing on tap.

### Manage activity (host)
- Requests list: avatar, name, level, message, "Accept" (primary sm) and "Decline" (ghost sm).
- Going list.
- Actions: "Edit activity", "Cancel activity" (destructive, confirmation sheet).

### My activities
- Segmented control: Upcoming / Past.
- Cards with a status tag: Hosting, Going, Requested, Confirmed (after check-in).
- Past activities without a check-in show "Did you meet up? Check in" link.

### Chats
- List of activity group chats: sport icon, activity title, last message, time, unread dot.
- Chat screen: TopBar with activity title and date (tap opens activity detail), ChatBubbles, text input with send icon button. Text only.

### Profile (mine and others)
- Avatar 96 with verified tick, name, age, suburb, bio.
- Stats row (3 tiles): Confirmed meetups, Activities hosted, Sports.
- StatChart: meetups per month (last 6 months).
- My sports: list of SportTile-style rows with LevelPill.
- Achievement patches grid (earned and locked).
- On my own profile: "Edit profile", "Settings", "About Count Me In". On others: "Report" and "Block" in the more menu.

### About Count Me In
- Short story: "Count Me In started with one bloke in Adelaide who wanted someone to go spearfishing with. Turns out he wasn't the only one."
- One quiet section at the bottom titled "Need someone to talk to?" with:
  - Beyond Blue: 1300 22 4636
  - MensLine Australia: 1300 78 99 78
- No other mental health content anywhere in the app.

## Mock data

Create `data/` with:
- **Current user**: Jai, 37, Port Noarlunga, verified, sports: Spearfishing (Intermediate), Kitesurfing (Beginner), Hiking (Intermediate), Running (Intermediate), Gym (Experienced). 7 confirmed meetups, 2 hosted. Patches earned: First meetup, Regular, Salt water.
- **Other users** (8): Matt 34 Brighton, Luca 29 Glenelg, Sam 41 Aldinga, Hamish 36 Stirling, Raj 32 Mawson Lakes, Ben 45 Seaford, Tom 27 Norwood, Dave 39 Semaphore. All verified, with 2 to 4 sports each and confirmed meetups between 1 and 25.
- **Activities** (10), spread over the next 14 days:
  - Spearfishing, Port Noarlunga reef, 5 to 10 m, shore dive, 2 hrs, host Matt, 2 of 4 spots
  - Hiking, Waterfall Gully to Mount Lofty summit, 8 km, steep, 3 hrs, host Hamish, small group 3 of 6
  - Kitesurfing, Brighton jetty, freeride, 2 hrs, host Luca, 1 buddy wanted
  - Running, Onkaparinga River trail, 12 km, steady, trail, host Sam, 1 of 3
  - Gym, Fitness centre in Norwood, strength, 60 mins, host Tom, 1 buddy wanted
  - Mountain biking, Eagle Mountain Bike Park, 15 km, blue, host Raj, 2 of 4
  - Scuba diving, Rapid Bay jetty, max 12 m, Open Water, host Ben, 1 of 4
  - Surfing, Middleton Point, any board, 2 hrs, host Dave, 1 buddy wanted
  - Swimming, Glenelg beach, ocean, 1500 m, steady, host Luca, small group 2 of 8
  - Open activity, "Sunday arvo fishing off Semaphore jetty", host Dave, 1 of 4
- **Chats**: 2 group chats for activities Jai has joined, each with 4 to 6 realistic, casual messages (Aussie tone: "Keen", "Viz looked decent yesterday", "I'll bring a spare float").
- **Join requests**: 2 pending requests on an activity Jai hosts (a hike, Morialta Falls, 10 km, moderate).
