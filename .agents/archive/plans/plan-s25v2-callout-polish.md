# Implementation Plan: Callout UI Polish & CSS Fix (S25-V2)

Fix the "dark rendering glitch" and implement a premium frosted-glass aesthetic for Callout annotations.

## Proposed Changes

### [Component] Callout Styling Overhaul

#### [MODIFY] [index.css](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/index.css)
- Add `.callout-container` with strictly defined glassmorphism (translucent dark background, 12px blur, subtle rim light).
- Add `.callout-textarea` with clean typography and transparent background.

#### [MODIFY] [CalloutBox.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/CalloutBox.tsx)
- Switch from inline styling to the new CSS classes.
- **Remove** the "Status Indicator / Accent" div (the likely "smudge").
- Ensure font size and padding remain scaled via `viewerScale`.

#### [MODIFY] [CalloutLayer.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/CalloutLayer.tsx)
- Update `strokeWidth` to `3` for more deliberate, premium-looking arrows.

## Verification Plan

### Automated Tests
- Run `npm run build` to ensure no regressions in the build process.

### Manual Verification
- Deploy to browser.
- Create a callout and verify the box looks like "frosted glass".
- Ensure the left-side "smudge" is gone.
- Verify the arrow thickness looks premium.
- Test at different zoom levels to ensure scaling remains intact.
