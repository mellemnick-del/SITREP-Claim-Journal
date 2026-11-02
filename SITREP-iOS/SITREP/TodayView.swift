import SwiftUI
import SwiftData
import UIKit

struct TodayView: View {
    @Environment(\.modelContext) private var ctx
    @Environment(Toaster.self) private var toaster
    @AppStorage(Keys.isExample) private var isExample = false

    @Query(sort: \Condition.sort) private var conditions: [Condition]
    @Query private var checkIns: [CheckIn]
    @Query private var flares: [Flare]
    @Query(sort: \Deadline.date) private var deadlines: [Deadline]
    @Query private var assessments: [Assessment]

    @State private var severity: [String: Double] = [:]
    @State private var sleep: Double = 7
    @State private var limited = false
    @State private var note = ""
    @State private var showFlare = false
    @State private var showDeadline = false
    @State private var loadedFor: Date?

    private var todayKey: String { Dates.key(Dates.today()) }
    private var existing: CheckIn? { checkIns.first { $0.day == todayKey } }

    var body: some View {
        Page {
            HStack {
                Wordmark()
                Spacer()
                if isExample { Chip(label: "Example data", tone: .warn) }
            }
            PageHeader(eyebrow: Dates.long(Dates.today()), title: existing == nil ? "Today's check-in" : "You're logged for today")
            StatRow(items: [
                ("\(Stats.streak(checkIns))", "day streak"),
                ("\(Stats.daysLogged(checkIns))/30", "days logged"),
                ("\(flares.filter { $0.start >= Stats.windowStart }.count)", "flare-ups, 30 days"),
            ])

            checkupsDue
            upcoming

            if showFlare {
                FlareForm(conditions: conditions) { showFlare = false }
            }

            checkInPanel

            Fine("SITREP is an organizer. It isn't legal or medical advice and isn't affiliated with the VA. Talk with an accredited VSO about your claim. Everything you enter stays on this phone.")
        }
        .toolbar(.hidden, for: .navigationBar)
        .onAppear(perform: loadDraft)
        .onChange(of: conditions.count) { _, _ in loadDraft() }
    }

    // MARK: Sections

    @ViewBuilder private var checkupsDue: some View {
        let due = Instrument.order.filter { Instrument.due($0, in: assessments).due }
        if !due.isEmpty {
            Panel {
                HStack {
                    H2("Check-ups due")
                    Spacer()
                    Chip(label: "\(due.count) due", tone: .warn)
                }
                Text("\(due.map { $0.instrument.short }.joined(separator: ", ")). A few minutes each, and they show your provider how you're trending. Find them under More.")
                    .font(Fonts.body(13)).foregroundStyle(Palette.muted)
            }
        }
    }

    @ViewBuilder private var upcoming: some View {
        let list = deadlines.filter { Dates.daysUntil($0.date) >= 0 }
        Panel {
            HStack {
                H2("Coming up")
                Spacer()
                if !showDeadline {
                    Button { showDeadline = true } label: { Chip(label: "Add date", tone: .accent) }.buttonStyle(.plain)
                }
            }
            if showDeadline {
                DeadlineForm { showDeadline = false }
            }
            if list.isEmpty && !showDeadline {
                Text("Add your C&P exam, VSO appointments, or when your Intent to File expires.")
                    .font(Fonts.body(13)).foregroundStyle(Palette.muted)
            }
            ForEach(list) { d in
                let n = Dates.daysUntil(d.date)
                let soon = n <= 14
                HStack(alignment: .top, spacing: 12) {
                    VStack(spacing: 0) {
                        Text("\(n)").font(Fonts.display(22)).foregroundStyle(soon ? Palette.warn : Palette.fg)
                        Text(n == 1 ? "DAY" : "DAYS").font(Fonts.semibold(10)).foregroundStyle(soon ? Palette.warn : Palette.muted)
                    }
                    .frame(width: 56)
                    .padding(.vertical, 6)
                    .background(soon ? Palette.warnSoft : Palette.sunken, in: RoundedRectangle(cornerRadius: 8))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(d.title).font(Fonts.semibold()).foregroundStyle(Palette.fg)
                        if !d.detail.isEmpty {
                            Text(d.detail).font(Fonts.body(13)).foregroundStyle(Palette.muted)
                        }
                        HStack {
                            Text(Dates.full(d.date)).font(Fonts.mono()).foregroundStyle(Palette.muted)
                            Spacer()
                            Button("Remove") { ctx.delete(d) }
                                .font(Fonts.medium(13)).foregroundStyle(Palette.muted)
                        }
                    }
                }
            }
        }
    }

    private var checkInPanel: some View {
        Panel {
            HStack {
                H2(existing == nil ? "How was today?" : "Update today's check-in")
                Spacer()
                if let e = existing { Chip(label: "Logged \(Dates.hhmm(e.savedAt))", tone: .ok) }
            }
            if conditions.isEmpty {
                Text("Add the conditions you're claiming on the Conditions tab, then rate them here each day.")
                    .font(Fonts.body()).foregroundStyle(Palette.muted)
            } else {
                Fine("Rate each condition from 0 (none) to 10 (worst). Takes about a minute.")
                ForEach(conditions) { c in
                    let key = c.uid.uuidString
                    let v = severity[key] ?? 0
                    VStack(alignment: .leading, spacing: 2) {
                        HStack {
                            Text(c.name).font(Fonts.semibold()).foregroundStyle(Palette.fg)
                            Spacer()
                            if !c.dc.isEmpty { Text("DC \(c.dc)").font(Fonts.mono()).foregroundStyle(Palette.muted) }
                        }
                        HStack(spacing: 12) {
                            Slider(value: Binding(get: { severity[key] ?? 0 }, set: { severity[key] = $0.rounded() }), in: 0...10, step: 1)
                                .tint(v >= 7 ? Palette.flare : Palette.accent)
                                .accessibilityLabel("\(c.name) severity")
                            Text("\(Int(v))").font(Fonts.display(24)).monospacedDigit()
                                .foregroundStyle(v >= 7 ? Palette.flare : Palette.fg)
                                .frame(width: 32, alignment: .trailing)
                        }
                    }
                }
            }
            Field(label: "Hours of sleep last night") {
                Stepper2(value: $sleep, step: 0.5, range: 0...16, suffix: "hrs")
            }
            CheckRow(label: "Symptoms limited my work or daily tasks today", isOn: $limited)
            Field(label: "What happened? (optional)") {
                TextField("Example: Had to leave the grocery store, back wouldn't let me stand in line", text: $note, axis: .vertical)
                    .lineLimit(3...8)
                    .fieldStyle()
            }
            HStack(spacing: 8) {
                if !showFlare && !conditions.isEmpty {
                    Button("Log flare-up") { showFlare = true }.sButton(.flare)
                }
                Button(existing == nil ? "Save check-in" : "Update check-in", action: save).sButton()
            }
        }
    }

    // MARK: Actions

    private func loadDraft() {
        var next: [String: Double] = [:]
        let saved = existing?.severity ?? [:]
        for c in conditions {
            let k = c.uid.uuidString
            next[k] = Double(saved[k] ?? Int(severity[k] ?? 0))
        }
        severity = next
        if let e = existing, loadedFor != Dates.today() {
            sleep = e.sleep
            limited = e.limited
            note = e.note
        }
        loadedFor = Dates.today()
    }

    private func save() {
        let sev = severity.mapValues { Int($0) }
        let trimmed = note.trimmingCharacters(in: .whitespacesAndNewlines)
        if let e = existing {
            e.severity = sev
            e.sleep = sleep
            e.limited = limited
            e.note = trimmed
            e.savedAt = Date()
            toaster.show("Check-in updated")
        } else {
            ctx.insert(CheckIn(day: todayKey, sleep: sleep, limited: limited, note: trimmed, severity: sev))
            toaster.show("Check-in saved")
        }
        try? ctx.save()
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
}

