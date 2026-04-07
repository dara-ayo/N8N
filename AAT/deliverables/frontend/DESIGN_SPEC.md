# ContentFlow — Design System Specification
**Fetemi Marketing | Version 1.0 | March 2026**

> Target polish level: Linear / Vercel / Raycast. Every pixel intentional, every interaction satisfying.

---

## Current State Assessment

The existing app has a solid foundation:
- Dark theme with `#0f0f11` base, purple accent `#7c6af5`
- Inter font loaded, JetBrains Mono in config but not imported in CSS
- Tailwind token system already in place (surface, accent, text, status)
- Top horizontal nav with sticky header — **this needs to become a sidebar**
- Good component classes (`.card`, `.btn-primary`, etc.) but can be elevated
- Animations defined but inconsistent application

---

## 1. Design Philosophy

### Overall Feel
**Dark, minimal, professional.** ContentFlow is a power tool for marketing teams. The UI should feel like it was built by engineers who care about design — not by designers who don't understand engineering. Think: information-dense without being cluttered, beautiful without being decorative.

Reference apps: Linear (keyboard-centric, dense, fast), Vercel (clean hierarchy, monospace stats), Raycast (list-based, instant, premium dark).

### Typography Hierarchy

**Primary font:** Inter (already loaded)
**Monospace font:** JetBrains Mono — **must be added to the Google Fonts import** in `index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

| Role | Font | Size | Weight | Color Token | Notes |
|---|---|---|---|---|---|
| Page title | Inter | 22px / `text-[22px]` | 600 | `text-text-primary` | `tracking-tight` |
| Section title | Inter | 15px / `text-[15px]` | 600 | `text-text-primary` | |
| Body default | Inter | 14px / `text-sm` | 400 | `text-text-secondary` | `leading-relaxed` |
| Body emphasis | Inter | 14px / `text-sm` | 500 | `text-text-primary` | |
| Caption / meta | Inter | 12px / `text-xs` | 400 | `text-text-tertiary` | |
| Labels / overline | Inter | 11px / `text-[11px]` | 500 | `text-text-tertiary` | `uppercase tracking-widest` |
| Stat numbers | JetBrains Mono | 24px / `text-2xl` | 500 | `text-text-primary` | `font-mono` |
| Stat subtext | JetBrains Mono | 12px / `text-xs` | 400 | `text-text-tertiary` | `font-mono` |
| Code/ID snippets | JetBrains Mono | 12px / `text-xs` | 400 | `text-text-secondary` | `font-mono` |
| Nav labels | Inter | 13px / `text-[13px]` | 500 | varies by state | |
| Button text | Inter | 13px / `text-[13px]` | 500 | varies | |

### Spacing System

Base unit: **4px**. All spacing values are multiples of 4.

| Token | Value | Use |
|---|---|---|
| `space-1` | 4px | Icon gap, tight inline |
| `space-2` | 8px | Form element internal padding |
| `space-3` | 12px | Card internal gap, nav item padding |
| `space-4` | 16px | Default element separation |
| `space-5` | 20px | Card padding (compact) |
| `space-6` | 24px | Card padding (standard), section gap |
| `space-8` | 32px | Major section separation |
| `space-10` | 40px | Page section breaks |
| `space-12` | 48px | Empty state padding |

Sidebar width: **240px** expanded, **56px** collapsed.
Main content max-width: **900px** (within the remaining space).
Content area horizontal padding: **32px** (`px-8`).

---

## 2. Color System

### Background Layers (3 levels)

```
Layer 0 — App base:    #0a0a0d  (slightly darker than current #0f0f11)
Layer 1 — Base:        #0f0f11  (current DEFAULT — body background)
Layer 2 — Elevated:    #16161a  (current secondary — cards, sidebar bg)
Layer 3 — Surface:     #1c1c22  (current tertiary — inputs, code blocks)
Layer 4 — Hover:       #22222a  (current elevated — hover states)
```

**Update `tailwind.config.js` surface tokens:**
```js
surface: {
  DEFAULT: '#0f0f11',      // body bg
  secondary: '#16161a',    // cards, sidebar
  tertiary: '#1c1c22',     // inputs, nested sections
  elevated: '#22222a',     // hover states
  border: '#2a2a35',       // default border
  'border-strong': '#3a3a48', // emphasized border
  hover: '#28282f',        // hover bg
}
```

### Text Hierarchy

| Token | Hex | Opacity | Use |
|---|---|---|---|
| `text-text-primary` | `#f0f0f5` | 100% | Headers, active labels, values |
| `text-text-secondary` | `#a0a0b0` | 100% | Body copy, descriptions |
| `text-text-tertiary` | `#606070` | 100% | Meta, placeholders, disabled labels |
| `text-text-disabled` | `#404050` | 100% | Truly disabled content |

### Accent Colors

**Primary — Purple (brand):**
```js
accent: {
  DEFAULT: '#7c6af5',
  hover: '#9585f8',
  muted: 'rgba(124, 106, 245, 0.12)',
  'muted-hover': 'rgba(124, 106, 245, 0.18)',
  border: 'rgba(124, 106, 245, 0.25)',
  'border-hover': 'rgba(124, 106, 245, 0.45)',
}
```

**Success — Green:**
```
Solid:      #22c55e
Muted bg:   rgba(34, 197, 94, 0.10)
Border:     rgba(34, 197, 94, 0.20)
Glow:       0 0 12px rgba(34, 197, 94, 0.15)
```

**Warning — Amber:**
```
Solid:      #f59e0b
Muted bg:   rgba(245, 158, 11, 0.10)
Border:     rgba(245, 158, 11, 0.20)
```

**Error — Red:**
```
Solid:      #ef4444
Muted bg:   rgba(239, 68, 68, 0.10)
Border:     rgba(239, 68, 68, 0.20)
```

**Info — Blue:**
```
Solid:      #3b82f6
Muted bg:   rgba(59, 130, 246, 0.10)
Border:     rgba(59, 130, 246, 0.20)
```

### Gradient Definitions

**Card gradient border (glass-morphism effect):**
```css
/* Apply as inline style on stat cards */
background: linear-gradient(135deg, #16161a 0%, #1c1c22 100%);
border-image: linear-gradient(135deg, rgba(124,106,245,0.3) 0%, rgba(124,106,245,0.05) 100%) 1;
```

**Accent CTA gradient:**
```css
background: linear-gradient(135deg, #7c6af5 0%, #9585f8 50%, #a78bfa 100%);
```

**Stat card gradient (per-card variations):**
```css
/* Purple stat */
background: linear-gradient(135deg, rgba(124,106,245,0.06) 0%, transparent 60%);

/* Green stat */
background: linear-gradient(135deg, rgba(34,197,94,0.06) 0%, transparent 60%);

/* Blue stat */
background: linear-gradient(135deg, rgba(59,130,246,0.06) 0%, transparent 60%);

/* Amber stat */
background: linear-gradient(135deg, rgba(245,158,11,0.06) 0%, transparent 60%);
```

**Page ambient gradient (behind content):**
```css
/* Applied to body or page wrapper */
background-image: radial-gradient(ellipse 60% 40% at 50% -10%, rgba(124,106,245,0.07) 0%, transparent 100%);
```

### Border / Divider Colors

