import Foundation
import SwiftData

/// Sample journal for trying the app before entering real information.
enum ExampleData {
    static func load(into ctx: ModelContext) {
        var rng = SeededRandom(seed: 11)
        func ri(_ a: Int, _ b: Int) -> Int { a + Int(rng.next() % UInt64(b - a + 1)) }

        let notes: [Int: String] = [
            27: "Migraine hit at work around 1400. Left early and lay down in a dark room.",
            22: "Bad sleep. Ringing louder than usual at night.",
            19: "Back locked up loading the truck. Couldn't finish yard work.",
            16: "Migraine with light sensitivity. Missed my kid's practice.",
            12: "Knee gave out on the stairs at the stadium.",
            9: "Migraine in the morning. Took meds, lay down 3 hours.",
            6: "Back flare. Took the day off, mostly on the floor with ice.",
            4: "Migraine. Pushed through work but had to sit in the car at lunch.",
            2: "Tinnitus loud after a meeting in a noisy room.",
        ]
        let migDays: Set<Int> = [27, 16, 9, 4]
        let backDays: Set<Int> = [19, 6]

        let tin = Condition(name: "Tinnitus", dc: "6260", status: .filed, sort: 1)
        let back = Condition(name: "Lower back strain", dc: "5237", status: .filed, sort: 2)
        let mig = Condition(name: "Migraines", dc: "8100", status: .filed, sort: 3)
        let knee = Condition(name: "Right knee", dc: "5260", status: .planned, sort: 4)
        [tin, back, mig, knee].forEach { ctx.insert($0) }

        let today = Dates.today()
        for ago in stride(from: 29, through: 1, by: -1) {
            let d = Dates.add(-ago, to: today)
            let isMig = migDays.contains(ago), isBack = backDays.contains(ago)
            if ri(0, 99) < 12 && !isMig && !isBack && notes[ago] == nil { continue }
            let saved = Dates.cal.date(bySettingHour: ri(20, 22), minute: ri(0, 59), second: 0, of: d) ?? d
            let sev: [String: Int] = [
                tin.uid.uuidString: ri(3, 5) + (ago == 22 || ago == 2 ? 2 : 0),
                back.uid.uuidString: isBack ? ri(7, 8) : ri(2, 5),
                mig.uid.uuidString: isMig ? ri(7, 9) : ri(0, 2),
                knee.uid.uuidString: ago == 12 ? 7 : ri(2, 4),
            ]
            ctx.insert(CheckIn(day: Dates.key(d), sleep: ago == 22 ? 4 : Double(ri(5, 7)), limited: isMig || isBack || ago == 12,
                               note: notes[ago] ?? "", severity: sev, savedAt: saved))
            if isMig || isBack {
                let start = Dates.cal.date(bySettingHour: ri(8, 14), minute: ri(0, 59), second: 0, of: d) ?? d
                ctx.insert(Flare(conditionID: isMig ? mig.uid : back.uid, start: start,
                                 hours: Double(isMig ? ri(3, 9) : ri(18, 36)), liedDown: isMig && ago != 4, note: notes[ago] ?? ""))
            }
        }

        ctx.insert(Deadline(title: "VSO appointment", detail: "Review evidence list and personal statement", date: Dates.add(6, to: today)))
        ctx.insert(Deadline(title: "C&P exam: migraines and back", detail: "Bring your symptom summary", date: Dates.add(21, to: today)))
        ctx.insert(Deadline(title: "Intent to File expires", detail: "Submit the full claim before this date to keep your effective date", date: Dates.add(137, to: today)))

        let ev: [(String, String, UUID?, EvidenceStatus)] = [
            ("Service treatment records", "Military records", nil, .requested),
            ("Separation exam audiogram", "Military records", tin.uid, .have),
            ("Lumbar MRI report", "Private medical", back.uid, .have),
            ("Buddy statement from squad member (VA Form 21-10210)", "Lay statement", back.uid, .need),
            ("Neurologist visit notes", "Private medical", mig.uid, .requested),
            ("Personal statement (VA Form 21-4138)", "Lay statement", nil, .need),
            ("Knee brace prescription", "Private medical", knee.uid, .have),
        ]
        for (title, cat, cid, st) in ev { ctx.insert(Evidence(title: title, category: cat, conditionID: cid, status: st)) }

        // Check-up history every two weeks, trending slightly better.
        for (i, ago) in [56, 42, 28, 14].enumerated() {
            let at = Dates.add(-ago, to: Date())
            let better = i > 2 ? 1 : 0
            ctx.insert(Assessment(kind: .phq9, answers: [2, 2, 3, 2, 1, 1, 2, 1, 0].map { max(0, $0 - better) }, takenAt: at))
            ctx.insert(Assessment(kind: .gad7, answers: [2, 2, 2, 1, 2, 2, 1].map { max(0, $0 - (i > 1 ? 1 : 0)) }, takenAt: at))
            ctx.insert(Assessment(kind: .pcl5, answers: [3, 3, 2, 3, 3, 3, 2, 1, 2, 2, 3, 2, 3, 2, 3, 1, 3, 3, 2, 3].map { max(0, $0 - better) }, takenAt: at))
        }
        try? ctx.save()
    }

    static func eraseAll(in ctx: ModelContext) {
        try? ctx.delete(model: Condition.self)
        try? ctx.delete(model: CheckIn.self)
        try? ctx.delete(model: Flare.self)
        try? ctx.delete(model: Evidence.self)
        try? ctx.delete(model: Deadline.self)
        try? ctx.delete(model: Assessment.self)
        try? ctx.save()
        EvidenceFiles.removeAll()
    }
}

/// Small deterministic generator so the example journal looks the same every time.
struct SeededRandom {
    private var state: UInt64
    init(seed: UInt64) { state = seed &* 0x9E3779B97F4A7C15 }
    mutating func next() -> UInt64 {
        state &+= 0x9E3779B97F4A7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
        z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
        return z ^ (z >> 31)
    }
}
