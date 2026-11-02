import SwiftUI
import SwiftData
import UniformTypeIdentifiers

struct EvidenceView: View {
    @Environment(\.modelContext) private var ctx
    @Environment(Toaster.self) private var toaster
    @Query(sort: \Condition.sort) private var conditions: [Condition]
    @Query(sort: \Evidence.createdAt) private var evidence: [Evidence]
    @State private var open: UUID?
    @State private var share: ShareItem?

    private struct Group: Identifiable {
        let id: String
        let conditionID: UUID?
        let name: String
    }

    private var groups: [Group] {
        [Group(id: "all", conditionID: nil, name: "Applies to every condition")]
            + conditions.map { Group(id: $0.uid.uuidString, conditionID: $0.uid, name: $0.name) }
    }

    var body: some View {
        Page {
            PageHeader(eyebrow: "Evidence locker", title: "Evidence")
            StatRow(items: [
                ("\(evidence.filter { $0.status == .have }.count)", "in hand"),
                ("\(evidence.filter { $0.status == .requested }.count)", "requested"),
                ("\(evidence.filter { $0.status == .need }.count)", "still needed"),
            ])
            Fine("Tap a status to move it along: Need, then Requested, then Have. Tap an item for more options.")
            ForEach(groups) { g in
                let items = evidence.filter { $0.conditionID == g.conditionID }
                if !items.isEmpty {
                    Panel(spacing: 0) {
                        H2(g.name).padding(.bottom, 10)
                        ForEach(Array(items.enumerated()), id: \.element.uid) { i, e in
                            row(e)
                                .padding(.vertical, 12)
                                .overlay(alignment: .top) { if i > 0 { Rectangle().fill(Palette.line).frame(height: 1) } }
                        }
                    }
                }
            }
            AddEvidenceForm(conditions: conditions)
        }
        .toolbar(.hidden, for: .navigationBar)
        .sheet(item: $share) { ShareSheet(items: [$0.url]) }
    }

    private func tone(_ s: EvidenceStatus) -> Tone { s == .have ? .ok : s == .requested ? .warn : .flare }

    private func row(_ e: Evidence) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 12) {
                Button { open = open == e.uid ? nil : e.uid } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(e.title).font(Fonts.semibold()).foregroundStyle(Palette.fg).multilineTextAlignment(.leading)
                        Text(e.category + (e.fileName.map { "  ·  \($0)" } ?? ""))
                            .font(Fonts.body(13)).foregroundStyle(Palette.muted).multilineTextAlignment(.leading)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.plain)
                Button {
                    e.status = e.status.next
                    try? ctx.save()
                    toaster.show("Marked as \(e.status.rawValue)")
                } label: { Chip(label: e.status.rawValue, tone: tone(e.status)) }
                .buttonStyle(.plain)
                .accessibilityLabel("Status \(e.status.rawValue). Tap to change.")
            }
            if open == e.uid {
                HStack(spacing: 8) {
                    if let url = e.fileURL {
                        Button("Open or share file") { share = ShareItem(url: url) }.sButton(.ghost)
                    }
                    Button("Delete") {
                        EvidenceFiles.remove(e.storedFile)
                        ctx.delete(e)
                        try? ctx.save()
                        open = nil
                        toaster.show("Evidence deleted")
                    }
                    .sButton(.danger)
                }
            }
        }
    }
}

struct AddEvidenceForm: View {
    let conditions: [Condition]
    @Environment(\.modelContext) private var ctx
    @Environment(Toaster.self) private var toaster
    @State private var title = ""
    @State private var category = evidenceTypes[0]
    @State private var cond: UUID?
    @State private var picked: URL?
    @State private var importing = false

    var body: some View {
        Panel {
            H2("Add evidence")
            Field(label: "What is it?") {
                TextField("Example: Urgent care visit for back, March 2026", text: $title).fieldStyle()
            }
            Field(label: "Condition") {
                ChoicePills(options: [(UUID?.none, "All conditions")] + conditions.map { (Optional($0.uid), $0.name) }, selection: $cond)
            }
            Field(label: "Type") {
                ChoicePills(options: evidenceTypes.map { ($0, $0) }, selection: $category)
            }
            Field(label: "File (optional)") {
                if let picked {
                    HStack {
                        Text(picked.lastPathComponent).font(Fonts.body()).foregroundStyle(Palette.fg)
                        Spacer()
                        Button { self.picked = nil } label: { Chip(label: "Remove") }.buttonStyle(.plain)
                    }
                } else {
                    Button("Attach a PDF or photo") { importing = true }.sButton(.ghost)
                }
            }
            Button("Add to locker", action: save).sButton()
            Fine("Files are copied into SITREP's private storage on this phone. They aren't uploaded anywhere.")
        }
        .fileImporter(isPresented: $importing, allowedContentTypes: [.pdf, .image]) { result in
            if case .success(let url) = result {
                picked = url
                if title.isEmpty { title = url.deletingPathExtension().lastPathComponent }
            }
        }
    }

    private func save() {
        let t = title.trimmingCharacters(in: .whitespaces)
        guard !t.isEmpty else {
            toaster.show("Give the evidence a name first")
            return
        }
        var stored: String?
        if let picked {
            do {
                stored = try EvidenceFiles.store(picked)
            } catch {
                toaster.show("Couldn't save that file. Try picking it again.")
                return
            }
        }
        ctx.insert(Evidence(title: t, category: category, conditionID: cond, status: stored == nil ? .need : .have,
                            storedFile: stored, fileName: picked?.lastPathComponent))
        try? ctx.save()
        title = ""
        picked = nil
        toaster.show("Added to your evidence locker")
    }
}
