# 🏗️ Active Plan: Space Card Options Menu Z-Index

## 1. Requirements & Scope
* **Goal:** Fix the z-index stacking context bug on the Space Card options dropdown menu. Currently, when the options dropdown is opened, it renders behind subsequent Space Cards because each Space Card is wrapped in an unpositioned `div` with an animation that creates a new stacking context. Clicks on the dropdown pass through to elements on the cards behind it.
* **Blueprint Alignment:** LLD.md section on the Spaces manager view and components.
* **Out of Scope:** Structural layout changes to the Space Card or redesigning the options menu buttons.

## 2. Architecture & Dependencies
* **Loaded Constraints:** `.agents/rules/icycrow-master.md`, `.agents/skills/preact-ui/SKILL.md`
* **New Dependencies:** None

## 3. Implementation Phases (TDD Ready)
### Phase 1: Sibling Promotion & Animation Integration
* **Action:** 
  - `[MODIFY] src/side-panel/components/SpaceCard.tsx` - Add `animate-slide-up` to the component's main class list so that the transition applies directly to the card.
  - `[MODIFY] src/side-panel/components/SpacesView.tsx` - Remove the wrapping `<div className="animate-slide-up">` inside `filteredSpaces.map()`, rendering `<SpaceCard>` directly as sibling nodes under `<div className="spaces-list">`.
* **Required Tests:** Run `vitest` to ensure component rendering, expansion, and options button visibility tests in `SpaceCard.test.tsx` pass without regression.

### Phase 2: Verification of Stacking Context
* **Action:**
  - Verify that sibling positioning correctly resolves the z-index overlap: since the active card has `zIndex: showMenu ? 100 : undefined`, it will stack above sibling cards when its menu is active.
* **Required Tests:** Verify existing tests and build output.

## 4. Risks & Mitigations
* ⚠️ **[Medium Risk]:** Animating the outer droppable node might affect `@dnd-kit/core` drag/drop target calculation. -> **Mitigation:** The drop/node ref is already set on the outermost element of `SpaceCard`, so moving the class does not change the reference element passed to `setNodeRef`.
