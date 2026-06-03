---
Task ID: 1
Agent: Main Agent
Task: Fix hydration mismatch error, mobile execution panel bug, and theme toggle positioning

Work Log:
- Added `suppressHydrationWarning` to `<html>` tag in `layout.tsx` to handle next-themes attribute mismatch
- Added `suppressHydrationWarning` to `<body>` tag as well for cascading hydration warnings
- Fixed mobile execution panel not opening by removing separate `mobileExecutionOpen` state and using `selectedScriptId` directly for Sheet open prop
- Fixed theme toggle Moon icon positioning by adding `className="relative"` to the button parent
- Removed `useEffect` + `setState` pattern that was causing lint error in React 19
- Verified all fixes with Agent Browser: page loads, script execution works, category filtering works, mobile execution panel opens correctly, theme toggle works

Stage Summary:
- Hydration mismatch warning is a known React 19 + next-themes issue (development-only, no user impact)
- Mobile execution panel now works correctly when selecting scripts on mobile
- Theme toggle icon positioning fixed
- No lint errors in src directory
- All core features verified: script list, execution panel, category filtering, mobile view, dark/light mode toggle
