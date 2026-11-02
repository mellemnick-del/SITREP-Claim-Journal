import SwiftUI
import UIKit
import CoreText

// MARK: - Colors (field-logbook palette: olive paper in light, dark olive in dark)

private func dynamic(_ light: UInt32, _ dark: UInt32) -> Color {
    Color(UIColor { trait in
        let hex = trait.userInterfaceStyle == .dark ? dark : light
        return UIColor(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    })
}

enum Palette {
    static let bg = dynamic(0xECEEE5, 0x12160F)
    static let surface = dynamic(0xF8F9F3, 0x1A1F17)
    static let sunken = dynamic(0xE2E5D9, 0x232A1F)
    static let fg = dynamic(0x1D2219, 0xE2E7D8)
    static let muted = dynamic(0x5C6455, 0x9AA38F)
    static let line = dynamic(0xCBD0C0, 0x2F3829)
    static let accent = dynamic(0x3E5A28, 0xA3C27A)
    static let accentInk = dynamic(0xF4F7EE, 0x13180F)
    static let accentSoft = dynamic(0xDCE5CF, 0x2A3820)
    static let flare = dynamic(0xB0472C, 0xE77F5F)
    static let flareSoft = dynamic(0xF2DDD5, 0x3A2219)
    static let warn = dynamic(0x9A6A12, 0xDDB45A)
    static let warnSoft = dynamic(0xF1E5C8, 0x362C16)
    static let ok = dynamic(0x2F6B3F, 0x7CC48C)
    static let okSoft = dynamic(0xD6E8D9, 0x1D3423)
}

// MARK: - Fonts

enum Fonts {
    static func registerAll() {
        let files = [
            "SairaCondensed_600SemiBold", "SairaCondensed_700Bold",
            "PublicSans_400Regular", "PublicSans_500Medium", "PublicSans_600SemiBold",
            "IBMPlexMono_400Regular",
        ]
        for name in files {
            if let url = Bundle.main.url(forResource: name, withExtension: "ttf") {
                CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
            }
        }
    }

    static func display(_ size: CGFloat) -> Font { .custom("SairaCondensed-SemiBold", size: size) }
    static func displayBold(_ size: CGFloat) -> Font { .custom("SairaCondensed-Bold", size: size) }
    static func body(_ size: CGFloat = 15) -> Font { .custom("PublicSans-Regular", size: size) }
    static func medium(_ size: CGFloat = 15) -> Font { .custom("PublicSans-Medium", size: size) }
    static func semibold(_ size: CGFloat = 15) -> Font { .custom("PublicSans-SemiBold", size: size) }
    static func mono(_ size: CGFloat = 12) -> Font { .custom("IBMPlexMono-Regular", size: size) }
}

// MARK: - Building blocks

enum Tone { case neutral, ok, warn, flare, accent }

extension Tone {
    var colors: (bg: Color, fg: Color) {
        switch self {
        case .neutral: return (Palette.sunken, Palette.muted)
        case .ok: return (Palette.okSoft, Palette.ok)
        case .warn: return (Palette.warnSoft, Palette.warn)
        case .flare: return (Palette.flareSoft, Palette.flare)
        case .accent: return (Palette.accentSoft, Palette.accent)
        }
    }
}

struct Chip: View {
    let label: String
    var tone: Tone = .neutral
    var body: some View {
        Text(label.uppercased())
            .font(Fonts.semibold(11))
            .tracking(0.6)
            .foregroundStyle(tone.colors.fg)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(tone.colors.bg, in: Capsule())
            .fixedSize()
    }
}

struct Panel<Content: View>: View {
    var spacing: CGFloat = 14
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: spacing) { content }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.surface, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Palette.line, lineWidth: 1))
    }
}

struct Eyebrow: View {
    let text: String
    var body: some View {
        Text(text.uppercased()).font(Fonts.semibold(11)).tracking(1.1).foregroundStyle(Palette.muted)
    }
}

struct PageHeader: View {
    let eyebrow: String
    let title: String
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Eyebrow(text: eyebrow)
            Text(title).font(Fonts.display(32)).foregroundStyle(Palette.fg)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct H2: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View { Text(text).font(Fonts.display(22)).foregroundStyle(Palette.fg) }
}

struct Fine: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View {
        Text(text).font(Fonts.body(13)).foregroundStyle(Palette.muted).frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct Wordmark: View {
    var size: CGFloat = 26
    var body: some View {
        (Text("SIT").foregroundColor(Palette.fg) + Text("REP").foregroundColor(Palette.accent))
            .font(Fonts.displayBold(size))
            .tracking(size * 0.09)
    }
}

enum ButtonKind { case primary, ghost, flare, danger }

struct ButtonLook: ViewModifier {
    var kind: ButtonKind
    func body(content: Content) -> some View {
        let bg: Color = kind == .primary ? Palette.accent : kind == .flare ? Palette.flareSoft : .clear
        let fg: Color = kind == .primary ? Palette.accentInk : (kind == .flare || kind == .danger) ? Palette.flare : Palette.accent
        let border: Color = kind == .danger ? Palette.flare : kind == .ghost ? Palette.line : .clear
        return content
            .font(Fonts.semibold(15))
            .foregroundStyle(fg)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 13)
            .padding(.horizontal, 16)
            .background(bg, in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(border, lineWidth: 1))
            .contentShape(Rectangle())
    }
}

