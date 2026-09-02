import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import InfluencePicker from '../../components/InfluencePicker'

describe('InfluencePicker component @unit', () => {
  it('returns null when visible is false', () => {
    const { container } = render(
      <InfluencePicker visible={false} cards={['DUKE', 'ASSASSIN']} onSelect={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('returns null when cards is empty', () => {
    const { container } = render(
      <InfluencePicker visible={true} cards={[]} onSelect={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('returns null when cards is null', () => {
    const { container } = render(
      <InfluencePicker visible={true} cards={null} onSelect={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders card buttons when visible with cards', () => {
    render(
      <InfluencePicker visible={true} cards={['DUKE', 'ASSASSIN']} onSelect={vi.fn()} />
    )

    expect(screen.getByText('DUKE')).toBeInTheDocument()
    expect(screen.getByText('ASSASSIN')).toBeInTheDocument()
  })

  it('displays the title text', () => {
    render(
      <InfluencePicker visible={true} cards={['DUKE']} onSelect={vi.fn()} />
    )

    expect(screen.getByText('Choose a card to lose')).toBeInTheDocument()
  })

  it('displays the description text', () => {
    render(
      <InfluencePicker visible={true} cards={['DUKE']} onSelect={vi.fn()} />
    )

    expect(screen.getByText(/permanently remove one influence/)).toBeInTheDocument()
  })

  it('calls onSelect with the card name when a card is clicked', () => {
    const onSelect = vi.fn()
    render(
      <InfluencePicker visible={true} cards={['DUKE', 'ASSASSIN']} onSelect={onSelect} />
    )

    fireEvent.click(screen.getByText('DUKE'))
    expect(onSelect).toHaveBeenCalledWith('DUKE')
  })

  it('calls onSelect with the correct card for each button', () => {
    const onSelect = vi.fn()
    render(
      <InfluencePicker visible={true} cards={['CAPTAIN', 'CONTESSA']} onSelect={onSelect} />
    )

    fireEvent.click(screen.getByText('CAPTAIN'))
    expect(onSelect).toHaveBeenCalledWith('CAPTAIN')

    fireEvent.click(screen.getByText('CONTESSA'))
    expect(onSelect).toHaveBeenCalledWith('CONTESSA')
  })

  it('renders the danger badge', () => {
    render(
      <InfluencePicker visible={true} cards={['DUKE']} onSelect={vi.fn()} />
    )

    expect(screen.getByText('Influence Lost')).toBeInTheDocument()
  })
})
