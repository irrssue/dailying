# HANDOFF — Morning Ritual App (overnight autonomous build)

**To:** Claude Code
**From:** Liam (@irrssue)
**Mode:** Fully autonomous. I am asleep. Do **not** wait for input. Make every decision yourself, document it, and keep going until the Definition of Done is met. Leave the tree building cleanly.

---

## 0. The one-paragraph brief

This is a **morning ritual app** — a calm, once-a-day iOS app you open *instead of* doom-scrolling TikTok/Twitter when you wake up. It shows you what to focus on first thing (calendar, important emails, reminders, optional news) as a small set of full-screen, swipe-through cards, then gets out of your way. The product philosophy: AI is useful and invisible, not a chatbot layer. The design philosophy: one screen / one decision, bounded daily ritual, honest when there's nothing to show. Calm, not loud.

**Your job tonight:** build the complete *frontend* of this app in SwiftUI, running entirely on local mock data, so that when I wake up I can hit Run and swipe through a real, polished prototype. The backend, auth, Claude pipeline, and real system data are explicitly **out of scope** tonight (they need my credentials and decisions). Stub them cleanly and keep moving.

---

## 1. Hard scope boundaries — read this first

### IN scope tonight (build all of this)
- A buildable SwiftUI iOS app, Swift 6, iOS 17.0 deployment target, **simulator-only** (no code signing, no dev account).
- Full card model + a realistic **mock briefing** and a **mock empty briefing**.
- Full-screen swipe-through card flow (up to 5 cards).
- The special **calendar/Today card** with a real day-timeline visualization.
- Sunrise ring streak indicator.
- Time-of-day responsive gradient background.
- Honest empty state.
- A minimal Settings sheet (news opt-in toggle + a couple of placeholders).
- Haptics on swipe, accessibility labels, SwiftUI previews for every view.
- Git commits at each milestone + a `BUILD_NOTES.md` documenting every decision and every stub.

### OUT of scope tonight (stub with `// TODO(liam):`, do NOT attempt)
- Any backend (Node/Fastify), Postgres, Redis, BullMQ.
- Sign in with Apple / Google OAuth.
- Claude Sonnet/Haiku API calls.
- Real EventKit / Mail / Reminders system access, entitlements, permission prompts.
- Push / APNs.
- Real illustrations (we don't have an illustrator yet — use SF Symbols as placeholders).
- Any third-party Swift package that requires network/keys. **Prefer zero external dependencies.** Pure SwiftUI + Foundation.

If a task tempts you toward anything in the OUT list, stop, drop a `// TODO(liam):` comment with a one-line explanation, wire it to mock data, and move on. Never block on it.

---

## 2. Autonomous operating rules (non-negotiable)

1. **Never ask me a question.** I'm asleep. When you hit a fork, pick the option most consistent with "calm, minimal, one-decision-per-screen," implement it, and log the choice in `BUILD_NOTES.md` under "Decisions I made for you."
2. **Build after every logical unit.** After each file or small group of files, run the build (see §7). **Never commit a non-compiling tree.** If a milestone won't compile and you can't fix it in a few iterations, revert that unit, stub it, log it, and continue with the rest.
3. **Loop to green.** On a build failure: read the compiler errors, fix, rebuild. Repeat until clean. Don't move to the next milestone with errors outstanding.
4. **Commit at every milestone** (§6 lists them) with a clear message like `feat: card stack swipe flow`. Small, frequent commits.
5. **Mock, don't mock around.** All data comes from `MockData`. No network calls anywhere in the app. The app must launch and run fully offline with no permissions.
6. **Respect the 12-word rule.** Card body copy is capped at ~12 words. Add a debug `assert` that flags any card body over 12 words so I catch regressions later.
7. **Previews for everything.** Every view gets a `#Preview` so I can inspect in the canvas immediately.
8. **Leave a trail.** `BUILD_NOTES.md` is mandatory: decisions made, what's stubbed and why, anything you'd flag for me, and exact run instructions.

---

## 3. Project assumptions

I will have created a fresh Xcode iOS App project before sleeping:
- Interface: SwiftUI
- Language: Swift (Swift 6 toolchain, Xcode 16)
- A `.xcodeproj` exists in the project folder with a single app target.

**Your first move:** inspect the folder. Detect the actual `.xcodeproj` name, the scheme name, and the app target name (don't assume it's called "MorningRitual" — discover it via `xcodebuild -list`). Use the real names in every command. Set the iOS deployment target to **17.0** if it isn't already. Disable code signing for builds (simulator builds don't need it).