| Use Case | Value | Tailwind Equivalent |
|---|---|---|
| Default card border | `rgba(255,255,255,0.06)` | `border-white/[0.06]` |
| Sidebar divider | `rgba(255,255,255,0.05)` | `border-white/[0.05]` |
| Input border | `rgba(255,255,255,0.08)` | `border-white/[0.08]` |
| Input border (focus) | `rgba(124,106,245,0.40)` | `border-accent/40` |
| Card border (hover) | `rgba(124,106,245,0.25)` | `border-accent-border` |
| Card border (active) | `rgba(124,106,245,0.45)` | custom |
| Section divider | `#2a2a35` | `border-surface-border` |
| Success card border | `rgba(34,197,94,0.20)` | `border-status-success/20` |
| Error card border | `rgba(239,68,68,0.20)` | `border-status-error/20` |

### Shadow Definitions

```js
boxShadow: {
  // Existing — keep
  'glow-accent': '0 0 20px rgba(124, 106, 245, 0.20)',
  'glow-sm':     '0 0 8px rgba(124, 106, 245, 0.15)',
  'surface':     '0 1px 3px rgba(0,0,0,0.40), 0 1px 2px rgba(0,0,0,0.30)',
  'surface-md':  '0 4px 12px rgba(0,0,0,0.50), 0 2px 4px rgba(0,0,0,0.40)',
  'surface-lg':  '0 8px 32px rgba(0,0,0,0.60), 0 4px 8px rgba(0,0,0,0.50)',
  'modal':       '0 20px 60px rgba(0,0,0,0.80), 0 4px 16px rgba(0,0,0,0.60)',
  // New
  'card-hover':  '0 8px 24px rgba(0,0,0,0.50), 0 0 0 1px rgba(124,106,245,0.15)',
  'glow-green':  '0 0 12px rgba(34,197,94,0.18)',
  'glow-red':    '0 0 12px rgba(239,68,68,0.18)',
  'sidebar':     '1px 0 0 rgba(255,255,255,0.04)',
}
```

---

## 3. Component Design Specifications

### 3.1 Layout — Sidebar Navigation

**Architecture change:** Replace the current sticky top header with a fixed left sidebar. This is a breaking layout change — `Layout.jsx` needs to be rewritten.

**Sidebar structure:**
```
[Fixed left sidebar, 240px wide]
├── Logo / Brand lockup (top, 56px tall header area)
├── Nav items (scrollable middle)
│   ├── Dashboard
│   ├── New Submission  (editor+)
│   ├── Team            (admin only)
│   └── Settings        (admin only)
├── [spacer flex-1]
└── User profile area (bottom, 64px)
    ├── Avatar circle (initials)
    ├── Name + role
    └── Sign out icon button
```

**Sidebar visual spec:**
- Background: `bg-surface-secondary` (`#16161a`)
- Right border: `border-r border-white/[0.05]`
- Shadow: `shadow-sidebar` (`1px 0 0 rgba(255,255,255,0.04)`)
- Width: `w-60` (240px) on desktop, `w-14` (56px) on md screens, hidden on mobile
- Position: `fixed left-0 top-0 bottom-0 z-40`

**Brand lockup (top of sidebar):**
```
Height: h-14 (56px)
Padding: px-4
Content: [logo icon 32px] + [text "ContentFlow" text-sm font-semibold]
Bottom border: border-b border-white/[0.05]
Logo icon: w-8 h-8 rounded-xl bg-gradient-accent shadow-glow-sm
```

**Nav items:**
```
Container: flex flex-col gap-0.5 px-3 py-4
```

Each nav item — default state:
```
className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium
           text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]
           transition-all duration-150 group"
```

Icon (in nav item):
```
className="w-[18px] h-[18px] flex-shrink-0 text-text-tertiary
           group-hover:text-text-secondary transition-colors"
```

Each nav item — active state:
```
className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium
           text-accent bg-accent-muted relative
           before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2
           before:w-0.5 before:h-4 before:bg-accent before:rounded-r-full"
```

Active icon:
```
className="w-[18px] h-[18px] flex-shrink-0 text-accent"
```

**Active state glow (optional, premium touch):**
```css
/* Add box-shadow on the active nav item */
box-shadow: 0 0 0 1px rgba(124,106,245,0.10), inset 0 0 12px rgba(124,106,245,0.06);
```

**Section label above nav groups (if multiple groups):**
```
className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary/60"
```

**User profile area (bottom of sidebar):**
```
Container: border-t border-white/[0.05] p-3
Layout: flex items-center gap-3

Avatar: w-8 h-8 rounded-full bg-accent-muted border border-accent-border
        flex items-center justify-center text-xs font-semibold text-accent

Name: text-[13px] font-medium text-text-primary leading-none
Role: text-[11px] text-text-tertiary capitalize mt-0.5

Sign out button: ml-auto w-7 h-7 rounded-lg flex items-center justify-center
                 text-text-tertiary hover:text-text-primary hover:bg-white/[0.06]
                 transition-all duration-150
```

**Main content area (right of sidebar):**
```
className="ml-60 min-h-screen bg-surface"
/* On md screens: ml-14 */
/* On mobile: ml-0, sidebar becomes bottom tab bar */
```

Inner content wrapper:
```
className="max-w-[900px] mx-auto px-8 py-8"
```

**Collapsible behavior (md screens, 768-1024px):**
- Sidebar collapses to `w-14` (56px)
- Hide all text labels, show only icons
- Logo shrinks to icon-only version (centered)
- User area shows only avatar
- Nav items: icon only, centered, with tooltip on hover

---

### 3.2 Page Header Pattern

Every page has a consistent header block at the top of the main content:

```
Layout: flex items-start justify-between mb-8 pb-6 border-b border-surface-border
```

Left side:
```
Breadcrumb (optional): text-[11px] text-text-tertiary uppercase tracking-wider mb-2
                        e.g. "Dashboard" or "Submissions / Detail"

Page title: text-[22px] font-semibold text-text-primary tracking-tight leading-none

Subtitle: text-sm text-text-tertiary mt-1.5
```

Right side (action buttons, right-aligned):
```
flex items-center gap-2
```

---

### 3.3 Dashboard Page

#### Stats Bar (NEW — add this above the submission list)

Four glass-morphism stat cards in a 4-column grid. Each displays an aggregate count with a colored icon and gradient background.

**Stats to display:**
1. Total Submissions — purple icon, purple gradient
2. Drafts Pending Review — blue icon, blue gradient
3. Published — green icon, green gradient
4. Scheduled — amber icon, amber gradient

**Stat card structure:**
```jsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <StatCard ... />
  ...
</div>
```

Each `StatCard`:
```
Outer wrapper:
className="relative overflow-hidden rounded-2xl border border-white/[0.07]
           bg-surface-secondary p-5 transition-all duration-200
           hover:border-white/[0.12] hover:shadow-surface-md group"

Gradient overlay (inline style, color varies per card):
style={{ background: 'linear-gradient(135deg, rgba(124,106,245,0.06) 0%, transparent 60%)' }}
position: absolute inset-0 pointer-events-none

Icon container:
className="w-9 h-9 rounded-xl flex items-center justify-center mb-4
           bg-accent-muted border border-accent-border"
(Colors swap per stat: success-bg/border for Published, info-bg/border for Pending, etc.)

Icon: w-4.5 h-4.5 text-accent (or text-status-success etc.)

Count value:
className="text-2xl font-mono font-medium text-text-primary tabular-nums leading-none"

Label:
className="text-xs text-text-tertiary mt-1 font-medium"
```

