//
//  Haptics.swift
//  dailying
//
//  Tiny wrapper so the rest of the app doesn't deal with UIKit feedback
//  generators directly. Soft, calm feedback only.
//

import UIKit

enum Haptics {
    /// A soft tap, used on card page changes.
    static func soft() {
        let generator = UIImpactFeedbackGenerator(style: .soft)
        generator.prepare()
        generator.impactOccurred()
    }
}