struct FlareForm: View {
    let conditions: [Condition]
    let onDone: () -> Void
    @Environment(\.modelContext) private var ctx
    @Environment(Toaster.self) private var toaster
    @State private var cond: UUID?
    @State private var hoursAgo: Double = 0
    @State private var hours: Double = 4
    @State private var liedDown = false
    @State private var note = ""

    var body: some View {
        Panel {
            HStack {
                H2("Log a flare-up")
                Spacer()
                Chip(label: "Flare-up", tone: .flare)
            }
            Field(label: "Condition") {
                ChoicePills(options: conditions.map { (Optional($0.uid), $0.name) }, selection: $cond)
            }
            Field(label: "When did it start? (hours ago)") {
                Stepper2(value: $hoursAgo, range: 0...72, suffix: hoursAgo == 0 ? "(now)" : "ago")
            }
            Field(label: "How long did it last? (hours)") {
                Stepper2(value: $hours, step: 0.5, range: 0...240, suffix: "hrs")
            }
            CheckRow(label: "I had to stop what I was doing and lie down", isOn: $liedDown)
            Field(label: "What did it stop you from doing?") {
                TextField("Example: Left work at 1300, couldn't drive, lay down in a dark room", text: $note, axis: .vertical)
                    .lineLimit(3...8)
                    .fieldStyle()
            }
            HStack(spacing: 8) {
                Button("Cancel", action: onDone).sButton(.ghost)
                Button("Save flare-up", action: save).sButton()
            }
        }
        .onAppear { if cond == nil { cond = conditions.first?.uid } }
    }

    private func save() {
        guard let cond else { return }
        ctx.insert(Flare(conditionID: cond, start: Date().addingTimeInterval(-hoursAgo * 3600), hours: hours, liedDown: liedDown,
                         note: note.trimmingCharacters(in: .whitespacesAndNewlines)))
        try? ctx.save()
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        toaster.show("\(conditions.first { $0.uid == cond }?.name ?? "Flare-up") flare-up saved")
        onDone()
    }
}

struct DeadlineForm: View {
    let onDone: () -> Void
    @Environment(\.modelContext) private var ctx
    @Environment(Toaster.self) private var toaster
    @State private var title = ""
    @State private var detail = ""
    @State private var date = Dates.add(14, to: Dates.today())
    private let presets = ["C&P exam", "VSO appointment", "Intent to File expires", "Doctor visit"]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Field(label: "What is it?") {
                ChoicePills(options: presets.map { ($0, $0) }, selection: $title)
                TextField("Or type your own", text: $title).fieldStyle()
            }
            Field(label: "Date") {
                DatePicker("Date", selection: $date, displayedComponents: .date)
                    .labelsHidden()
                    .tint(Palette.accent)
            }
            Field(label: "Notes (optional)") {
                TextField("Example: Conroe VA clinic, bring symptom summary", text: $detail).fieldStyle()
            }
            HStack(spacing: 8) {
                Button("Cancel", action: onDone).sButton(.ghost)
                Button("Add date", action: save).sButton()
            }
        }
    }

    private func save() {
        let t = title.trimmingCharacters(in: .whitespaces)
        guard !t.isEmpty else {
            toaster.show("Give the date a name first")
            return
        }
        ctx.insert(Deadline(title: t, detail: detail.trimmingCharacters(in: .whitespaces), date: date))
        try? ctx.save()
        toaster.show("Date added")
        onDone()
    }
}
