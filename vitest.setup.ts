import '@testing-library/jest-dom/vitest'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

// @react-three/test-renderer never sets this flag itself (unlike
// @testing-library/react), so without it React makes no guarantee that
// effects flush synchronously inside `act`/`await renderer.create(...)`.
// Our material-swap assertions (components/sushi-model.test.tsx) depend on
// effects having run by the time the awaited call resolves — do not remove.
globalThis.IS_REACT_ACT_ENVIRONMENT = true
