import Foundation
import SwiftData

// Records reference each other by UUID rather than SwiftData relationships. That keeps deletes,
// backups and restores simple and predictable.

enum ConditionStatus: String, CaseIterable, Codable {
    case planned = "Planned", filed = "Filed", serviceConnected = "Service connected", denied = "Denied"
}

enum EvidenceStatus: String, CaseIterable, Codable {
    case need = "Need", requested = "Requested", have = "Have"
    var next: EvidenceStatus {
        let all = EvidenceStatus.allCases
        return all[(all.firstIndex(of: self)! + 1) % all.count]
    }
}

let evidenceTypes = ["Private medical", "Military records", "VA records", "Lay statement", "Photo", "Other"]

@Model final class Condition {
    var uid: UUID = UUID()
    var name: String = ""
    var dc: String = ""
    var statusRaw: String = ConditionStatus.planned.rawValue
    var sort: Int = 0

    init(name: String, dc: String, status: ConditionStatus, sort: Int) {
        self.uid = UUID()
        self.name = name
        self.dc = dc
        self.statusRaw = status.rawValue
        self.sort = sort
    }

    var status: ConditionStatus {
        get { ConditionStatus(rawValue: statusRaw) ?? .planned }
        set { statusRaw = newValue.rawValue }
    }
}

@Model final class CheckIn {
    /// Local calendar day, "yyyy-MM-dd".
    var day: String = ""
    var sleep: Double = 7
    var limited: Bool = false
    var note: String = ""
    var savedAt: Date = Date()
    /// Condition UUID string -> 0...10, stored as JSON.
    var severityJSON: String = "{}"

    init(day: String, sleep: Double, limited: Bool, note: String, severity: [String: Int], savedAt: Date = Date()) {
        self.day = day
        self.sleep = sleep
        self.limited = limited
        self.note = note
        self.savedAt = savedAt
        self.severityJSON = CheckIn.encode(severity)
    }

    var severity: [String: Int] {
        get { (try? JSONDecoder().decode([String: Int].self, from: Data(severityJSON.utf8))) ?? [:] }
        set { severityJSON = CheckIn.encode(newValue) }
    }

    func value(for c: Condition) -> Int? { severity[c.uid.uuidString] }

    static func encode(_ d: [String: Int]) -> String {
        (try? String(data: JSONEncoder().encode(d), encoding: .utf8)) ?? "{}"
    }
}

@Model final class Flare {
    var uid: UUID = UUID()
    var conditionID: UUID = UUID()
    var start: Date = Date()
    var hours: Double = 0
    var liedDown: Bool = false
    var note: String = ""

    init(conditionID: UUID, start: Date, hours: Double, liedDown: Bool, note: String) {
        self.uid = UUID()
        self.conditionID = conditionID
        self.start = start
        self.hours = hours
        self.liedDown = liedDown
        self.note = note
    }
}

@Model final class Evidence {
    var uid: UUID = UUID()
    var title: String = ""
    var category: String = ""
    /// nil means it applies to every condition.
    var conditionID: UUID?
    var statusRaw: String = EvidenceStatus.need.rawValue
    /// File name inside Documents/evidence, if a file is attached.
    var storedFile: String?
    var fileName: String?
    var createdAt: Date = Date()

    init(title: String, category: String, conditionID: UUID?, status: EvidenceStatus, storedFile: String? = nil, fileName: String? = nil) {
        self.uid = UUID()
        self.title = title
        self.category = category
        self.conditionID = conditionID
        self.statusRaw = status.rawValue
        self.storedFile = storedFile
        self.fileName = fileName
        self.createdAt = Date()
    }

    var status: EvidenceStatus {
        get { EvidenceStatus(rawValue: statusRaw) ?? .need }
        set { statusRaw = newValue.rawValue }
    }

    var fileURL: URL? { storedFile.map { EvidenceFiles.folder.appendingPathComponent($0) } }
}

@Model final class Deadline {
    var uid: UUID = UUID()
    var title: String = ""
    var detail: String = ""
    var date: Date = Date()

    init(title: String, detail: String, date: Date) {
        self.uid = UUID()
        self.title = title
        self.detail = detail
        self.date = date
    }
}

@Model final class Assessment {
    var uid: UUID = UUID()
    var kindRaw: String = AssessmentKind.phq9.rawValue
    var takenAt: Date = Date()
    /// Comma-separated answers, e.g. "0,1,2".
    var answersCSV: String = ""
    var total: Int = 0

    init(kind: AssessmentKind, answers: [Int], takenAt: Date = Date()) {
        self.uid = UUID()
        self.kindRaw = kind.rawValue
        self.takenAt = takenAt
        self.answersCSV = answers.map(String.init).joined(separator: ",")
        self.total = answers.reduce(0, +)
    }

    var kind: AssessmentKind { AssessmentKind(rawValue: kindRaw) ?? .phq9 }
    var answers: [Int] { answersCSV.split(separator: ",").compactMap { Int($0) } }
}

let allModels: [any PersistentModel.Type] = [Condition.self, CheckIn.self, Flare.self, Evidence.self, Deadline.self, Assessment.self]

/// Where attached evidence files live. Private to the app and included in the phone's own backups.
enum EvidenceFiles {
    static var folder: URL {
        let url = URL.documentsDirectory.appendingPathComponent("evidence", isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    /// Copy a picked file in. Returns the stored file name.
    static func store(_ source: URL) throws -> String {
        let access = source.startAccessingSecurityScopedResource()
        defer { if access { source.stopAccessingSecurityScopedResource() } }
        let safe = source.lastPathComponent.replacingOccurrences(of: "/", with: "_")
        let name = "\(Int(Date().timeIntervalSince1970))-\(safe)"
        try FileManager.default.copyItem(at: source, to: folder.appendingPathComponent(name))
        return name
    }

    static func remove(_ stored: String?) {
        guard let stored else { return }
        try? FileManager.default.removeItem(at: folder.appendingPathComponent(stored))
    }

    static func removeAll() {
        try? FileManager.default.removeItem(at: URL.documentsDirectory.appendingPathComponent("evidence"))
    }
}
