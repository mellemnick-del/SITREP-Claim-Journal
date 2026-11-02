import SwiftUI
import SwiftData
import UIKit

enum MoreRoute: Hashable {
    case checkups, export, settings
}

struct MoreView: View {
    @Query private var assessments: [Assessment]

    var body: some View {
        Page {
            PageHeader(eyebrow: "SITREP", title: "More")
            let due = Instrument.order.filter { Instrument.due($0, in: assessments).due }.count
            VStack(spacing: 0) {
                row("Mental health check-ups", "PTSD, depression and anxiety questionnaires with trends", .checkups, chip: due > 0 ? "\(due) due" : nil, first: true)
                row("Export summary", "PDF for your VSO, C&P exam or provider", .export)
                row("Settings", "Reminders, Face ID lock, backup and your data", .settings)
            }
            .background(Palette.surface, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Palette.line, lineWidth: 1))
            CrisisCard()
            Fine("SITREP is an organizer. It isn't legal or medical advice and isn't affiliated with the VA.")
        }
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(for: MoreRoute.self) { route in
            switch route {
            case .checkups: CheckupsView()
            case .export: ExportView()
            case .settings: SettingsView()
            }
        }
    }

    private func row(_ title: String, _ detail: String, _ route: MoreRoute, chip: String? = nil, first: Bool = false) -> some View {
        NavigationLink(value: route) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(Fonts.semibold(16)).foregroundStyle(Palette.fg)
                    Text(detail).font(Fonts.body(13)).foregroundStyle(Palette.muted).multilineTextAlignment(.leading)
                }
                Spacer()
                if let chip { Chip(label: chip, tone: .warn) }
                Image(systemName: "chevron.right").foregroundStyle(Palette.muted)
            }
            .padding(16)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .overlay(alignment: .top) { if !first { Rectangle().fill(Palette.line).frame(height: 1) } }
    }
}

// MARK: - Check-ups

struct CheckupsView: View {
    @Environment(\.modelContext) private var ctx
    @Environment(Toaster.self) private var toaster
    @Query(sort: \Assessment.takenAt, order: .reverse) private var assessments: [Assessment]
    @State private var history: AssessmentKind?
    @State private var taking: AssessmentKind?

    var body: some View {
        Page {
            PageHeader(eyebrow: "Mental health", title: "Check-ups")
            Text("Standard questionnaires used by the VA and mental health providers. Taking them regularly shows how you're doing over time, in a form your provider already knows how to read.")
                .font(Fonts.body()).foregroundStyle(Palette.muted)
            ForEach(Instrument.order) { kind in card(kind) }
            Fine("These questionnaires don't diagnose anything. Share your results with your provider. Scores use each questionnaire's published scoring.")
        }
        .navigationBarTitleDisplayMode(.inline)
        .fullScreenCover(item: $taking) { TakeCheckupView(kind: $0).modelContext(ctx) }
    }

    private func card(_ kind: AssessmentKind) -> some View {
        let ins = kind.instrument
        let list = assessments.filter { $0.kind == kind }
        let due = Instrument.due(kind, in: assessments)
        return Panel {
            VStack(alignment: .leading, spacing: 2) {
                H2(ins.name)
                Text(ins.about).font(Fonts.body(13)).foregroundStyle(Palette.muted)
            }
            if let last = list.first {
                let band = ins.band(for: last.total)
                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 4) {
                        (Text("\(last.total)").font(Fonts.display(40)) + Text(" / \(ins.max)").font(Fonts.display(18)))
                            .foregroundStyle(Palette.fg)
                        Chip(label: band.label, tone: band.tone)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 4) {
                        TrendLine(values: list.prefix(8).reversed().map(\.total), max: ins.max)
                        if list.count > 1 {
                            let d = last.total - list[1].total
                            Text("\(d == 0 ? "No change" : d > 0 ? "Up \(d)" : "Down \(-d)") since \(Dates.monthDay(list[1].takenAt))")
                                .font(Fonts.mono()).foregroundStyle(Palette.muted)
                        }
                    }
                }
            } else {
                Text("No results yet. It takes about \(max(2, ins.items.count / 5)) minutes.").font(Fonts.body(13)).foregroundStyle(Palette.muted)
            }
            HStack {
                Chip(label: due.label, tone: due.due ? .warn : .ok)
                Spacer()
                if !list.isEmpty {
                    Button(history == kind ? "Hide history" : "History (\(list.count))") { history = history == kind ? nil : kind }
                        .font(Fonts.medium(14)).foregroundStyle(Palette.accent)
                }
            }
            if history == kind {
                VStack(spacing: 0) {
                    ForEach(list) { a in
                        HStack {
                            Text(Dates.full(a.takenAt)).font(Fonts.mono()).foregroundStyle(Palette.fg)
                            Spacer()
                            Text("\(a.total)").font(Fonts.display(20)).foregroundStyle(Palette.fg)
                            Button("Delete") {
                                ctx.delete(a)
                                try? ctx.save()
                                toaster.show("Result deleted")
                            }
                            .font(Fonts.medium(13)).foregroundStyle(Palette.muted)
                            .padding(.leading, 10)
                        }
                        .padding(.vertical, 8)
                    }
                }
            }
            Button(list.isEmpty ? "Start \(ins.short)" : "Take \(ins.short) again") { taking = kind }.sButton()
        }
    }
}

