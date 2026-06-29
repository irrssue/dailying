//
//  TimeOfDayGradient.swift
//  dailying
//
//  The calm base layer of the whole app. Picks a muted multi-stop gradient from
//  the current hour. Exposes a debug override so each band can be previewed.
//

import SwiftUI

struct TimeOfDayGradient: View {
    /// When nil, resolves the band from the current time. Set to preview a band.
    var override: Theme.TimeBand?

    private var band: Theme.TimeBand {
        override ?? Theme.TimeBand.current()
    }

    var body: some View {
        LinearGradient(
            colors: band.colors,
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea()
        // A soft cross-fade if the band changes (e.g. debug override flipping).
        .animation(.easeInOut(duration: 0.6), value: band)
        .accessibilityHidden(true)
    }
}

#Preview("All bands") {
    ScrollView {
        VStack(spacing: 0) {
            ForEach(Theme.TimeBand.allCases) { band in
                ZStack {
                    TimeOfDayGradient(override: band)
                    Text(band.label)
                        .font(Theme.TypeStyle.categoryLabel())
                        .tracking(2)
                        .textCase(.uppercase)
                        .foregroundStyle(
                            band.prefersLightInk
                            ? Theme.Ink.primaryOnDark
                            : Theme.Ink.primary
                        )
                }
                .frame(height: 160)
            }
        }
    }
    .ignoresSafeArea()
}

#Preview("Current") {
    TimeOfDayGradient()
}
