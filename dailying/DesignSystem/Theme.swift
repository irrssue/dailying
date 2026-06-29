//
//  Theme.swift
//  dailying
//
//  Design tokens for the morning ritual app. One place for color, type, and
//  spacing so every screen stays in the same calm key.
//
//  North star: calm over loud. Muted, low-saturation color. Soft off-tones
//  instead of pure black/white. Serif body type for warmth; small tracked
//  system labels for structure.
//

import SwiftUI

enum Theme {

    // MARK: - Spacing

    /// 8 / 16 / 24 / 40 scale. Use these instead of magic numbers.
    enum Space {
        static let xs: CGFloat = 8
        static let sm: CGFloat = 16
        static let md: CGFloat = 24
        static let lg: CGFloat = 40
        static let xl: CGFloat = 64

        /// Standard breathing room around a full-screen card's content.
        static let cardPadding: CGFloat = 32
    }

    // MARK: - Corner radii

    enum Radius {
        static let block: CGFloat = 8
        static let card: CGFloat = 24
    }

    // MARK: - Accents (muted, per category)

    enum Accent {
        // Warm, low-saturation tones. Tuned to read calm over the gradient.
        static let today     = Color(red: 0.93, green: 0.70, blue: 0.42) // soft amber/sun
        static let inbox     = Color(red: 0.51, green: 0.62, blue: 0.74) // dusty slate-blue
        static let reminders = Color(red: 0.56, green: 0.71, blue: 0.60) // muted sage
        static let news      = Color(red: 0.72, green: 0.62, blue: 0.78) // soft lavender
    }

    // MARK: - Ink (text tones — never pure black/white)

    enum Ink {
        static let primary   = Color(red: 0.16, green: 0.15, blue: 0.18)
        static let secondary = Color(red: 0.16, green: 0.15, blue: 0.18).opacity(0.62)
        static let faint      = Color(red: 0.16, green: 0.15, blue: 0.18).opacity(0.35)

        /// On dark/evening gradients we lift the ink toward a warm off-white.
        static let primaryOnDark   = Color(red: 0.97, green: 0.96, blue: 0.94)
        static let secondaryOnDark = Color(red: 0.97, green: 0.96, blue: 0.94).opacity(0.70)
    }

    // MARK: - Type

    enum TypeStyle {
        /// Large, calm serif for card bodies (New York via design: .serif).
        static func cardBody() -> Font {
            .system(size: 32, weight: .regular, design: .serif)
        }

        /// Slightly smaller serif used by the calendar card's woven copy.
        static func cardBodyCompact() -> Font {
            .system(size: 26, weight: .regular, design: .serif)
        }

        /// Small, tracked, uppercase system label for categories.
        static func categoryLabel() -> Font {
            .system(size: 13, weight: .semibold, design: .default)
        }

        /// Tiny meta text (timestamps, footers).
        static func meta() -> Font {
            .system(size: 12, weight: .regular, design: .default)
        }

        /// The empty-state headline — gentle serif.
        static func emptyHeadline() -> Font {
            .system(size: 28, weight: .regular, design: .serif)
        }
    }

    // MARK: - Time-of-day gradient palettes

    /// The five calm bands of the day. Each maps to a muted multi-stop gradient.
    enum TimeBand: String, CaseIterable, Identifiable {
        case dawn       // 5–8
        case morning    // 8–11
        case midday     // 11–16
        case golden     // 16–19
        case night      // 19–5

        var id: String { rawValue }

        var label: String {
            switch self {
            case .dawn:    return "Dawn"
            case .morning: return "Morning"
            case .midday:  return "Midday"
            case .golden:  return "Golden"
            case .night:   return "Night"
            }
        }

        /// Resolve the band for a given hour (0–23).
        static func band(forHour hour: Int) -> TimeBand {
            switch hour {
            case 5..<8:   return .dawn
            case 8..<11:  return .morning
            case 11..<16: return .midday
            case 16..<19: return .golden
            default:      return .night
            }
        }

        static func current(_ date: Date = Date()) -> TimeBand {
            band(forHour: Calendar.current.component(.hour, from: date))
        }

        /// Muted, low-saturation gradient stops (top → bottom).
        var colors: [Color] {
            switch self {
            case .dawn:
                return [
                    Color(red: 0.36, green: 0.40, blue: 0.55),
                    Color(red: 0.78, green: 0.62, blue: 0.58),
                    Color(red: 0.96, green: 0.80, blue: 0.62)
                ]
            case .morning:
                return [
                    Color(red: 0.62, green: 0.76, blue: 0.86),
                    Color(red: 0.84, green: 0.88, blue: 0.90),
                    Color(red: 0.96, green: 0.94, blue: 0.88)
                ]
            case .midday:
                return [
                    Color(red: 0.70, green: 0.82, blue: 0.90),
                    Color(red: 0.86, green: 0.91, blue: 0.93),
                    Color(red: 0.93, green: 0.95, blue: 0.95)
                ]
            case .golden:
                return [
                    Color(red: 0.92, green: 0.70, blue: 0.46),
                    Color(red: 0.86, green: 0.58, blue: 0.46),
                    Color(red: 0.55, green: 0.42, blue: 0.50)
                ]
            case .night:
                return [
                    Color(red: 0.10, green: 0.12, blue: 0.22),
                    Color(red: 0.16, green: 0.18, blue: 0.30),
                    Color(red: 0.22, green: 0.22, blue: 0.34)
                ]
            }
        }

        /// Whether ink should switch to its on-dark variant over this band.
        var prefersLightInk: Bool {
            switch self {
            case .night, .golden, .dawn: return true
            case .morning, .midday:      return false
            }
        }
    }
}
