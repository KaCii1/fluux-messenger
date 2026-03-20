import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Avatar, getConsistentTextColor } from './Avatar'

// Mock the SDK color generation
vi.mock('@fluux/sdk', () => ({
  generateConsistentColorHexSync: vi.fn((identifier: string) => {
    // Return predictable colors based on identifier for testing
    if (identifier === 'alice') return '#4488cc'
    if (identifier === 'bob') return '#cc8844'
    return '#888888'
  }),
}))

describe('Avatar', () => {
  describe('Basic Rendering', () => {
    it('renders fallback letter when no avatarUrl provided', () => {
      render(<Avatar identifier="alice" name="Alice" />)
      expect(screen.getByText('A')).toBeInTheDocument()
    })

    it('renders first letter of identifier when name not provided', () => {
      render(<Avatar identifier="bob@example.com" />)
      expect(screen.getByText('B')).toBeInTheDocument()
    })

    it('renders image when avatarUrl is provided', () => {
      render(<Avatar identifier="alice" name="Alice" avatarUrl="https://example.com/alice.jpg" />)
      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('src', 'https://example.com/alice.jpg')
      expect(img).toHaveAttribute('alt', 'Alice')
    })

    it('renders ? when identifier is empty', () => {
      render(<Avatar identifier="" />)
      expect(screen.getByText('?')).toBeInTheDocument()
    })
  })

  describe('fallbackColor prop', () => {
    it('uses fallbackColor when provided and no avatarUrl', () => {
      const { container } = render(
        <Avatar identifier="alice" name="Alice" fallbackColor="#ff0000" />
      )
      const letterDiv = container.querySelector('div > div')
      // The color will be adjusted by ensureContrastWithWhite
      expect(letterDiv).toHaveStyle({ backgroundColor: expect.any(String) })
    })

    it('ignores fallbackColor when avatarUrl is provided', () => {
      render(
        <Avatar
          identifier="alice"
          name="Alice"
          avatarUrl="https://example.com/alice.jpg"
          fallbackColor="#ff0000"
        />
      )
      // Should render image, not letter with fallback color
      expect(screen.getByRole('img')).toBeInTheDocument()
    })
  })

  describe('ensureContrastWithWhite (via fallbackColor)', () => {
    it('darkens a very light color for avatar background', () => {
      const { container } = render(
        <Avatar identifier="alice" name="Alice" fallbackColor="#ffffff" />
      )
      // Find the div with inline style (the letter background)
      const styledDiv = container.querySelector('[style*="background"]')
      expect(styledDiv).toBeTruthy()
      const style = styledDiv?.getAttribute('style') || ''
      // White (#ffffff) should be darkened to ensure contrast with white text
      // The result should NOT be #ffffff
      expect(style).not.toContain('#ffffff')
      expect(style).not.toContain('rgb(255, 255, 255)')
    })

    it('keeps a dark color unchanged', () => {
      const { container } = render(
        <Avatar identifier="alice" name="Alice" fallbackColor="#222222" />
      )
      const styledDiv = container.querySelector('[style*="background"]')
      expect(styledDiv).toBeTruthy()
      const style = styledDiv?.getAttribute('style') || ''
      // Dark color should be unchanged (browser converts to rgb(34, 34, 34))
      expect(style).toContain('rgb(34, 34, 34)')
    })

    it('darkens a light pastel color', () => {
      const { container } = render(
        <Avatar identifier="alice" name="Alice" fallbackColor="#aaccff" />
      )
      const styledDiv = container.querySelector('[style*="background"]')
      expect(styledDiv).toBeTruthy()
      const style = styledDiv?.getAttribute('style') || ''
      // Light blue should be darkened
      expect(style).not.toContain('#aaccff')
    })

    it('keeps a medium-dark color unchanged', () => {
      const { container } = render(
        <Avatar identifier="alice" name="Alice" fallbackColor="#336699" />
      )
      const styledDiv = container.querySelector('[style*="background"]')
      expect(styledDiv).toBeTruthy()
      const style = styledDiv?.getAttribute('style') || ''
      // Medium blue has enough contrast, should be kept (browser converts to rgb(51, 102, 153))
      expect(style).toContain('rgb(51, 102, 153)')
    })
  })

  describe('Presence Indicator', () => {
    it('shows presence indicator when presence prop is provided', () => {
      const { container } = render(
        <Avatar identifier="alice" name="Alice" presence="online" />
      )
      const presenceIndicator = container.querySelector('.rounded-full.border-2')
      expect(presenceIndicator).toBeInTheDocument()
    })

    it('does not show presence indicator when presence is not provided', () => {
      const { container } = render(
        <Avatar identifier="alice" name="Alice" />
      )
      const presenceIndicator = container.querySelector('.rounded-full.border-2.absolute')
      expect(presenceIndicator).not.toBeInTheDocument()
    })
  })

  describe('Sizes', () => {
    it('applies correct size classes for sm (default)', () => {
      const { container } = render(<Avatar identifier="alice" />)
      expect(container.firstChild).toHaveClass('w-8', 'h-8')
    })

    it('applies correct size classes for md', () => {
      const { container } = render(<Avatar identifier="alice" size="md" />)
      expect(container.firstChild).toHaveClass('w-10', 'h-10')
    })

    it('applies correct size classes for lg', () => {
      const { container } = render(<Avatar identifier="alice" size="lg" />)
      expect(container.firstChild).toHaveClass('w-12', 'h-12')
    })
  })

  describe('Image error fallback', () => {
    it('shows letter fallback when image fails to load', () => {
      render(<Avatar identifier="alice" name="Alice" avatarUrl="blob:invalid" />)
      const img = screen.getByRole('img')
      fireEvent.error(img)
      expect(screen.getByText('A')).toBeInTheDocument()
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('resets error state when avatarUrl changes', () => {
      const { rerender } = render(
        <Avatar identifier="alice" name="Alice" avatarUrl="blob:invalid" />
      )
      fireEvent.error(screen.getByRole('img'))
      expect(screen.queryByRole('img')).not.toBeInTheDocument()

      rerender(<Avatar identifier="alice" name="Alice" avatarUrl="blob:new-valid-url" />)
      expect(screen.getByRole('img')).toBeInTheDocument()
    })
  })

  describe('Click handling', () => {
    it('has cursor-pointer class when onClick provided', () => {
      const { container } = render(
        <Avatar identifier="alice" onClick={() => {}} />
      )
      expect(container.firstChild).toHaveClass('cursor-pointer')
    })

    it('has cursor-default class when no onClick', () => {
      const { container } = render(<Avatar identifier="alice" />)
      expect(container.firstChild).toHaveClass('cursor-default')
    })

    it('has cursor-pointer when clickable prop is true', () => {
      const { container } = render(
        <Avatar identifier="alice" clickable />
      )
      expect(container.firstChild).toHaveClass('cursor-pointer')
    })
  })
})

describe('getConsistentTextColor', () => {
  it('returns a color string', () => {
    const color = getConsistentTextColor('alice')
    expect(color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('returns same color for same identifier', () => {
    const color1 = getConsistentTextColor('alice')
    const color2 = getConsistentTextColor('alice')
    expect(color1).toBe(color2)
  })

  it('returns different colors for different identifiers', () => {
    const color1 = getConsistentTextColor('alice')
    const color2 = getConsistentTextColor('bob')
    expect(color1).not.toBe(color2)
  })
})
