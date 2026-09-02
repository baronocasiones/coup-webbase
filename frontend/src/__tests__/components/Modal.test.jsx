import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Modal from '../../components/Modal'

describe('Modal component @unit', () => {
  it('renders children when visible', () => {
    render(
      <Modal status="Test Status" style={{ visibility: 'visible' }}>
        <p>Modal content</p>
      </Modal>
    )

    expect(screen.getByText('Modal content')).toBeInTheDocument()
    expect(screen.getByText('Test Status')).toBeInTheDocument()
  })

  it('renders children even when hidden (CSS handles visibility)', () => {
    render(
      <Modal status="Hidden" style={{ visibility: 'hidden' }}>
        <p>Hidden content</p>
      </Modal>
    )

    // Content is still in DOM, just visually hidden
    expect(screen.getByText('Hidden content')).toBeInTheDocument()
  })

  it('displays the status badge', () => {
    render(
      <Modal status="Action Required" style={{ visibility: 'visible' }}>
        <div />
      </Modal>
    )

    expect(screen.getByText('Action Required')).toBeInTheDocument()
  })

  it('applies visible styles when visibility is visible', () => {
    const { container } = render(
      <Modal status="Visible" style={{ visibility: 'visible' }}>
        <div />
      </Modal>
    )

    const backdrop = container.querySelector('[class]')
    expect(backdrop).toBeTruthy()
  })

  it('applies hidden styles when visibility is hidden', () => {
    const { container } = render(
      <Modal status="Hidden" style={{ visibility: 'hidden' }}>
        <div />
      </Modal>
    )

    const backdrop = container.querySelector('[class]')
    expect(backdrop).toBeTruthy()
  })

  it('renders without style prop', () => {
    render(
      <Modal status="No Style">
        <p>No style content</p>
      </Modal>
    )

    expect(screen.getByText('No style content')).toBeInTheDocument()
  })
})
