//
//  CardCategory.swift
//  dailying
//
//  The kinds of things a morning briefing can surface. Each category knows how
//  to present itself: a short label, an SF Symbol standing in for the (future)
//  archetype illustration, and a calm accent color pulled from the Theme.
//

import SwiftUI

enum CardCategory: String, CaseIterable, Identifiable {
    case today
    case inbox
    case reminders
    case news

    var id: String { rawValue }

    /// Short human label, e.g. shown in the CategoryLabel.
    var label: String {
        switch self {
        case .today:     return "Today"
        case .inbox:     return "Inbox"
        case .reminders: return "Reminders"
        case .news:      return "News"
        }
    }

    /// SF Symbol placeholder for the eventual hand-drawn archetype illustration.
    // TODO(liam): replace these SF Symbols with real illustrations once we have an illustrator.
    var symbol: String {
        switch self {
        case .today:     return "sun.max"
        case .inbox:     return "envelope"
        case .reminders: return "checklist"
        case .news:      return "globe"
        }
    }

    /// A muted, calm accent per category. Sourced from Theme so the palette
    /// stays consistent across the app.
    var accent: Color {
        switch self {
        case .today:     return Theme.Accent.today
        case .inbox:     return Theme.Accent.inbox
        case .reminders: return Theme.Accent.reminders
        case .news:      return Theme.Accent.news
        }
    }
}
