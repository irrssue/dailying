//
//  Briefing.swift
//  dailying
//
//  A single morning's briefing: when it was generated, the (up to ~5) cards to
//  swipe through, and the current streak. Honest about emptiness.
//

import Foundation

struct Briefing {
    let generatedAt: Date
    let cards: [BriefingCard]
    let streakDays: Int

    init(generatedAt: Date, cards: [BriefingCard], streakDays: Int) {
        self.generatedAt = generatedAt
        self.cards = cards
        self.streakDays = streakDays
    }

    /// True when there's nothing meaningful to show. Drives the empty state.
    var isEmpty: Bool {
        cards.isEmpty
    }
}
