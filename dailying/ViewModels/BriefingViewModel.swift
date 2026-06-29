//
//  BriefingViewModel.swift
//  dailying
//
//  MVVM-lite. Holds the current briefing and the handful of UI toggles. No async,
//  no network — loads MockData on init.
//
//  TODO(liam): swap MockData for the real briefing fetch (backend + Claude
//  pipeline) here. Keep this the single source of truth for the views.
//

import SwiftUI
import Combine

@MainActor
final class BriefingViewModel: ObservableObject {
    @Published var briefing: Briefing
    @Published var currentIndex: Int = 0

    /// News is opt-in. Off by default.
    @Published var newsEnabled: Bool = false

    /// Debug toggle (in Settings) to inspect the honest empty state.
    @Published var useEmptyState: Bool = false

    /// Optional name placeholder for the (future) personalized greeting.
    // TODO(liam): wire to the user's real profile once auth exists.
    @Published var userName: String = ""

    private let fullBriefing: Briefing
    private let emptyBriefing: Briefing

    init(
        full: Briefing = MockData.fullBriefing,
        empty: Briefing = MockData.emptyBriefing
    ) {
        self.fullBriefing = full
        self.emptyBriefing = empty
        self.briefing = full
    }

    /// The cards actually shown: empty-state override wins; otherwise the full
    /// set minus `.news` when news is off. Capped at 5 (the ritual is bounded).
    var visibleCards: [BriefingCard] {
        if useEmptyState { return emptyBriefing.cards }
        let filtered = fullBriefing.cards.filter { card in
            card.category != .news || newsEnabled
        }
        return Array(filtered.prefix(5))
    }

    var streakDays: Int {
        useEmptyState ? emptyBriefing.streakDays : fullBriefing.streakDays
    }

    var generatedAt: Date {
        useEmptyState ? emptyBriefing.generatedAt : fullBriefing.generatedAt
    }

    /// Progress through the visible stack, 0...1, for the sunrise ring.
    var progress: Double {
        let count = visibleCards.count
        guard count > 1 else { return visibleCards.isEmpty ? 0 : 1 }
        return Double(currentIndex) / Double(count - 1)
    }

    /// Keep currentIndex in range when the visible set changes (e.g. toggles).
    func clampIndex() {
        let maxIndex = max(visibleCards.count - 1, 0)
        if currentIndex > maxIndex { currentIndex = maxIndex }
        if currentIndex < 0 { currentIndex = 0 }
    }
}
