//
//  RootView.swift
//  dailying
//
//  The base layer: the time-of-day gradient, then either the card stack or the
//  honest empty state, with a low-contrast settings gear top-trailing.
//

import SwiftUI

struct RootView: View {
    @StateObject private var viewModel = BriefingViewModel()
    @State private var showSettings = false

    /// Debug override for the gradient band, driven from Settings so each band
    /// can be previewed on device. nil = follow the real clock.
    @State private var bandOverride: Theme.TimeBand?

    private var band: Theme.TimeBand {
        bandOverride ?? Theme.TimeBand.current()
    }

    private var onDark: Bool { band.prefersLightInk }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            TimeOfDayGradient(override: bandOverride)

            content
                .transition(.opacity)

            settingsButton
                .padding(.horizontal, Theme.Space.cardPadding)
                .padding(.top, Theme.Space.xs)
        }
        .animation(.easeInOut(duration: 0.35), value: viewModel.useEmptyState)
        .animation(.easeInOut(duration: 0.35), value: viewModel.newsEnabled)
        .onChange(of: viewModel.newsEnabled) { _, _ in viewModel.clampIndex() }
        .onChange(of: viewModel.useEmptyState) { _, _ in viewModel.clampIndex() }
        .sheet(isPresented: $showSettings) {
            SettingsView(viewModel: viewModel, bandOverride: $bandOverride)
        }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.visibleCards.isEmpty {
            EmptyStateView(streakDays: viewModel.streakDays, onDark: onDark)
        } else {
            CardStackView(viewModel: viewModel, onDark: onDark)
        }
    }

    private var settingsButton: some View {
        Button {
            showSettings = true
        } label: {
            Image(systemName: "gearshape")
                .font(.system(size: 18, weight: .regular))
                .foregroundStyle(
                    (onDark ? Theme.Ink.primaryOnDark : Theme.Ink.primary).opacity(0.45)
                )
                .frame(width: 44, height: 44) // tap target
                .contentShape(Rectangle())
        }
        .accessibilityLabel("Settings")
    }
}

#Preview {
    RootView()
}
