//
//  CardView.swift
//  dailying
//
//  One full-screen card. A large archetype symbol, the category label, and a
//  single calm serif line. Tapping anywhere points out to the source app.
//  Background is transparent so the time-of-day gradient shows through.
//
//  The .today category hands off to CalendarCardView for its timeline viz.
//

import SwiftUI

struct CardView: View {
    let card: BriefingCard
    /// Whether we're sitting over a dark gradient band (lifts ink contrast).
    var onDark: Bool = false

    @Environment(\.openURL) private var openURL

    var body: some View {
        Group {
            if card.category == .today {
                CalendarCardView(card: card, onDark: onDark)
            } else {
                standardCard
            }
        }
        .contentShape(Rectangle())
        .onTapGesture { route() }
    }

    // MARK: - Standard (non-calendar) card

    private var standardCard: some View {
        VStack(spacing: Theme.Space.lg) {
            Spacer(minLength: Theme.Space.xl)

            // Archetype placeholder.
            Image(systemName: card.category.symbol)
                .font(.system(size: 64, weight: .light))
                .foregroundStyle(card.category.accent)
                .symbolRenderingMode(.hierarchical)
                .accessibilityHidden(true)

            CategoryLabel(category: card.category, onDark: onDark)

            Text(card.body)
                .font(Theme.TypeStyle.cardBody())
                .foregroundStyle(onDark ? Theme.Ink.primaryOnDark : Theme.Ink.primary)
                .multilineTextAlignment(.center)
                .lineSpacing(6)
                .fixedSize(horizontal: false, vertical: true)

            Spacer(minLength: Theme.Space.xl)

            if card.deepLink != nil {
                tapHint
            }

            Spacer(minLength: Theme.Space.lg)
        }
        .padding(.horizontal, Theme.Space.cardPadding)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(card.category.label). \(card.body)")
        .accessibilityHint(card.deepLink != nil ? "Double tap to open in \(card.category.label)." : "")
        .accessibilityAddTraits(card.deepLink != nil ? .isButton : [])
    }

    private var tapHint: some View {
        Text("Tap to open")
            .font(Theme.TypeStyle.meta())
            .tracking(1.5)
            .textCase(.uppercase)
            .foregroundStyle(onDark ? Theme.Ink.secondaryOnDark : Theme.Ink.faint)
    }

    // MARK: - Routing

    private func route() {
        // A pointer, not a viewer. Attempt the deep link; a no-op in the
        // simulator is expected and fine.
        guard let url = card.deepLink else { return }
        openURL(url)
    }
}

#Preview("Inbox") {
    ZStack {
        TimeOfDayGradient(override: .morning)
        CardView(card: MockData.inboxCardOne)
    }
}

#Preview("Reminder") {
    ZStack {
        TimeOfDayGradient(override: .midday)
        CardView(card: MockData.reminderCardOne)
    }
}

#Preview("News over night") {
    ZStack {
        TimeOfDayGradient(override: .night)
        CardView(card: MockData.newsCard, onDark: true)
    }
}
