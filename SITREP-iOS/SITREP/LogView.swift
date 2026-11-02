import SwiftUI
import SwiftData

struct LogView: View {
    @Environment(\.modelContext) private var ctx
    @Query(sort: \Condition.sort) private var conditions: [Condition]
    @Query(sort: \CheckIn.day, order: .reverse) private var checkIns: [CheckIn]
    @Query(sort: \Flare.start, order: .reverse) private var flares: [Flare]
    @State private var filter = "all"

    private enum Item: Identifiable {
        case checkIn(CheckIn)
        case flare(Flare)
        var id: String {
            switch self {
            case .checkIn(let c): return "c" + c.day
            case .flare(let f): return "f" + f.uid.uuidString
            }
        }
        var time: Date {
            switch self {
            case .checkIn(let c): return Dates.fromKey(c.day).addingTimeInterval(1)
            case .flare(let f): return f.start
            }
        }
    }

    private var items: [Item] {
        let all = checkIns.map(Item.checkIn) + flares.map(Item.flare)
        return all.sorted { $0.time > $1.time }.filter { item in
            switch (filter, item) {
            case ("all", _): return true
            case ("flares", .flare): return true
            case ("flares", .checkIn): return false
            case (let id, .flare(let f)): return f.conditionID.uuidString == id
            case (let id, .checkIn(let c)): return (c.severity[id] ?? 0) >= 6 || !c.note.isEmpty
            }
        }
    }

    private func name(_ id: UUID) -> String { conditions.first { $0.uid == id }?.name ?? "Removed condition" }

    private func short(_ key: String) -> String {
        let n = conditions.first { $0.uid.uuidString == key }?.name ?? "?"
        return String((n.split(separator: " ").first ?? "").prefix(6)).uppercased()
    }

    var body: some View {
        Page {
            PageHeader(eyebrow: "Everything you've logged", title: "Log")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    pill("all", "All")
                    pill("flares", "Flare-ups")
                    ForEach(conditions) { c in pill(c.uid.uuidString, c.name) }
                }
            }
            Panel(spacing: 0) {
                if items.isEmpty {
                    Text("Nothing logged for this filter yet. Save a check-in on the Today tab to start your timeline.")
                        .font(Fonts.body()).foregroundStyle(Palette.muted)
                }
                ForEach(Array(items.enumerated()), id: \.element.id) { i, item in
                    row(item)
                        .padding(.vertical, 12)
                        .overlay(alignment: .top) { if i > 0 { Rectangle().fill(Palette.line).frame(height: 1) } }
                }
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    private func pill(_ id: String, _ label: String) -> some View {
        let on = filter == id
        return Button { filter = id } label: {
            Text(label).font(Fonts.medium(13))
                .foregroundStyle(on ? Palette.accentInk : Palette.fg)
                .padding(.horizontal, 12).padding(.vertical, 7)
                .background(on ? Palette.accent : Palette.surface, in: Capsule())
                .overlay(Capsule().stroke(on ? Palette.accent : Palette.line, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder private func row(_ item: Item) -> some View {
        switch item {
        case .flare(let f):
            HStack(alignment: .top, spacing: 12) {
                RoundedRectangle(cornerRadius: 2).fill(Palette.flare).frame(width: 4)
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("\(name(f.conditionID)) flare-up").font(Fonts.semibold()).foregroundStyle(Palette.fg)
                        Spacer()
                        Text(Dates.dtg(f.start)).font(Fonts.mono()).foregroundStyle(Palette.muted)
                    }
                    HStack(spacing: 6) {
                        Chip(label: "\(f.hours.clean) hrs", tone: .flare)
                        if f.liedDown { Chip(label: "Had to lie down", tone: .flare) }
                    }
                    if !f.note.isEmpty { Text(f.note).font(Fonts.body()).foregroundStyle(Palette.fg) }
                    Button("Delete") { ctx.delete(f) }.font(Fonts.medium(13)).foregroundStyle(Palette.muted)
                }
            }
        case .checkIn(let c):
            HStack(alignment: .top, spacing: 12) {
                RoundedRectangle(cornerRadius: 2).fill(Palette.line).frame(width: 4)
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("\(Dates.short(Dates.fromKey(c.day))) check-in").font(Fonts.semibold()).foregroundStyle(Palette.fg)
                        Spacer()
                        Text(Dates.dtg(c.savedAt)).font(Fonts.mono()).foregroundStyle(Palette.muted)
                    }
                    FlowLayout(spacing: 6) {
                        ForEach(c.severity.sorted { $0.key < $1.key }, id: \.key) { key, v in
                            Text("\(short(key)) \(v)").font(Fonts.mono())
                                .foregroundStyle(v >= 7 ? Palette.flare : Palette.fg)
                                .padding(.horizontal, 6).padding(.vertical, 1)
                                .background(v >= 7 ? Palette.flareSoft : Palette.sunken, in: RoundedRectangle(cornerRadius: 4))
                        }
                        Text("SLEEP \(c.sleep.clean)h").font(Fonts.mono()).foregroundStyle(Palette.fg)
                            .padding(.horizontal, 6).padding(.vertical, 1)
                            .background(Palette.sunken, in: RoundedRectangle(cornerRadius: 4))
                        if c.limited { Chip(label: "Limited daily tasks", tone: .warn) }
                    }
                    if !c.note.isEmpty { Text(c.note).font(Fonts.body()).foregroundStyle(Palette.fg) }
                }
            }
        }
    }
}
