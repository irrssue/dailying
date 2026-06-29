//
//  BriefingCard.swift
//  dailying
//
//  One swipeable card in the morning briefing. A card is a *pointer*, not a
//  viewer: its body is one tight line (≤12 words) and tapping it routes out to
//  the source app via a deep link.
//

import Foundation

struct CalendarBlock: Identifiable, Hashable {
    let id: UUID
    let title: String
    let start: Date
    let end: Date
    /// Accent stored as a hashable component triple so the model stays
    /// Foundation-only; resolved to a SwiftUI Color at the view layer.
    let accentName: AccentName

    enum AccentName: String, Hashable {
        case today, inbox, reminders, news
    }

    init(id: UUID = UUID(), title: String, start: Date, end: Date, accentName: AccentName) {
        self.id = id
        self.title = title
        self.start = start
        self.end = end
        self.accentName = accentName
    }
}

struct BriefingCard: Identifiable, Hashable {
    let id: UUID
    let category: CardCategory
    /// Narrative voice, capped at ~12 words. See `wordCount`.
    let body: String
    /// Where a tap would route. May no-op in the simulator — that's fine.
    let deepLink: URL?
    /// Only meaningful for `.today`: drives the calendar visualization.
    let timeline: [CalendarBlock]?

    init(
        id: UUID = UUID(),
        category: CardCategory,
        body: String,
        deepLink: URL? = nil,
        timeline: [CalendarBlock]? = nil
    ) {
        self.id = id
        self.category = category
        self.body = body
        self.deepLink = deepLink
        self.timeline = timeline

        // The 12-word rule. Body copy this long means the *content* is wrong,
        // not the copy. Debug-only so it flags regressions without shipping a crash.
        assert(
            BriefingCard.wordCount(body) <= 12,
            "Card body exceeds the 12-word rule (\(BriefingCard.wordCount(body)) words): \"\(body)\""
        )
    }

    static func wordCount(_ string: String) -> Int {
        string
            .split(whereSeparator: { $0 == " " || $0 == "\n" || $0 == "\t" })
            .count
    }
}
