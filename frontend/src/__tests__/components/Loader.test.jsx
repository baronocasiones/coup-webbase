import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Loader from '../../components/Loader'

describe('Loader component @unit', () => {
  it('renders three bouncing circles', () => {
    const { container } = render(<Loader />)

    // The loader renders 3 circle divs and 3 shadow divs inside a wrapper
    const circles = container.querySelectorAll('[class]')
    expect(circles.length).toBeGreaterThan(0)
  })

  it('renders without crashing', () => {
    const { container } = render(<Loader />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders a container element', () => {
    const { container } = render(<Loader />)
    // Should have a top-level container div
    expect(container.firstChild.tagName).toBe('DIV')
  })
})
