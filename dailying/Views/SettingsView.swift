//
//  SettingsView.swift
//  dailying
//
//  Minimal sheet. News opt-in, a debug toggle to see the empty state, a name
//  placeholder, a time-of-day band debug override, and a tiny generated-at footer.
//  Nothing else — this isn't a settings app.
//

import SwiftUI

struct SettingsView: View {
    @ObservedObject var viewModel: BriefingViewModel
    @Binding var bandOverride: Theme.TimeBand?

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Toggle("News", isOn: $viewModel.newsEnabled)
                } header: {
                    Text("Morning")
                } footer: {
                    Text("Off by default. Turning it on adds one quiet news card.")
                }

                Section {
                    // TODO(liam): persist and use this for a personalized greeting
                    // once auth/profile exists.
                    TextField("Your name", text: $viewModel.userName)
                        .textInputAutocapitalization(.words)
                } header: {
                    Text("You")
                }

                Section {
                    Toggle("Show empty state", isOn: $viewModel.useEmptyState)
                    Picker("Time of day", selection: $bandOverride) {
                        Text("Auto (now)").tag(Theme.TimeBand?.none)
                        ForEach(Theme.TimeBand.allCases) { band in
                            Text(band.label).tag(Theme.TimeBand?.some(band))
                        }
                    }
                } header: {
                    Text("Debug")
                } footer: {
                    Text("Preview the honest empty state and each gradient band.")
                }

                Section {
                    HStack {
                        Text("Briefing")
                        Spacer()
                        Text(Self.footerFormatter.string(from: viewModel.generatedAt))
                            .foregroundStyle(Theme.Ink.secondary)
                    }
                    .font(Theme.TypeStyle.meta())
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private static let footerFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMM d · h:mm a"
        return f
    }()
}

#Preview {
    SettingsView(
        viewModel: BriefingViewModel(),
        bandOverride: .constant(nil)
    )
}
