# BBCDash Phase Audit — Scoped Report

**Important scope note up front:** the user requested a full 5-phase rebuild
(functional rebuild + liquid-glass design system + motion layer + 3D depth
accents + final QA). This pass performed a genuine **Phase 0 code audit** and
**two real, verified bug fixes** (Phase 1 scope), plus `tsc`/`eslint`
verification. It did **not** implement Phases 2–4 (the visual design system
rewrite, motion layer, and 3D accents) — that is a large amount of UI/CSS
authoring across every component that was not completed in this pass. Treat
this file as an honest interim report, not a claim that all 5 phases are
done. See "What still needs doing" at the bottom.

## Phase 0 — Audit findings

1. **Username+PIN login** — `src/app/login/page.tsx` (not fully re-read line
   by line this pass, but `src/app/api/auth/login/route.ts` is solid: regex
   `^\d{4}$` PIN validation, bcrypt compare, generic "Invalid username or
   PIN" error). Looks present and reasonable server-side.
2. **Rep dashboard CRUD + tri-state gating** — present via
   `src/components/DashboardBoard.tsx`, `AppointmentModal.tsx`,
   `StatusToggle.tsx`. Tri-state cycle is `pending → yes → no → pending`
   (`src/components/StatusToggle.tsx:4-7`). Not independently verified that
   the UI blocks skipping straight to "sold" without confirmed/showed — this
   needs a closer read of `AppointmentModal.tsx`/`AppointmentCard.tsx` that
   this pass did not complete.
3. **Manager admin + server-side enforcement** — **verified good**.
   `src/app/api/appointments/[id]/route.ts` PATCH checks
   `session.role !== "manager" && existing.rep_id !== session.id` → 403, and
   only allows `rep_id` reassignment when `session.role === "manager"`.
   DELETE requires `session.role === "manager"` (lines ~66-72). This is real
   server-side authorization, not just UI hiding — good.
4. **Appraisal/vAuto/CRM links** — present in `Appointment` type
   (`src/lib/types.ts`) and persisted via `EDITABLE_FIELDS` in the PATCH
   route and the POST route. Looks correctly wired end-to-end at the API
   layer.
5. **Rep color coding / no duplicate colors** — `src/lib/colors.ts` has an
   8-color palette and `nextAvailableColor()` picks the first unused color,
   falling back to a modulo wrap (which **can** produce a duplicate once
   there are more than 8 active reps). Not a bug for realistic team sizes but
   worth flagging; not fixed in this pass.
6. **TV week view / realtime / day rollover** — **bug found and fixed**. In
   `src/components/tv/TvBoard.tsx`, the `weekAppts` filter (today..end-of-week)
   was computed in a `useMemo` keyed only on `[appointments]`, not on the
   ticking `now` clock from `useNowTick`. That means the "today" boundary
   used to roll appointments off the TV at midnight only updated when new
   appointment data happened to arrive over Realtime — if nothing changed
   in the DB overnight, stale prior-day appointments would keep showing.
   Fixed by adding `now` to the dependency array and passing `now` into
   `endOfWeekISO(now)` (see diff below). This directly addresses the audit
   item "check this actually keys off date, not just last N appointments."
7. **Up Next 30-min glow** — depends on `AppointmentCard.tsx`, not
   deep-audited this pass; `useNowTick` exists and is wired into `TvBoard`
   and passed to `AppointmentCard` as `now`, which is the right pattern.
8. **Sound alerts** — `src/lib/sounds.ts` and `useAlertScheduler.ts` look
   correct: `unlockAudio()` plays a near-silent oscillator blip to satisfy
   autoplay policy, gated behind a "Tap to enable sound" overlay
   (`TvBoard.tsx`) that only renders until `soundUnlocked` is true, i.e. it
   requires a real user gesture first. Offsets/preset come from
   `tv_settings` via Realtime. Looks structurally sound.
9. **Concurrent-edit safety** — `Appointment.updated_at` exists in the type
   and schema; the PATCH route does a plain field-level `.update()` (not a
   read-modify-write merge of the whole row), so it is inherently
   last-write-wins per field without client-side merge corruption. No
   optimistic-concurrency check (e.g. comparing `updated_at`) is enforced,
   so two managers editing the same appointment within the same request
   window could silently clobber each other's non-overlapping field changes
   depending on request order — acceptable for last-write-wins semantics as
   specified, not a correctness bug given the stated requirement.
10. **Mobile usability** — not evaluated visually in this pass (no live
    render available).
11. **Visual design baseline** — confirmed NOT yet "liquid glass": CSS uses
    some `glass-panel` utility classes already (see `globals.css`,
    referenced throughout `TvBoard.tsx`), but a full frosted/squircle/
    typographic-hierarchy design system per the Phase 2 spec has not been
    implemented.

## Fixes made this pass (Phase 1 scope, partial)

1. `src/components/tv/TvBoard.tsx` — day-rollover bug: `weekAppts` `useMemo`
   now depends on `now` (the ticking clock) in addition to `appointments`,
   and `endOfWeekISO(now)` is passed explicitly, so the TV board's date
   window actually advances at midnight instead of only refreshing when new
   Realtime data arrives.
2. `src/app/layout.tsx` — removed a reference to a Next.js
   codegen-only ambient type (`LayoutProps<"/">`) that made `npx tsc
   --noEmit` fail outside of a full `next build`/`next dev` run (which
   generates `.next/types`). Replaced with a plain `{ children:
   React.ReactNode }` prop type. This is a build-tooling correctness fix,
   not a behavior change.

Verification performed:
- `npx tsc --noEmit` — passes clean (no errors) after the two fixes above.
- `npx eslint .` — passes clean, no warnings or errors.
- `npx next build` — **not run in this pass**; per the task's own caveat,
  builds that touch Supabase at prerender time cannot succeed in this
  sandbox regardless of code correctness, and distinguishing a real build
  bug from a network-block failure requires actually running it, which this
  pass did not get to.

## What still needs doing (honest gap list)

This pass did **not** complete:
- Deep read of `AppointmentModal.tsx`, `AppointmentCard.tsx`,
  `DashboardBoard.tsx`, `AdminBoard.tsx`, `RepAvatar.tsx`,
  `LinkButtons.tsx`, `UserManagement.tsx`, `Recap.tsx`, `TvControls.tsx`,
  `Nav.tsx`, `useLiveData.ts` (users channel), `supabase/admin.ts`,
  `supabase/browser.ts`, `proxy.ts`, or the migrations file in full detail
  — so items 1, 2 (tri-state skip-blocking specifically), 7, and 10 from
  the kill list above are **not independently code-verified**, only
  inferred as "present" from file existence and partial reads.
- **Phase 2 (liquid glass design system)** — not implemented: no squircle
  radii pass, no WCAG contrast computation, no icon-glass link buttons, no
  circular rep-photo treatment audit.
- **Phase 3 (motion layer)** — not implemented: no sold-status
  shimmer/pulse, no fade+slide-in, no animated reorder, no fade-out on
  rollover, no `prefers-reduced-motion` shared hook.
- **Phase 4 (3D/depth accents)** — not implemented.
- **Phase 5 (final QA pass with pass/fail table against all 11 kill-list
  items)** — only partially done above; several rows are marked
  "not independently verified" rather than pass/fail because the
  corresponding files were not read this pass.
- `npx next build` was not run at all.

## Recommendation

Given the size of this request (a full visual/motion/3D redesign across
every screen plus a rigorous line-by-line audit), it should be broken into
separate follow-up passes — one per remaining phase — each with its own
`tsc`/`eslint`/`build` verification and its own commit, rather than
attempted in a single pass. This report intentionally avoids claiming
completion of work that was not actually done.

## Phase 0/1 Audit — Remaining Components

Deep read completed for all previously-unreviewed files: `AppointmentModal.tsx`,
`AppointmentCard.tsx`, `DashboardBoard.tsx`, `StatusToggle.tsx`,
`admin/AdminBoard.tsx`, `admin/Recap.tsx`, `admin/TvControls.tsx`,
`admin/UserManagement.tsx`, `RepAvatar.tsx`, `LinkButtons.tsx`, `Nav.tsx`,
`app/dashboard/page.tsx`, `app/dashboard/layout.tsx`, `app/admin/page.tsx`,
`app/login/page.tsx`, `app/tv/page.tsx`.

1. **Tri-state status control** — OK, with a design note. Each of
   Confirmed/Showed/Sold is an *independent* tri-state toggle
   (`pending → yes → no → pending`, `src/components/StatusToggle.tsx:3-7`),
   not a single 4-step gated sequence. `AppointmentCard.tsx:82-101` renders
   all three toggles simultaneously and each calls `onStatusChange` directly
   — there is no ordering enforcement, so a rep *can* mark "Sold = yes"
   without ever touching Confirmed/Showed. This is how the app is built
   end-to-end (matches the API's field-level PATCH, no cross-field
   validation there either), so it is not a code bug, but it does mean the
   literal "blank → confirmed → showed → sold" linear state machine implied
   by the task description does not exist in this codebase — flagging as a
   product/requirements question, not fixing as a bug.
   "Un-checking" (returning to blank/pending) works correctly: the cycle
   `yes → no → pending` reaches blank as the third click
   (`StatusToggle.tsx:5-7`), and `nextTriState` persists it via the same
   `onChange`/PATCH path as any other state, so blank is a fully persisted
   state, not just a UI default.
2. **Add/edit appointment modal — bug found and fixed.**
   `DashboardBoard.tsx` computed a `conflictKeys` set intended to flag
   double-booked appointments, but the key was `date|time` with a `Set` of
   `rep_id`s, and it flagged a conflict when the set size was `> 1` — i.e.
   it fired whenever **two different reps** each had their own appointment
   at the same time slot (completely normal on a multi-rep floor) and
   **stayed silent** for the real conflict case, the same rep double-booked
   at the same time (their own `rep_id` set has size 1 no matter how many
   appointments they have there). Fixed by keying on
   `rep_id|date|time` and counting occurrences per rep, so the "conflict"
   badge (`AppointmentCard.tsx:55-58`, the `ring-1 ring-[#e0654f]/60` style)
   now only lights up when one rep genuinely has two overlapping
   appointments. See `src/components/DashboardBoard.tsx:56-66` (logic) and
   `:138` (usage). Beyond that, the modal does not otherwise block saving
   an overlapping time — it does not crash or corrupt data either way,
   since each appointment is its own row; the only feedback is the (now
   correct) visual badge, not a hard block. 15-min slot generation
   (`src/lib/time.ts:35-45`, 7:00 AM–8:00 PM) is used correctly by
   `AppointmentModal.tsx:7,136-149`.
3. **Appraisal/vAuto/CRM links** — OK. Editable in
   `AppointmentModal.tsx:163-201` (three URL inputs plus a CRM label
   `<select>` for VAN/DealerCentric), persisted via the same PATCH/POST
   payload as other fields (`AppointmentModal.tsx:56-67`), and rendered as
   real `<a target="_blank" rel="noopener noreferrer">` links with
   `stopPropagation` (so clicking a link doesn't also open the edit modal)
   in `src/components/LinkButtons.tsx:3-17`. `LinkButtons` only renders
   buttons for links that are actually set (`LinkButtons.tsx:20-21`), so no
   dead/empty buttons.
4. **Rep color coding** — OK in these components. `RepAvatar.tsx` and
   `Nav.tsx`/`AppointmentCard.tsx` only *consume* `rep.color_hex` (as a
   border/ring/text color); none of the reviewed components do their own
   color assignment. `src/lib/colors.ts:15-19` (`nextAvailableColor`, used
   server-side at rep creation, not in these files) still has the
   already-documented theoretical duplicate-color wraparound past 8 active
   reps — unchanged from the prior pass's note, not re-fixed here since it
   is outside the reviewed component set and not a realistic team-size
   issue.
5. **Manager-only actions — client/server gating cross-checked, consistent.**
   - Admin route is server-gated: `src/app/admin/page.tsx:8` redirects
     non-managers to `/dashboard` before `AdminBoard` ever renders, so a rep
     cannot reach `UserManagement`/`TvControls` at all (no "sees the button,
     gets silently 403'd" case here).
   - `Nav.tsx:20` only adds the "Admin" tab link for `user.role ===
     "manager"`, matching the server redirect — a rep never even sees the
     nav entry.
   - `AppointmentModal.tsx`: delete button only rendered for
     `isEdit && isManager` (`:216-224`), matching the DELETE route's
     manager-only enforcement noted in the prior pass. The rep-assignment
     `<select>` is only rendered for managers (`:151-161`), and the Save
     button itself is gated on `canEditAll = isManager || !isEdit ||
     appointment?.rep_id === user.id` (`:47,230`) — a non-owning rep who
     opens someone else's appointment (the card's `onClick` is unconditional
     in `DashboardBoard.tsx:137/161`) gets a fully read-only modal with no
     Save button at all, rather than a Save button that then 403s. This is
     the correct pattern the task was checking for.
   - `StatusToggle`s in `AppointmentCard` are disabled via
     `editable={user.role === "manager" || a.rep_id === user.id}`
     (`DashboardBoard.tsx:135,159`), so a rep can't even click a status
     toggle on someone else's appointment to trigger a silent 403.
6. **Up Next 30-minute glow** — OK, implemented exactly as expected.
   `src/components/AppointmentCard.tsx:10-17` (`upNextGlowClass`) computes
   `minutesUntil(appt.appt_date, appt.appt_time, now)` using the `now` prop
   (sourced from the ticking `useNowTick`, confirmed working in the prior
   pass) versus the appointment's own date/time, gates on `0 <= mins <= 30`,
   and additionally distinguishes `<= 15` minutes as
   `up-next-glow-urgent` vs. `up-next-glow` — a nicer two-tier version of
   what was asked for. It also correctly stops glowing once all three
   status fields are non-pending (`isComplete` check, `:11-13`), so a
   fully-processed appointment doesn't keep glowing.
7. **Mobile usability** — reviewed via Tailwind classes only (no live
   render, per sandbox constraint). Overall looks reasonable, not obviously
   broken:
   - Layout: `AppointmentModal` uses `grid-cols-1 sm:grid-cols-2` (stacks on
     mobile), `DashboardBoard`'s header uses `flex-wrap`, `Nav.tsx` hides
     the display name at `sm:` and keeps the avatar+logout visible on
     narrow screens (`Nav.tsx:42`). No fixed pixel container widths found
     that would force horizontal page scroll; wide-looking elements
     (`TvControls.tsx:86` offsets input `w-48`) sit inside `flex flex-wrap`
     containers so they wrap instead of overflowing.
   - Touch targets: `StatusToggle.tsx:40` renders a 32×32px
     (`w-8 h-8`) tap target for Confirm/Show/Sold — below the common
     44×44px guideline. Three of these sit side-by-side
     (`AppointmentCard.tsx:82-101`) next to a `cursor-pointer` card that
     also opens the edit modal on click, so on a small phone there's real
     risk of mis-tapping the card instead of a toggle, or vice versa.
     This is a real usability rough edge but is a CSS/sizing change
     (explicitly out of scope for this pass per the Phase 2 boundary), so
     it is called out here rather than changed.
   - The PIN pad on `login/page.tsx:89-125` uses `py-3.5` buttons in a
     `grid-cols-3` layout, which gives comfortably large (full-width-cell)
     tap targets on mobile — no issue there.
   - No horizontal-scroll traps identified in any of the reviewed files.
8. **Login page PIN pad** — OK, verified in code.
   `pressDigit` (`login/page.tsx:39-45`) appends a digit, and once
   `next.length === 4` it calls `submit(next)` automatically — true
   auto-submit on the 4th digit, no separate submit button needed. On a
   failed login, `submit()` sets `error` from the API response and resets
   `pin` to `""` (`:25-29`) so the dots clear and the message shows; typing
   a new digit via `pressDigit` also clears the error (`:43`) so stale
   errors don't linger once the user starts a fresh attempt. `backspace`
   and `Clear` are also present and working.
9. **Concurrent-edit handling at the component level** — OK, no unsafe
   optimistic overwrite found. `DashboardBoard.setStatus` (`:71-77`) and
   `AppointmentModal.save` (`:49-85`) both just `fetch(...PATCH)` and rely
   on the Realtime subscription (`useAppointments`, reviewed in the prior
   pass) to reconcile the displayed list from the server afterward — there
   is no local `setState` that optimistically writes a whole appointment
   object over what Realtime might independently deliver, so there's no
   component-level path that could clobber a concurrent server update with
   stale local state. Consistent with the prior pass's finding that the
   PATCH route is field-level, last-write-wins by design.

### Fixes made this sub-pass

1. `src/components/DashboardBoard.tsx:56-66,138` — fixed the
   double-booking "conflict" detector, which had its logic inverted (see
   item 2 above): it now flags the same rep being double-booked at the
   same date+time, instead of flagging two different reps each having
   their own separate appointment at the same time.

### Verification

- `npx tsc --noEmit` — clean, no errors.
- `npx eslint .` — clean, no warnings or errors.

### Still open / not fixed (by design, not oversight)

- Cross-field status ordering (item 1) — no code bug, but flagged as a
  product decision: the app currently allows any of Confirmed/Showed/Sold
  to be set independently and out of order.
- `StatusToggle` touch target size (item 7) — real mobile usability rough
  edge, left alone because it's a CSS/sizing change and this pass's scope
  explicitly excludes visual/design changes (Phase 2's job).
- `src/lib/colors.ts` duplicate-color wraparound past 8 reps — pre-existing
  note from the prior pass, not in the reviewed component set, not
  re-touched.

## Phase 2 — Liquid Glass Design System

Implemented the full visual redesign requested for this pass, across all
three surfaces (rep dashboard, manager admin, TV display) plus login and
shared chrome. No business logic, data fetching, auth, or animation timing
was touched — this was a CSS/markup-for-styling pass only.

### Shared token system (`src/app/globals.css`)

- Flipped the app from a forced dark theme to a **warm off-white light
  theme** as the default (`--background: #f6f1e9`), with a soft multi-stop
  radial gradient (amber + cool-blue + warm-tan washes) so the page reads
  as ambient light rather than a flat fill — deliberately not stark white,
  per spec, especially for TV viewing across a room.
- Kept the previous dark palette, now gated behind `prefers-color-scheme:
  dark` (guarded as `:root:not([data-theme="light"])`) and mirrored under
  `:root[data-theme="dark"]` for an explicit toggle, per the theme-aware
  requirement — every color token has both a light (bare `:root`) and dark
  definition, none defined only inside a media/data-theme block.
- New/renamed tokens: `--foreground-faint`, `--border-glass-strong`,
  `--hover-tint` / `--hover-tint-strong` (replacing hard-coded
  `bg-white/5`, `bg-white/10` utility classes that assumed a dark
  background — those all read wrong once the base flipped to light, so
  every occurrence across `Nav.tsx`, `DashboardBoard.tsx`,
  `AppointmentModal.tsx`, `LinkButtons.tsx`, `TvControls.tsx`,
  `UserManagement.tsx`, `TvBoard.tsx`, and `login/page.tsx` was swapped to
  the new theme-aware var via sed pass), `--pending-fg`.
- Squircle radius scale: `.glass-panel` → `1.75rem`, `.glass-panel-strong`
  → `2rem`, `.glass-input` → `1rem`, new `.glass-icon-btn` → `1.25rem`;
  every remaining hand-rolled `rounded-lg`/`rounded-xl` in components was
  bumped to `rounded-2xl` so nothing in the app uses a tight/sharp corner
  anymore.
- Typography hierarchy utilities: `.text-headline` (650 weight, tight
  tracking, full-strength foreground — customer name / time), `.text-secondary`
  (500 weight, muted — rep name / vehicle / links), `.text-label` (11px,
  600 weight, uppercase, wide tracking, faint — section/status labels).
  Font stack unchanged (Geist via `next/font/google`, already locally
  bundled at build time — no new webfont dependency introduced).
- `.glass-icon-btn`: the new shared icon-glass-button style (frosted fill,
  hairline border, `min-height`/`min-width: 2.75rem` = 44px) used for the
  appraisal/vAuto/CRM link buttons.

### Per-surface changes

- **`StatusToggle.tsx`** — rebuilt as a 44×44px (`w-11 h-11`, `min-w-11
  min-h-11`) glass chip with a soft backdrop-blur fill, colored inset ring
  per state (blank/confirmed=green/rejected=red), and a small dot glyph
  for the pending state so all three states are visually distinct even
  without color (shape, not just hue). This directly fixes the
  under-44px mobile touch-target issue flagged in Phase 1.
- **`LinkButtons.tsx`** — switched from a bespoke inline class string to
  the shared `.glass-icon-btn` (icon + label, 44px min touch target,
  consistent frosted-pill look across appraisal/vAuto/CRM).
- **`RepAvatar.tsx`** — photo variant gets a soft two-layer ring (white
  inset + colored outer ring + diffuse colored drop shadow) instead of a
  hard 2px solid-color outline; initial-letter fallback keeps a
  colored-tint chip background but renders the initials in the neutral
  `--foreground` color instead of the raw rep hex (see contrast section
  below for why).
- **`AppointmentCard.tsx`** — restructured for real hierarchy: time +
  customer name promoted to `.text-headline` (18–30px depending on
  surface), vehicle demoted to `.text-secondary`, rep identity moved into
  a small "With `<name>`" line under an avatar rather than a top-line
  colored label. Rep color coding is now expressed only via a 4–6px
  tinted left border plus a matching soft outward glow
  (`box-shadow: -14px 0 26px -22px <accent>`) — never as colored body
  text. Added a `tv` prop that scales up type (2xl/3xl headline, lg
  secondary, thicker 6px accent border) for the TV surface without
  affecting the dashboard/admin rendering of the same component.
- **`TvBoard.tsx`** — every `AppointmentCard` usage (single list,
  columns-per-rep, columns-by-status) now passes `tv`, so the one surface
  meant to be read from ~10ft gets materially larger/bolder type instead
  of the same size as a phone card. Header, column labels, and the
  sound-unlock overlay were bumped to match.
- **Admin surface** (`TvControls.tsx`, `UserManagement.tsx`, `Recap.tsx`)
  — heading treatment switched to `.text-headline`, all hover/active state
  classes moved off the old `bg-white/*` utilities onto the theme-aware
  hover tokens.
- **Login page** — squircle radii bumped, error text moved to
  `var(--bad)` instead of a hard-coded hex so it tracks the theme token.
- **`layout.tsx`** — removed the hard-coded `dark` class on `<html>` so
  the light theme is the actual default render, not just the CSS fallback.

### WCAG AA contrast audit

Every glass surface is translucent, so contrast was computed against the
**actual composited color** (foreground/panel alpha flattened onto the
base page background), not the raw CSS variable. Base app background used
for compositing: `#f6f1e9`. `.glass-panel` is `rgba(255,255,255,0.55)`
over that base → composites to `#fbf9f5`. Method: WCAG relative-luminance
formula, ratio = (L1+0.05)/(L2+0.05).

| Foreground | Background (composited) | Ratio | Requirement | Result |
|---|---|---|---|---|
| `--foreground` #2a2420 | panel #fbf9f5 | 14.56:1 | 4.5:1 (body text) | Pass |
| `--foreground-muted` #6b6157 | panel #fbf9f5 | 5.75:1 | 4.5:1 | Pass |
| `--foreground-faint` #6f6459 (label/caption text) | panel #fbf9f5 | 5.48:1 | 4.5:1 | Pass — **adjusted** from an initial draft `#948b80` (3.19:1, fail) to `#6f6459` |
| `--pending-fg` #766c60 (StatusToggle blank-state text/dot) | panel #fbf9f5 | 4.89:1 | 4.5:1 | Pass — **adjusted** from an initial draft `#8a8073` (3.69:1, fail) |
| `--accent` #3568d4 (link/active text) | panel #fbf9f5 | 4.89:1 | 4.5:1 | Pass |
| `--ok` #1f8f5f (StatusToggle "yes" icon) | its own chip `rgba(31,143,95,0.16)` over panel → `#d8e8dd` | 3.20:1 | 3:1 (graphical/icon, WCAG 1.4.11) | Pass |
| `--bad` #c8402a (StatusToggle "no" icon / conflict label) | its own chip `rgba(200,64,42,0.14)` over panel → `#f4dfd9` | 3.88:1 | 3:1 (icon) / label text is `.text-label` at 11px bold — checked separately below | Pass |
| `--bad` on panel directly (conflict `.text-label`, error text) | panel #fbf9f5 | 4.73:1 | 4.5:1 | Pass |
| white `#fff` on `--accent` #3568d4 (Save/Add buttons) | solid #3568d4 | 5.14:1 | 4.5:1 | Pass |
| `--foreground` #2a2420 (page body, outside any glass panel) | base `#f6f1e9` | 13.62:1 | 4.5:1 | Pass |
| `--foreground-muted` #6b6157 (page body) | base `#f6f1e9` | 5.38:1 | 4.5:1 | Pass |

**Rep-color-as-text failure, found and redesigned around:** the 8-color
rep palette (`src/lib/colors.ts`, unchanged — it's live data already
assigned to real reps, not touched) was originally designed for dark
panels. Used as small text on the new light panel it fails badly —
computed ratios range from **2.37:1 (emerald) to 3.63:1 (violet)**, all
below 4.5:1, and even white-on-solid-chip only reaches 2.49–3.63:1
depending on hue. Rather than alter the stored palette (would require a
DB migration and change already-assigned rep colors, out of scope), the
**fix was architectural**: rep color is never rendered as small text
anywhere in this design. It appears only as (a) the card's left accent
border + soft outward glow, (b) the avatar's tint chip background /
photo ring, both of which are decorative/graphical, not text. Avatar
initials render in `--foreground` (dark neutral) on the tinted chip
(computed ratio 12–14:1 for all 8 palette colors' chips, since the chips
themselves are >90% panel-white regardless of hue) instead of in the rep
color. The "With `<name>`" line renders the name in `--foreground-muted`,
not the rep's hex. This keeps reps instantly distinguishable by color
(border + glow + ring, all still hue-coded and TV-distance legible) while
keeping every actual text glyph on a token that passes AA.

**TV-specific sizing:** the `tv` variant on `AppointmentCard` renders
customer name/time at `text-2xl`/`text-3xl` (24–30px) and vehicle at
`text-lg` (18px) — both comfortably clear the "large text" 3:1 threshold
even before applying the same 4.5:1-passing color tokens computed above,
so TV legibility at distance is not a contrast-vs-size tradeoff here.

### Verification

- `npx tsc --noEmit` — clean, no errors.
- `npx eslint .` — clean, no warnings or errors.
- `npx next build` — not run (network-blocked Supabase prerender, per the
  standing sandbox constraint); not required to validate a CSS/markup-only
  pass, and `tsc`/`eslint` both pass clean on every touched file.

### Not addressed in this pass (explicitly out of scope)

- Motion (Phase 3) and 3D/depth (Phase 4) — untouched, as instructed.
- Dark-mode contrast was not independently re-audited token-by-token this
  pass — the dark palette is the pre-existing scheme from before this
  redesign (high-contrast light-on-near-black, e.g. `#e9edf5` on
  `#0b0f17`), carried forward unchanged and gated behind
  `prefers-color-scheme`/`data-theme`, but the specific AA math above was
  only computed for the light (default) surfaces per the primary target
  described in the task.
- `src/lib/colors.ts`'s 8-color palette was left as-is (see rep-color
  section above for why, and for the redesign that routes around its
  contrast problem rather than editing live-data-adjacent constants).

## Phase 2.1 — Bright White Palette Adjustment

Follow-up pass on top of Phase 2's liquid-glass system: the light theme was
shifted from a "warm atmospheric off-white" to a bright, clean white —
"the feel of a whiteboard's surface." Only `:root` (light) tokens were
touched; the `prefers-color-scheme`/`data-theme="dark"` variant is
unchanged except for adding the new `--shadow-color-tv` token so the
variable exists in both themes.

### What changed

- `--background`: `#f6f1e9` → `#ffffff`. `--background-alt`: `#efe7da` →
  `#f7f7f8`.
- Removed the three warm/cool radial gradients from `body` in light mode
  entirely (flat `var(--background)` now); the gradients are preserved
  but re-tuned to cool tones and gated behind the dark-mode media query
  only, so light mode reads as flat, glare-free white and dark mode keeps
  its atmospheric depth.
- Neutrals darkened for higher, more consistent contrast against the
  brighter base: `--foreground` `#2a2420`→`#16181c`, `--foreground-muted`
  `#6b6157`→`#52565c`, `--foreground-faint` `#6f6459`→`#4b4f55`,
  `--pending-fg` `#766c60`→`#4b4f55` (unified with foreground-faint —
  previously the lightest, most contrast-marginal token in the system).
- Glass tint lightened/de-hazed: `--panel-glass` alpha 0.55→0.72,
  `--panel-glass-strong` 0.72→0.85, `.glass-input` fill 0.5→0.6 (0.72→0.85
  on focus). Blur/border/shadow (the actual "glass" identity) kept
  unchanged in mechanism, just re-tinted neutral instead of warm:
  `--border-glass`/`--border-glass-strong` now `rgba(20,20,26,…)` instead
  of `rgba(60,48,32,…)`.
- Shadows lightened and neutralized: `--shadow-color`
  `rgba(60,48,32,0.14)` → `rgba(20,20,26,0.09)` — a soft lift, not a dark
  drop shadow.
- `--ok` `#1f8f5f`→`#167a4c` and `--bad` `#c8402a`→`#b8391f`: both
  darkened slightly so the StatusToggle icon-on-tint-chip combination
  clears WCAG non-text contrast (3:1) with real margin against the
  brighter base (see table below). Both stay clearly saturated — this is
  a contrast fix, not a desaturation.
- `src/components/StatusToggle.tsx`: its hardcoded chip-fill/ring rgba
  values (previously literal `31,143,95` / `200,64,42`) were updated to
  match the new `--ok`/`--bad` hexes so the chip tint and the icon color
  stay in sync.
- `src/lib/colors.ts`'s 8-color rep palette is untouched — those hexes
  stay fully saturated and are only ever expressed as a border/glow
  accent (never as text), per the Phase 2 decision. Re-verified below
  that they still read clearly against the new pure-white base.

### WCAG contrast recomputation (light theme)

Because `--background` is now pure `#ffffff` and light-mode glass panels
sit directly on that flat body (no gradient showing through), a
translucent-white panel composited over `#ffffff` composites back to
`#ffffff` exactly — so "text on background" and "text on glass panel"
collapse to the same number for every token below.

| Foreground token | Hex | On (composited) | Ratio | Needs | Result |
|---|---|---|---|---|---|
| `--foreground` | `#16181c` | `#ffffff` | ~19:1 | 4.5:1 | Pass (wide margin) |
| `--foreground-muted` | `#52565c` | `#ffffff` | 7.38:1 | 4.5:1 | Pass |
| `--foreground-faint` (`.text-label`, small uppercase) | `#4b4f55` | `#ffffff` | 8.24:1 | 4.5:1 | Pass |
| `--pending-fg` (on `.glass-panel`/pending chip) | `#4b4f55` | `#ffffff` | 8.24:1 | 4.5:1 | Pass |
| `--accent` (`#3568d4`) | `#3568d4` | `#ffffff` | 5.15:1 | 4.5:1 | Pass |

StatusToggle icon-on-tint-chip (icon glyphs count as UI graphics, 3:1
threshold under WCAG 1.4.11, not the 4.5:1 text threshold):

| State | Icon color | Chip fill (composited over `#fff`) | Ratio | Needs | Result |
|---|---|---|---|---|---|
| Yes | `--ok` `#167a4c` | `rgba(22,122,76,0.14)` → `#dee9e2` | 4.41:1 | 3:1 | Pass, +text-AA-adjacent margin |
| No | `--bad` `#b8391f` | `rgba(184,57,31,0.14)` → `#f5e3df` | 4.66:1 | 3:1 | Pass, +text-AA-adjacent margin |

(Prior Phase 2 values `#1f8f5f`/`#c8402a` at the old chip alphas measured
~3.35:1 and ~4.07:1 against the warmer base — both technically legal for
icons but the green sat close to the 3:1 floor. The 2.1 hexes carry more
margin against the brighter white.)

### TV-display glare/legibility check

`src/components/tv/TvBoard.tsx` renders `AppointmentCard` with `tv` large
type and, in `columns_per_rep`/`columns_by_status` layouts, `.glass-input`
column headers — all on the same bright-white base. Concern: a pure-white
`.glass-panel` fill on a pure-white body, viewed from 10+ feet under
bright showroom lighting, has almost no fill-vs-background luminance
delta once glare is factored in — panels could read as a flat white void
with only the rep-color left border for shape.

Adjustment made: added a `.glass-panel-tv` modifier (new `--shadow-color-tv`
token, `rgba(20,20,26,0.20)` light / `rgba(0,0,0,0.55)` dark — notably
heavier than the base `--shadow-color` but still neutral-gray, not warm)
that gives TV-surface panels a firmer hairline border
(`--border-glass-strong` instead of `--border-glass`) and a heavier, more
defined drop shadow than the desktop card gets. Wired into:
- `AppointmentCard` when `tv` is true (both the CSS class and the inline
  per-card `boxShadow`, which otherwise would have overridden the class
  with the lighter desktop shadow).
- The TV board's top date/time header bar.
- The per-rep and per-status column header chips in the two grid layouts
  (border-color and shadow strengthened via inline style, keeping each
  rep's color-coded left border intact by ordering `borderLeft` after
  `borderColor` in the style object).

This keeps the "bright, clean" mandate — no tint or warmth was
reintroduced — while giving panels enough edge definition to hold their
shape at a distance instead of dissolving into the white body behind
them.

### Rep-color / status-accent re-verification against pure white

The 8-color `REP_COLOR_PALETTE` (`#4F8EF7`, `#E0654F`, `#3FB88A`,
`#C99A3C`, `#9D6FE0`, `#3FAFC2`, `#E0578C`, `#7C9C4A`) and the
`up-next-glow`/`up-next-glow-urgent` amber/red glow colors are used only
as a left-border strip + soft box-shadow glow (decorative, non-text), so
WCAG text-contrast thresholds don't apply — but they were re-checked
visually against `#ffffff` rather than the old `#f6f1e9`: every hex in
the palette is mid-to-high saturation and reads clearly as a distinct
color chip on pure white (more so than on the warmer base, if anything,
since there's no competing warm cast). No hue/saturation changes were
needed or made to this palette.

## Phase 3 — Motion Layer

CSS-only motion (no new runtime dependency). `framer-motion` is **not** a
dependency (`package.json` confirmed clean of it before starting) and the
whole layer — entrances, the FLIP reorder, cross-fades, the modal, the
signature shimmer — is built with plain CSS `@keyframes`/`transition`
plus small React hooks that only toggle classes and schedule/clear
timers. No new package was added.

### Per-requirement

1. **Signature "sold" moment.** New shared hook
   `src/lib/useSoldShimmer.ts` watches `appointments` and fires only when
   a given appointment's `sold_status` transitions from not-`"yes"` to
   `"yes"` (previously `DashboardBoard` triggered on *full* completion —
   all three fields non-pending — which is not the same event and could
   fire off a `confirmed`/`showed` change; that logic is now specifically
   sold-gated). It returns a `Set<string>` of ids that should carry
   `animate-completion-shimmer` (the pre-existing `AppointmentCard`
   glass-glow keyframe from Phase 2) for ~950ms. Wired into both
   `DashboardBoard` and, newly, `TvBoard` (which previously had no
   shimmer at all) so the flourish is consistent rep-side and TV-side.
   Confirmed/showed toggles intentionally get no special effect — they
   just re-render through `StatusToggle`'s existing 100ms scale
   transition.
2. **New-appointment entrance.** `.appt-card-enter` (`card-enter`
   keyframe: opacity 0→1 + `translateY(10px)`→`0`, 420ms) is applied to
   the wrapping `<div key={a.id}>` around every rendered
   `AppointmentCard` — `DashboardBoard`'s active and "completed today"
   lists, and all three `TvBoard` layouts (single list, per-rep columns,
   per-status columns). Because React keys these wrappers by stable
   appointment id, the animation only replays when a node is freshly
   inserted (a genuinely new appointment, or one that just moved into a
   different list, e.g. dashboard's active→completed split), never on an
   ordinary re-render of an existing card.
3. **Sink-to-bottom animated reorder (TV).** New
   `src/lib/useFlipAnimation.ts` — a small manual FLIP implementation
   (no library): before each render it snapshots child
   `getBoundingClientRect()`s keyed by `data-flip-id`, and after the DOM
   updates it computes each item's position delta, sets an instant
   `transform` to the old delta, forces a reflow, then transitions the
   transform back to identity (500ms). Wired to `TvBoard`'s single-list
   container (the primary "day list" view) via `singleListRef`, keyed on
   the current render order's ids. The per-rep/per-status column layouts
   get the entrance animation but not FLIP (their columns don't reorder
   items the way the single list does — items move between columns
   instead, which is already covered by the enter animation on
   insertion).
4. **Day-rollover fade-out (TV).** `TvBoard` now tracks which
   appointment ids just dropped out of `weekAppts` (rollover past
   `todayISO()`, or the record vanishing outright) in a `fadingOut: Map<id,
   Appointment>` state. A dropped item is kept in the render list — with
   `.appt-fade-out` (900ms fade + slight downward drift, `pointer-events:
   none`) — for one more tick, then its own `setTimeout` deletes it from
   the map. Every entry is removed by a timer scoped to that exact
   appointment; nothing is left to accumulate.
5. **Up Next glow.** Already implemented in Phase 2
   (`up-next-glow`/`up-next-glow-urgent` keyframes, `AppointmentCard.tsx`
   → `upNextGlowClass`) as a slow (2.6s) / medium (1.5s, ≤15min-out)
   `ease-in-out infinite` box-shadow pulse — already the calm,
   from-across-the-room read the requirement asks for, so left untouched
   other than confirming it isn't jarring at either cadence.
6. **Manager TV layout cross-fade.** `TvBoard` now holds
   `displayLayout`/`layoutFadeClass` state separate from the live
   `settings.layout_mode`. On a layout change it fades the current
   content out (`layout-fade-out`, 200ms), swaps the rendered layout
   branch, then fades the new one in (`layout-fade-in`, 260ms) — a
   sequential cross-fade rather than an instant DOM swap. `TvControls`
   itself needed no changes; it already just PATCHes `tv_settings`, and
   `TvBoard` picks the new value up over its existing Realtime
   subscription.
7. **Modal open/close.** `AppointmentModal` gained a `closing` boolean
   and a `requestClose(cb)` helper: closing (backdrop click, Escape,
   Cancel, or a successful save/delete) sets `closing` — which swaps the
   backdrop/panel classes to `modal-backdrop-out`/`modal-panel-out`
   (fade + `scale(0.97)`) — and defers the actual `onClose`/`onSaved`/
   `onDeleted` callback by the animation's duration (180ms) instead of
   unmounting instantly. Opening plays the mirrored `-in` keyframes
   (fade + `scale(0.96)→1`) on mount.
8. **`prefers-reduced-motion`.** One shared mechanism, used everywhere:
   - A single blanket rule at the bottom of `globals.css` —
     `@media (prefers-reduced-motion: reduce) { *, *::before, *::after {
     animation-duration: 0.001ms !important; transition-duration:
     0.001ms !important; … } }` — collapses every CSS animation/transition
     in the app (shimmer, up-next glow, card enter/exit, modal, layout
     cross-fade, and any existing hover/press transitions) to effectively
     instant. This is declarative and automatically covers any animation
     added later, rather than an allowlist of class names.
   - New `src/lib/usePrefersReducedMotion.ts` hook (lazy-initialized from
     `matchMedia`, with a `change` listener cleaned up on unmount) for the
     handful of places where *JS*, not CSS, controls timing: the modal's
     close-delay, the TV rollover fade-out's removal delay, the layout
     cross-fade's swap delay, and gating the FLIP hook on/off. Every one
     of those call sites branches on this hook to use a 0ms delay instead
     of the animated one — so reduced-motion truly means an immediate
     state change, not just a faster CSS transition underneath a still-
     staged JS sequence.
   No per-component ad-hoc `matchMedia` checks were added outside this
   hook.

### Leak-risk review (code-level; no live/soak test possible in-sandbox)

- **`DashboardBoard`'s old shimmer tracking** (`prevCompleteRef: Map`)
  never pruned entries for appointments that left the list — over a
  multi-day session that map would grow without bound. Replaced by
  `useSoldShimmer`, which now explicitly deletes any id from its internal
  `prevSoldRef` map that is no longer present in the current
  `appointments` array on every effect run.
- **`TvBoard`'s new `fadingOut` map** is the one new piece of
  animation-triggered state that could in principle grow (a "recently
  dropped" id list) — verified every entry is deleted by its own
  `setTimeout` (cleared/rescheduled correctly via the effect's cleanup
  function), so it cannot accumulate across a long TV session.
- **All new `setInterval`/`setTimeout` usage** — `useSoldShimmer`,
  `useFlipAnimation` (one-shot `requestAnimationFrame`-free; it uses
  synchronous reflow forcing, not a raf loop), the `TvBoard` rollover and
  layout-crossfade effects, and `AppointmentModal`'s `requestClose` — was
  checked for matching cleanup: every effect that schedules a timer
  returns a cleanup function that clears it, so no timer can fire against
  an unmounted component or stale closure survive a re-render.
- **`usePrefersReducedMotion`'s `matchMedia` listener** is removed in its
  effect's cleanup — verified no listener leak.
- **No new `addEventListener` on `window`/`document`** was introduced
  beyond the pre-existing `AppointmentModal` Escape-key listener (already
  cleaned up, now just calls `requestClose` instead of `onClose`
  directly).
- `eslint`'s `react-hooks/set-state-in-effect` rule flagged three
  synchronous `setState` calls inside effect bodies during development
  (`useSoldShimmer`, `usePrefersReducedMotion`, `TvBoard`'s layout-fade
  effect); all three were fixed — either by lazy `useState` initializers
  or by deferring the `setState` through a (cleaned-up) `setTimeout(…, 0)`
  — rather than suppressed, so the fix is a real behavior change, not a
  lint bypass.

### Verification

- `npx tsc --noEmit` — clean, no errors.
- `npx eslint .` — clean, no warnings or errors.
- `npx next build` / real browser / TV soak test — **not run**, per the
  standing sandbox constraint (no Supabase network access). Everything
  above is verified by type-checking, linting, and manual code review
  only. In particular:
  - The FLIP reorder, the rollover fade-out timing against real Realtime
    updates, and the layout cross-fade have not been visually confirmed
    in a browser.
  - Real frame-rate/memory behavior over a multi-hour TV run has **not**
    been measured and still needs a live soak test once network access
    to Supabase exists — this pass only rules out the concrete,
    inspectable leak patterns (unbounded maps, uncancelled timers,
    unremoved listeners) via code review, not empirical profiling.


## Phase 4 — 3D/Depth Accents

Added atmosphere-only 3D/depth touches in exactly the four approved spots,
all CSS-driven (no framer-motion or other new runtime dependency added),
and all gated through the existing Phase 3 reduced-motion mechanism.

1. **TV display ambient background** (`src/components/tv/TvBoard.tsx` +
   `.tv-ambient-bg` in `src/app/globals.css`): three blurred, low-opacity
   radial-gradient circles (`filter: blur(70px)`, opacity 0.06–0.10) sit in
   a `position: fixed` layer at `z-index: 0`, with the board's real content
   wrapped in a `position: relative; z-index: 10` div on top. Each circle
   drifts slowly (52s/64s/70s `ease-in-out infinite` keyframes doing only
   `translate`+`scale`) — pure CSS, no JS timer or per-frame recomputation
   drives them, so they cannot drift, leak, or accumulate cost over a
   multi-hour TV session. Colors are pulled from the existing `--accent`/
   `--ok` tokens so they match the theme automatically. Hidden outright
   (`display: none`) under `prefers-reduced-motion: reduce`.
2. **Login panel depth** (`src/app/login/page.tsx` + `.login-panel-enter`/
   `.login-panel-tilt` in `globals.css`): the panel mounts with a perspective
   entrance (`rotateX(8deg)` easing to flat, scale+translateY, 480ms). After
   mount, a `mousemove`/`mouseleave` listener **on the panel element itself**
   (not `window`) writes two CSS custom properties (`--tilt-x`/`--tilt-y`)
   that a CSS `transform: perspective(1200px) rotateX(var(--tilt-x))
   rotateY(var(--tilt-y))` with a 150ms transition consumes — so the only
   JS work per pointer move is two `style.setProperty` calls, no layout
   thrashing. Tilt is clamped to ±6deg. The listener is attached only when
   `window.matchMedia("(hover: hover) and (pointer: fine)")` matches (skips
   touch/no-hover devices entirely) and only when `usePrefersReducedMotion()`
   is false, and is removed in the effect's cleanup.
3. **Empty state** (new `src/components/EmptyState.tsx`, used by
   `DashboardBoard.tsx` and `TvBoard.tsx`'s single-list layout, replacing
   their old plain-text "no appointments" messages): a small inline SVG
   icon (a clipboard-with-checkmark glyph built from the existing glass/
   accent tokens) wrapped in `.empty-state-icon`, which applies a slow
   4.5s bob (`translateY` oscillation under a fixed slight `rotateX` for
   the 3D read) via `@keyframes empty-state-float`.
4. **Modal entrance** (`AppointmentModal.tsx` via `globals.css`'s
   `modal-panel-in`/`modal-panel-out`): the existing Phase 3 scale+fade
   keyframes now open on `perspective(1000px) rotateX(6deg)` easing to
   `rotateX(0deg)` alongside the scale/translateY, so the dialog reads as
   tipping toward the viewer rather than flatly zooming. No JS changes —
   same `closing` state machine as before.

Explicitly untouched, as instructed: `AppointmentCard`, `StatusToggle`,
and any status-checkbox affordance — nothing there gained a hover-tilt or
any other 3D effect.

### Reduced-motion gating

All four reuse the established Phase 3 mechanism rather than a parallel
one:
- The blanket `@media (prefers-reduced-motion: reduce)` rule in
  `globals.css` already collapses every `animation`/`transition` duration
  to ~0, which flattens the modal's rotateX entrance and the empty-state
  float automatically (no per-rule opt-out needed).
- `.tv-ambient-bg` gets an explicit `display: none` under that same media
  query, since a merely-instant animation would still leave three static
  blurred shapes lingering (undesirable — the intent is "off", not
  "frozen").
- `.login-panel-tilt` gets an explicit `transform: none !important;
  transition: none !important` under the same query, matching intent for
  the same reason.
- The login page's pointer-tilt *listener* is additionally gated in JS
  (via `usePrefersReducedMotion()`) so it never attaches at all for
  reduced-motion users, rather than attaching and then being visually
  suppressed by CSS.

### Performance / cleanup review

- **TV ambient background is pure CSS.** No `setInterval`/`requestAnimationFrame`
  drives it; the three `<span>` elements are static in the DOM (rendered
  once, never re-created) and only their `transform`/`opacity` are
  animated — cheap, compositor-only properties. Confirmed no JS in
  `TvBoard.tsx` touches these elements after mount.
- **Login pointer listener is properly scoped and cleaned up.** It is
  attached to the panel `<div>` via `panelRef`, not to `window` or
  `document`, so it only fires while the pointer is physically over the
  login panel (a small, one-screen-only component that unmounts on
  navigation away from `/login` — it cannot leak into other pages). The
  `useEffect` returns a cleanup that calls `removeEventListener` for both
  `mousemove` and `mouseleave`. The effect also early-returns (attaching
  nothing) when `prefers-reduced-motion: reduce` is set or the device
  lacks `hover`+fine pointer, so touch users get zero added listeners.
- **No new unbounded state.** `EmptyState` is a stateless presentational
  component. The login tilt state lives entirely in two CSS custom
  properties on a single DOM node (no React state, no growing
  map/array). Nothing here reintroduces the class of leak Phase 3 fixed
  (unpruned maps, uncancelled timers) — no new timers or maps were added
  in this phase at all.
- **TV z-index/opacity change reviewed for readability.** The ambient
  layer sits at `z-index: 0` under a `z-index: 10` content wrapper, is
  capped at 10% opacity per shape, and blurred to 70px — verified by
  reading the values against the existing `glass-panel`/card contrast,
  not by rendering (see Verification below), but the intent and numbers
  are conservative enough that it should read as "faint depth" not "a
  competing visual."

### Verification

- `npx tsc --noEmit` — clean, no errors.
- `npx eslint .` — clean, no warnings or errors.
- Real GPU/frame-rate behavior of the TV ambient background over a
  multi-hour run, and the visual feel of the login tilt and modal
  perspective entrance in an actual browser, have **not** been verified
  live — per the standing sandbox constraint (no Supabase network
  access, no `npm run dev`). This pass is code-review-only: the ambient
  layer is architecturally guaranteed to be GPU-cheap (pure CSS
  transform/opacity on 3 static elements, no JS per-frame cost), but an
  actual soak test on TV hardware is still owed once network access
  exists.
