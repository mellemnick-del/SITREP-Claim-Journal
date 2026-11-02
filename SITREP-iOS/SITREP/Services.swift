import Foundation
import LocalAuthentication
import SwiftData
import UIKit
import UserNotifications

// MARK: - Settings keys (stored with @AppStorage)

enum Keys {
    static let onboarded = "onboarded"
    static let isExample = "isExample"
    static let veteranName = "veteranName"
    static let reminderOn = "reminderOn"
    static let reminderMinutes = "reminderMinutes" // minutes after midnight
    static let lockOn = "lockOn"
}

// MARK: - Daily reminder

enum Reminders {
    private static let id = "daily-checkin"
    private static let messages = [
        "Time for your SITREP. One minute, then you’re done for the day.",
        "How did today go? Log it while it’s fresh.",
        "Quick check-in: rate today and note anything that got in the way.",
    ]

    /// Schedules one repeating daily reminder. Returns false if notifications aren't allowed.
    static func schedule(minutes: Int) async -> Bool {
        let center = UNUserNotificationCenter.current()
        let granted = (try? await center.requestAuthorization(options: [.alert, .sound])) ?? false
        guard granted else { return false }
        center.removePendingNotificationRequests(withIdentifiers: [id])
        let content = UNMutableNotificationContent()
        content.title = "SITREP"
        content.body = messages.randomElement() ?? messages[0]
        let trigger = UNCalendarNotificationTrigger(dateMatching: DateComponents(hour: minutes / 60, minute: minutes % 60), repeats: true)
        do {
            try await center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
            return true
        } catch {
            return false
        }
    }

    static func cancel() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
    }
}

// MARK: - Face ID / passcode

enum Biometrics {
    static var available: Bool {
        LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: nil)
    }

    static func confirm(_ reason: String) async -> Bool {
        (try? await LAContext().evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason)) ?? false
    }
}

// MARK: - Backup and restore

struct BackupFile: Codable {
    struct C: Codable { var uid: UUID; var name: String; var dc: String; var status: String; var sort: Int }
    struct K: Codable { var day: String; var sleep: Double; var limited: Bool; var note: String; var savedAt: Date; var severity: [String: Int] }
    struct F: Codable { var conditionID: UUID; var start: Date; var hours: Double; var liedDown: Bool; var note: String }
    struct E: Codable { var title: String; var category: String; var conditionID: UUID?; var status: String; var fileName: String? }
    struct D: Codable { var title: String; var detail: String; var date: Date }
    struct A: Codable { var kind: String; var takenAt: Date; var answers: [Int] }

    var format = "sitrep-backup"
    var version = 2
    var exportedAt = Date()
    var veteranName: String
    var conditions: [C]
    var checkIns: [K]
    var flares: [F]
    var evidence: [E]
    var deadlines: [D]
    var assessments: [A]
}

enum BackupError: LocalizedError {
    case notABackup
    var errorDescription: String? { "This file is not a SITREP backup." }
}

enum Backup {
    private static func coder() -> (JSONEncoder, JSONDecoder) {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        e.outputFormatting = [.prettyPrinted, .sortedKeys]
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return (e, d)
    }

    /// Writes a backup file to the temporary folder and returns its URL for the share sheet.
    /// Attached evidence files aren't included, only their records.
    static func write(from ctx: ModelContext, veteranName: String) throws -> URL {
        let b = BackupFile(
            veteranName: veteranName,
            conditions: (try ctx.fetch(FetchDescriptor<Condition>())).map { .init(uid: $0.uid, name: $0.name, dc: $0.dc, status: $0.statusRaw, sort: $0.sort) },
            checkIns: (try ctx.fetch(FetchDescriptor<CheckIn>())).map { .init(day: $0.day, sleep: $0.sleep, limited: $0.limited, note: $0.note, savedAt: $0.savedAt, severity: $0.severity) },
            flares: (try ctx.fetch(FetchDescriptor<Flare>())).map { .init(conditionID: $0.conditionID, start: $0.start, hours: $0.hours, liedDown: $0.liedDown, note: $0.note) },
            evidence: (try ctx.fetch(FetchDescriptor<Evidence>())).map { .init(title: $0.title, category: $0.category, conditionID: $0.conditionID, status: $0.statusRaw, fileName: $0.fileName) },
            deadlines: (try ctx.fetch(FetchDescriptor<Deadline>())).map { .init(title: $0.title, detail: $0.detail, date: $0.date) },
            assessments: (try ctx.fetch(FetchDescriptor<Assessment>())).map { .init(kind: $0.kindRaw, takenAt: $0.takenAt, answers: $0.answers) }
        )
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("SITREP-backup-\(Dates.key(Date())).json")
        try coder().0.encode(b).write(to: url, options: .atomic)
        return url
    }

    static func read(_ url: URL) throws -> BackupFile {
        let access = url.startAccessingSecurityScopedResource()
        defer { if access { url.stopAccessingSecurityScopedResource() } }
        guard let data = try? Data(contentsOf: url), let b = try? coder().1.decode(BackupFile.self, from: data), b.format == "sitrep-backup" else {
            throw BackupError.notABackup
        }
        return b
    }

    /// Replaces everything on this phone with the backup.
    static func restore(_ b: BackupFile, into ctx: ModelContext) {
        ExampleData.eraseAll(in: ctx)
        for c in b.conditions {
            let m = Condition(name: c.name, dc: c.dc, status: ConditionStatus(rawValue: c.status) ?? .planned, sort: c.sort)
            m.uid = c.uid
            ctx.insert(m)
        }
        for k in b.checkIns { ctx.insert(CheckIn(day: k.day, sleep: k.sleep, limited: k.limited, note: k.note, severity: k.severity, savedAt: k.savedAt)) }
        for f in b.flares { ctx.insert(Flare(conditionID: f.conditionID, start: f.start, hours: f.hours, liedDown: f.liedDown, note: f.note)) }
        for e in b.evidence {
            ctx.insert(Evidence(title: e.title, category: e.category, conditionID: e.conditionID, status: EvidenceStatus(rawValue: e.status) ?? .need, storedFile: nil, fileName: e.fileName))
        }
        for d in b.deadlines { ctx.insert(Deadline(title: d.title, detail: d.detail, date: d.date)) }
        for a in b.assessments {
            if let kind = AssessmentKind(rawValue: a.kind) { ctx.insert(Assessment(kind: kind, answers: a.answers, takenAt: a.takenAt)) }
        }
        try? ctx.save()
    }
}

// MARK: - PDF

enum PDFMaker {
    /// Renders HTML into a US Letter PDF in the temporary folder.
    static func make(html: String, fileName: String) throws -> URL {
        let page = CGRect(x: 0, y: 0, width: 612, height: 792)
        let renderer = UIPrintPageRenderer()
        renderer.addPrintFormatter(UIMarkupTextPrintFormatter(markupText: html), startingAtPageAt: 0)
        renderer.setValue(NSValue(cgRect: page), forKey: "paperRect")
        renderer.setValue(NSValue(cgRect: page.insetBy(dx: 36, dy: 36)), forKey: "printableRect")
        let data = NSMutableData()
        UIGraphicsBeginPDFContextToData(data, page, nil)
        renderer.prepare(forDrawingPages: NSRange(location: 0, length: renderer.numberOfPages))
        for i in 0..<renderer.numberOfPages {
            UIGraphicsBeginPDFPage()
            renderer.drawPage(at: i, in: UIGraphicsGetPDFContextBounds())
        }
        UIGraphicsEndPDFContext()
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        try (data as Data).write(to: url, options: .atomic)
        return url
    }
}
