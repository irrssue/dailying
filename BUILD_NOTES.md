# BUILD_NOTES — Morning Ritual App (overnight autonomous build)

**Built by:** Claude Code (Opus 4.8), autonomously, while Liam slept.
**Result:** Frontend-only SwiftUI prototype, pure mock data, **BUILD SUCCEEDED**, runs
in the iOS Simulator. Every milestone in `HANDOFF.md` (§6) is done and committed.

---

## 1. How to run it

The active developer dir on this machine pointed at **CommandLineTools**, not full
Xcode, so `xcodebuild`/`simctl` need `DEVELOPER_DIR` set (no sudo required — see
"Surprises" below). The simplest path for you in the morning:

**Easiest:** open `dailying.xcodeproj` in Xcode, pick an iPhone simulator, hit ⌘R.

**From the command line** (the exact command I used — there is no `iPhone 16` on this
machine; the available device is **iPhone 17**):

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
cd /Users/irrssue/Documents/dailying
xcodebuild \
  -project dailying.xcodeproj \
  -scheme dailying \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -configuration Debug \
  CODE_SIGNING_ALLOWED=NO \
  build
```

To install + launch on a booted sim:

```bash
UDID=$(xcrun simctl list devices | grep "iPhone 17 (" | grep -oE '[0-9A-F-]{36}')
xcrun simctl boot "$UDID"; open -a Simulator
APP=$(find ~/Library/Developer/Xcode/DerivedData/dailying-*/Build/Products/Debug-iphonesimulator -name dailying.app -maxdepth 1 | head -1)
xcrun simctl install "$UDID" "$APP"
xcrun simctl launch "$UDID" irrssue.dailying
```

- **Scheme:** `dailying` · **Target:** `dailying` · **Bundle id:** `irrssue.dailying`
- **Deployment target:** iOS **17.0** (was 26.5) · **Swift:** **6.0** (was 5.0)

I smoke-tested launch on the iPhone 17 simulator and captured screenshots of the
Today card, a standard inbox card, and the empty state — all render calm and correct.

---

## 2. Decisions I made for you ("calm, minimal, one-decision-per-screen" was the tiebreaker)

- **iPhone 17 simulator**, not iPhone 16 — 16 isn't installed; 17 is the only iPhone
  family available here. Build commands use `name=iPhone 17`.
- **`DEVELOPER_DIR` env var instead of `sudo xcode-select -s`** to reach full Xcode,
  since I can't run sudo unattended. You may want to run
  `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` once to make it permanent.
- **Calendar timeline = de-overlapped readable list, not pixel-proportional.** A true
  proportional 6am–10pm scale crushes back-to-back events into illegible 9pt slivers
  (this actually clipped in my first render — see screenshot history). I kept the hour
  labels (06/10/14/18/22) and the live now-marker proportional, but lay event blocks out
  sequentially with a guaranteed min gap so each stays readable. Calmer and honest about
  what it is: a briefing, not a calendar app. **This is the piece most worth your eyes.**
- **Mock streak = 7 days.** Sunrise ring fills with progress *through the stack* (0→1),
  and sits full at rest on the empty state (the streak is still real).
- **Time bands:** dawn 5–8, morning 8–11, midday 11–16, golden 16–19, night 19–5.
  Muted, low-saturation palettes; ink auto-switches to a warm off-white over dark bands.
- **Page indicator:** custom slim capsules instead of the system dots — quieter.
- **Card cap = 5.** `visibleCards` takes `.prefix(5)`; with news off you see 5 (Today,
  2 inbox, 2 reminders), with news on the news card replaces the 5th slot in order.
- **News card body** kept even when filtered out of the stack — the toggle just includes
  or excludes it. Off by default per the brief.
- **Settings has a "Time of day" debug picker** (Auto + each band) so you can preview
  every gradient on device, plus the required "Show empty state" toggle.
- **Dynamic Type capped** (`accessibility2` on standard cards, `accessibility1` on the
  calendar card) so huge text sizes don't break the one-screen layout.
- **Deep links** are best-effort `openURL` (`calshow://`, `message://`,
  `x-apple-reminderkit://`, `https://apple.news`); they no-op in the simulator, which is fine.

---

## 3. What's stubbed and why (`// TODO(liam):` — your morning to-do list)

| File | Line | Stub | Why it's out of scope tonight |
|---|---|---|---|
| `Models/MockData.swift` | 8 | Replace the whole MockData layer with the real briefing pipeline | Needs backend + Claude summarization + system data |
| `ViewModels/BriefingViewModel.swift` | 8 | Swap `MockData.fullBriefing` for a real fetch | Same — keep VM as the single source of truth for views |
| `ViewModels/BriefingViewModel.swift` | 27 | Wire `userName` to a real profile | Needs auth |
| `Models/CardCategory.swift` | 31 | Replace SF Symbols with real archetype illustrations | No illustrator yet |
| `Views/EmptyStateView.swift` | 21 | Replace cup symbol with the "calm morning" illustration | No illustrator yet |
| `Views/SettingsView.swift` | 30 | Persist + use the name for a personalized greeting | Needs auth/storage |

