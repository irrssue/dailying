//
//  AccentResolving.swift
//  dailying
//
//  Bridges the Foundation-only model layer to SwiftUI colors. Keeps CalendarBlock
//  free of a Color dependency while letting views ask for a resolved accent.
//

import SwiftUI

extension CalendarBlock.AccentName {
    var color: Color {
        switch self {
        case .today:     return Theme.Accent.today
        case .inbox:     return Theme.Accent.inbox
        case .reminders: return Theme.Accent.reminders
        case .news:      return Theme.Accent.news
        }
    }
}

extension CalendarBlock {
    var accent: Color { accentName.color }
}
