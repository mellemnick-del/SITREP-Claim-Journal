# SITREP Claim Journal

A daily symptom and evidence journal for veterans preparing a VA disability claim. Native iPhone app built with SwiftUI and SwiftData.

## Open it in Xcode

1. Download or clone this repo.
2. Open the **SITREP-iOS** folder and double-click **SITREP.xcodeproj**.
3. Pick an iPhone simulator at the top of Xcode and press ▶.

No Terminal, no extra installs. Requires Xcode 16 or newer; the app runs on iOS 17 and later.

**On your own iPhone:** plug it in, sign in under Xcode > Settings > Accounts, select the SITREP target > Signing & Capabilities > Team, pick your iPhone and press ▶.

## What it does

- **Today:** one-minute daily check-in (0 to 10 severity per condition, sleep, whether symptoms limited the day, notes), flare-up logging, and countdowns to key dates like the C&P exam and Intent to File expiration.
- **Log:** full timeline of check-ins and flare-ups, filterable by condition, with military date-time groups.
- **Conditions:** the conditions being claimed (with diagnostic code and claim status), a 30-day severity chart, flare-up stats and what to track for each one.
- **Evidence:** a locker grouped by condition with Need / Requested / Have status. Attach PDFs or photos, copied into the app's private storage.
- **Mental health check-ups:** PCL-5 (PTSD), PHQ-9 (depression) and GAD-7 (anxiety), one question at a time, with scoring, trends and due reminders. A concerning answer on PHQ-9 question 9 shows Veterans Crisis Line resources right away.
- **Export:** a PDF summary made on the phone (conditions, flare-ups, check-up trends and the veteran's own notes), shared through the share sheet.
- **Settings:** daily reminder, Face ID or passcode lock, backup and restore through a file, erase all data.
- **Veterans Crisis Line:** always one tap away on the More tab.

New users can start a real journal or load example data to look around.

## Project layout

```
SITREP-iOS/SITREP.xcodeproj     Xcode project (double-click to open)
SITREP-iOS/SITREP/
  SITREPApp.swift               App entry, tabs, welcome, lock screen, crisis card
  TodayView.swift               Daily check-in, flare-ups, upcoming dates
  LogView.swift                 Timeline
  ConditionsView.swift          Conditions, severity chart, add/edit
  EvidenceView.swift            Evidence locker and file attachments
  MoreView.swift                More tab, check-ups, questionnaire flow
  ExportView.swift              PDF summary
  SettingsView.swift            Reminders, app lock, backup, erase
  Models.swift                  SwiftData models
  Assessments.swift             PCL-5, PHQ-9, GAD-7 wording, scoring, crisis rules
  Services.swift                Reminders, Face ID, backup, PDF rendering
  Stats.swift, Dates.swift      30-day stats and date helpers
  ExampleData.swift             Sample journal
  Theme.swift                   Colors, fonts and shared components
  Fonts/, Assets.xcassets/      Bundled fonts, app icon, accent color
react-native/                   Earlier cross-platform version (Expo), kept for reference
prototype/index.html            Original clickable web prototype
```

## Clinical content

Questionnaire wording and scoring are in `SITREP-iOS/SITREP/Assessments.swift`. Before launch, a licensed clinician should check the wording against the official published forms. The app shows scores and standard ranges but never diagnoses.

## Principles

- An organizer, not legal or medical advice. Not affiliated with the VA.
- Private by design: no account, no server, nothing uploaded. Data lives on the phone.
- Affordable and on the veteran's side.