#### Search Bar

Elevated from the current `input-field` class to a premium command-bar aesthetic:

```
Container: relative mb-6

Input element:
className="w-full h-10 pl-10 pr-4
           bg-surface-secondary border border-white/[0.07] rounded-xl
           text-sm text-text-primary placeholder:text-text-tertiary
           focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10
           focus:bg-surface-tertiary
           transition-all duration-150"

Search icon (left):
className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary
           pointer-events-none"

Keyboard shortcut hint (right, shown when empty):
className="absolute right-3 top-1/2 -translate-y-1/2
           hidden sm:flex items-center gap-0.5
           text-[10px] text-text-tertiary/50 font-mono"
Content: "⌘K" — (visual only, no actual keyboard handling required unless desired)
```

#### Filter Pills

Replace the current button-style filters with pill-style filters:

```
Container: flex items-center gap-1.5 flex-wrap

Each pill — inactive:
className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
           bg-surface-secondary border border-white/[0.06] text-text-tertiary
           hover:text-text-secondary hover:border-white/[0.10]
           cursor-pointer transition-all duration-150 select-none"

Each pill — active:
className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
           bg-accent-muted border border-accent-border text-accent
           cursor-pointer transition-all duration-150 select-none"

Count bubble (inside pill):
Inactive: className="text-text-tertiary/60"
Active:   className="bg-accent/20 text-accent px-1 py-0 rounded-full font-mono"
```

#### Submission List Cards

The existing list uses a `card` class — upgrade each card to a more visually distinct, scannable item.

Each submission card:
```
Outer:
className="group relative flex items-center gap-4 p-4 rounded-xl
           bg-surface-secondary border border-white/[0.06]
           hover:border-accent/20 hover:bg-surface-elevated
           hover:-translate-y-[1px] hover:shadow-card-hover
           active:translate-y-0
           transition-all duration-200 cursor-pointer"

Left — Input type icon (32x32 circle):
  URL icon: bg-status-info-bg border border-status-info/20 text-status-info
  Idea icon: bg-accent-muted border border-accent-border text-accent
  YouTube icon: bg-rose-500/10 border border-rose-500/20 text-rose-400
  Icon size: w-4 h-4

Center content (flex-1):
  Title / content preview:
  className="text-sm font-medium text-text-primary leading-snug line-clamp-1 mb-1"

  Meta row:
  className="flex items-center gap-3 text-xs text-text-tertiary"
  Content: [StatusBadge] · [date relative, e.g. "3 days ago"] · [word count if available]

Right — chevron:
className="w-4 h-4 text-text-tertiary/40 group-hover:text-text-tertiary
           transition-colors flex-shrink-0"
(Show > chevron on hover)
```

**Loading skeleton cards** (enhanced):
```
className="flex items-center gap-4 p-4 rounded-xl bg-surface-secondary border border-white/[0.06]"

Elements:
  Circle skeleton: w-8 h-8 rounded-full skeleton
  Title skeleton: h-4 w-48 skeleton
  Meta skeleton: h-3 w-32 skeleton mt-1
```

---

### 3.4 New Submission Page

**Page layout:** Centered narrow form, max-width 640px. Generous whitespace. The form should feel spacious and calm, not cramped.

```
Page wrapper: max-w-[640px] mx-auto
```

**Section:** Page header (title + subtitle only, no action button on right)

**Form card:**
```
className="bg-surface-secondary border border-white/[0.07] rounded-2xl p-8 shadow-surface-md"
```

#### Input Mode Toggle (Segmented Control)

The current tab toggle is close — elevate it:

```
Container:
className="flex rounded-xl bg-surface-tertiary border border-white/[0.06] p-1 gap-1 relative"

Animated indicator (absolutely positioned, moves between buttons):
className="absolute inset-y-1 rounded-lg bg-surface-elevated border border-white/[0.08]
           shadow-surface transition-all duration-200 ease-out"
Width: 50% per option. Translate via JS state.

Each button (on top of indicator):
className="relative flex-1 flex items-center justify-center gap-2
           px-4 py-2 rounded-lg text-[13px] font-medium
           transition-colors duration-150 select-none"

Inactive text: text-text-tertiary hover:text-text-secondary
Active text: text-text-primary

Icons: w-3.5 h-3.5 (slightly smaller, refined)
```

For three modes (idea / url / youtube — if YouTube is planned):
- Each button takes 33.33% width
- Indicator slides to 0%, 33%, 66% based on selected index

#### Textarea (Idea Mode)

```
Label:
className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wider"

Helper text:
className="text-xs text-text-tertiary mb-3 leading-relaxed"

Textarea:
className="w-full px-4 py-3
           bg-surface-tertiary text-text-primary text-sm leading-relaxed
           border border-white/[0.08] rounded-xl
           placeholder:text-text-tertiary/60
           focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40
           focus:bg-surface-tertiary
           resize-y min-h-[160px]
           transition-all duration-150"

Error state: border-status-error/50 focus:ring-status-error/20

Character counter:
className="flex items-center justify-between mt-2"
Left: error message in text-xs text-status-error (or empty span)
Right: "{count} / {MAX}" in text-xs font-mono
  - Default: text-text-tertiary/50
  - At 90%: text-status-warning font-medium (color transition, no bold flash)
  - At 100%+: text-status-error font-semibold + shake animation on the counter
```

#### URL Input (URL Mode)

```
className="relative"

Input:
className="w-full h-11 pl-11 pr-4
           bg-surface-tertiary text-text-primary text-sm
           border border-white/[0.08] rounded-xl
           placeholder:text-text-tertiary/50
           focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40
           transition-all duration-150"

Left icon (link icon):
className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none"

Right — validation indicator (shown when URL is typed):
  Valid: w-4 h-4 text-status-success (checkmark icon)
  Invalid: w-4 h-4 text-status-error (x-circle icon)
className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-all duration-200"

Valid input border: border-status-success/30
Invalid input border: border-status-error/40
```

#### Generate Drafts CTA Button

This is the primary action — make it unmissable:

```
className="w-full h-12 flex items-center justify-center gap-2.5
           bg-gradient-to-r from-[#7c6af5] via-[#8b78f6] to-[#9585f8]
           text-white text-[14px] font-semibold rounded-xl
           border border-accent/30
           shadow-glow-sm
           hover:shadow-glow-accent hover:scale-[1.01]
           active:scale-[0.99]
           disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100
           transition-all duration-150"

Icon: w-[18px] h-[18px] (send/spark icon, slightly larger than nav icons)
```

#### Loading State: Progress Steps

When `isSubmitting` is true, replace the simple spinner with a multi-step progress indicator:

```jsx
{/* Shown below the form while submitting */}
<div className="mt-6 animate-fade-in">
  {/* Progress bar */}
  <div className="h-0.5 bg-surface-border rounded-full overflow-hidden mb-4">
    <div
      className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all duration-700"
      style={{ width: `${progressPercent}%` }} // animate 0→25→50→75→90 at timed intervals
    />
  </div>

  {/* Step list */}
  <div className="space-y-2">
    {steps.map((step, i) => (
      <div key={i} className="flex items-center gap-3 text-xs">
        {/* Icon: pending = circle, current = spinning, done = checkmark */}
        <div className="w-4 h-4 flex-shrink-0">...</div>
        <span className={step.done ? 'text-text-tertiary line-through' : step.active ? 'text-text-primary' : 'text-text-tertiary/40'}>
          {step.label}
        </span>
      </div>
    ))}
  </div>
</div>
```

