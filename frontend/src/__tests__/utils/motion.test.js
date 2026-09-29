import { describe, it, expect, afterEach, vi } from 'vitest'
import { prefersReducedMotion, selAll } from '../../utils/motion'

/** Swap in a matchMedia that reports the given reduced-motion answer. */
function mockReducedMotion(matches) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('motion utilities @unit', () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    })
  })

  describe('prefersReducedMotion', () => {
    it('reports false when the user has not requested reduced motion', () => {
      mockReducedMotion(false)
      expect(prefersReducedMotion()).toBe(false)
    })

    it('reports true when the user has requested reduced motion', () => {
      mockReducedMotion(true)
      expect(prefersReducedMotion()).toBe(true)
    })

    it('queries the reduce media feature', () => {
      mockReducedMotion(false)
      prefersReducedMotion()
      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
    })

    it('defaults to false when matchMedia is unavailable', () => {
      // Older browsers, and any environment that has not stubbed it.
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: undefined,
      })
      expect(prefersReducedMotion()).toBe(false)
    })

    it('defaults to false when matchMedia throws', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn(() => {
          throw new Error('unsupported')
        }),
      })
      expect(prefersReducedMotion()).toBe(false)
    })
  })

  describe('selAll', () => {
    it('finds every descendant carrying a hashed class name', () => {
      const root = document.createElement('div')
      root.innerHTML = `
        <span class="_card_a1"></span>
        <span class="_other_b2"></span>
        <span class="_card_a1"></span>
      `

      expect(selAll(root, '_card_a1')).toHaveLength(2)
    })

    it('includes the root itself when it carries the class', () => {
      // Components usually put their scope ref on the exact element whose
      // entrance they animate. querySelectorAll would not return that element,
      // which made every such animation a silent no-op.
      const root = document.createElement('div')
      root.className = '_panel_x1'
      root.innerHTML = '<span class="_panel_x1"></span>'

      const found = selAll(root, '_panel_x1')
      expect(found).toHaveLength(2)
      expect(found[0]).toBe(root)
    })

    it('returns the root only once when nothing else matches', () => {
      const root = document.createElement('div')
      root.className = '_solo_y2'

      expect(selAll(root, '_solo_y2')).toEqual([root])
    })

    it('returns an empty list rather than throwing when nothing matches', () => {
      const root = document.createElement('div')

      expect(selAll(root, '_missing_zz')).toHaveLength(0)
    })

    it('returns an empty list for a missing root', () => {
      expect(selAll(null, '_anything_1')).toHaveLength(0)
    })

    it('does not match class names outside the scope root', () => {
      const outside = document.createElement('span')
      outside.className = '_card_a1'
      document.body.appendChild(outside)

      const root = document.createElement('div')
      root.innerHTML = '<span class="_card_a1"></span>'

      expect(selAll(root, '_card_a1')).toHaveLength(1)
      outside.remove()
    })
  })
})
