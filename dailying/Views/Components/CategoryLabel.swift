//
//  CategoryLabel.swift
//  dailying
//
//  Small, tracked, uppercase label marking what a card is about: the category's
//  SF Symbol + name, tinted with its accent. Quiet structure, not decoration.
//

import SwiftUI

struct CategoryLabel: View {
    let category: CardCategory
    /// Lift contrast when sitting over a dark gradient band.
    var onDark: Bool = false

    var body: some View {
        HStack(spacing: Theme.Space.xs) {
            Image(systemName: category.symbol)
                .font(.system(size: 13, weight: .semibold))
            Text(category.label.uppercased())
                .font(Theme.TypeStyle.categoryLabel())
                .tracking(2.5)
        }
        .foregroundStyle(category.accent)
        .opacity(onDark ? 0.95 : 0.85)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(category.label) card")
    }
}

#Preview {
    ZStack {
        TimeOfDayGradient(override: .morning)
        VStack(alignment: .leading, spacing: Theme.Space.md) {
            ForEach(CardCategory.allCases) { cat in
                CategoryLabel(category: cat)
            }
        }
    }
}
