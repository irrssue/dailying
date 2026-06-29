//
//  CardStackView.swift
//  dailying
//
//  The ritual itself: a horizontal paging swipe over the visible cards, with the
//  sunrise ring and a slim page indicator overlaid. Soft haptic on each turn.
//

import SwiftUI

struct CardStackView: View {
    @ObservedObject var viewModel: BriefingViewModel
    /// Whether the current gradient band wants light ink.
    var onDark: Bool

    var body: some View {
        let cards = viewModel.visibleCards

        ZStack(alignment: .top) {
            TabView(selection: $viewModel.currentIndex) {
                ForEach(Array(cards.enumerated()), id: \.element.id) { index, card in
                    CardView(card: card, onDark: onDark)
                        .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .ignoresSafeArea(edges: .bottom)
            .onChange(of: viewModel.currentIndex) { _, _ in
                Haptics.soft()
            }

            // Top overlay: sunrise ring + slim page indicator.
            VStack(spacing: Theme.Space.sm) {
                HStack {
                    SunriseRing(
                        progress: viewModel.progress,
                        streakDays: viewModel.streakDays,
                        onDark: onDark
                    )
                    Spacer()
                }
                PageIndicator(
                    count: cards.count,
                    index: viewModel.currentIndex,
                    onDark: onDark
                )
            }
            .padding(.horizontal, Theme.Space.cardPadding)
            .padding(.top, Theme.Space.xs)
        }
    }
}

/// A slim custom page indicator — quieter than the system dots.
private struct PageIndicator: View {
    let count: Int
    let index: Int
    var onDark: Bool

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<max(count, 0), id: \.self) { i in
                Capsule()
                    .fill(
                        (onDark ? Theme.Ink.primaryOnDark : Theme.Ink.primary)
                            .opacity(i == index ? 0.9 : 0.25)
                    )
                    .frame(width: i == index ? 18 : 6, height: 6)
                    .animation(.easeInOut(duration: 0.25), value: index)
            }
        }
        .frame(maxWidth: .infinity, alignment: .center)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Card \(index + 1) of \(count)")
    }
}

#Preview("Stack over morning") {
    ZStack {
        TimeOfDayGradient(override: .morning)
        CardStackView(viewModel: BriefingViewModel(), onDark: false)
    }
}

#Preview("Stack over night") {
    ZStack {
        TimeOfDayGradient(override: .night)
        CardStackView(viewModel: BriefingViewModel(), onDark: true)
    }
}
