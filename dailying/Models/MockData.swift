//
//  MockData.swift
//  dailying
//
//  All data in the prototype comes from here. No network, no system access.
//  Bodies are calm, narrative, and ≤12 words by design.
//
//  TODO(liam): replace the entire MockData layer with the real briefing
//  pipeline — Claude-summarized EventKit / Mail / Reminders / news — once the
//  backend, auth, and system permissions exist.
//

import Foundation

enum MockData {

    // MARK: - Date helpers

    /// Anchor calendar blocks to *today* so the current-time marker lands in a
    /// believable place whenever Liam runs this.
    private static func todayAt(_ hour: Int, _ minute: Int = 0) -> Date {
        let cal = Calendar.current
        return cal.date(
            bySettingHour: hour,
            minute: minute,
            second: 0,
            of: Date()
        ) ?? Date()
    }

    // MARK: - Full briefing

    static var fullBriefing: Briefing {
        Briefing(
            generatedAt: Date(),
            cards: [
                todayCard,
                inboxCardOne,
                inboxCardTwo,
                reminderCardOne,
                reminderCardTwo,
                newsCard
            ],
            streakDays: 7
        )
    }

    // MARK: - Empty briefing (honest empty state)

    static var emptyBriefing: Briefing {
        Briefing(
            generatedAt: Date(),
            cards: [],
            streakDays: 7
        )
    }

    // MARK: - Cards

    /// The special Today card: weather woven into the body, real timeline blocks.
    static var todayCard: BriefingCard {
        BriefingCard(
            category: .today,
            body: "Crisp and clear. Three meetings — first at ten, with Henri.",
            deepLink: URL(string: "calshow://"),
            timeline: [
                CalendarBlock(title: "Standup",          start: todayAt(9, 0),  end: todayAt(9, 30),  accentName: .reminders),
                CalendarBlock(title: "1:1 with Henri",   start: todayAt(10, 0), end: todayAt(11, 0),  accentName: .today),
                CalendarBlock(title: "Lunch with Mara",  start: todayAt(12, 30), end: todayAt(13, 30), accentName: .news),
                CalendarBlock(title: "Design review",    start: todayAt(15, 0), end: todayAt(16, 0),  accentName: .inbox),
                CalendarBlock(title: "Gym",              start: todayAt(18, 30), end: todayAt(19, 30), accentName: .reminders)
            ]
        )
    }

    static var inboxCardOne: BriefingCard {
        BriefingCard(
            category: .inbox,
            body: "Two emails worth your attention. One's about the internship.",
            deepLink: URL(string: "message://")
        )
    }

    static var inboxCardTwo: BriefingCard {
        BriefingCard(
            category: .inbox,
            body: "Sofia replied about the apartment. She needs an answer today.",
            deepLink: URL(string: "message://")
        )
    }

    static var reminderCardOne: BriefingCard {
        BriefingCard(
            category: .reminders,
            body: "You wanted to call your sister back today.",
            deepLink: URL(string: "x-apple-reminderkit://")
        )
    }

    static var reminderCardTwo: BriefingCard {
        BriefingCard(
            category: .reminders,
            body: "Rent is due tomorrow. Worth doing it now.",
            deepLink: URL(string: "x-apple-reminderkit://")
        )
    }

    /// Only shown when news is opted in.
    static var newsCard: BriefingCard {
        BriefingCard(
            category: .news,
            body: "Quiet news morning. Nothing urgent out there.",
            deepLink: URL(string: "https://apple.news")
        )
    }
}
