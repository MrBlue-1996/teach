# Top Shelf Service LLC™ — Design Tokens

Source of truth for all UI work. Derived from the official Brand Guidelines v1.0.

## Colors

### Core Palette (Tailwind `ts-*`)

| Token         | Hex       | HSL           | Role                                |
| ------------- | --------- | ------------- | ----------------------------------- |
| `ts-black`    | `#050507` | `240 18% 2%`  | Primary background, dark UI         |
| `ts-charcoal` | `#181A1F` | `223 16% 11%` | Cards, elevated surfaces            |
| `ts-slate`    | `#2C3036` | `216 11% 19%` | Borders, secondary text on dark     |
| `ts-mist`     | `#F3F4F6` | `220 14% 96%` | Light background, body text on dark |

### Accent Colors

| Token      | Hex       | HSL           | Role                                       |
| ---------- | --------- | ------------- | ------------------------------------------ |
| `ts-green` | `#22C55E` | `142 71% 45%` | Primary CTA, success, correct answers      |
| `ts-amber` | `#F59E0B` | `38 92% 50%`  | Warnings, hints, in-progress               |
| `ts-red`   | `#EF4444` | `0 84% 60%`   | Errors, destructive actions, wrong answers |

### Semantic Tokens (CSS custom properties)

| Token                    | Light         | Dark          | Usage                          |
| ------------------------ | ------------- | ------------- | ------------------------------ |
| `--primary`              | `142 71% 45%` | `142 71% 45%` | Primary CTA (TS Accent Green)  |
| `--primary-foreground`   | `0 0% 100%`   | `240 18% 2%`  | Text on primary                |
| `--secondary`            | `220 14% 96%` | `223 16% 11%` | Secondary surfaces             |
| `--secondary-foreground` | `216 11% 19%` | `220 14% 96%` | Text on secondary              |
| `--muted`                | `220 14% 96%` | `223 16% 11%` | Subtle fills, disabled         |
| `--muted-foreground`     | `216 11% 40%` | `215 20% 65%` | Captions, placeholder          |
| `--accent`               | `220 14% 96%` | `223 16% 11%` | Hover / highlight              |
| `--destructive`          | `0 84% 60%`   | `0 84% 60%`   | Errors, delete (TS Red)        |
| `--success`              | `142 71% 45%` | `142 71% 45%` | Correct, completion (TS Green) |
| `--warning`              | `38 92% 50%`  | `38 92% 50%`  | Hints, caution (TS Amber)      |
| `--background`           | `0 0% 100%`   | `240 18% 2%`  | Page bg (white / TS Black)     |
| `--foreground`           | `216 11% 19%` | `220 14% 96%` | Body text (TS Slate / TS Mist) |
| `--border`               | `220 13% 91%` | `223 16% 11%` | Dividers                       |
| `--ring`                 | `142 71% 45%` | `142 71% 45%` | Focus ring (TS Green)          |
| `--radius`               | `0.5rem`      | `0.5rem`      | Border radius base             |

### Teaching Mode Colors

| Context        | Token                      | Notes                           |
| -------------- | -------------------------- | ------------------------------- |
| Correct answer | `--success` (green)        | CheckCircle2 icon, green border |
| Wrong answer   | `--destructive` (red)      | X icon, red border              |
| Hint box       | `--warning` (amber)        | Lightbulb icon, amber border    |
| Explanation    | `--primary` at 20% opacity | MessageSquare icon              |

## Typography

### Font Families

| Role      | Family     | Weights                                 | Tailwind Class |
| --------- | ---------- | --------------------------------------- | -------------- |
| Headlines | Montserrat | 600 (Semi), 700 (Bold), 800 (Extra)     | `font-heading` |
| Body / UI | Inter      | 400 (Regular), 500 (Medium), 600 (Semi) | `font-sans`    |
| Code      | Menlo      | 400                                     | `font-mono`    |

Both Montserrat and Inter are loaded via `next/font/google` in layout.tsx with CSS variables `--font-montserrat` and `--font-inter`.