/// Small line of recent totals, oldest to newest.
struct TrendLine: View {
    let values: [Int]
    let max: Int

    var body: some View {
        if values.count >= 2 {
            Canvas { gc, size in
                let pts = values.enumerated().map { i, v in
                    CGPoint(x: 4 + CGFloat(i) * (size.width - 8) / CGFloat(values.count - 1),
                            y: 4 + (size.height - 8) * (1 - CGFloat(v) / CGFloat(max)))
                }
                var base = Path()
                base.move(to: CGPoint(x: 0, y: size.height - 4))
                base.addLine(to: CGPoint(x: size.width, y: size.height - 4))
                gc.stroke(base, with: .color(Palette.line), lineWidth: 1)
                var line = Path()
                line.addLines(pts)
                gc.stroke(line, with: .color(Palette.accent), style: StrokeStyle(lineWidth: 2, lineJoin: .round))
                if let last = pts.last {
                    gc.fill(Path(ellipseIn: CGRect(x: last.x - 3.5, y: last.y - 3.5, width: 7, height: 7)), with: .color(Palette.accent))
                }
            }
            .frame(width: 140, height: 44)
            .accessibilityLabel("Trend of last \(values.count) results")
        }
    }
}

struct TakeCheckupView: View {
    let kind: AssessmentKind
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var ctx
    @Query(sort: \Assessment.takenAt, order: .reverse) private var assessments: [Assessment]
    @State private var answers: [Int?] = []
    @State private var idx = 0
    @State private var result: (total: Int, previous: Int?, crisis: Bool)?

    private var ins: Instrument { kind.instrument }

    var body: some View {
        Page {
            if let result {
                resultView(result)
            } else if !answers.isEmpty {
                question
            }
        }
        .onAppear { if answers.isEmpty { answers = Array(repeating: nil, count: ins.items.count) } }
    }

    private var question: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Eyebrow(text: ins.short)
                    Spacer()
                    Eyebrow(text: "\(idx + 1) of \(ins.items.count)")
                }
                ProgressView(value: Double(idx + 1), total: Double(ins.items.count)).tint(Palette.accent)
            }
            .padding(.top, 16)
            Text(ins.prompt).font(Fonts.body(13)).foregroundStyle(Palette.muted)
            Text(ins.items[idx]).font(Fonts.display(26)).foregroundStyle(Palette.fg).fixedSize(horizontal: false, vertical: true)
            VStack(spacing: 8) {
                ForEach(ins.options.indices, id: \.self) { v in
                    let on = answers[idx] == v
                    Button { choose(v) } label: {
                        HStack(spacing: 12) {
                            Text("\(v)").font(Fonts.display(20)).foregroundStyle(Palette.muted).frame(width: 16)
                            Text(ins.options[v]).font(Fonts.medium(16)).foregroundStyle(Palette.fg)
                            Spacer()
                        }
                        .padding(.vertical, 15).padding(.horizontal, 16)
                        .background(on ? Palette.accentSoft : Palette.surface, in: RoundedRectangle(cornerRadius: 10))
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(on ? Palette.accent : Palette.line, lineWidth: 1))
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
            HStack(spacing: 8) {
                if idx > 0 { Button("Back") { idx -= 1 }.sButton(.ghost) }
                Button("Stop for now") { dismiss() }.sButton(.ghost)
            }
            Fine("Answers are only saved when you finish all \(ins.items.count) questions.")
        }
    }

    private func choose(_ v: Int) {
        UISelectionFeedbackGenerator().selectionChanged()
        answers[idx] = v
        if idx < ins.items.count - 1 {
            idx += 1
            return
        }
        let final = answers.map { $0 ?? 0 }
        let previous = assessments.first { $0.kind == kind }?.total
        ctx.insert(Assessment(kind: kind, answers: final))
        try? ctx.save()
        result = (final.reduce(0, +), previous, Instrument.needsCrisisSupport(kind, final))
    }

    private func resultView(_ r: (total: Int, previous: Int?, crisis: Bool)) -> some View {
        let band = ins.band(for: r.total)
        return VStack(alignment: .leading, spacing: 16) {
            if r.crisis { CrisisCard(urgent: true).padding(.top, 16) }
            Panel {
                Eyebrow(text: "\(ins.short) result")
                (Text("\(r.total)").font(Fonts.display(56)) + Text(" / \(ins.max)").font(Fonts.display(22))).foregroundStyle(Palette.fg)
                Chip(label: band.label, tone: band.tone)
                if let p = r.previous {
                    Text("Last time you scored \(p). " + (r.total == p ? "No change." : r.total < p ? "That's \(p - r.total) lower." : "That's \(r.total - p) higher."))
                        .font(Fonts.body()).foregroundStyle(Palette.fg)
                }
                Text("Saved to your journal. This score doesn't diagnose anything. It's a snapshot to share with your provider, and it's included in your exported summary.")
                    .font(Fonts.body(13)).foregroundStyle(Palette.muted)
            }
            .padding(.top, r.crisis ? 0 : 16)
            Button("Done") { dismiss() }.sButton()
            Fine(ins.source)
        }
    }
}
