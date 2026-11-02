import Foundation

enum Dates {
    static let cal = Calendar.current

    static func today() -> Date { cal.startOfDay(for: Date()) }

    static func add(_ days: Int, to d: Date) -> Date { cal.date(byAdding: .day, value: days, to: d) ?? d }

    /// Local calendar day key, "yyyy-MM-dd".
    static func key(_ d: Date) -> String {
        let c = cal.dateComponents([.year, .month, .day], from: d)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    static func fromKey(_ k: String) -> Date {
        let p = k.split(separator: "-").compactMap { Int($0) }
        guard p.count == 3 else { return today() }
        return cal.date(from: DateComponents(year: p[0], month: p[1], day: p[2])) ?? today()
    }

    /// Last n calendar days ending today, oldest first.
    static func last(_ n: Int) -> [Date] {
        let t = today()
        return (0..<n).map { add($0 - (n - 1), to: t) }
    }

    static func daysUntil(_ d: Date) -> Int {
        cal.dateComponents([.day], from: today(), to: cal.startOfDay(for: d)).day ?? 0
    }

    private static func fmt(_ pattern: String) -> DateFormatter {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = pattern
        return f
    }

    private static let shortF = fmt("EEE, MMM d")
    private static let monthDayF = fmt("MMM d")
    private static let fullF = fmt("MMM d, yyyy")
    private static let longF = fmt("EEEE, MMMM d")
    private static let hhmmF = fmt("HHmm")
    private static let dtgF = fmt("ddHHmm'J'MMMyy")

    static func short(_ d: Date) -> String { shortF.string(from: d) }
    static func monthDay(_ d: Date) -> String { monthDayF.string(from: d) }
    static func full(_ d: Date) -> String { fullF.string(from: d) }
    static func long(_ d: Date) -> String { longF.string(from: d) }
    static func hhmm(_ d: Date) -> String { hhmmF.string(from: d) }
    /// Military date-time group in local time (zone letter J), e.g. 161430JOCT26.
    static func dtg(_ d: Date) -> String { dtgF.string(from: d).uppercased() }
}
