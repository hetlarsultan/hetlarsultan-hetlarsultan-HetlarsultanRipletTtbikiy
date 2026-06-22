---
name: CharacterAnimator memo export pattern
description: Named-export React components need a Base rename to wrap in memo without breaking imports.
---

When wrapping a named-export React component (e.g. `export const CharacterAnimator`) with `React.memo`, rename the internal function to `CharacterAnimatorBase` and re-export as `export const CharacterAnimator = memo(CharacterAnimatorBase)`.

**Why:** Direct wrapping like `export const CharacterAnimator = memo<Props>(({...}) => {...})` works, but the rename pattern keeps the function name in DevTools and avoids TypeScript generic inference issues with complex prop shapes.

**How to apply:** Used in `CharacterAnimator.tsx`. Applies to any named export that needs memoization in this codebase.
