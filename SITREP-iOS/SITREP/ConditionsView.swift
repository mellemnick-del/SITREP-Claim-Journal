import SwiftUI
import SwiftData
import Charts

struct ConditionsView: View {
    @Environment(\.modelContext) private var ctx
    @Query(sort: \Condition.sort) private var conditions: [Condition]
    @Query private var checkIns: [CheckIn]
    @Query private var flares: [Flare]
    @Query private var evidence: [Evidence]
    @State private var editing: UUID?
    @State private var adding = false

    var body: some View {
        Page {
            PageHeader(eyebrow: "\(conditions.count) condition\(conditions.count == 1 ? "" : "s") tracked", title: "Conditions")
            if !conditions.isEmpty { legend }
            if adding || conditions.isEmpty {
                ConditionForm(condition: nil, nextSort: (conditions.map(\.sort).max() ?? 0) + 1) { adding = false }
            }
            ForEach(conditions) { c in
                if editing == c.uid {
                    ConditionForm(condition: c, nextSort: c.sort) { editing = nil }
                } else {
                    card(c)
                }
            }
            if !adding && !conditions.isEmpty {
                Button("Add a condition") { adding = true }.sButton(.ghost)
            }
            Fine("Diagnostic codes (DC) are for reference. Confirm yours with your VSO or your rating decision letter.")
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    private var legend: some View {
        HStack(spacing: 14) {
            legendItem(Palette.accent, "Daily severity")
            legendItem(Palette.flare, "Flare-up day")
            legendItem(Palette.line, "Not logged")
        }
    }

    private func legendItem(_ color: Color, _ label: String) -> some View {
        HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 2).fill(color).frame(width: 10, height: 10)
            Text(label).font(Fonts.body(12)).foregroundStyle(Palette.muted)
        }
    }

    private func card(_ c: Condition) -> some View {
        let st = Stats.forCondition(c, checkIns: checkIns, flares: flares)
        let ev = evidence.filter { $0.conditionID == c.uid || $0.conditionID == nil }
        let have = ev.filter { $0.status == .have }.count
        let tone: Tone = c.status == .filed || c.status == .serviceConnected ? .accent : c.status == .denied ? .flare : .neutral
        return Panel {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    H2(c.name)
                    if !c.dc.isEmpty { Text("DC \(c.dc)").font(Fonts.mono()).foregroundStyle(Palette.muted) }
                }
                Spacer()
                Chip(label: c.status.rawValue, tone: tone)
            }
            SeverityChart(condition: c, checkIns: checkIns, flares: flares)
            StatRow(items: [
                (String(format: "%.1f", st.avg), "avg severity"),
                ("\(st.flares)", st.flares > 0 ? "flare-ups, avg \(Int(st.avgHours.rounded())) hrs" : "flare-ups"),
                ("\(have)/\(ev.count)", "evidence ready"),
            ])
            if st.liedDown > 0 {
                HStack {
                    Text("Flare-ups where you had to lie down").font(Fonts.body()).foregroundStyle(Palette.fg)
                    Spacer()
                    Chip(label: "\(st.liedDown) in 30 days", tone: .flare)
                }
            }
            (Text("What to track: ").font(Fonts.semibold(13)).foregroundColor(Palette.accent)
                + Text(Stats.tip(for: c.dc)).font(Fonts.body(13)).foregroundColor(Palette.fg))
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Palette.accentSoft, in: RoundedRectangle(cornerRadius: 8))
            Button("Edit condition") { editing = c.uid }
                .font(Fonts.medium(14)).foregroundStyle(Palette.accent)
        }
    }
}

/// 30 daily bars for one condition. Flare-up days use the flare color; unlogged days show a stub.
struct SeverityChart: View {
    let condition: Condition
    let checkIns: [CheckIn]
    let flares: [Flare]

    private struct Point: Identifiable {
        let id = UUID()
        let date: Date
        let value: Int
        let flare: Bool
        let logged: Bool
    }

    private var points: [Point] {
        let map = Stats.byDay(checkIns)
        let key = condition.uid.uuidString
        let flareDays = Set(flares.filter { $0.conditionID == condition.uid }.map { Dates.key($0.start) })
        return Dates.last(statsWindow).map { d in
            let k = Dates.key(d)
            if let v = map[k]?.severity[key] {
                return Point(date: d, value: v, flare: flareDays.contains(k), logged: true)
            }
            return Point(date: d, value: 0, flare: false, logged: false)
        }
    }