Steps array (timed with `setInterval`):
1. "Extracting content..." (0–8s)
2. "Analyzing key themes..." (8–18s)
3. "Generating Draft 1..." (18–28s)
4. "Generating Draft 2..." (28–38s)
5. "Generating Draft 3..." (38s+)

Step icon states:
- Pending: `w-4 h-4 rounded-full border border-white/[0.15]`
- Active: spinning loader, `border-t-accent`
- Done: checkmark circle in `text-status-success`

---

### 3.5 Submission Detail Page

#### Submission Info Card (top)

```
className="bg-surface-secondary border border-white/[0.07] rounded-2xl p-6 shadow-surface"

Header row (flex justify-between):
  Left: "Submission Details" text-[15px] font-semibold + StatusBadge below
  Right: ID badge — font-mono text-xs bg-surface-tertiary px-2.5 py-1 rounded-lg border border-white/[0.08]

Meta grid (4 columns):
  className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-white/[0.06]"
  Each cell:
    Label: text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1
    Value: text-sm font-medium text-text-primary

Input content block:
  className="mt-4 pt-4 border-t border-white/[0.06]"
  Label: text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-2
  Content block: bg-surface-tertiary border border-white/[0.06] rounded-xl px-4 py-3.5
                 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap
                 max-h-44 overflow-y-auto font-mono text-[13px]
```

#### Draft Selection Section (pending_review status)

Change from a vertical stacked list to a **3-column horizontal grid** on desktop:

```
Container: grid grid-cols-1 md:grid-cols-3 gap-4
```

Each `DraftCard` — elevated design:

```
Outer card:
className="relative flex flex-col bg-surface-secondary border border-white/[0.07]
           rounded-2xl p-5 transition-all duration-200
           hover:border-accent/25 hover:-translate-y-[2px] hover:shadow-card-hover
           group cursor-pointer"

Header row:
  Left: draft number badge + angle badge
  Right: word count (font-mono text-xs text-text-tertiary)

Draft number badge:
className="w-6 h-6 rounded-full bg-surface-tertiary border border-white/[0.08]
           flex items-center justify-center text-[10px] font-semibold text-text-tertiary font-mono"
Content: "1", "2", "3"

Angle badge (colored per angle):
  Contrarian:       bg-rose-500/10 text-rose-400 border border-rose-500/15
  How-To:           bg-emerald-500/10 text-emerald-400 border border-emerald-500/15
  Data & Trends:    bg-violet-500/10 text-violet-400 border border-violet-500/15
  Thought Leadership: bg-amber-500/10 text-amber-400 border border-amber-500/15
  Case Study:       bg-cyan-500/10 text-cyan-400 border border-cyan-500/15
  Listicle:         bg-pink-500/10 text-pink-400 border border-pink-500/15

  className="badge border text-[11px] px-2 py-0.5"

Title:
className="text-sm font-semibold text-text-primary leading-snug mt-3 mb-3"

Content preview:
className="text-xs text-text-tertiary leading-relaxed flex-1"
Max ~4 lines before "Read more" toggle

Expand toggle:
className="text-xs text-accent hover:text-accent-hover font-medium mt-2 transition-colors"

Divider before CTA:
className="border-t border-white/[0.06] mt-4 pt-4"

Select button (default):
className="w-full h-9 flex items-center justify-center gap-2
           bg-surface-tertiary border border-white/[0.08] rounded-xl
           text-[13px] font-medium text-text-secondary
           hover:bg-accent-muted hover:border-accent-border hover:text-accent
           transition-all duration-150"

Select button (selected/confirmed state):
className="w-full h-9 flex items-center justify-center gap-2
           bg-status-success-bg border border-status-success/25 rounded-xl
           text-[13px] font-medium text-status-success"
Content: [checkmark icon] + "Selected"

Select button (loading):
Same as default but with spinner + "Selecting..." text
```

#### Adapted Content Section — Tab Layout

Replace the current stacked vertical layout (LinkedIn card → X card → Newsletter card) with a **tab system**:

```
Tab bar:
className="flex items-center gap-1 border-b border-white/[0.06] mb-6"

Each tab button — inactive:
className="flex items-center gap-2 px-4 py-3 text-[13px] font-medium
           text-text-tertiary border-b-2 border-transparent
           hover:text-text-secondary hover:border-white/[0.15]
           transition-all duration-150 -mb-px"

Each tab button — active:
className="flex items-center gap-2 px-4 py-3 text-[13px] font-medium
           text-text-primary border-b-2 border-accent
           -mb-px"

Tab icons (small, 14px):
  LinkedIn: LinkedIn SVG icon, text-status-info when active
  X:        X SVG icon, text-text-primary when active
  Newsletter: envelope icon, text-status-success when active

Tab panel (animated on switch):
className="animate-fade-in"
```

**Tab panel contents — LinkedIn:**
```
Character/word counter bar (above textarea):
className="flex items-center justify-between mb-2 text-xs"
Left: "LinkedIn Post" text-text-tertiary
Right: "{count} / 3,000 · {words} words" — font-mono, color changes at 90% and 100%

Textarea:
className="w-full px-4 py-3 bg-surface-tertiary border border-white/[0.08] rounded-xl
           text-sm text-text-secondary leading-relaxed resize-y min-h-[180px]
           focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40
           transition-all duration-150"

Platform preview (optional, below textarea):
Mini LinkedIn card mockup — show the text in a gray card with LinkedIn-style header
className="mt-3 rounded-xl border border-white/[0.06] bg-surface-tertiary p-4 text-[12px]"
```

**Tab panel contents — X / Twitter:**
```
Similar pattern, limit = 280 chars
Show character count prominently — ring gauge (circular SVG) when near limit

Over-limit state: red ring + text-status-error counter
```

**Tab panel contents — Newsletter:**
```
Subject line field:
  Label: "Subject Line" text-[11px] uppercase tracking-wider text-text-tertiary mb-1.5
  Input: standard input-field but with left icon (envelope) and character count on right

Content field:
  Identical to LinkedIn textarea but taller (min-h-[240px])
  Word count shown below: "{n} words"
```

**Save + Publish row (below tab content):**
```
className="flex items-center justify-between pt-5 mt-5 border-t border-white/[0.06]"

Left side:
  Save button (primary, disabled when no changes)
  Discard button (ghost, only shown when hasUnsavedChanges)
  "Unsaved changes" badge (amber, only when dirty)

Right side (admin only):
  "Publish to LinkedIn" ghost button
  "Publish to X" ghost button
  "Publish to Newsletter" ghost button
  OR
  "Publish All" primary button with gradient
```

**Publish confirmation dialog:**
```
Small modal (not full overlay):
className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"

Backdrop: bg-black/60 backdrop-blur-sm

Dialog:
className="bg-surface-secondary border border-white/[0.10] rounded-2xl p-6
           shadow-modal w-full max-w-sm animate-scale-in"

Title: "Publish to {Platform}?" text-base font-semibold
Body: "This will send the content to your connected {Platform} account."
Buttons: [Cancel ghost] [Publish primary]
```

