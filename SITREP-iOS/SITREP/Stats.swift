import Foundation

let statsWindow = 30

struct ConditionStats {
    var avg: Double = 0
    var peak: Int = 0
    var logged: Int = 0
    var flares: Int = 0
    var avgHours: Double = 0
    var liedDown: Int = 0
    var limitedDays: Int = 0
}

enum Stats {
    static var windowStart: Date { Dates.add(-(statsWindow - 1), to: Dates.today()) }

    static func byDay(_ checkIns: [CheckIn]) -> [String: CheckIn] {
        Dictionary(checkIns.map { ($0.day, $0) }, uniquingKeysWith: { a, _ in a })
    }

    static func daysLogged(_ checkIns: [CheckIn]) -> Int {
        let days = Set(checkIns.map(\.day))
        return Dates.last(statsWindow).filter { days.contains(Dates.key($0)) }.count
    }

    static func streak(_ checkIns: [CheckIn]) -> Int {
        let days = Set(checkIns.map(\.day))
        var d = days.contains(Dates.key(Dates.today())) ? Dates.today() : Dates.add(-1, to: Dates.today())
        var n = 0
        while days.contains(Dates.key(d)) {
            n += 1
            d = Dates.add(-1, to: d)
        }
        return n
    }

    static func forCondition(_ c: Condition, checkIns: [CheckIn], flares: [Flare]) -> ConditionStats {
        let map = byDay(checkIns)
        let key = c.uid.uuidString
        var s = ConditionStats()
        var vals: [Int] = []
        for d in Dates.last(statsWindow) {
            guard let ci = map[Dates.key(d)] else { continue }
            let sev = ci.severity
            if let v = sev[key] { vals.append(v) }
            if ci.limited && (sev[key] ?? 0) >= 6 { s.limitedDays += 1 }
        }
        s.logged = vals.count
        s.avg = vals.isEmpty ? 0 : Double(vals.reduce(0, +)) / Double(vals.count)
        s.peak = vals.max() ?? 0
        let fl = flares.filter { $0.conditionID == c.uid && $0.start >= windowStart }
        s.flares = fl.count
        s.avgHours = fl.isEmpty ? 0 : fl.map(\.hours).reduce(0, +) / Double(fl.count)
        s.liedDown = fl.filter(\.liedDown).count
        return s
    }

    private static let tips: [String: String] = [
        "6260": "Note when the ringing makes it hard to sleep, focus or follow a conversation. Examiners ask how it affects daily life.",
        "5237": "Log flare-ups with how long they last and what you couldn't do, like bending, lifting or sitting through a shift.",
        "8100": "For each attack, note whether you had to stop and lie down. How often that happens is a key question for migraines.",
        "5260": "Track stairs, kneeling and instability. Note any days you used a brace or cane.",
        "9411": "Note sleep, nightmares, irritability, and days you avoided people or places. Include how it affected work and family.",
        "6847": "Track CPAP use, daytime sleepiness, and any days you nodded off at work or behind the wheel.",
    ]

    static func tip(for dc: String) -> String {
        tips[dc.trimmingCharacters(in: .whitespaces)]
            ?? "Log how it affects work, sleep and daily tasks, and note flare-ups with how long they lasted. Specific examples help more than numbers alone."
    }

    static let commonConditions: [(name: String, dc: String)] = [
        ("Tinnitus", "6260"), ("Lower back strain", "5237"), ("Migraines", "8100"),
        ("PTSD", "9411"), ("Sleep apnea", "6847"), ("Knee pain", "5260"),
    ]
}
