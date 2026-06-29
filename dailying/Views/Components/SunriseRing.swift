//
//  SunriseRing.swift
//  dailying
//
//  The one piece of "gamification" — a soft arc evoking a rising sun. Fills with
//  progress through the morning's cards. The streak count sits inside. Animatable.
//

import SwiftUI

struct SunriseRing: View {
    /// 0...1 progress through the card stack.
    var progress: Double
    /// Current streak in days, shown at center.
    var streakDays: Int
    var onDark: Bool = false

    private var clamped: Double { min(max(progress, 0), 1) }

    private var arcGradient: AngularGradient {
        AngularGradient(
            colors: [
                Theme.Accent.today.opacity(0.4),
                Theme.Accent.today,
                Color(red: 0.96, green: 0.80, blue: 0.62)
            ],
            center: .center,
            startAngle: .degrees(-90),
            endAngle: .degrees(270)
        )
    }

    var body: some View {
        ZStack {
            // Track.
            Circle()
                .stroke(
                    (onDark ? Theme.Ink.primaryOnDark : Theme.Ink.primary).opacity(0.12),
                    style: StrokeStyle(lineWidth: 5, lineCap: .round)
                )

            // Progress arc, starting from the top like a sun cresting.
            Circle()
                .trim(from: 0, to: clamped)
                .stroke(arcGradient, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut(duration: 0.45), value: clamped)

            // Center: streak.
            VStack(spacing: 0) {
                Image(systemName: "sun.max.fill")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Theme.Accent.today)
                Text("\(streakDays)")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(onDark ? Theme.Ink.primaryOnDark : Theme.Ink.primary)
            }
        }
        .frame(width: 52, height: 52)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(streakDays) day streak. \(Int(clamped * 100)) percent through this morning.")
    }
}

#Preview {
    ZStack {
        TimeOfDayGradient(override: .dawn)
        HStack(spacing: Theme.Space.md) {
            SunriseRing(progress: 0.0, streakDays: 7, onDark: true)
            SunriseRing(progress: 0.5, streakDays: 7, onDark: true)
            SunriseRing(progress: 1.0, streakDays: 12, onDark: true)
        }
    }
}
