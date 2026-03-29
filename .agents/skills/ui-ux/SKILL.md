# ui-ux-pro-max

## Description
UI/UX Pro Max - Design Intelligence. Comprehensive design guide for web and mobile applications. Contains 50+ styles, 161 color palettes, 57 font pairings, 161 product types with reasoning rules, 99 UX guidelines, and 25 chart types across 10 technology stacks. Searchable database with priority-based recommendations.

* **Actions:** plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, and check UI/UX code.
* **Projects:** website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, and mobile app.
* **Elements:** button, modal, navbar, sidebar, card, table, form, and chart.
* **Styles:** glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, and flat design.
* **Topics:** color systems, accessibility, animation, layout, typography, font pairing, spacing, interaction states, shadow, and gradient.
* **Integrations:** shadcn/ui MCP for component search and examples.

---

## When to Apply
Use this skill when the task involves **UI structure, visual design decisions, interaction patterns, or user experience quality control.**

* **🟢 Must Use:** Designing new pages, creating/refactoring UI components, choosing color/typography/spacing systems, reviewing UI code for UX/accessibility, implementing navigation/animations, or making product-level design decisions.
* **🟡 Recommended:** UI looks "not professional enough," receiving UX feedback, pre-launch optimization, aligning cross-platform design, or building component libraries.
* **🔴 Skip:** Pure backend logic, API/database design, non-interface performance optimization, infrastructure/DevOps, or non-visual automation tasks. *(Decision criteria: If the task changes how a feature looks, feels, moves, or is interacted with, use this Skill.)*

---

## Rule Categories by Priority

| Priority | Category | Impact | Domain | Key Checks (Must Have) | Anti-Patterns (Avoid) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Accessibility | CRITICAL | `ux` | Contrast 4.5:1, Alt text, Keyboard nav, Aria-labels | Removing focus rings, Icon-only buttons without labels |
| 2 | Touch & Interaction | CRITICAL | `ux` | Min size 44×44px, 8px+ spacing, Loading feedback | Reliance on hover only, Instant state changes (0ms) |
| 3 | Performance | HIGH | `ux` | WebP/AVIF, Lazy loading, Reserve space (CLS < 0.1) | Layout thrashing, Cumulative Layout Shift |
| 4 | Style Selection | HIGH | `style`, `product` | Match product type, Consistency, SVG icons | Mixing flat & skeuomorphic randomly, Emoji as icons |
| 5 | Layout & Responsive | HIGH | `ux` | Mobile-first breakpoints, Viewport meta, No horizontal scroll | Horizontal scroll, Fixed px container widths, Disable zoom |
| 6 | Typography & Color | MEDIUM | `typography`, `color` | Base 16px, Line-height 1.5, Semantic color tokens | Text < 12px body, Gray-on-gray, Raw hex in components |
| 7 | Animation | MEDIUM | `ux` | Duration 150–300ms, Motion conveys meaning | Decorative-only animation, Animating width/height |
| 8 | Forms & Feedback | MEDIUM | `ux` | Visible labels, Error near field, Helper text | Placeholder-only label, Errors only at top |
| 9 | Navigation Patterns | HIGH | `ux` | Predictable back, Bottom nav ≤5, Deep linking | Overloaded nav, Broken back behavior, No deep links |
| 10 | Charts & Data | LOW | `chart` | Legends, Tooltips, Accessible colors | Relying on color alone to convey meaning |

---

## Quick Reference

### 1. Accessibility (CRITICAL)
* **color-contrast:** Minimum 4.5:1 ratio for normal text (large text 3:1); Material Design.
* **focus-states:** Visible focus rings on interactive elements (2–4px; Apple HIG, MD).
* **alt-text:** Descriptive alt text for meaningful images.
* **aria-labels:** `aria-label` for icon-only buttons; `accessibilityLabel` in native.
* **keyboard-nav:** Tab order matches visual order; full keyboard support.
* **form-labels:** Use `<label>` with `for` attribute.
* **skip-links:** Skip to main content for keyboard users.
* **heading-hierarchy:** Sequential h1→h6, no level skip.
* **color-not-only:** Don't convey info by color alone (add icon/text).
* **dynamic-type:** Support system text scaling; avoid truncation.
* **reduced-motion:** Respect `prefers-reduced-motion`.
* **voiceover-sr:** Meaningful accessibilityLabel/Hint; logical reading order.
* **escape-routes:** Provide cancel/back in modals and multi-step flows.
* **keyboard-shortcuts:** Preserve system/a11y shortcuts; offer keyboard alternatives for drag-and-drop.