struct SButtonStyle: ButtonStyle {
    var kind: ButtonKind = .primary
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .modifier(ButtonLook(kind: kind))
            .opacity(configuration.isPressed ? 0.75 : 1)
    }
}

extension View {
    func sButton(_ kind: ButtonKind = .primary) -> some View { buttonStyle(SButtonStyle(kind: kind)) }
    func buttonLook(_ kind: ButtonKind) -> some View { modifier(ButtonLook(kind: kind)) }

    /// Standard text field look.
    func fieldStyle() -> some View {
        self.font(Fonts.body(15))
            .foregroundStyle(Palette.fg)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Palette.bg, in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Palette.line, lineWidth: 1))
    }
}

struct Field<Content: View>: View {
    let label: String
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(Fonts.semibold(14)).foregroundStyle(Palette.fg)
            content
        }
    }
}

/// Scrolling page with the app background and side gutter.
struct Page<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) { content }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 32)
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Palette.bg.ignoresSafeArea())
    }
}

struct StatTile: View {
    let value: String
    let label: String
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value).font(Fonts.display(24)).monospacedDigit().foregroundStyle(Palette.fg)
            Text(label).font(Fonts.body(12)).foregroundStyle(Palette.muted).fixedSize(horizontal: false, vertical: true)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .background(Palette.sunken, in: RoundedRectangle(cornerRadius: 8))
    }
}

struct StatRow: View {
    let items: [(String, String)]
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            ForEach(items.indices, id: \.self) { i in StatTile(value: items[i].0, label: items[i].1) }
        }
    }
}

/// Wrapping row of choice pills.
struct ChoicePills<T: Hashable>: View {
    let options: [(T, String)]
    @Binding var selection: T
    var body: some View {
        FlowLayout(spacing: 6) {
            ForEach(options.indices, id: \.self) { i in
                let option = options[i]
                let on = option.0 == selection
                Button { selection = option.0 } label: {
                    Text(option.1)
                        .font(Fonts.medium(13))
                        .foregroundStyle(on ? Palette.accentInk : Palette.fg)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(on ? Palette.accent : Palette.surface, in: Capsule())
                        .overlay(Capsule().stroke(on ? Palette.accent : Palette.line, lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
    }
}

/// Simple left-to-right wrapping layout.
struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0, widest: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if x > 0 && x + s.width > maxWidth {
                y += rowHeight + spacing
                x = 0
                rowHeight = 0
            }
            x += s.width + spacing
            rowHeight = max(rowHeight, s.height)
            widest = max(widest, x - spacing)
        }
        return CGSize(width: min(widest, maxWidth), height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if x > bounds.minX && x + s.width > bounds.maxX {
                y += rowHeight + spacing
                x = bounds.minX
                rowHeight = 0
            }
            v.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(s))
            x += s.width + spacing
            rowHeight = max(rowHeight, s.height)
        }
    }
}

struct Stepper2: View {
    @Binding var value: Double
    var step: Double = 1
    var range: ClosedRange<Double> = 0...99
    var suffix: String = ""
    var body: some View {
        HStack(spacing: 12) {
            stepButton("−", -step)
            Text("\(value.clean)\(suffix.isEmpty ? "" : " \(suffix)")")
                .font(Fonts.display(24))
                .monospacedDigit()
                .foregroundStyle(Palette.fg)
                .frame(minWidth: 80)
            stepButton("+", step)
        }
    }

    private func stepButton(_ label: String, _ delta: Double) -> some View {
        Button {
            value = min(range.upperBound, max(range.lowerBound, value + delta))
        } label: {
            Text(label).font(Fonts.display(22)).foregroundStyle(Palette.accent)
                .frame(width: 44, height: 44)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Palette.line, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(delta > 0 ? "Increase" : "Decrease")
    }
}

struct CheckRow: View {
    let label: String
    @Binding var isOn: Bool
    var body: some View {
        Button { isOn.toggle() } label: {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: isOn ? "checkmark.square.fill" : "square")
                    .font(.system(size: 22))
                    .foregroundStyle(isOn ? Palette.accent : Palette.muted)
                Text(label).font(Fonts.medium(15)).foregroundStyle(Palette.fg).multilineTextAlignment(.leading)
                Spacer(minLength: 0)
            }
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }
}

extension Double {
    /// 7 -> "7", 7.5 -> "7.5"
    var clean: String { truncatingRemainder(dividingBy: 1) == 0 ? String(Int(self)) : String(format: "%.1f", self) }
}

// MARK: - Toast

@Observable final class Toaster {
    var message: String?
    private var token = 0

    func show(_ text: String) {
        message = text
        token += 1
        let mine = token
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) { [weak self] in
            if self?.token == mine { self?.message = nil }
        }
    }
}

struct ToastOverlay: View {
    @Environment(Toaster.self) private var toaster
    var body: some View {
        VStack {
            Spacer()
            if let m = toaster.message {
                Text(m)
                    .font(Fonts.semibold(14))
                    .foregroundStyle(Palette.bg)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Palette.fg, in: Capsule())
                    .padding(.bottom, 72)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: toaster.message)
        .allowsHitTesting(false)
    }
}

// MARK: - Share sheet

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ vc: UIActivityViewController, context: Context) {}
}

/// Lets a URL drive `.sheet(item:)`.
struct ShareItem: Identifiable {
    let id = UUID()
    let url: URL
}
