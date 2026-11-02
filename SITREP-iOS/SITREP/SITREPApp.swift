import SwiftUI
import SwiftData

@main
struct SITREPApp: App {
    @State private var toaster = Toaster()

    init() {
        Fonts.registerAll()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(toaster)
        }
        .modelContainer(for: [Condition.self, CheckIn.self, Flare.self, Evidence.self, Deadline.self, Assessment.self])
    }
}

struct RootView: View {
    @AppStorage(Keys.onboarded) private var onboarded = false
    @AppStorage(Keys.lockOn) private var lockOn = false
    @Environment(\.scenePhase) private var scenePhase
    @State private var locked = UserDefaults.standard.bool(forKey: Keys.lockOn)

    var body: some View {
        ZStack {
            if onboarded {
                MainTabs()
            } else {
                WelcomeView()
            }
            ToastOverlay()
            if locked {
                LockView { locked = false }
                    .transition(.opacity)
            }
        }
        // Only "background" locks. "inactive" also fires while Face ID itself is showing.
        .onChange(of: scenePhase) { _, phase in
            if phase == .background && lockOn { locked = true }
        }
    }
}

struct MainTabs: View {
    var body: some View {
        TabView {
            NavigationStack { TodayView() }
                .tabItem { Label("Today", systemImage: "scope") }
            NavigationStack { LogView() }
                .tabItem { Label("Log", systemImage: "list.bullet.rectangle") }
            NavigationStack { ConditionsView() }
                .tabItem { Label("Conditions", systemImage: "chart.bar") }
            NavigationStack { EvidenceView() }
                .tabItem { Label("Evidence", systemImage: "folder") }
            NavigationStack { MoreView() }
                .tabItem { Label("More", systemImage: "ellipsis.circle") }
        }
        .tint(Palette.accent)
    }
}

struct LockView: View {
    let onUnlock: () -> Void
    @State private var busy = false

    var body: some View {
        VStack(spacing: 16) {
            Wordmark(size: 40)
            Text("Your journal is locked.").font(Fonts.body()).foregroundStyle(Palette.muted)
            Button("Unlock") { unlock() }.sButton()
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.bg.ignoresSafeArea())
        .task { unlock() }
    }

    private func unlock() {
        guard !busy else { return }
        busy = true
        Task {
            if await Biometrics.confirm("Unlock SITREP") { onUnlock() }
            busy = false
        }
    }
}

struct WelcomeView: View {
    @Environment(\.modelContext) private var ctx
    @AppStorage(Keys.onboarded) private var onboarded = false
    @AppStorage(Keys.isExample) private var isExample = false

    private let points = [
        ("Log a quick check-in each day", "Rate each condition, sleep, and how symptoms affected your day."),
        ("Capture flare-ups as they happen", "How long they lasted and whether you had to stop and lie down."),
        ("Track your mental health", "Standard PTSD, depression and anxiety check-ups your provider already uses."),
        ("Keep your evidence organized", "Track what you have, what you requested, and what you still need."),
        ("Hand your VSO a clean summary", "Export a PDF timeline for your VSO or C&P exam."),
    ]

    var body: some View {
        Page {
            VStack(alignment: .leading, spacing: 8) {
                Wordmark(size: 44)
                Text("A daily journal for your VA claim.").font(Fonts.display(24)).foregroundStyle(Palette.fg)
            }
            .padding(.top, 32)

            VStack(alignment: .leading, spacing: 14) {
                ForEach(points.indices, id: \.self) { i in
                    let point = points[i]
                    HStack(alignment: .top, spacing: 12) {
                        RoundedRectangle(cornerRadius: 2).fill(Palette.accent).frame(width: 4)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(point.0).font(Fonts.semibold()).foregroundStyle(Palette.fg)
                            Text(point.1).font(Fonts.body(13)).foregroundStyle(Palette.muted)
                        }
                    }
                    .fixedSize(horizontal: false, vertical: true)
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Private by design").font(Fonts.semibold()).foregroundStyle(Palette.fg)
                Text("No account. Nothing is uploaded. Your journal lives only on this phone.").font(Fonts.body(13)).foregroundStyle(Palette.muted)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.sunken, in: RoundedRectangle(cornerRadius: 10))

            VStack(spacing: 10) {
                Button("Start my journal") { onboarded = true }.sButton()
                Button("Look around with example data") {
                    ExampleData.load(into: ctx)
                    isExample = true
                    onboarded = true
                }
                .sButton(.ghost)
            }
            Fine("SITREP is an organizer. It isn't legal or medical advice and isn't affiliated with the VA. Talk with an accredited VSO about your claim.")
        }
    }
}

/// Veterans Crisis Line. Shown after a concerning answer and always reachable from More.
struct CrisisCard: View {
    var urgent = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(urgent ? "You don't have to carry this alone" : "Veterans Crisis Line")
                .font(Fonts.display(22))
                .foregroundStyle(urgent ? Palette.flare : Palette.fg)
            Text(urgent
                 ? "You mentioned thoughts of being better off dead or hurting yourself. Caring, qualified responders at the Veterans Crisis Line are available 24/7, and many of them are veterans. It is free and confidential."
                 : "Free, confidential support 24/7 for veterans, service members and their families. You don't have to be enrolled in VA benefits or health care.")
                .font(Fonts.body())
                .foregroundStyle(Palette.fg)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 8) {
                Link(destination: Crisis.call) { Text("Call 988, press 1").buttonLook(.primary) }
                Link(destination: Crisis.text) { Text("Text 838255").buttonLook(.ghost) }
            }
            Link("Chat online at VeteransCrisisLine.net", destination: Crisis.chat)
                .font(Fonts.semibold(14))
                .foregroundStyle(Palette.accent)
            if urgent {
                Text("If you are in immediate danger, call 911.").font(Fonts.body(13)).foregroundStyle(Palette.muted)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(urgent ? Palette.flareSoft : Palette.surface, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(urgent ? Palette.flare : Palette.line, lineWidth: 1))
    }
}