### 2. Touch & Interaction (CRITICAL)
* **touch-target-size:** Min 44×44pt (Apple) / 48×48dp (Material); extend hit area if needed.
* **touch-spacing:** Minimum 8px/8dp gap between touch targets.
* **hover-vs-tap:** Use click/tap for primary interactions; don't rely on hover alone.
* **loading-buttons:** Disable button during async operations; show spinner.
* **error-feedback:** Clear error messages near problem.
* **cursor-pointer:** Add `cursor-pointer` to clickable elements (Web).
* **gesture-conflicts:** Avoid horizontal swipe on main content; prefer vertical scroll.
* **tap-delay:** Use `touch-action: manipulation` to reduce 300ms delay.
* **standard-gestures:** Use platform standard gestures consistently.
* **system-gestures:** Don't block system gestures (Control Center, back swipe).
* **press-feedback:** Visual feedback on press (ripple/highlight).
* **haptic-feedback:** Use haptic for confirmations and important actions.
* **gesture-alternative:** Provide visible controls for critical actions alongside gestures.
* **safe-area-awareness:** Keep touch targets away from notch, Dynamic Island, screen edges.
* **no-precision-required:** Avoid requiring pixel-perfect taps on small icons.
* **swipe-clarity:** Swipe actions must show clear affordance or hint.
* **drag-threshold:** Use a movement threshold before starting drag.

### 3. Performance (HIGH)
* **image-optimization:** Use WebP/AVIF, responsive images, lazy load non-critical assets.
* **image-dimension:** Declare width/height to prevent layout shift (CLS).
* **font-loading:** Use `font-display: swap/optional`; reserve space.
* **font-preload:** Preload only critical fonts.
* **critical-css:** Prioritize above-the-fold CSS.
* **lazy-loading:** Lazy load non-hero components.
* **bundle-splitting:** Split code by route/feature to reduce initial load.
* **third-party-scripts:** Load async/defer; remove unnecessary ones.
* **reduce-reflows:** Avoid frequent layout reads/writes; batch DOM reads/writes.
* **content-jumping:** Reserve space for async content.
* **virtualize-lists:** Virtualize lists with 50+ items.
* **main-thread-budget:** Keep per-frame work under ~16ms for 60fps.
* **progressive-loading:** Use skeleton screens for >1s operations.
* **input-latency:** Keep input latency under ~100ms.
* **debounce-throttle:** Use debounce/throttle for high-frequency events.
* **offline-support:** Provide offline state messaging.

### 4. Style Selection (HIGH)
* **style-match:** Match style to product type.
* **consistency:** Use same style across all pages.
* **no-emoji-icons:** Use SVG icons (Heroicons, Lucide), not emojis.
* **color-palette-from-product:** Choose palette from product/industry.
* **effects-match-style:** Shadows, blur, radius aligned with chosen style.
* **platform-adaptive:** Respect platform idioms (iOS HIG vs Material).
* **state-clarity:** Make hover/pressed/disabled states visually distinct.
* **elevation-consistent:** Use a consistent elevation/shadow scale.
* **dark-mode-pairing:** Design light/dark variants together.
* **icon-style-consistent:** Use one icon set/visual language across the product.
* **system-controls:** Prefer native/system controls over fully custom ones.
* **blur-purpose:** Use blur to indicate background dismissal, not as decoration.
* **primary-action:** Only one primary CTA per screen.

### 5. Layout & Responsive (HIGH)
* **viewport-meta:** `width=device-width initial-scale=1` (never disable zoom).
* **mobile-first:** Design mobile-first, then scale up.
* **breakpoint-consistency:** Use systematic breakpoints (375 / 768 / 1024 / 1440).
* **readable-font-size:** Minimum 16px body text on mobile.
* **line-length-control:** Mobile 35–60 chars/line; desktop 60–75.
* **horizontal-scroll:** No horizontal scroll on mobile.
* **spacing-scale:** Use 4pt/8dp incremental spacing system.
* **touch-density:** Keep component spacing comfortable for touch.
* **container-width:** Consistent max-width on desktop.
* **z-index-management:** Define layered z-index scale (e.g., 0 / 10 / 20 / 40 / 100).
* **fixed-element-offset:** Fixed bars must reserve safe padding.
* **viewport-units:** Prefer `min-h-dvh` over `100vh` on mobile.
* **orientation-support:** Readable and operable in landscape mode.
* **visual-hierarchy:** Establish hierarchy via size, spacing, contrast.

### 6. Typography & Color (MEDIUM)
* **line-height:** 1.5-1.75 for body text.
* **font-scale:** Consistent type scale (12, 14, 16, 18, 24, 32).
* **contrast-readability:** Darker text on light backgrounds.
* **weight-hierarchy:** Bold headings (600–700), Regular body (400), Medium labels (500).
* **color-semantic:** Define semantic color tokens (primary, secondary, error).
* **color-dark-mode:** Dark mode uses desaturated/lighter tonal variants, not inverted colors.
* **color-accessible-pairs:** Foreground/background pairs must meet 4.5:1 (AA) or 7:1 (AAA).
* **color-not-decorative-only:** Functional color must include icon/text.
* **truncation-strategy:** Prefer wrapping over truncation; use ellipsis/tooltip if needed.
* **number-tabular:** Use tabular figures for data columns, prices, timers.