    var body: some View {
        Chart(points) { p in
            // Unlogged days get a short stub so gaps are visible.
            BarMark(x: .value("Day", p.date, unit: .day), y: .value("Severity", p.logged ? Double(p.value) : 0.25))
                .foregroundStyle(!p.logged ? Palette.line : p.flare ? Palette.flare : Palette.accent)
                .cornerRadius(1)
        }
        .chartYScale(domain: 0...10)
        .chartYAxis {
            AxisMarks(position: .leading, values: [0, 5, 10]) { _ in
                AxisGridLine().foregroundStyle(Palette.line)
                AxisValueLabel().font(Fonts.mono(9)).foregroundStyle(Palette.muted)
            }
        }
        .chartXAxis {
            AxisMarks(values: [points.first?.date ?? Date(), points.last?.date ?? Date()]) { value in
                AxisValueLabel {
                    if let d = value.as(Date.self) {
                        Text(Dates.key(d) == Dates.key(Dates.today()) ? "Today" : "30 days ago").font(Fonts.body(11)).foregroundStyle(Palette.muted)
                    }
                }
            }
        }
        .frame(height: 110)
        .accessibilityLabel("Daily severity for \(condition.name), last 30 days")
    }
}

struct ConditionForm: View {
    let condition: Condition?
    let nextSort: Int
    let onDone: () -> Void
    @Environment(\.modelContext) private var ctx
    @Environment(Toaster.self) private var toaster
    @Query private var flares: [Flare]
    @Query private var evidence: [Evidence]
    @Query private var checkIns: [CheckIn]
    @State private var name = ""
    @State private var dc = ""
    @State private var status: ConditionStatus = .planned
    @State private var confirmDelete = false
    @State private var common = ""

    var body: some View {
        Panel {
            H2(condition == nil ? "Add a condition" : "Edit condition")
            if condition == nil {
                Field(label: "Common conditions") {
                    ChoicePills(options: Stats.commonConditions.map { ($0.name, $0.name) }, selection: $common)
                }
            }
            Field(label: "Name") { TextField("Example: Right shoulder", text: $name).fieldStyle() }
            Field(label: "Diagnostic code (optional)") {
                TextField("Example: 5201", text: $dc).keyboardType(.numberPad).fieldStyle()
            }
            Field(label: "Claim status") {
                ChoicePills(options: ConditionStatus.allCases.map { ($0, $0.rawValue) }, selection: $status)
            }
            HStack(spacing: 8) {
                Button("Cancel", action: onDone).sButton(.ghost)
                Button(condition == nil ? "Add condition" : "Save changes", action: save).sButton()
            }
            if let c = condition {
                if confirmDelete {
                    Text("This deletes \(c.name) and every rating, flare-up and evidence item linked to it.")
                        .font(Fonts.body(13)).foregroundStyle(Palette.fg)
                    Button("Delete \(c.name)") { delete(c) }.sButton(.danger)
                } else {
                    Button("Delete condition") { confirmDelete = true }
                        .font(Fonts.medium(14)).foregroundStyle(Palette.flare)
                }
            }
        }
        .onAppear {
            if let c = condition {
                name = c.name
                dc = c.dc
                status = c.status
            }
        }
        .onChange(of: common) { _, v in
            name = v
            dc = Stats.commonConditions.first { $0.name == v }?.dc ?? ""
        }
    }

    private func save() {
        let n = name.trimmingCharacters(in: .whitespaces)
        guard !n.isEmpty else {
            toaster.show("Give the condition a name first")
            return
        }
        if let c = condition {
            c.name = n
            c.dc = dc.trimmingCharacters(in: .whitespaces)
            c.status = status
            toaster.show("Condition updated")
        } else {
            ctx.insert(Condition(name: n, dc: dc.trimmingCharacters(in: .whitespaces), status: status, sort: nextSort))
            toaster.show("Condition added")
        }
        try? ctx.save()
        onDone()
    }

    private func delete(_ c: Condition) {
        let id = c.uid
        flares.filter { $0.conditionID == id }.forEach { ctx.delete($0) }
        evidence.filter { $0.conditionID == id }.forEach {
            EvidenceFiles.remove($0.storedFile)
            ctx.delete($0)
        }
        for ci in checkIns where ci.severity[id.uuidString] != nil {
            var s = ci.severity
            s.removeValue(forKey: id.uuidString)
            ci.severity = s
        }
        ctx.delete(c)
        try? ctx.save()
        toaster.show("Condition deleted")
        onDone()
    }
}