If, and only if, no `.xcodeproj` exists when you start: create the project structure yourself as a SwiftUI app (you can scaffold the folder layout and an `@main` App, then generate a project with a generator if available; if you cannot produce a valid `.xcodeproj`, create all Swift sources in the expected layout, write clear instructions in `BUILD_NOTES.md` for me to drag them into a new project, and still verify they compile via `swiftc`/SPM where possible). Log whichever path you took.

---

## 4. Architecture (build to this spec — it's the contract)

MVVM-lite. No external deps. Suggested group/folder layout:

```
<App>/
  App/
    MorningRitualApp.swift        // @main, WindowGroup -> RootView, injects BriefingViewModel
  Models/
    CardCategory.swift
    BriefingCard.swift
    Briefing.swift
    MockData.swift
  ViewModels/
    BriefingViewModel.swift
  Views/
    RootView.swift
    CardStackView.swift
    CardView.swift
    CalendarCardView.swift
    EmptyStateView.swift
    SettingsView.swift
    Components/
      SunriseRing.swift
      CategoryLabel.swift
      TimeOfDayGradient.swift
  DesignSystem/
    Theme.swift                   // colors, gradients-by-hour, spacing, type styles
  Resources/
    (none needed; SF Symbols only)
```

### Models

**`CardCategory`** — enum: `.today`, `.inbox`, `.reminders`, `.news`. Each case exposes:
- `label: String` (e.g. "Today", "Inbox", "Reminders", "News")
- `symbol: String` (SF Symbol placeholder for the archetype illustration — e.g. `sun.max`, `envelope`, `checklist`, `globe`)
- `accent: Color` (a muted, calm accent per category — pull from `Theme`)

**`BriefingCard`** — `Identifiable`:
- `id: UUID`
- `category: CardCategory`
- `body: String` (≤12 words; narrative voice)
- `deepLink: URL?` (where tapping would route — e.g. `URL(string: "calshow://")`, `message://`, `x-apple-reminderkit://`; tapping just attempts `openURL` and is fine if it no-ops in simulator)
- For `.today` only: optional `timeline: [CalendarBlock]` to drive the calendar viz.

**`CalendarBlock`** — `Identifiable`: `title: String`, `start: Date`, `end: Date`, `accent: Color`. (A handful of mock events across the day.)

**`Briefing`** — `generatedAt: Date`, `cards: [BriefingCard]`, `streakDays: Int`. Computed `isEmpty: Bool` when there are no meaningful cards.

**`MockData`** — static providers:
- `MockData.fullBriefing` — a realistic morning: a Today card with 4–5 calendar blocks + weather woven into its body, 2 important inbox items, 2 reminders, and (only if news is on) 1 news card. Keep every body ≤12 words and in a calm narrative voice. Example bodies (match this tone): "Three meetings today. First one's at 10, with Henri." / "Two emails worth your attention. One's about the internship." / "You wanted to call your sister back today." / "Quiet news morning. Nothing urgent out there."
- `MockData.emptyBriefing` — generatedAt set, cards empty, streak intact. Drives the honest empty state.

### ViewModel

**`BriefingViewModel: ObservableObject`**
- `@Published var briefing: Briefing`
- `@Published var currentIndex: Int`
- `@Published var newsEnabled: Bool` (default **false** — news is opt-in)
- `@Published var useEmptyState: Bool` (debug toggle, exposed in Settings, so I can see the empty state)
- `var visibleCards: [BriefingCard]` — filters out `.news` when `newsEnabled == false`; returns empty briefing's cards when `useEmptyState`.
- Loads `MockData.fullBriefing` on init. No async, no network.

