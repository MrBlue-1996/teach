---
description: 'TopShelf brand kit for UI work. Use when building pages, components, styling, or writing user-facing copy. Covers design tokens, voice/tone, and design principles.'
applyTo: 'apps/web/src/**'
lastUpdated: '2026-05-28'
---

# Top Shelf Service LLC™ — Brand Kit

**Read these files before any UI work:**

1. **Design Tokens** — `governance/standards/brand/tokens/design-tokens.md`
   Colors (`ts-*` palette), typography (Montserrat + Inter), spacing, icons, component patterns

2. **Voice & Tone** — `governance/standards/brand/voice/voice-and-tone.md`
   "Direct, calm, competent. No hype, no jargon, no gimmicks." Writing rules, do/don't examples

3. **Brand Doctrine** — `governance/standards/brand/doctrine/brand-doctrine.md`
   Boulder logo, dark-first design, Chromebook-first, progressive depth, imagery rules

## Quick Rules

- **Colors:** Grayscale core (TS Black, Charcoal, Slate, Mist) + 3 accents (Green, Amber, Red)
- **Primary CTA:** TS Accent Green `#22C55E` on dark backgrounds
- **Semantic tokens:** Use `primary`, `success`, `destructive`, `warning` — never raw hex in components
- **Brand palette:** Use `ts-black`, `ts-charcoal`, `ts-slate`, `ts-mist`, `ts-green`, `ts-amber`, `ts-red`
- **Headlines:** `font-heading` (Montserrat 600–800)
- **Body/UI:** `font-sans` (Inter 400–600)
- **Code:** `font-mono` (Menlo)
- **Dark mode preferred** — dark backgrounds (TS Black, TS Charcoal) are the signature look
- **Icons:** lucide-react only
- **Touch targets:** minimum 44x44px
- **Company name:** "Top Shelf Service LLC™" (two words + ™)
- **Product name:** "Top Shelf Teaching" (two words)
- **Tagline:** "The hardest part is done for you."
- **No emoji, no hype words, no stock language** in any user-facing copy
- **Buttons:** verb-first, max 3 words
- **Imagery:** B&W or desaturated, gritty/honest — never stock photos

## Dark Mode

- Default to dark backgrounds: TS Black `#0A0A0A` for page backgrounds, TS Charcoal `#1A1A1A` for cards/surfaces
- Use **semantic tokens** — `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground` — never hard-code `bg-black` or `text-white`
- Light mode is supported but dark is the primary and signature look; design dark-first
- Never invert the brand color palette for light mode — use the token layer so both modes stay consistent

## Component Patterns

Use these patterns consistently across all UI surfaces:

**Buttons**
```tsx
<Button variant="default">Save changes</Button>
<Button variant="destructive">Delete session</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">View details</Button>
```
Labels must be verb-first and max 3 words. No emoji, no exclamation marks.

**Forms**
```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email address</Label>
  <Input id="email" type="email" placeholder="you@example.com" />
</div>
```
Always pair `<Label>` with `<Input>` via matching `htmlFor`/`id`. Accessible labels are non-negotiable.

**Loading States**
```tsx
<Skeleton className="h-4 w-[200px]" />
<Skeleton className="h-10 w-full" />
```
Use `<Skeleton>` from `components/ui/skeleton` — never use spinners or custom loading animations.

**Errors**
```tsx
<Alert variant="destructive">
  <AlertTitle>Something went wrong</AlertTitle>
  <AlertDescription>Could not load session. Try again.</AlertDescription>
</Alert>
```
Use `<Alert variant="destructive">` — never inline red text (`className="text-red-500"`).

**Empty States**
Every empty state must include: an icon + a heading + a brief description + a CTA button.
```tsx
<div className="flex flex-col items-center gap-4 py-12 text-center">
  <BookOpen className="h-10 w-10 text-muted-foreground" />
  <h3 className="font-heading text-lg font-semibold">No sessions yet</h3>
  <p className="text-sm text-muted-foreground">Start a session to track your progress.</p>
  <Button variant="default">Start session</Button>
</div>
```

## Copy Rules

Write copy the way a competent trainer talks — direct, calm, no hype.

| ✅ Do | ❌ Don't |
| ----- | -------- |
| "Save changes" | "Click here to save your amazing changes!" |
| "Session ended" | "Oops! Something went wrong 😢" |
| "3 blocks completed" | "You're crushing it! 3 blocks done! 🎉" |
| "Start session" | "Begin your learning journey" |
| "No results found" | "Hmm, we couldn't find anything!" |

Rules:
- No emoji in UI copy
- No exclamation marks in body copy or labels
- No "journey", "amazing", "crushing it", or similar hype language
- Error messages state what happened and what to do — not how to feel about it

## Responsive Design

- **Mobile-first:** Write base styles for small screens, then expand with `md:` and `lg:` prefixes
- **Breakpoints:** sm (640px), md (768px), lg (1024px), xl (1280px)
- **Primary desktop target:** Chromebook viewport 1366×768 — test at this size before shipping
- Avoid fixed widths that break at 1366px; prefer `max-w-*` with `w-full`
- Stack layouts vertically on mobile; use grid/flex row only at `md:` and above