Nothing from the OUT-of-scope list (backend, OAuth, Claude API, EventKit/Mail/Reminders,
APNs, third-party packages) was attempted. **Zero external dependencies. Zero network
calls. No permission prompts.** Pure SwiftUI + Foundation + a single UIKit haptic call.

---

## 4. Where the calendar viz might need love

Honest read: **it reads calm and is instantly legible** — the de-overlap layout was the
right call and the live now-marker grounds it. Two things you may want to revisit:

- It's **not time-proportional** between events anymore (gaps are uniform, not scaled to
  real time). For a briefing I think that's correct, but if you ever want "how much
  free time between meetings" to be visible at a glance, you'd need a hybrid layout.
- The **hour labels (06/10/14/18/22) sit on the proportional scale while the blocks sit
  on the list scale**, so a block's vertical position is only loosely related to its
  label. It looks fine because the data is roughly evenly spread, but with a clustered
  day (e.g. four meetings 9–11am) the labels and blocks would visibly disagree. Decide
  whether that bothers you before wiring real EventKit data.

---

## 5. Things that surprised me / flags before you build the backend

- **Full Xcode was installed but not "selected"** — `xcode-select -p` returned
  CommandLineTools. Builds only worked once I pointed `DEVELOPER_DIR` at
  `/Applications/Xcode.app/...`. Worth fixing permanently with `sudo xcode-select -s`.
- **DerivedData had a stale locked build DB** on first run (`database is locked`). I
  cleared `~/Library/Developer/Xcode/DerivedData/dailying-*` once and it was fine after.
- **The project uses Xcode 16+ file-system-synchronized groups** (`PBXFileSystemSynchronizedRootGroup`,
  objectVersion 77). This is great: I could add `.swift` files into the folder tree and
  they joined the target automatically — no `project.pbxproj` surgery. Keep using folders;
  don't drag files in via the old "add to target" flow or you may get duplicates.
- **Swift 6 strict concurrency** is on. `BriefingViewModel` is `@MainActor`; keep new
  view-facing state on the main actor to avoid concurrency warnings when you add async fetches.
- **Created-by date in the template is 6/29/26** (the project was scaffolded with a future
  system clock). Harmless, just noting it.

---

## 6. File map (what got built)

```
dailying/
  dailyingApp.swift              @main → RootView
  Models/
    CardCategory.swift           enum: label / SF Symbol / accent
    BriefingCard.swift           card + CalendarBlock; 12-word debug assert lives here
    Briefing.swift               generatedAt / cards / streakDays / isEmpty
    MockData.swift               full + empty briefings (all bodies ≤12 words)
  ViewModels/
    BriefingViewModel.swift      @MainActor, no async; visibleCards / progress / toggles
  Views/
    RootView.swift               gradient base + stack/empty switch + settings gear
    CardStackView.swift          paging TabView, soft haptic, sunrise ring + page dots
    CardView.swift               full-screen standard card; delegates .today to ↓
    CalendarCardView.swift       the day-timeline Today card
    EmptyStateView.swift         honest empty state
    SettingsView.swift           news toggle, empty-state toggle, band picker, name, footer
    Components/
      SunriseRing.swift          animatable sun-cresting progress arc + streak
      CategoryLabel.swift        tracked uppercase symbol+label
      TimeOfDayGradient.swift    hour→band gradient, with debug override
  DesignSystem/
    Theme.swift                  spacing / radius / accents / ink / type / time bands
    AccentResolving.swift        CalendarBlock.AccentName → SwiftUI Color bridge
    Haptics.swift                soft impact wrapper
```

Every view has a working `#Preview` (9 total). The 12-word rule is enforced by a debug
`assert` in `BriefingCard.init` — any over-length body will trip it in debug builds.

---

## 7. Definition of Done — all checked

- [x] `xcodebuild … build` returns **BUILD SUCCEEDED**, zero errors (clean build verified).
- [x] App launches in the simulator and shows the full mock briefing.
- [x] Swipe through up to 5 full-screen cards (paging TabView; verified card 1 & 2 + dots).
- [x] Today/calendar card renders the day-timeline (verified on device).
- [x] Sunrise ring visible and reflects progress (and full at rest on empty state).
- [x] Gradient background reflects current time of day (+ debug override in Settings).
- [x] News off by default; toggle adds the news card.
- [x] Empty state reachable via Settings debug toggle; honest, not padded (verified).
- [x] Every view has a working `#Preview`.
- [x] No network, no permission prompts, no third-party deps.
- [x] Git history shows clean milestone commits.
- [x] This file exists.

*North star: be the thing you open instead of TikTok. Calm, bounded, honest. Four
minutes and get out. — built to that.*