### Views

- **`RootView`** — decides between `CardStackView` and `EmptyStateView` based on `visibleCards.isEmpty`. Hosts the `TimeOfDayGradient` as the base layer and a Settings entry point (small gear, top trailing, low-contrast).
- **`CardStackView`** — a paging `TabView` (`.tabViewStyle(.page(indexDisplayMode: .never))`) over `visibleCards`. Full-screen cards, horizontal swipe. Overlays: the `SunriseRing` (top, showing progress through the stack / streak) and a slim custom page indicator. Trigger a soft haptic (`UIImpactFeedbackGenerator(style: .soft)`) on page change. Bind selection to `currentIndex`.
- **`CardView`** — one full-screen card: large SF Symbol (archetype placeholder) up top, `CategoryLabel`, then the ≤12-word body in **New York serif** at large size (`.font(.system(.largeTitle, design: .serif))`-ish, tune for calm). Generous padding, lots of breathing room, vertically centered-ish. Tap anywhere → attempt `openURL(card.deepLink)`. Background is transparent so the gradient shows through.
- **`CalendarCardView`** — the special Today card. A real, simple **day-timeline visualization** drawn with SwiftUI `Canvas` or a `GeometryReader` + stacked blocks: a vertical (or horizontal) track representing ~6am–10pm with colored blocks for each `CalendarBlock`, current-time marker line, and the woven weather + headline body beneath. This is the riskiest visual piece — give it the most care. It must look calm and instantly readable, not like a busy calendar app.
- **`EmptyStateView`** — honest and warm: a calm illustration placeholder + a short line like "Nothing urgent this morning. Enjoy it." + the sunrise ring still present. Never padded with fake cards.
- **`SettingsView`** — minimal sheet: a **News** opt-in toggle (bound to `newsEnabled`), a **Show empty state** debug toggle (bound to `useEmptyState`), a placeholder "Your name" field, and a tiny footer with `generatedAt`. Nothing else.

### Components

- **`SunriseRing`** — circular progress arc evoking a rising sun; fills based on progress through the card stack (or streak). Soft gradient stroke. Animatable.
- **`CategoryLabel`** — small uppercase/tracked label with the category's SF Symbol + accent.
- **`TimeOfDayGradient`** — computes a calm two/three-stop gradient from the current hour: dawn (5–8), morning (8–11), midday (11–16), golden/evening (16–19), night (19–5). Muted, low-saturation palettes. Expose a debug override so I can preview each band.

### Design system (`Theme.swift`)
- Type: body = New York serif (large, calm); labels = system, tracked, small. Define reusable `Font` helpers.
- Color: muted accents per category; gradient palettes per time band. Avoid pure black/white — soft off-tones.
- Spacing scale (e.g. 8/16/24/40) and a standard card padding constant.

---

## 5. Design north star (use this to break ties)
- **One screen, one decision.** If a view is doing two things, split it.
- **Calm over loud.** When unsure between two visual options, pick the quieter one.
- **Tight copy.** ≤12 words. If a card needs more, the *content* is wrong, not the copy.
- **Honest.** Empty means empty. Never fill space to look busy.
- **A pointer, not a viewer.** Cards point out to source apps; they don't expand into readers.
- Duolingo's *structure* (bounded, one-decision, completion moment) — **not** its loudness. The only "gamification" is the sunrise ring.

---

## 6. Build order = milestones (commit after each, build must be green)