---

### 3.6 Settings Page — Platform Connection Cards

**Grid layout:** Always 3 columns (same as current, but cards are elevated)

```
Grid: className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
```

Each `PlatformCard`:
```
Outer (disconnected):
className="relative flex flex-col bg-surface-secondary border border-white/[0.07]
           rounded-2xl p-5 transition-all duration-200
           hover:border-white/[0.12]"

Outer (connected):
className="relative flex flex-col bg-surface-secondary rounded-2xl p-5
           border border-status-success/20
           shadow-[0_0_0_1px_rgba(34,197,94,0.08),0_0_20px_rgba(34,197,94,0.04)]
           transition-all duration-200"

Outer (expired):
className="relative flex flex-col bg-surface-secondary border border-status-warning/20
           rounded-2xl p-5"

Top row (logo + status):
className="flex items-start justify-between mb-4"

Platform logo container:
className="w-11 h-11 rounded-xl flex items-center justify-center"
  LinkedIn: bg-[#0077b5]/15 border border-[#0077b5]/20, icon text-[#0a91c0]
  X:        bg-white/[0.06] border border-white/[0.10], icon text-text-primary
  Newsletter: bg-status-success-bg border border-status-success/20, icon text-status-success

Status indicator (top-right):
  Connected: w-2 h-2 rounded-full bg-status-success shadow-glow-green
  Disconnected: w-2 h-2 rounded-full bg-surface-border
  Expired: w-2 h-2 rounded-full bg-status-warning

Below logo:
Platform name: text-[15px] font-semibold text-text-primary
Status text (connected): text-xs text-text-tertiary mt-0.5 — "@username" or email

Meta info (connected state only):
  Token expiry: text-xs text-text-tertiary — "Expires in 28 days"
  If expiring soon: text-status-warning

CTA button row (bottom of card, mt-auto):
  Not connected: btn-secondary with "Connect" label
  Connected: btn-danger with "Disconnect" label (subtle red ghost button)
  Expired: btn-primary to re-connect + warning text above
```

---

### 3.7 Team Page

#### Member List

Change from a table to a clean card list (more premium):

```
Container: className="space-y-2"

Each member row card:
className="flex items-center gap-4 px-5 py-4 rounded-xl
           bg-surface-secondary border border-white/[0.06]
           hover:border-white/[0.10] transition-all duration-150"

Avatar circle:
className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center
           text-sm font-semibold"
  Active: bg-accent-muted border border-accent-border text-accent
  Inactive: bg-surface-elevated border border-surface-border text-text-tertiary
  Show initials from display_name or email

Member info (flex-1):
  Name: text-sm font-medium text-text-primary
  Email: text-xs text-text-tertiary mt-0.5

Role badge:
  Admin: bg-accent-muted border border-accent-border text-accent text-[11px]
  Editor: bg-status-info-bg border border-status-info/20 text-status-info text-[11px]
  Viewer: bg-surface-elevated border border-white/[0.06] text-text-tertiary text-[11px]

Status badge:
  Active: green dot + "Active" text-[11px] text-status-success
  Invited: amber dot + "Invited" text-[11px] text-status-warning (pulsing dot)
  Inactive: gray dot + "Inactive" text-[11px] text-text-tertiary

Joined date:
  text-xs text-text-tertiary font-mono
  (hidden on small screens)

Actions (admin only — right side):
  Role dropdown: btn-ghost text-xs with chevron
  Deactivate/Reactivate: btn-ghost text-xs
  (Shown in a dropdown menu or directly as small ghost buttons)
```

#### Invite Modal

```
Backdrop: fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4

Modal:
className="bg-surface-secondary border border-white/[0.10] rounded-2xl shadow-modal
           w-full max-w-md p-7 animate-scale-in"

Header: text-[17px] font-semibold text-text-primary + close button (top-right)

Body spacing: space-y-5

Email field: standard input-field with label above

Role selector:
  Label: standard label pattern
  Custom select or styled native select:
  className="input-field appearance-none pr-10 cursor-pointer"
  Options: Viewer, Editor, Admin
  Right chevron icon: absolute right-3

Submit button: btn-primary w-full h-11 mt-2
  "Send Invitation" — after click becomes loading state
  Success state: show a green confirmation message, not a new screen
```

---

## 4. Micro-interactions & Animations

### Button Interactions
```css
/* All interactive buttons */
hover: transform: scale(1.015); box-shadow increases
active: transform: scale(0.985);

/* Gradient CTA (Generate Drafts) */
hover: box-shadow: 0 0 24px rgba(124,106,245,0.30), 0 8px 16px rgba(0,0,0,0.30);
       transform: translateY(-1px);
active: transform: translateY(0);
```

### Card Hover
```css
.card-interactive:hover {
  transform: translateY(-2px);
  border-color: rgba(124,106,245,0.20);
  box-shadow: 0 8px 24px rgba(0,0,0,0.50), 0 0 0 1px rgba(124,106,245,0.12);
}
```

### Page Transitions
Each page should wrap content in:
```jsx
<div className="animate-slide-up">
  {/* page content */}
</div>
```

The existing `slideUp` keyframe (`translateY(8px) → 0`) is perfect. Make sure duration is `0.25s` with `cubic-bezier(0.16, 1, 0.3, 1)`.

### Loading Skeletons

Enhanced shimmer:
```css
/* Enhanced shimmer — more visible on dark backgrounds */
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.03) 0px,
    rgba(255,255,255,0.07) 200px,
    rgba(255,255,255,0.03) 400px
  );
  background-size: 800px 100%;
  animation: shimmer 1.6s ease-in-out infinite;
  border-radius: 8px;
}
```

Use skeleton in place of all real content during loading — not just inline, but full card shapes.

### Toast Notifications

Elevate the existing Toast:

```
Position: fixed bottom-5 right-5 z-[100]
Stack direction: flex flex-col-reverse gap-2 (newest on bottom)

Each toast:
className="pointer-events-auto flex items-start gap-3 px-4 py-3.5
           rounded-xl border shadow-surface-lg backdrop-blur-sm
           min-w-[280px] max-w-[360px]
           transition-all duration-300"

Entry: translateX(100%) → translateX(0) + fade in
Exit: translateX(100%) + fade out

Progress bar (bottom of each toast):
height: 2px, positioned absolute bottom-0 left-0
background: matches toast type color
Animates from width: 100% → 0% over the toast duration

Types:
  success: bg-surface-secondary/95 border-status-success/25
           progress bar: bg-status-success
  error:   bg-surface-secondary/95 border-status-error/25
           progress bar: bg-status-error
  warning: bg-surface-secondary/95 border-status-warning/25
           progress bar: bg-status-warning
  info:    bg-surface-secondary/95 border-white/[0.08]
           progress bar: bg-accent
```

Add `toast-progress` keyframe to tailwind config:
```js
toastProgress: {
  '0%': { width: '100%' },
  '100%': { width: '0%' },
}
```

### Modal / Dialog Animations
```css
/* Backdrop */
animation: fadeIn 0.15s ease-out;

/* Modal panel */
animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
```

Existing `scaleIn` keyframe works: `scale(0.97) → scale(1)`.

### Generating State (SubmissionDetail)