### Type Scale

| Usage         | Class                                  | Notes                      |
| ------------- | -------------------------------------- | -------------------------- |
| Hero headline | `font-heading text-4xl font-extrabold` | Landing pages              |
| Page heading  | `font-heading text-xl font-semibold`   | Block title                |
| Section label | `text-sm font-medium`                  | "Challenge", "Hint 1 of 3" |
| Body text     | `text-lg leading-relaxed`              | Question text              |
| Caption       | `text-sm text-muted-foreground`        | Timestamps, credits        |
| Code input    | `font-mono text-sm`                    | Commands, tags, paths      |
| Brand name    | `font-heading text-xl font-bold`       | "Top Shelf" wordmark       |

## Spacing & Layout

| Token             | Value         | Usage                      |
| ----------------- | ------------- | -------------------------- |
| `--radius`        | `0.5rem`      | Base border radius         |
| Container max     | `1400px`      | Content container          |
| Container padding | `2rem`        | Desktop horizontal padding |
| Header height     | `h-14` (56px) | Learning mode header       |
| Navigation height | `h-16` (64px) | Landing/app header         |

## Icons

| Context     | Icon                           | Source                   |
| ----------- | ------------------------------ | ------------------------ |
| Challenge   | `Zap`                          | lucide-react             |
| Hint        | `Lightbulb`                    | Hint button / box header |
| Explanation | `MessageSquare`                | Explanation section      |
| Correct     | `CheckCircle2`                 | Success feedback         |
| Wrong       | `X`                            | Error feedback           |
| Timer       | `Clock`                        | Elapsed time             |
| Progress    | `TrendingUp`                   | Stats/analytics          |
| Security    | `Shield`                       | Trust indicators         |
| Achievement | `Award`                        | Badges, milestones       |
| Navigate    | `ChevronRight` / `ChevronLeft` | Forward/back             |
| Retry       | `RotateCcw`                    | Try again                |
| Loading     | `Loader2`                      | Spinner (`animate-spin`) |

## Component Patterns

### Primary CTA

TS Accent Green on TS Charcoal background — this is the primary call-to-action pattern.

```tsx
<Button className="bg-ts-green text-white hover:bg-ts-green/90">Get Started</Button>
```

### Cards

Dark backgrounds preferred. Use `bg-card` (TS Charcoal in dark mode).

```tsx
<Card className="overflow-hidden">
  <CardContent className="p-6">
```

### Buttons

- Primary: `<Button>` — TS Green bg
- Secondary: `<Button variant="outline">` — bordered
- Ghost: `<Button variant="ghost">` — no border
- Sizing: `size="sm"` for toolbar, default for actions

### Animations

| Name                | Duration                | Usage               |
| ------------------- | ----------------------- | ------------------- |
| `slide-up`          | 0.3s ease-out           | Page transitions    |
| `pulse-slow`        | 2s ease-in-out infinite | Loading             |
| `accordion-down/up` | 0.2s ease-out           | Expandable sections |
| `card-hover`        | 200ms all               | Card lift on hover  |
| `progress-fill`     | 0.5s ease-out           | Progress bars       |

## Dark Mode

- Preferred by default — dark backgrounds (TS Black, TS Charcoal) are the brand's signature look
- Toggle via `.dark` class on `<html>`
- ALL colors defined in both light and dark variants
- Use semantic tokens, never raw hex in components

## Accessibility

- Focus ring: `focus-visible:ring-2 ring-ring ring-offset-2`
- Keyboard navigation everywhere
- Min touch target: 44x44px for mobile/Chromebook
- Color is never the only indicator (icons + text)
- WCAG 2.1 AA minimum

## Legal

- Copyright: `© 2025 Top Shelf Service LLC™. All rights reserved.`
- Company name: "Top Shelf Service LLC™" (two words + ™)
- Product name: "Top Shelf Teaching" (two words)
- Sister product: "Fresh Schedules™ by Top Shelf Service LLC™"
- Tagline: "The hardest part is done for you."
