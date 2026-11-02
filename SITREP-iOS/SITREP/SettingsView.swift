import SwiftUI
import SwiftData

struct SettingsView: View {
    @Environment(\.modelContext) private var ctx
    @Environment(Toaster.self) private var toaster
    @AppStorage(Keys.reminderOn) private var reminderOn = false
    @AppStorage(Keys.reminderMinutes) private var reminderMinutes = 20 * 60
    @AppStorage(Keys.lockOn) private var lockOn = false
    @AppStorage(Keys.isExample) private var isExample = false
    @AppStorage(Keys.onboarded) private var onboarded = true
    @AppStorage(Keys.veteranName) private var veteranName = ""

    @State private var share: ShareItem?
    @State private var importing = false
    @State private var pending: BackupFile?
    @State private var confirmErase = false

    private var reminderTime: Binding<Date> {
        Binding(
            get: { Dates.cal.date(bySettingHour: reminderMinutes / 60, minute: reminderMinutes % 60, second: 0, of: Date()) ?? Date() },
            set: { d in
                let c = Dates.cal.dateComponents([.hour, .minute], from: d)
                reminderMinutes = (c.hour ?? 20) * 60 + (c.minute ?? 0)
                Task { await applyReminder(true) }
            }
        )
    }

    var body: some View {
        Page {
            PageHeader(eyebrow: "SITREP", title: "Settings")

            Panel {
                H2("Daily reminder")
                Toggle(isOn: Binding(get: { reminderOn }, set: { on in Task { await applyReminder(on) } })) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Remind me to check in").font(Fonts.semibold()).foregroundStyle(Palette.fg)
                        Text("One notification a day. People who log daily build much stronger records.").font(Fonts.body(13)).foregroundStyle(Palette.muted)
                    }
                }
                .tint(Palette.accent)
                if reminderOn {
                    DatePicker("Time", selection: reminderTime, displayedComponents: .hourAndMinute)
                        .font(Fonts.body())
                        .tint(Palette.accent)
                }
            }

            Panel {
                H2("Privacy")
                if Biometrics.available {
                    Toggle(isOn: Binding(get: { lockOn }, set: { on in Task { await setLock(on) } })) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Lock with Face ID or passcode").font(Fonts.semibold()).foregroundStyle(Palette.fg)
                            Text("Ask to unlock every time SITREP opens.").font(Fonts.body(13)).foregroundStyle(Palette.muted)
                        }
                    }
                    .tint(Palette.accent)
                } else {
                    Text("Set up Face ID, Touch ID or a passcode on your phone to lock SITREP.").font(Fonts.body(13)).foregroundStyle(Palette.muted)
                }
                Text("Your journal is stored only on this phone. There's no account and nothing is uploaded.").font(Fonts.body(13)).foregroundStyle(Palette.muted)
            }

            Panel {
                H2("Backup")
                Text("Save a backup file to iCloud Drive, Files or email. Restore it on a new phone so you never lose months of logs. Attached evidence files aren't included, only their records.")
                    .font(Fonts.body(13)).foregroundStyle(Palette.muted)
                Button("Save a backup") {
                    do {
                        share = ShareItem(url: try Backup.write(from: ctx, veteranName: veteranName))
                    } catch {
                        toaster.show("Couldn't create the backup. Try again.")
                    }
                }
                .sButton()
                if let b = pending {
                    Text("Restoring replaces everything on this phone with the backup from \(Dates.full(b.exportedAt)). Anything not in the backup will be lost.")
                        .font(Fonts.body(13)).foregroundStyle(Palette.fg)
                    HStack(spacing: 8) {
                        Button("Cancel") { pending = nil }.sButton(.ghost)
                        Button("Replace with backup") {
                            Backup.restore(b, into: ctx)
                            veteranName = b.veteranName
                            isExample = false
                            pending = nil
                            toaster.show("Backup restored")
                        }
                        .sButton(.danger)
                    }
                } else {
                    Button("Restore from a backup") { importing = true }.sButton(.ghost)
                }
            }

            Panel {
                H2("Your data")
                if isExample {
                    Text("You're looking at example data. Erase it when you're ready to start your real journal.").font(Fonts.body(13)).foregroundStyle(Palette.fg)
                }
                if confirmErase {
                    Text("This permanently deletes every check-in, flare-up, check-up, condition, date and evidence file. It can't be undone.")
                        .font(Fonts.body(13)).foregroundStyle(Palette.fg)
                    HStack(spacing: 8) {
                        Button("Keep my data") { confirmErase = false }.sButton(.ghost)
                        Button("Erase everything") {
                            ExampleData.eraseAll(in: ctx)
                            Reminders.cancel()
                            reminderOn = false
                            isExample = false
                            veteranName = ""
                            confirmErase = false
                            onboarded = false
                        }
                        .sButton(.danger)
                    }
                } else {
                    Button("Erase all data") { confirmErase = true }
                        .font(Fonts.medium(14)).foregroundStyle(Palette.flare)
                }
            }

            Panel {
                H2("About")
                Text("SITREP is an organizer for veterans preparing a VA disability claim. It isn't legal or medical advice and isn't affiliated with the Department of Veterans Affairs. For help with your claim, work with an accredited Veterans Service Officer (VSO).")
                    .font(Fonts.body(13)).foregroundStyle(Palette.muted)
                Fine("Version \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0")")
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $share) { ShareSheet(items: [$0.url]) }
        .fileImporter(isPresented: $importing, allowedContentTypes: [.json]) { result in
            guard case .success(let url) = result else { return }
            do {
                pending = try Backup.read(url)
            } catch {
                toaster.show(error.localizedDescription)
            }
        }
    }

    private func applyReminder(_ on: Bool) async {
        guard on else {
            Reminders.cancel()
            reminderOn = false
            return
        }
        if await Reminders.schedule(minutes: reminderMinutes) {
            reminderOn = true
            let h = reminderMinutes / 60, m = reminderMinutes % 60
            toaster.show("Reminder set for \(h % 12 == 0 ? 12 : h % 12):\(String(format: "%02d", m)) \(h < 12 ? "AM" : "PM")")
        } else {
            reminderOn = false
            toaster.show("Allow notifications for SITREP in the Settings app first")
        }
    }

    private func setLock(_ on: Bool) async {
        guard await Biometrics.confirm(on ? "Turn on app lock" : "Turn off app lock") else { return }
        lockOn = on
        toaster.show(on ? "App lock on" : "App lock off")
    }
}