The spinning circle is fine — add ambient pulsing rings:
```jsx
<div className="relative w-16 h-16 mx-auto mb-6">
  {/* Outer pulse rings */}
  <div className="absolute inset-0 rounded-full border border-accent/10 animate-ping" style={{ animationDuration: '2s' }} />
  <div className="absolute inset-2 rounded-full border border-accent/15 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
  {/* Main spinner */}
  <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
  {/* Center dot */}
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="w-2 h-2 rounded-full bg-accent shadow-glow-sm" />
  </div>
</div>
```

### Status Dot Pulse (Generating / Processing badges)

The existing `animate-ping` on StatusBadge dots is correct — keep it.

---

## 5. Responsive Behavior

### Breakpoints (Tailwind defaults)
- `sm`: 640px (phones in landscape / small tablets)
- `md`: 768px (tablets)
- `lg`: 1024px (laptops)
- `xl`: 1280px (desktops)

### Sidebar Responsive States

**Desktop (lg+, ≥1024px):**
- Full sidebar: `w-60` (240px), always visible
- All labels visible
- User profile fully expanded (name + role + avatar + sign out)

**Tablet (md to lg, 768-1024px):**
- Collapsed sidebar: `w-14` (56px)
- Only icons shown (no text labels)
- Logo: icon only, centered
- User area: avatar only
- Nav items: icon centered, with tooltip `title` attribute
- Main content: `ml-14`

**Mobile (<768px):**
- Sidebar: hidden (`hidden md:flex`)
- Bottom navigation bar: `fixed bottom-0 left-0 right-0 z-40`
  ```
  className="md:hidden fixed bottom-0 left-0 right-0 z-40
             bg-surface-secondary/90 backdrop-blur-md
             border-t border-white/[0.06]
             flex items-center justify-around px-4 py-2
             safe-area-pb"
  ```
  Each bottom nav item: icon + small label below, 44px tap target minimum
- Main content: `ml-0`, full width with `px-4` padding
- Add `pb-20` to main content to avoid overlap with bottom nav

### Cards on Mobile

- Stats grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Submission cards: full width, same design
- Draft selection grid: `grid-cols-1 md:grid-cols-3`
- Platform cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Team member rows: hide "Joined" date column below `sm`

### Tabs on Mobile

```
className="flex items-center gap-0.5 border-b border-white/[0.06] overflow-x-auto
           scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
```

Tabs scroll horizontally, no wrap. Min tab width: 80px.

---

## 6. Exact Tailwind Class Strings

### 6.1 `Layout.jsx` — Sidebar Structure

```jsx
{/* Root layout wrapper */}
<div className="flex min-h-screen bg-surface">

  {/* Sidebar */}
  <aside className="fixed left-0 top-0 bottom-0 w-60 md:w-14 lg:w-60 z-40 flex flex-col
                    bg-surface-secondary border-r border-white/[0.05]">

    {/* Brand */}
    <div className="flex items-center gap-3 h-14 px-4 border-b border-white/[0.05] flex-shrink-0">
      <div className="w-8 h-8 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow-sm flex-shrink-0">
        {/* icon */}
      </div>
      <span className="text-[13px] font-semibold text-text-primary tracking-tight lg:block md:hidden">
        ContentFlow
      </span>
    </div>

    {/* Nav */}
    <nav className="flex flex-col gap-0.5 px-3 py-4 flex-1 overflow-y-auto">
      {/* Nav link — inactive */}
      <a className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium
                    text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]
                    transition-all duration-150 group">
        <svg className="w-[18px] h-[18px] flex-shrink-0 transition-colors" />
        <span className="lg:block md:hidden">Dashboard</span>
      </a>

      {/* Nav link — active */}
      <a className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium
                    text-accent bg-accent-muted relative
                    shadow-[inset_0_0_12px_rgba(124,106,245,0.06)]">
        {/* Left accent bar */}
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-accent rounded-r-full" />
        <svg className="w-[18px] h-[18px] flex-shrink-0 text-accent" />
        <span className="lg:block md:hidden">Dashboard</span>
      </a>
    </nav>

    {/* User area */}
    <div className="border-t border-white/[0.05] p-3 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-accent-muted border border-accent-border
                        flex items-center justify-center text-xs font-semibold text-accent flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0 lg:block md:hidden">
          <p className="text-[13px] font-medium text-text-primary leading-none truncate">
            {name}
          </p>
          <p className="text-[11px] text-text-tertiary capitalize mt-0.5">{role}</p>
        </div>
        <button className="w-7 h-7 rounded-lg flex items-center justify-center
                           text-text-tertiary hover:text-text-primary hover:bg-white/[0.06]
                           transition-all duration-150 lg:flex md:hidden flex-shrink-0">
          {/* sign out icon */}
        </button>
      </div>
    </div>
  </aside>

  {/* Main content */}
  <main className="ml-60 md:ml-14 lg:ml-60 flex-1 min-h-screen">
    <div className="max-w-[900px] mx-auto px-8 py-8">
      {children}
    </div>
  </main>

  {/* Mobile bottom nav */}
  <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40
                  bg-surface-secondary/90 backdrop-blur-md border-t border-white/[0.06]
                  flex items-center justify-around px-2 py-2 pb-safe">
    {/* mobile nav items */}
  </nav>

</div>
```

### 6.2 Stat Card

```jsx
<div className="relative overflow-hidden rounded-2xl border border-white/[0.07]
                bg-surface-secondary p-5 transition-all duration-200
                hover:border-white/[0.12] hover:shadow-surface-md">
  {/* Gradient tint */}
  <div className="absolute inset-0 pointer-events-none"
       style={{ background: 'linear-gradient(135deg, rgba(124,106,245,0.05) 0%, transparent 60%)' }} />

  <div className="relative">
    {/* Icon */}
    <div className="w-9 h-9 rounded-xl bg-accent-muted border border-accent-border
                    flex items-center justify-center mb-4">
      <svg className="w-4 h-4 text-accent" />
    </div>

    {/* Value */}
    <p className="text-2xl font-mono font-medium text-text-primary tabular-nums leading-none">
      {count}
    </p>

    {/* Label */}
    <p className="text-xs text-text-tertiary mt-1.5 font-medium">{label}</p>
  </div>
</div>
```

### 6.3 Submission List Card

```jsx
<Link to={`/submission/${id}`}
  className="group flex items-center gap-4 p-4 rounded-xl
             bg-surface-secondary border border-white/[0.06]
             hover:border-accent/20 hover:bg-surface-elevated
             hover:-translate-y-[1px] hover:shadow-card-hover
             active:translate-y-0 transition-all duration-200">

  {/* Input type icon */}
  <div className="w-9 h-9 rounded-xl bg-accent-muted border border-accent-border
                  flex items-center justify-center flex-shrink-0">
    <svg className="w-4 h-4 text-accent" />
  </div>

  {/* Content */}
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium text-text-primary leading-snug line-clamp-1">
      {preview}
    </p>
    <div className="flex items-center gap-3 mt-1">
      <StatusBadge status={status} />
      <span className="text-xs text-text-tertiary">{relativeDate}</span>
    </div>
  </div>

  {/* Chevron */}
  <svg className="w-4 h-4 text-text-tertiary/30 group-hover:text-text-tertiary/60
                  transition-colors flex-shrink-0" />
</Link>
```

### 6.4 Search Bar

