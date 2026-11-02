import SwiftUI
import SwiftData

struct ExportView: View {
    @Environment(Toaster.self) private var toaster
    @AppStorage(Keys.veteranName) private var name = ""
    @Query(sort: \Condition.sort) private var conditions: [Condition]
    @Query private var checkIns: [CheckIn]
    @Query(sort: \Flare.start) private var flares: [Flare]
    @Query(sort: \Assessment.takenAt, order: .reverse) private var assessments: [Assessment]
    @State private var share: ShareItem?

    private var from: Date { Stats.windowStart }

    private var notes: [CheckIn] {
        let map = Stats.byDay(checkIns)
        return Array(Dates.last(statsWindow).compactMap { map[Dates.key($0)] }.filter { !$0.note.isEmpty }.suffix(8).reversed())
    }

    private var checkups: [(kind: AssessmentKind, list: [Assessment])] {
        Instrument.order.map { k in (kind: k, list: assessments.filter { $0.kind == k }) }.filter { !$0.list.isEmpty }
    }

    var body: some View {
        Page {
            PageHeader(eyebrow: "For your VSO or C&P exam", title: "Export")
            Panel {
                Field(label: "Name on the summary") {
                    TextField("Your name", text: $name).textContentType(.name).fieldStyle()
                }
                Divider().overlay(Palette.line)
                VStack(alignment: .leading, spacing: 4) {
                    Eyebrow(text: "Symptom summary preview")
                    H2(name.isEmpty ? "Your name" : name)
                    Text("\(Dates.full(from)) to \(Dates.full(Dates.today())) · \(Stats.daysLogged(checkIns)) of \(statsWindow) days logged")
                        .font(Fonts.mono()).foregroundStyle(Palette.muted)
                }
                if conditions.isEmpty {
                    Text("Add conditions and log a few days to build your summary.").font(Fonts.body()).foregroundStyle(Palette.muted)
                }
                ForEach(conditions) { c in
                    let st = Stats.forCondition(c, checkIns: checkIns, flares: flares)
                    VStack(alignment: .leading, spacing: 2) {
                        HStack {
                            Text(c.name).font(Fonts.semibold()).foregroundStyle(Palette.fg)
                            Spacer()
                            if !c.dc.isEmpty { Text("DC \(c.dc)").font(Fonts.mono()).foregroundStyle(Palette.muted) }
                        }
                        Text(summaryLine(st)).font(Fonts.body(13)).foregroundStyle(Palette.muted)
                    }
                }
                if !checkups.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Eyebrow(text: "Mental health check-ups")
                        ForEach(checkups, id: \.kind) { c in
                            let ins = c.kind.instrument
                            let latest = c.list[0]
                            HStack {
                                Text("\(ins.short): \(latest.total) / \(ins.max)" + (c.list.count > 1 ? "  (was \(c.list[1].total))" : ""))
                                    .font(Fonts.body()).foregroundStyle(Palette.fg)
                                Spacer()
                                Chip(label: ins.band(for: latest.total).label, tone: ins.band(for: latest.total).tone)
                            }
                        }
                    }
                }
                Button("Create and share PDF", action: exportPDF).sButton()
                Fine("The PDF is made on this phone. You choose where it goes: email, print, Files, or your VSO.")
            }
            Fine("SITREP is an organizer. It isn't legal or medical advice and isn't affiliated with the VA.")
        }
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $share) { ShareSheet(items: [$0.url]) }
    }

    private func summaryLine(_ st: ConditionStats) -> String {
        var s = "Avg \(String(format: "%.1f", st.avg))/10 · peak \(st.peak) · \(st.flares) flare-up\(st.flares == 1 ? "" : "s")"
        if st.flares > 0 { s += " (avg \(Int(st.avgHours.rounded())) hrs)" }
        s += " · \(st.limitedDays) limited day\(st.limitedDays == 1 ? "" : "s")"
        if st.liedDown > 0 { s += " · \(st.liedDown) required lying down" }
        return s
    }

    private func exportPDF() {
        do {
            let url = try PDFMaker.make(html: html(), fileName: "SITREP-summary-\(Dates.key(Date())).pdf")
            share = ShareItem(url: url)
        } catch {
            toaster.show("Couldn't create the PDF. Try again.")
        }
    }

    private func esc(_ s: String) -> String {
        s.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;").replacingOccurrences(of: "\"", with: "&quot;")
    }

    private func html() -> String {
        let condName: (UUID) -> String = { id in conditions.first { $0.uid == id }?.name ?? "" }
        let rows = conditions.map { c -> String in
            let st = Stats.forCondition(c, checkIns: checkIns, flares: flares)
            let dc = c.dc.isEmpty ? "" : " <span class=\"m\">DC \(esc(c.dc))</span>"
            return "<tr><td>\(esc(c.name))\(dc)</td><td class=\"n\">\(String(format: "%.1f", st.avg))</td><td class=\"n\">\(st.peak)</td><td class=\"n\">\(st.flares)</td><td class=\"n\">\(st.flares > 0 ? String(Int(st.avgHours.rounded())) : "-")</td><td class=\"n\">\(st.liedDown)</td><td class=\"n\">\(st.limitedDays)</td></tr>"
        }.joined()
        let flareItems = flares.filter { $0.start >= from && !$0.note.isEmpty }.map {
            "<li><span class=\"m\">\(Dates.monthDay($0.start))</span> \(esc(condName($0.conditionID))), \($0.hours.clean) hrs\($0.liedDown ? ", had to lie down" : ""). \(esc($0.note))</li>"
        }.joined()
        let noteItems = notes.map { "<li><span class=\"m\">\(Dates.monthDay(Dates.fromKey($0.day)))</span> \(esc($0.note))</li>" }.joined()
        let checkupRows = checkups.map { c -> String in
            let ins = c.kind.instrument
            let hist = c.list.prefix(6).map { "\($0.total) <span class=\"m\">(\(Dates.monthDay($0.takenAt)))</span>" }.joined(separator: ", ")
            return "<tr><td>\(esc(ins.name))</td><td class=\"n\">\(c.list[0].total) / \(ins.max)</td><td>\(esc(ins.band(for: c.list[0].total).label))</td><td>\(hist)</td></tr>"
        }.joined()

        return """
        <!doctype html><html><head><meta charset="utf-8"><style>
        body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1D2219;font-size:11px;line-height:1.5}
        h1{font-size:22px;margin:0}h2{font-size:13px;margin:20px 0 6px;text-transform:uppercase;letter-spacing:.06em}
        .head{border-bottom:2px solid #1D2219;padding-bottom:10px;margin-bottom:12px}
        .eb{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#5C6455}
        .m{font-family:Menlo,Courier,monospace;color:#5C6455;font-size:9px}
        table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #CBD0C0;padding:5px 6px 5px 0;text-align:left;vertical-align:top}
        th{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#5C6455}.n{text-align:right}
        ul{padding-left:16px;margin:0}li{margin-bottom:4px}.fine{margin-top:24px;color:#5C6455;font-size:9px}
        </style></head><body>
        <div class="head"><div class="eb">Symptom summary</div><h1>\(esc(name.isEmpty ? "Veteran" : name))</h1>
        <div class="m">\(Dates.full(from)) to \(Dates.full(Dates.today())) · \(Stats.daysLogged(checkIns)) of \(statsWindow) days logged · Generated \(Dates.full(Date()))</div></div>
        <table><thead><tr><th>Condition</th><th class="n">Avg severity</th><th class="n">Peak</th><th class="n">Flare-ups</th><th class="n">Avg hrs</th><th class="n">Had to lie down</th><th class="n">Limited days</th></tr></thead><tbody>\(rows)</tbody></table>
        \(checkupRows.isEmpty ? "" : "<h2>Mental health check-ups</h2><table><thead><tr><th>Questionnaire</th><th class=\"n\">Latest</th><th>Range</th><th>Recent results, newest first</th></tr></thead><tbody>\(checkupRows)</tbody></table>")
        \(flareItems.isEmpty ? "" : "<h2>Flare-ups</h2><ul>\(flareItems)</ul>")
        \(noteItems.isEmpty ? "" : "<h2>In the veteran's words</h2><ul>\(noteItems)</ul>")
        <p class="fine">Self-reported daily log kept in SITREP. Severity is rated by the veteran from 0 (none) to 10 (worst). "Limited days" are days the veteran reported symptoms limited work or daily tasks with a rating of 6 or higher for that condition. Check-up scores are self-administered and are not a diagnosis.</p>
        </body></html>
        """
    }
}
