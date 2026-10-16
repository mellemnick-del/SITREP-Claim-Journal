# SITREP Claim Journal

A daily symptom and evidence journal for veterans preparing a VA disability claim. One codebase runs on Android and iPhone (React Native with Expo).

## What it does

- **Today:** one-minute daily check-in (0 to 10 severity per condition, sleep, whether symptoms limited the day, notes), flare-up logging, and countdowns to key dates like the C&P exam and Intent to File expiration.
- **Log:** full timeline of check-ins and flare-ups, filterable by condition, with military date-time groups.
- **Conditions:** add the conditions you're claiming (with diagnostic code and claim status), see a 30-day severity chart, flare-up stats and what to track for each one.
- **Evidence:** a locker grouped by condition with Need / Requested / Have status. Attach PDFs or photos, which are copied into the app's private storage.
- **Mental health check-ups:** the PCL-5 (PTSD), PHQ-9 (depression) and GAD-7 (anxiety) questionnaires, one question at a time, with scoring, trends and reminders when one is due. A concerning answer on PHQ-9 question 9 shows Veterans Crisis Line resources right away.
- **Export:** builds a PDF summary on the phone (conditions, flare-ups, check-up trends and the veteran's own notes) and opens the share sheet to email, print or save it.
- **Settings:** daily check-in reminder, Face ID or passcode lock, backup and restore through a file, and erase all data.
- **Veterans Crisis Line:** always one tap away on the More tab.

New users can start a real journal or load example data to look around.

## Clinical content

Questionnaire wording and scoring are in `src/assessments.ts`. Before launch, a licensed clinician should check the wording against the official published forms. The app shows scores and standard ranges but never diagnoses.

## Principles

- An organizer, not legal or medical advice. Not affiliated with the VA.
- Private by design: no account, no server, nothing uploaded. Data lives in a SQLite database on the phone.
- Affordable and on the veteran's side.

## Run it on your phone

1. Install [Node.js](https://nodejs.org) (LTS) on your computer.
2. In this folder, run `npm install`, then `npx expo start`.
3. Install **Expo Go** on your phone (Play Store or App Store).
4. Scan the QR code from the terminal: with Expo Go on Android, or with the Camera app on iPhone. Your phone and computer need to be on the same Wi-Fi.

Run `npm run typecheck` to check the code.

## Project layout

```
App.tsx                 Fonts, navigation and tab bar
src/db.ts               SQLite schema, queries and example data
src/store.tsx           Shared app state and 30-day stats
src/screens/            Today, Log, Conditions, Evidence, More, Check-ups, Export, Settings
src/assessments.ts      PCL-5, PHQ-9 and GAD-7 wording, scoring and crisis rules
src/backup.ts           Backup file export and import
src/Lock.tsx            Face ID / passcode app lock
src/reminders.ts        Daily reminder notifications
src/ui.tsx              Shared components (panels, chips, buttons, inputs)
src/theme.ts            Light and dark color palettes and fonts
prototype/index.html    Original clickable web prototype
```

## Publishing (later)

Store builds are made with Expo's cloud build service (`npx eas-cli build`), which can also build the iPhone version without a Mac. You'll need a Google Play developer account ($25 one time) and an Apple Developer account ($99 per year).
