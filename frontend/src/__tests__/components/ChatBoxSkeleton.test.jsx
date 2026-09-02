import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChatBoxSkeleton from '../../components/ChatBoxSkeleton'

describe('ChatBoxSkeleton component @unit', () => {
  it('renders skeleton placeholder elements', () => {
    const { container } = render(<ChatBoxSkeleton />)

    // Should render skeleton text divs
    const skeletonElements = container.querySelectorAll('[class]')
    expect(skeletonElements.length).toBeGreaterThan(0)
  })

  it('renders without crashing', () => {
    const { container } = render(<ChatBoxSkeleton />)
    expect(container.firstChild).toBeTruthy()
  })
})
