# 🏗️ Active Plan: Toolbar Tool Colors

## 1. Requirements & Scope
* **Goal:** Redesign the toolbar tool item color logic to improve visual clarity and state indication. Inactive tool icons will have the same uniform white/gray color as the select/pan tools (`rgba(255, 255, 255, 0.7)`). Only the active/selected tool's icon will highlight with its selected color. The selected color will be retrieved dynamically from user settings (so that changing the color in the customizer dynamically updates the icon).
* **Blueprint Alignment:** LLD.md section on the Drawing Workspace Toolbar components.
* **Out of Scope:** Modifications to the toolbar customization menu UI.

## 2. Architecture & Dependencies
* **Loaded Constraints:** `.agents/rules/icycrow-master.md`, `.agents/skills/preact-ui/SKILL.md`
* **New Dependencies:** None

## 3. Implementation Phases (TDD Ready)
### Phase 1: Update SortableToolItem Color Logic
* **Action:**
  - `[MODIFY] src/workspace/components/SortableToolItem.tsx`:
    - Retrieve custom color from `settings?.color` (which tracks live updates in the customizer modal) before falling back to `metadata?.color`.
    - Set the icon color to the selected/metadata color *only* if `isActive` is true; otherwise, default to `rgba(255, 255, 255, 0.7)`.
    - Apply `settings?.color || metadata?.color || 'rgba(255, 255, 255, 0.4)'` to the customizable indicator dot's background style. This shows the selected color of the tool even when inactive.
* **Required Tests:** Run `SortableToolItem` tests or verify with Vitest that the component mounts and renders with the correct properties.

### Phase 2: Update CircularToolbar Color Logic
* **Action:**
  - `[MODIFY] src/workspace/components/CircularToolbar.tsx`:
    - Retrieve `settings` using `toolSettings.value[id] || toolSettings.value[baseType]`.
    - Apply the same `iconColor` logic: selected/metadata color when active, `rgba(255, 255, 255, 0.7)` when inactive.
    - Color the orbiting customizable indicator dot background with `settings?.color || toolMeta?.color || 'rgba(255, 255, 255, 0.4)'`.
* **Required Tests:** Verify existing circular toolbar tests.

### Phase 3: Verification & Polish
* **Action:**
  - Run the Vitest workspace test suite and compile production builds using `npm run build`.
* **Required Tests:** Ensure no regressions in existing tests.

## 4. Risks & Mitigations
* ⚠️ **[Low Risk]:** Inactive state loses color information completely. -> **Mitigation:** The customization indicator dot at the bottom/corner of the tool icon will be colored with the selected tool color, so the user can easily see what color is currently active for each drawing tool without selecting it.
