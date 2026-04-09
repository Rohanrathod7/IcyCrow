# Implementation Plan - Bridge Selector Visibility Hardening

This plan resolves the persistent issue of the Bridge Selector dropdown being invisible when toggled.

## User Review Required

> [!IMPORTANT]
> I have identified that the CSS class `.chat-header.glass-card` in `panel.css` explicitly sets `overflow: hidden`, which is the global "kill switch" for the dropdown menu. 

## Proposed Changes

### [CSS Styles]

#### [MODIFY] [panel.css](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/side-panel/panel.css)
-   Change `overflow: hidden` to `overflow: visible` for the `.chat-header.glass-card` selector.
-   This removes the final clipping boundary that was preventing the absolutely positioned dropdown from rendering outside the pill-shaped header.

## Verification Plan

### Manual Verification
-   Click the Bridge Selector arrow.
-   Confirm the dropdown menu transitions into view and is no longer clipped by the header boundaries.
-   Verify that long bridge titles still truncate correctly (which I've ensured via internal span styles in previous steps).