```jsx
<div className="relative mb-6">
  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4
                  text-text-tertiary pointer-events-none" />
  <input
    type="text"
    placeholder="Search submissions..."
    className="w-full h-10 pl-10 pr-12
               bg-surface-secondary border border-white/[0.07] rounded-xl
               text-sm text-text-primary placeholder:text-text-tertiary
               focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10
               transition-all duration-150"
  />
  <div className="absolute right-3 top-1/2 -translate-y-1/2
                  hidden sm:flex items-center">
    <kbd className="text-[10px] text-text-tertiary/40 font-mono
                    bg-surface-elevated border border-white/[0.05]
                    px-1.5 py-0.5 rounded">⌘K</kbd>
  </div>
</div>
```

### 6.5 Filter Pills

```jsx
{/* Container */}
<div className="flex items-center gap-1.5 flex-wrap">
  {filters.map(f => (
    <button
      key={f.value}
      onClick={() => setFilter(f.value)}
      className={
        filter === f.value
          ? "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer select-none transition-all duration-150 bg-accent-muted border border-accent-border text-accent"
          : "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer select-none transition-all duration-150 bg-surface-secondary border border-white/[0.06] text-text-tertiary hover:text-text-secondary hover:border-white/[0.10]"
      }
    >
      {f.label}
      {count > 0 && (
        <span className={filter === f.value
          ? "bg-accent/20 text-accent px-1 rounded-full font-mono"
          : "text-text-tertiary/60 font-mono"
        }>
          {count}
        </span>
      )}
    </button>
  ))}
</div>
```

### 6.6 Segmented Control (Input Mode Toggle)

```jsx
<div className="relative flex rounded-xl bg-surface-tertiary border border-white/[0.06] p-1">
  {/* Animated indicator */}
  <div
    className="absolute top-1 bottom-1 rounded-lg bg-surface-elevated border border-white/[0.08] shadow-surface
                transition-all duration-200 ease-out pointer-events-none"
    style={{
      left: `calc(${inputMode === 'idea' ? '0' : '50'}% + 4px)`,
      width: 'calc(50% - 4px)',
    }}
  />

  {/* Buttons */}
  {['idea', 'url'].map((mode) => (
    <button
      key={mode}
      type="button"
      onClick={() => setInputMode(mode)}
      className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-2
                  rounded-lg text-[13px] font-medium transition-colors duration-150 select-none
                  ${inputMode === mode ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
    >
      <svg className="w-3.5 h-3.5 flex-shrink-0" />
      {mode === 'idea' ? 'Raw Idea' : 'URL'}
    </button>
  ))}
</div>
```

### 6.7 Generate Drafts Button

```jsx
<button
  type="submit"
  disabled={isSubmitting}
  className="w-full h-12 flex items-center justify-center gap-2.5
             bg-gradient-to-r from-[#7c6af5] via-[#8b78f6] to-[#9585f8]
             text-white text-[14px] font-semibold rounded-xl
             border border-[rgba(124,106,245,0.30)]
             shadow-[0_0_8px_rgba(124,106,245,0.15)]
             hover:shadow-[0_0_24px_rgba(124,106,245,0.30),0_4px_16px_rgba(0,0,0,0.30)]
             hover:-translate-y-px
             active:translate-y-0 active:shadow-glow-sm
             disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0
             transition-all duration-150"
>
  {isSubmitting ? (
    <>
      <svg className="animate-spin h-4 w-4" />
      Generating...
    </>
  ) : (
    <>
      <svg className="w-[18px] h-[18px]" /> {/* send icon */}
      Generate Drafts
    </>
  )}
</button>
```

### 6.8 Draft Card

```jsx
<div className="relative flex flex-col bg-surface-secondary border border-white/[0.07]
                rounded-2xl p-5 transition-all duration-200
                hover:border-accent/25 hover:-translate-y-[2px] hover:shadow-card-hover">

  {/* Header */}
  <div className="flex items-start justify-between gap-3 mb-3">
    <div className="flex items-center gap-2">
      <span className="w-6 h-6 rounded-full bg-surface-tertiary border border-white/[0.08]
                       flex items-center justify-center text-[10px] font-semibold text-text-tertiary font-mono">
        {index + 1}
      </span>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${angleStyle}`}>
        {angle}
      </span>
    </div>
    <span className="text-xs text-text-tertiary font-mono whitespace-nowrap">{words}w</span>
  </div>

  {/* Title */}
  <h3 className="text-sm font-semibold text-text-primary leading-snug mb-3">{title}</h3>

  {/* Content */}
  <div className="text-xs text-text-tertiary leading-relaxed flex-1">
    {/* preview text */}
  </div>

  {/* Expand toggle */}
  {isLong && (
    <button className="mt-2 text-xs text-accent hover:text-accent-hover font-medium transition-colors">
      {expanded ? 'Show less' : 'Read more'}
    </button>
  )}

  {/* CTA */}
  {canSelect && (
    <div className="mt-4 pt-4 border-t border-white/[0.06]">
      <button
        onClick={onSelect}
        disabled={isSelecting}
        className={isSelected
          ? "w-full h-9 flex items-center justify-center gap-2 bg-status-success-bg border border-status-success/25 rounded-xl text-[13px] font-medium text-status-success"
          : "w-full h-9 flex items-center justify-center gap-2 bg-surface-tertiary border border-white/[0.08] rounded-xl text-[13px] font-medium text-text-secondary hover:bg-accent-muted hover:border-accent-border hover:text-accent transition-all duration-150"
        }
      >
        {isSelected ? <><svg className="w-4 h-4" />Selected</> : "Select This Draft"}
      </button>
    </div>
  )}
</div>
```

### 6.9 Adapted Content Tab Bar

```jsx
<div className="flex items-center gap-0.5 border-b border-white/[0.06] mb-6">
  {['linkedin', 'twitter', 'newsletter'].map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={activeTab === tab
        ? "flex items-center gap-2 px-4 py-3 text-[13px] font-medium text-text-primary border-b-2 border-accent -mb-px transition-all duration-150"
        : "flex items-center gap-2 px-4 py-3 text-[13px] font-medium text-text-tertiary border-b-2 border-transparent hover:text-text-secondary hover:border-white/[0.10] -mb-px transition-all duration-150"
      }
    >
      <svg className={`w-3.5 h-3.5 ${activeTab === tab ? tabIconColor[tab] : ''}`} />
      {tabLabels[tab]}
    </button>
  ))}
</div>
```

### 6.10 Platform Card (Settings)

```jsx
{/* Connected state */}
<div className="relative flex flex-col bg-surface-secondary rounded-2xl p-5
                border border-status-success/20
                shadow-[0_0_0_1px_rgba(34,197,94,0.06)]
                transition-all duration-200">

  {/* Top row */}
  <div className="flex items-start justify-between mb-5">
    <div className="w-11 h-11 rounded-xl bg-status-success-bg border border-status-success/20
                    flex items-center justify-center">
      <svg className="w-5 h-5 text-status-success" />
    </div>
    {/* Status dot */}
    <div className="w-2 h-2 rounded-full bg-status-success shadow-glow-green mt-1.5" />
  </div>

  {/* Info */}
  <p className="text-[15px] font-semibold text-text-primary">{platformName}</p>
  <p className="text-xs text-text-tertiary mt-0.5">{accountName}</p>
  <p className="text-xs text-text-tertiary/60 mt-1">Expires in {days} days</p>

  {/* CTA */}
  <button className="mt-auto pt-4 w-full h-8 flex items-center justify-center
                     text-xs font-medium text-status-error/70 hover:text-status-error
                     border border-transparent hover:border-status-error/20
                     hover:bg-status-error-bg rounded-xl transition-all duration-150 mt-4">
    Disconnect
  </button>
