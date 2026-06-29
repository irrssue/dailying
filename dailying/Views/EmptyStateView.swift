//
//  EmptyStateView.swift
//  dailying
//
//  Honest and warm. When there's nothing urgent, we say so — and the sunrise
//  ring stays, because the streak is still real. Never padded with fake cards.
//

import SwiftUI

struct EmptyStateView: View {
    var streakDays: Int
    var onDark: Bool

    var body: some View {
        ZStack(alignment: .top) {
            VStack(spacing: Theme.Space.lg) {
                Spacer()

                // Calm illustration placeholder.
                // TODO(liam): replace with the real "calm morning" illustration.
                Image(systemName: "cup.and.saucer")
                    .font(.system(size: 56, weight: .light))
                    .foregroundStyle(Theme.Accent.today)
                    .symbolRenderingMode(.hierarchical)
                    .accessibilityHidden(true)

                Text("Nothing urgent this morning.\nEnjoy it.")
                    .font(Theme.TypeStyle.emptyHeadline())
                    .foregroundStyle(onDark ? Theme.Ink.primaryOnDark : Theme.Ink.primary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(6)

                Spacer()
                Spacer()
            }
            .padding(.horizontal, Theme.Space.cardPadding)
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // Sunrise ring stays — the streak is still real. Full at rest.
            HStack {
                SunriseRing(progress: 1.0, streakDays: streakDays, onDark: onDark)
                Spacer()
            }
            .padding(.horizontal, Theme.Space.cardPadding)
            .padding(.top, Theme.Space.xs)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Nothing urgent this morning. Enjoy it. \(streakDays) day streak.")
    }
}

#Preview("Empty over morning") {
    ZStack {
        TimeOfDayGradient(override: .morning)
        EmptyStateView(streakDays: 7, onDark: false)
    }
}

#Preview("Empty over night") {
    ZStack {
        TimeOfDayGradient(override: .night)
        EmptyStateView(streakDays: 7, onDark: true)
    }
}
