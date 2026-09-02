import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PrimaryButton from '../../components/PrimaryButton'

describe('PrimaryButton component @unit', () => {
  it('renders with the given text', () => {
    render(<PrimaryButton text="Click Me" />)
    expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<PrimaryButton text="Submit" onClick={handleClick} />)

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn()
    render(<PrimaryButton text="Disabled" onClick={handleClick} disabled />)

    fireEvent.click(screen.getByRole('button', { name: 'Disabled' }))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies disabled attribute when disabled prop is true', () => {
    render(<PrimaryButton text="Btn" disabled />)
    expect(screen.getByRole('button', { name: 'Btn' })).toBeDisabled()
  })

  it('applies width and height styles', () => {
    render(<PrimaryButton text="Sized" width="200px" height="50px" />)
    const button = screen.getByRole('button', { name: 'Sized' })
    expect(button.style.width).toBe('200px')
    expect(button.style.height).toBe('50px')
  })

  it('applies variant class', () => {
    const { container } = render(<PrimaryButton text="Danger" variant="danger" />)
    const button = container.querySelector('button')
    expect(button.className).toContain('danger')
  })

  it('applies pulse class when pulse is true', () => {
    const { container } = render(<PrimaryButton text="Pulse" pulse />)
    const button = container.querySelector('button')
    expect(button.className).toContain('primaryPulse')
  })

  it('does not apply pulse class when pulse is false', () => {
    const { container } = render(<PrimaryButton text="No Pulse" />)
    const button = container.querySelector('button')
    expect(button.className).not.toContain('primaryPulse')
  })
})
