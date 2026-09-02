import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ExchangeModal from '../../components/ExchangeModal'

describe('ExchangeModal component @unit', () => {
  it('returns null when visible is false', () => {
    const { container } = render(
      <ExchangeModal visible={false} cards={['DUKE', 'ASSASSIN']} currentCardCount={2} onSelect={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('returns null when cards is empty', () => {
    const { container } = render(
      <ExchangeModal visible={true} cards={[]} currentCardCount={2} onSelect={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('returns null when cards is null', () => {
    const { container } = render(
      <ExchangeModal visible={true} cards={null} currentCardCount={2} onSelect={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders card buttons when visible with cards', () => {
    render(
      <ExchangeModal visible={true} cards={['DUKE', 'ASSASSIN', 'CAPTAIN']} currentCardCount={2} onSelect={vi.fn()} />
    )

    expect(screen.getByText('DUKE')).toBeInTheDocument()
    expect(screen.getByText('ASSASSIN')).toBeInTheDocument()
    expect(screen.getByText('CAPTAIN')).toBeInTheDocument()
  })

  it('displays the title with card count', () => {
    render(
      <ExchangeModal visible={true} cards={['DUKE', 'ASSASSIN']} currentCardCount={2} onSelect={vi.fn()} />
    )

    expect(screen.getByText('Choose 2 cards to keep')).toBeInTheDocument()
  })

  it('displays singular form for 1 card', () => {
    render(
      <ExchangeModal visible={true} cards={['DUKE']} currentCardCount={1} onSelect={vi.fn()} />
    )

    expect(screen.getByText('Choose 1 card to keep')).toBeInTheDocument()
  })

  it('shows selection counter', () => {
    render(
      <ExchangeModal visible={true} cards={['DUKE', 'ASSASSIN']} currentCardCount={2} onSelect={vi.fn()} />
    )

    expect(screen.getByText('0 / 2 selected')).toBeInTheDocument()
  })

  it('toggles card selection on click', () => {
    render(
      <ExchangeModal visible={true} cards={['DUKE', 'ASSASSIN']} currentCardCount={2} onSelect={vi.fn()} />
    )

    fireEvent.click(screen.getByText('DUKE'))
    expect(screen.getByText('1 / 2 selected')).toBeInTheDocument()

    // Click again to deselect
    fireEvent.click(screen.getByText('DUKE'))
    expect(screen.getByText('0 / 2 selected')).toBeInTheDocument()
  })

  it('prevents selecting more cards than currentCardCount', () => {
    render(
      <ExchangeModal visible={true} cards={['DUKE', 'ASSASSIN', 'CAPTAIN']} currentCardCount={2} onSelect={vi.fn()} />
    )

    fireEvent.click(screen.getByText('DUKE'))
    fireEvent.click(screen.getByText('ASSASSIN'))

    // Third card should be disabled
    const captainBtn = screen.getByText('CAPTAIN').closest('button')
    expect(captainBtn).toBeDisabled()
  })

  it('calls onSelect when confirm button is clicked with correct number of cards', () => {
    const onSelect = vi.fn()
    render(
      <ExchangeModal visible={true} cards={['DUKE', 'ASSASSIN']} currentCardCount={2} onSelect={onSelect} />
    )

    fireEvent.click(screen.getByText('DUKE'))
    fireEvent.click(screen.getByText('ASSASSIN'))

    fireEvent.click(screen.getByText('Confirm Selection'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(['DUKE0', 'ASSASSIN1'])
  })

  it('confirm button is disabled when not enough cards selected', () => {
    render(
      <ExchangeModal visible={true} cards={['DUKE', 'ASSASSIN']} currentCardCount={2} onSelect={vi.fn()} />
    )

    const confirmBtn = screen.getByText('Confirm Selection')
    expect(confirmBtn).toBeDisabled()

    fireEvent.click(screen.getByText('DUKE'))
    expect(confirmBtn).toBeDisabled()
  })

  it('resets selection after confirming', () => {
    render(
      <ExchangeModal visible={true} cards={['DUKE', 'ASSASSIN']} currentCardCount={2} onSelect={vi.fn()} />
    )

    fireEvent.click(screen.getByText('DUKE'))
    fireEvent.click(screen.getByText('ASSASSIN'))
    fireEvent.click(screen.getByText('Confirm Selection'))

    expect(screen.getByText('0 / 2 selected')).toBeInTheDocument()
  })

  it('displays the info badge', () => {
    render(
      <ExchangeModal visible={true} cards={['DUKE']} currentCardCount={1} onSelect={vi.fn()} />
    )

    expect(screen.getByText('Exchange')).toBeInTheDocument()
  })
})