### 7. Animation (MEDIUM)
* **duration-timing:** 150–300ms for micro-interactions; complex ≤400ms.
* **transform-performance:** Use transform/opacity only; avoid width/height/top/left.
* **motion-meaning:** Every animation must express a cause-effect relationship.
* **spring-physics:** Prefer spring/physics-based curves for a natural feel.
* **exit-faster-than-enter:** Exit animations ~60–70% of enter duration.
* **stagger-sequence:** Stagger list item entrance by 30–50ms per item.
* **interruptible:** User tap/gesture cancels in-progress animation immediately.
* **no-blocking-animation:** Never block user input during an animation.

### 8. Forms & Feedback (MEDIUM)
* **input-labels:** Visible label per input (not placeholder-only).
* **error-placement:** Show error below the related field.
* **submit-feedback:** Loading then success/error state on submit.
* **progressive-disclosure:** Reveal complex options progressively.
* **inline-validation:** Validate on blur (not keystroke).
* **input-type-keyboard:** Use semantic input types (email, tel, number) for mobile keyboards.
* **error-recovery:** Error messages must include a clear recovery path.
* **form-autosave:** Long forms should auto-save drafts.
* **focus-management:** After submit error, auto-focus the first invalid field.
* **destructive-emphasis:** Destructive actions use semantic danger color (red).

### 9. Navigation Patterns (HIGH)
* **bottom-nav-limit:** Bottom navigation max 5 items; use labels with icons.
* **back-behavior:** Predictable back navigation; preserve scroll/state.
* **deep-linking:** All key screens reachable via URL.
* **nav-state-active:** Current location must be visually highlighted.
* **modal-escape:** Modals/sheets must offer a clear close affordance (swipe-down on mobile).
* **state-preservation:** Navigating back must restore previous scroll/filter/input state.
* **modal-vs-navigation:** Modals must not be used for primary navigation flows.

### 10. Charts & Data (LOW)
* **chart-type:** Match chart to data (trend → line, comparison → bar, proportion → pie).
* **color-guidance:** Accessible color palettes; avoid red/green only pairs.
* **data-table:** Provide table alternative for accessibility.
* **legend-visible:** Always show legend near the chart.
* **tooltip-on-interact:** Tooltips/data labels on hover or tap.
* **empty-data-state:** Meaningful empty state ("No data yet" + guidance).
* **no-pie-overuse:** Avoid pie/donut for >5 categories; use bar charts.

---

# Pre-Delivery Checklist

Before delivering UI code, verify these items: 
*Scope notice: This checklist is for App UI (iOS/Android/React Native/Flutter).*

## Visual Quality
- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons come from a consistent icon family and style
- [ ] Official brand assets are used with correct proportions and clear space
- [ ] Pressed-state visuals do not shift layout bounds or cause jitter
- [ ] Semantic theme tokens are used consistently (no ad-hoc per-screen hardcoded colors)

## Interaction
- [ ] All tappable elements provide clear pressed feedback (ripple/opacity/elevation)
- [ ] Touch targets meet minimum size (>=44x44pt iOS, >=48x48dp Android)
- [ ] Micro-interaction timing stays in the 150-300ms range with native-feeling easing
- [ ] Disabled states are visually clear and non-interactive
- [ ] Screen reader focus order matches visual order, and interactive labels are descriptive
- [ ] Gesture regions avoid nested/conflicting interactions (tap/drag/back-swipe conflicts)

## Light/Dark Mode
- [ ] Primary text contrast >=4.5:1 in both light and dark mode
- [ ] Secondary text contrast >=3:1 in both light and dark mode
- [ ] Dividers/borders and interaction states are distinguishable in both modes
- [ ] Modal/drawer scrim opacity is strong enough to preserve foreground legibility (typically 40-60% black)
- [ ] Both themes are tested before delivery (not inferred from a single theme)

## Layout
- [ ] Safe areas are respected for headers, tab bars, and bottom CTA bars
- [ ] Scroll content is not hidden behind fixed/sticky bars
- [ ] Verified on small phone, large phone, and tablet (portrait + landscape)
- [ ] Horizontal insets/gutters adapt correctly by device size and orientation
- [ ] 4/8dp spacing rhythm is maintained across component, section, and page levels
- [ ] Long-form text measure remains readable on larger devices (no edge-to-edge paragraphs)

## Accessibility
- [ ] All meaningful images/icons have accessibility labels
- [ ] Form fields have labels, hints, and clear error messages
- [ ] Color is not the only indicator
- [ ] Reduced motion and dynamic text size are supported without layout breakage
- [ ] Accessibility traits/roles/states (selected, disabled, expanded) are announced correctly