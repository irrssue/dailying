//
//  CalendarCardView.swift
//  dailying
//
//  The special Today card. A calm day-timeline from ~6am–10pm: a soft vertical
//  track with rounded blocks for each event and a current-time marker. The woven
//  weather + headline body sits beneath. Readable at a glance — not a busy
//  calendar app.
//

import SwiftUI

struct CalendarCardView: View {
    let card: BriefingCard
    var onDark: Bool = false

    /// The window the timeline represents.
    private let dayStartHour = 6
    private let dayEndHour = 22

    private var blocks: [CalendarBlock] {
        (card.timeline ?? []).sorted { $0.start < $1.start }
    }

    private var inkPrimary: Color { onDark ? Theme.Ink.primaryOnDark : Theme.Ink.primary }
    private var inkSecondary: Color { onDark ? Theme.Ink.secondaryOnDark : Theme.Ink.secondary }
    private var trackColor: Color { inkPrimary.opacity(0.10) }

    var body: some View {
        VStack(spacing: Theme.Space.md) {
            header
            timeline
            body(text: card.body)
        }
        .padding(.horizontal, Theme.Space.cardPadding)
        .padding(.vertical, Theme.Space.lg)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilitySummary)
        .accessibilityHint("Double tap to open your calendar.")
        .accessibilityAddTraits(.isButton)
    }

    // MARK: - Header

    private var header: some View {
        VStack(spacing: Theme.Space.xs) {
            Image(systemName: card.category.symbol)
                .font(.system(size: 44, weight: .light))
                .foregroundStyle(card.category.accent)
                .symbolRenderingMode(.hierarchical)
                .accessibilityHidden(true)
            CategoryLabel(category: card.category, onDark: onDark)
        }
        .padding(.top, Theme.Space.sm)
    }

    // MARK: - Timeline visualization

    private var timeline: some View {
        GeometryReader { geo in
            let totalMinutes = Double((dayEndHour - dayStartHour) * 60)
            let height = geo.size.height
            let trackX = geo.size.width * 0.30
            let labelWidth = geo.size.width * 0.24

            ZStack(alignment: .topLeading) {
                // The day track.
                Capsule()
                    .fill(trackColor)
                    .frame(width: 3)
                    .frame(maxHeight: .infinity)
                    .position(x: trackX, y: height / 2)

                // Hour gridlines (every 4 hours) with soft labels.
                ForEach(hourMarks(), id: \.self) { hour in
                    let y = yPosition(forMinutesFromStart: Double((hour - dayStartHour) * 60),
                                      total: totalMinutes, height: height)
                    Text(hourLabel(hour))
                        .font(Theme.TypeStyle.meta())
                        .foregroundStyle(inkSecondary.opacity(0.7))
                        .frame(width: labelWidth, alignment: .trailing)
                        .position(x: labelWidth / 2, y: y)
                }

                // Event blocks.
                ForEach(blocks) { block in
                    eventBlock(block, geo: geo, totalMinutes: totalMinutes, height: height, trackX: trackX)
                }

                // Current-time marker.
                if let nowY = currentTimeY(totalMinutes: totalMinutes, height: height) {
                    nowMarker(at: nowY, width: geo.size.width, trackX: trackX)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 300)
    }

    private func eventBlock(
        _ block: CalendarBlock,
        geo: GeometryProxy,
        totalMinutes: Double,
        height: CGFloat,
        trackX: CGFloat
    ) -> some View {
        let startMin = minutesFromStart(block.start)
        let endMin = minutesFromStart(block.end)
        let topY = yPosition(forMinutesFromStart: startMin, total: totalMinutes, height: height)
        let rawHeight = yPosition(forMinutesFromStart: endMin, total: totalMinutes, height: height) - topY
        let blockHeight = max(rawHeight, 22) // keep short events tappable/legible
        let blockWidth = geo.size.width - trackX - Theme.Space.md

        return HStack(spacing: Theme.Space.sm) {
            RoundedRectangle(cornerRadius: Theme.Radius.block)
                .fill(block.accent.opacity(0.85))
                .frame(width: 4)
            VStack(alignment: .leading, spacing: 2) {
                Text(block.title)
                    .font(.system(size: 15, weight: .medium, design: .serif))
                    .foregroundStyle(inkPrimary)
                    .lineLimit(1)
                Text(timeRange(block))
                    .font(Theme.TypeStyle.meta())
                    .foregroundStyle(inkSecondary)
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 4)
        .padding(.horizontal, Theme.Space.xs)
        .frame(width: blockWidth, height: blockHeight, alignment: .topLeading)
        .background(
            RoundedRectangle(cornerRadius: Theme.Radius.block)
                .fill(block.accent.opacity(0.12))
        )
        .position(x: trackX + blockWidth / 2 + Theme.Space.md, y: topY + blockHeight / 2)
    }

    private func nowMarker(at y: CGFloat, width: CGFloat, trackX: CGFloat) -> some View {
        ZStack(alignment: .leading) {
            Rectangle()
                .fill(Theme.Accent.today)
                .frame(height: 1.5)
                .frame(maxWidth: .infinity)
            Circle()
                .fill(Theme.Accent.today)
                .frame(width: 8, height: 8)
                .position(x: trackX, y: 0)
        }
        .frame(width: width)
        .position(x: width / 2, y: y)
        .accessibilityHidden(true)
    }

    // MARK: - Woven body

    private func body(text: String) -> some View {
        Text(text)
            .font(Theme.TypeStyle.cardBodyCompact())
            .foregroundStyle(inkPrimary)
            .multilineTextAlignment(.center)
            .lineSpacing(5)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.bottom, Theme.Space.sm)
    }

    // MARK: - Math helpers

    private func minutesFromStart(_ date: Date) -> Double {
        let cal = Calendar.current
        let comps = cal.dateComponents([.hour, .minute], from: date)
        let minutes = Double((comps.hour ?? 0) * 60 + (comps.minute ?? 0))
        return minutes - Double(dayStartHour * 60)
    }

    private func yPosition(forMinutesFromStart minutes: Double, total: Double, height: CGFloat) -> CGFloat {
        let clamped = min(max(minutes, 0), total)
        return CGFloat(clamped / total) * height
    }

    private func currentTimeY(totalMinutes: Double, height: CGFloat) -> CGFloat? {
        let mins = minutesFromStart(Date())
        guard mins >= 0 && mins <= totalMinutes else { return nil }
        return yPosition(forMinutesFromStart: mins, total: totalMinutes, height: height)
    }

    private func hourMarks() -> [Int] {
        stride(from: dayStartHour, through: dayEndHour, by: 4).map { $0 }
    }

    private func hourLabel(_ hour: Int) -> String {
        let date = Calendar.current.date(bySettingHour: hour, minute: 0, second: 0, of: Date()) ?? Date()
        return Self.hourFormatter.string(from: date)
    }

    private func timeRange(_ block: CalendarBlock) -> String {
        "\(Self.timeFormatter.string(from: block.start))–\(Self.timeFormatter.string(from: block.end))"
    }

    private var accessibilitySummary: String {
        let events = blocks.map { "\($0.title) at \(Self.timeFormatter.string(from: $0.start))" }
            .joined(separator: ", ")
        return "Today. \(card.body) Schedule: \(events)."
    }

    private static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        f.amSymbol = "am"
        f.pmSymbol = "pm"
        return f
    }()

    private static let hourFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h a"
        f.amSymbol = "am"
        f.pmSymbol = "pm"
        return f
    }()
}

#Preview("Today over morning") {
    ZStack {
        TimeOfDayGradient(override: .morning)
        CalendarCardView(card: MockData.todayCard)
    }
}

#Preview("Today over night") {
    ZStack {
        TimeOfDayGradient(override: .night)
        CalendarCardView(card: MockData.todayCard, onDark: true)
    }
}