1. **Project hygiene** — discover scheme/target, set iOS 17 target, disable signing, create folder groups, confirm the empty app builds & launches in simulator. `chore: project setup, builds clean`
2. **Models + MockData** — all model types + full & empty mock briefings. `feat: models and mock data`
3. **Theme + TimeOfDayGradient** — design tokens + gradient background, with preview override. `feat: design system and time-of-day gradient`
4. **CardView (single card)** — one full-screen card looks calm and right *standing alone*. This is the make-or-break unit; polish it before moving on. `feat: full-screen card view`
5. **CalendarCardView** — the day-timeline Today card. `feat: calendar card visualization`
6. **SunriseRing + CategoryLabel** — components with previews. `feat: sunrise ring and category label`
7. **CardStackView** — paging swipe over visible cards, haptics, page indicator. `feat: swipe-through card stack`
8. **EmptyStateView + news opt-in filtering** — honest empty state + news off-by-default behavior. `feat: empty state and news opt-in`
9. **SettingsView** — minimal settings sheet with the two toggles. `feat: settings sheet`
10. **Polish pass** — swipe/transition animations, accessibility labels on every interactive element, dynamic type sanity, the 12-word debug assert. `polish: animation, a11y, asserts`
11. **Final verification** — clean build, launch in simulator, write `BUILD_NOTES.md`. `docs: build notes and run instructions`

If you run short on time, milestones 1–8 are the must-haves; 9–10 are nice-to-haves. A swipeable mock app with the calendar card and empty state is the minimum win.

---

## 7. Build & verify commands

Discover names first:
```bash
xcodebuild -list -project <YourApp>.xcodeproj
```

Pick a simulator destination (auto-detect an available iPhone; iPhone 16 if present):
```bash
xcrun simctl list devices available | grep iPhone
```

Build (simulator, no signing):
```bash
xcodebuild \
  -project <YourApp>.xcodeproj \
  -scheme <YourScheme> \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -configuration Debug \
  CODE_SIGNING_ALLOWED=NO \
  build
```

If `name=iPhone 16` isn't available, fall back to `'generic/platform=iOS Simulator'` or the first available iPhone from the list. **Run this after every milestone.** Parse errors, fix, repeat until it returns `BUILD SUCCEEDED`. Optionally boot the sim and `xcrun simctl install` / `launch` to smoke-test launch, but a clean `xcodebuild build` is the gate.

---

## 8. Definition of Done (all must be true)
- [ ] `xcodebuild ... build` returns **BUILD SUCCEEDED** with zero errors.
- [ ] App launches in the iOS Simulator and shows the full mock briefing.
- [ ] I can **swipe** through up to 5 full-screen cards.
- [ ] The **Today/calendar card** renders the day-timeline visualization.
- [ ] The **sunrise ring** is visible and reflects progress.
- [ ] The **gradient background** reflects the current time of day.
- [ ] News is **off by default**; toggling it on in Settings adds the news card.
- [ ] The **empty state** is reachable via the Settings debug toggle and looks honest, not padded.
- [ ] Every view has a working `#Preview`.
- [ ] No network calls, no permission prompts, no third-party deps.
- [ ] Git history shows clean milestone commits.
- [ ] `BUILD_NOTES.md` exists with: decisions you made, what's stubbed (`// TODO(liam):`), and exact run instructions.

---

## 9. What to hand back in `BUILD_NOTES.md`
1. **How to run it** — exact scheme + destination, one command.
2. **Decisions I made for you** — every fork you resolved, one line each.
3. **What's stubbed and why** — list every `// TODO(liam):` with file + reason (these are my morning to-dos: OAuth, backend, Claude pipeline, real EventKit/Mail, illustrations).
4. **Where the calendar viz might need love** — your honest read on whether it feels calm.
5. **Anything that surprised you** or that you'd flag before I build the backend on top.

---

## 10. Ready-to-paste kickoff prompt (for me)

> You are building an iOS app autonomously overnight while I sleep. Read `HANDOFF.md` in this folder in full and follow it exactly. Work start to finish without asking me anything — make decisions, document them in `BUILD_NOTES.md`, and keep going. Scope is frontend-only with pure mock data (no backend, no auth, no network, no third-party deps). Build after every milestone using the commands in §7; never commit a non-compiling tree; loop until BUILD SUCCEEDED. Commit at each milestone in §6. Stop only when every item in the Definition of Done (§8) is checked, then write `BUILD_NOTES.md` per §9. Begin with §3 project discovery now.

---

*North star: be the thing I open instead of TikTok. Calm, bounded, honest. Four minutes and get out.*
