# VFX Visual Lab — Continuous Playback

## Problem

The lab rendered a single production drawer at a manually selected normalized TTL progress. Entering the tool therefore showed a frozen frame, even though the production drawer was designed to resolve its visual composition from TTL progress.

## Change

- Start a continuous preview when the lab opens.
- Advance normalized TTL progress from a preview clock, looping from the end back to zero.
- Cap UI publication to 30 Hz to avoid rebuilding Canvas and Skia previews on every display refresh.
- Pause and resume playback.
- Restart an effect from its initial frame.
- Selecting another effect restarts its playback.
- Manual progress stepping and phase selection pause playback so a frame can be inspected.
- Applying a saved preset enters inspection mode and preserves its exact progress.

## Architecture

The preview clock is stateful; production VFX drawers remain pure functions of the world/entity state. No animation scheduler or particle runtime is added to gameplay. Both Canvas and Skia receive the same normalized progress and continue to call the same production drawer.

## Verification

The Playwright scenario checks that progress changes during playback, remains stable while paused, advances after resume, and restarts into live preview. Browser execution and visual review must still be completed in CI / deployed Visual Lab before calling the animation quality approved.
