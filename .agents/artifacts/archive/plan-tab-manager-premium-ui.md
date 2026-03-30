# 🏗️ Active Plan: Tab Manager - Premium UI & Accordion Expansion

Refactor the "Spaces" tab manager UI into a premium, expandable accordion system. This involves state management updates, component refactoring, and CSS animations to provide a sleek, high-end user experience.

## User Review Required

> [!IMPORTANT]
> This refactor introduces a new global UI state `expandedSpaceId` to manage accordion behavior. It also adds inline editing for space names directly within the card header.

> [!WARNING]
> Visual transitions for accordion expansion (e.g., `grid-template-rows`) require precise CSS to feel "premium." We will prioritize smooth animations.

## Proposed Changes

### 1. State & Store (`src/side-panel/store.ts`)
Add global signals and utility functions to manage the new accordion and space mutation states.

#### [MODIFY] [store.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/side-panel/store.ts)
- [NEW] `export const expandedSpaceId = signal<UUID | null>(null);`
- [NEW] `export const updateSpaceName = async (id: UUID, name: string) => { ... }`
- [NEW] `export const removeTabFromSpace = async (spaceId: UUID, tabId: UUID) => { ... }`

### 2. SpaceCard Component (`src/side-panel/components/SpaceCard.tsx`)
Complete refactor of the `SpaceCard` into a header + collapsible body structure.

#### [MODIFY] [SpaceCard.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/side-panel/components/SpaceCard.tsx)
- Implement `Header` section with:
  - `ChevronDown`/`ChevronUp` (from `lucide-preact`).
  - Inline editing state (`isEditing`) using a local signal.
  - Action buttons: `Play` (Restore), `Edit2` (Rename), `Trash2` (Delete).
- Implement `CollapsibleBody` section:
  - Render only when `expandedSpaceId.value === space.id`.
  - Use `TabRow` for each tab.

#### [NEW] [TabRow.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/side-panel/components/TabRow.tsx)
- Sleek row for individual tabs:
  - Favicon image.
  - Truncated title.
  - Hidden-on-hover "X" button (`X` icon from `lucide-preact`) to remove tab.

### 3. Styling (`src/side-panel/panel.css`)
Update styles to match the IcyCrow dark theme and add smooth transitions.

#### [MODIFY] [panel.css](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/side-panel/panel.css)
- Add accordion animation classes (`.accordion-body-open`, `.accordion-body-closed`).
- Update `.bento-item` and action button styles for a more "tactile" feel.
- Remove harsh backgrounds from secondary buttons.

## Implementation Phases (TDD Ready)

### Phase 1: Store & State Hardening
- **Action:** Update `src/side-panel/store.ts` with required signals and mutation functions.
- **Required Tests:**
  - `updateSpaceName` updates storage and signal.
  - `removeTabFromSpace` correctly filters out the tab and persists state.

### Phase 2: SpaceCard Header & Inline Editing
- **Action:** Refactor `SpaceCard` header. Implement `isEditing` logic.
- **Required Tests:**
  - Clicking "Rename" renders an input field.
  - Pressing "Enter" or `blur` saves the name and exits edit mode.
  - Action buttons trigger correct store functions.

### Phase 3: Accordion Body & TabRow
- **Action:** Implement `TabRow` and the collapsible body in `SpaceCard`.
- **Required Tests:**
  - Clicking the header toggles `expandedSpaceId`.
  - Body is visible only when expanded.
  - Clicking "X" on `TabRow` removes the tab.

### Phase 4: Premium UI Polish
- **Action:** Apply CSS transitions and theme updates to `panel.css`.
- **Required Tests:**
  - Visual verification of transitions.
  - Hover states for action icons and `TabRow` items.

## Risks & Mitigations
- ⚠️ **[Low Risk]:** CSS `grid-template-rows` animation compatibility. -> **Mitigation:** Use standard height/opacity transitions if grid-based animation flickers in MV3 side panel.
- ⚠️ **[Med Risk]:** Service Worker lifecycle during rapid state updates. -> **Mitigation:** Ensure store functions wait for `sendToSW` responses and handle errors gracefully.

## Verification Plan

### Automated Tests
- `npx vitest run src/side-panel/store.test.ts`
- `npx vitest run src/side-panel/components/SpaceCard.test.tsx`

### Manual Verification
- Open side panel, create a space, and verify accordion expansion.
- Test inline renaming with various lengths.
- Remove individual tabs and verify they remain gone after reload.
- Delete space and verify UI updates immediately.
