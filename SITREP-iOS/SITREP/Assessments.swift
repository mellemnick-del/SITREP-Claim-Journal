import Foundation

enum AssessmentKind: String, CaseIterable, Codable, Identifiable {
    case pcl5 = "PCL5", phq9 = "PHQ9", gad7 = "GAD7"
    var id: String { rawValue }
    var instrument: Instrument { Instrument.all[self]! }
}

struct Band {
    let min: Int
    let label: String
    let tone: Tone
}

struct Instrument {
    let kind: AssessmentKind
    let short: String
    let name: String
    let about: String
    let prompt: String
    let options: [String]
    let items: [String]
    let max: Int
    let bands: [Band]
    /// How often clinicians commonly repeat it, used for the "due" reminder.
    let everyDays: Int
    let source: String

    func band(for total: Int) -> Band { bands.last { total >= $0.min } ?? bands[0] }

    static let order: [AssessmentKind] = [.pcl5, .phq9, .gad7]

    private static let twoWeeks = "Over the last 2 weeks, how often have you been bothered by the following problems?"
    private static let freq = ["Not at all", "Several days", "More than half the days", "Nearly every day"]

    static let all: [AssessmentKind: Instrument] = [
        .pcl5: Instrument(
            kind: .pcl5,
            short: "PCL-5",
            name: "PTSD Checklist (PCL-5)",
            about: "A 20-question checklist for PTSD symptoms over the past month. Developed by the VA National Center for PTSD.",
            prompt: "Below is a list of problems that people sometimes have in response to a very stressful experience. How much have you been bothered by each problem in the past month?",
            options: ["Not at all", "A little bit", "Moderately", "Quite a bit", "Extremely"],
            items: [
                "Repeated, disturbing, and unwanted memories of the stressful experience?",
                "Repeated, disturbing dreams of the stressful experience?",
                "Suddenly feeling or acting as if the stressful experience were actually happening again (as if you were actually back there reliving it)?",
                "Feeling very upset when something reminded you of the stressful experience?",
                "Having strong physical reactions when something reminded you of the stressful experience (for example, heart pounding, trouble breathing, sweating)?",
                "Avoiding memories, thoughts, or feelings related to the stressful experience?",
                "Avoiding external reminders of the stressful experience (for example, people, places, conversations, activities, objects, or situations)?",
                "Trouble remembering important parts of the stressful experience?",
                "Having strong negative beliefs about yourself, other people, or the world (for example, having thoughts such as: I am bad, there is something seriously wrong with me, no one can be trusted, the world is completely dangerous)?",
                "Blaming yourself or someone else for the stressful experience or what happened after it?",
                "Having strong negative feelings such as fear, horror, anger, guilt, or shame?",
                "Loss of interest in activities that you used to enjoy?",
                "Feeling distant or cut off from other people?",
                "Trouble experiencing positive feelings (for example, being unable to feel happiness or have loving feelings for people close to you)?",
                "Irritable behavior, angry outbursts, or acting aggressively?",
                "Taking too many risks or doing things that could cause you harm?",
                "Being \"superalert\" or watchful or on guard?",
                "Feeling jumpy or easily startled?",
                "Having difficulty concentrating?",
                "Trouble falling or staying asleep?",
            ],
            max: 80,
            // The PCL-5 has no official severity bands. This only flags the range where clinicians commonly follow up.
            bands: [
                Band(min: 0, label: "Below common follow-up range", tone: .neutral),
                Band(min: 31, label: "In the range where providers often follow up", tone: .warn),
            ],
            everyDays: 30,
            source: "Weathers et al., 2013. National Center for PTSD (public domain)."
        ),
        .phq9: Instrument(
            kind: .phq9,
            short: "PHQ-9",
            name: "Depression check (PHQ-9)",
            about: "Nine questions about mood over the past two weeks. Widely used by doctors and the VA.",
            prompt: twoWeeks,
            options: freq,
            items: [
                "Little interest or pleasure in doing things",
                "Feeling down, depressed, or hopeless",
                "Trouble falling or staying asleep, or sleeping too much",
                "Feeling tired or having little energy",
                "Poor appetite or overeating",
                "Feeling bad about yourself, or that you are a failure or have let yourself or your family down",
                "Trouble concentrating on things, such as reading the newspaper or watching television",
                "Moving or speaking so slowly that other people could have noticed? Or the opposite: being so fidgety or restless that you have been moving around a lot more than usual",
                "Thoughts that you would be better off dead or of hurting yourself in some way",
            ],
            max: 27,
            bands: [
                Band(min: 0, label: "Minimal", tone: .ok),
                Band(min: 5, label: "Mild", tone: .neutral),
                Band(min: 10, label: "Moderate", tone: .warn),
                Band(min: 15, label: "Moderately severe", tone: .flare),
                Band(min: 20, label: "Severe", tone: .flare),
            ],
            everyDays: 14,
            source: "Kroenke, Spitzer & Williams, 2001. Free to use, no permission required."
        ),
        .gad7: Instrument(
            kind: .gad7,
            short: "GAD-7",
            name: "Anxiety check (GAD-7)",
            about: "Seven questions about anxiety over the past two weeks.",
            prompt: twoWeeks,
            options: freq,
            items: [
                "Feeling nervous, anxious, or on edge",
                "Not being able to stop or control worrying",
                "Worrying too much about different things",
                "Trouble relaxing",
                "Being so restless that it is hard to sit still",
                "Becoming easily annoyed or irritable",
                "Feeling afraid, as if something awful might happen",
            ],
            max: 21,
            bands: [
                Band(min: 0, label: "Minimal", tone: .ok),
                Band(min: 5, label: "Mild", tone: .neutral),
                Band(min: 10, label: "Moderate", tone: .warn),
                Band(min: 15, label: "Severe", tone: .flare),
            ],
            everyDays: 14,
            source: "Spitzer et al., 2006. Free to use, no permission required."
        ),
    ]

    /// PHQ-9 question 9 asks about thoughts of self-harm. Any answer above "Not at all" shows crisis resources.
    static func needsCrisisSupport(_ kind: AssessmentKind, _ answers: [Int]) -> Bool {
        kind == .phq9 && answers.count > 8 && answers[8] > 0
    }

    /// Whether a check-up is due, plus a short label.
    static func due(_ kind: AssessmentKind, in list: [Assessment]) -> (due: Bool, label: String) {
        guard let last = list.filter({ $0.kind == kind }).max(by: { $0.takenAt < $1.takenAt }) else {
            return (true, "Not taken yet")
        }
        let days = Dates.cal.dateComponents([.day], from: last.takenAt, to: Date()).day ?? 0
        let every = kind.instrument.everyDays
        return days >= every ? (true, "Due, last taken \(days) days ago") : (false, "Next in \(every - days) days")
    }
}

enum Crisis {
    static let call = URL(string: "tel:988")!
    static let text = URL(string: "sms:838255")!
    static let chat = URL(string: "https://www.veteranscrisisline.net/get-help-now/chat/")!
}