</div>
```

### 6.11 Toast Notification

```jsx
{/* Toast item with progress bar */}
<div className={`pointer-events-auto relative flex items-start gap-3 px-4 py-3.5
                 rounded-xl border shadow-surface-lg backdrop-blur-sm overflow-hidden
                 min-w-[280px] max-w-[360px] transition-all duration-300
                 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'}
                 ${toastBorderStyles[type]}`}>
  {/* Progress bar */}
  <div className="absolute bottom-0 left-0 h-[2px] rounded-full"
       style={{
         width: '100%',
         background: progressColor[type],
         animation: `toastProgress ${duration}ms linear forwards`,
       }} />

  {/* Icon */}
  {ICONS[type]}

  {/* Message */}
  <p className="text-sm text-text-primary flex-1 leading-relaxed">{message}</p>

  {/* Close */}
  <button onClick={() => onRemove(id)}
          className="flex-shrink-0 text-text-tertiary/50 hover:text-text-primary transition-colors mt-0.5">
    <svg className="w-3.5 h-3.5" />
  </button>
</div>
```

### 6.12 Login Page

```jsx
{/* Page */}
<div className="min-h-screen bg-surface flex items-center justify-center px-4"
     style={{
       backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,106,245,0.10) 0%, transparent 100%)',
     }}>

  <div className="w-full max-w-[360px] animate-slide-up">

    {/* Brand */}
    <div className="flex flex-col items-center mb-10">
      <div className="w-14 h-14 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-glow-accent mb-5">
        <svg className="w-7 h-7 text-white" />
      </div>
      <h1 className="text-[20px] font-semibold text-text-primary tracking-tight">ContentFlow</h1>
      <p className="text-xs text-text-tertiary mt-1.5">by Fetemi Marketing</p>
    </div>

    {/* Card */}
    <div className="bg-surface-secondary border border-white/[0.08] rounded-2xl p-7 shadow-surface-lg">
      <h2 className="text-[15px] font-semibold text-text-primary mb-1">Sign in</h2>
      <p className="text-sm text-text-tertiary mb-6">Enter your email to receive a magic link.</p>

      {/* Form */}
      <form className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
            Email address
          </label>
          <input
            type="email"
            className="w-full h-11 px-3.5
                       bg-surface-tertiary border border-white/[0.08] rounded-xl
                       text-sm text-text-primary placeholder:text-text-tertiary/60
                       focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10
                       transition-all duration-150"
          />
        </div>

        <button className="w-full h-11 flex items-center justify-center
                           bg-gradient-to-r from-[#7c6af5] to-[#9585f8]
                           text-white text-[13px] font-semibold rounded-xl
                           border border-accent/25 shadow-glow-sm
                           hover:shadow-glow-accent hover:-translate-y-px
                           active:translate-y-0
                           disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none
                           transition-all duration-150">
          Send Magic Link
        </button>
      </form>
    </div>

    <p className="text-center text-xs text-text-tertiary/50 mt-5">
      No password required — secure magic link via email.
    </p>
  </div>
</div>
```

### 6.13 StatusBadge (refined)

Existing implementation is solid. One refinement — increase badge padding slightly:

```jsx
{/* Before */}
<span className={`badge border ${config.bg} ${config.color} ${config.border}`}>

{/* After — add text-[11px] and slightly more refined sizing */}
<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                  text-[11px] font-medium border leading-none
                  ${config.bg} ${config.color} ${config.border}`}>
```

---

## 7. Tailwind Config Updates Required

Add these to `tailwind.config.js`:

```js
theme: {
  extend: {
    // Add to existing colors:
    colors: {
      surface: {
        // ... existing ...
        'border-strong': '#3a3a48',
      },
      accent: {
        // ... existing ...
        'muted-hover': 'rgba(124, 106, 245, 0.18)',
        'border-hover': 'rgba(124, 106, 245, 0.45)',
      },
    },

    // Add to boxShadow:
    boxShadow: {
      // ... existing ...
      'card-hover': '0 8px 24px rgba(0,0,0,0.50), 0 0 0 1px rgba(124,106,245,0.12)',
      'glow-green': '0 0 12px rgba(34,197,94,0.18)',
      'glow-red':   '0 0 12px rgba(239,68,68,0.18)',
      'sidebar':    '1px 0 0 rgba(255,255,255,0.04)',
    },

    // Add to animation:
    animation: {
      // ... existing ...
      'toast-progress': 'toastProgress linear forwards',
    },

    // Add to keyframes:
    keyframes: {
      // ... existing ...
      toastProgress: {
        '0%':   { width: '100%' },
        '100%': { width: '0%' },
      },
    },
  },
}
```

---

## 8. CSS Updates Required

In `src/index.css`, update or add:

```css
/* Add JetBrains Mono to import */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* Update .card */
.card {
  @apply bg-surface-secondary rounded-2xl border border-white/[0.07] shadow-surface p-6 transition-all duration-200;
}

/* Update .card-interactive */
.card-interactive {
  @apply card cursor-pointer hover:border-accent/20 hover:-translate-y-[2px] hover:shadow-card-hover active:translate-y-0;
}

/* Update .input-field */
.input-field {
  @apply w-full px-3.5 py-2.5
         bg-surface-tertiary text-text-primary text-sm
         border border-white/[0.08] rounded-xl
         placeholder:text-text-tertiary/60
         focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40
         transition-all duration-150;
}

/* Update .nav-link (for sidebar) */
.nav-link {
  @apply flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium
         text-text-tertiary hover:text-text-primary hover:bg-white/[0.04]
         transition-all duration-150;
}

/* Update .nav-link-active */
.nav-link-active {
  @apply flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium
         text-accent bg-accent-muted relative;
}

/* Scrollbar — make thinner */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }

/* Scrollbar none utility */
.scrollbar-none { scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }

/* Line clamp utilities */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

---

## 9. Implementation Priority Order

For the frontend engineer, tackle in this order:

1. **`tailwind.config.js`** — add missing tokens (shadow-card-hover, glow-green, etc.)
2. **`index.css`** — add JetBrains Mono import, update component classes
3. **`Layout.jsx`** — migrate from top nav to sidebar (biggest structural change)
4. **`Dashboard.jsx`** — add stats bar, upgrade cards and search bar
5. **`DraftCard.jsx`** — upgrade card design + selected state
6. **`SubmissionDetail.jsx`** — add tab layout for adapted content, upgrade draft grid
7. **`NewSubmission.jsx`** — upgrade segmented control, add progress steps, upgrade CTA
8. **`Settings.jsx` / `PlatformCard.jsx`** — upgrade connection card designs
9. **`Team.jsx`** — migrate table to card list
10. **`Toast.jsx`** — add slide-in animation and progress bar
11. **`StatusBadge.jsx`** — minor refinement
12. **`Login.jsx`** — minor refinement (already good)

---

*Specification complete. All class strings above are copy-paste ready for Tailwind v3 with the config changes noted. Cross-reference against the existing component files to ensure no logic is lost during visual upgrades.*
