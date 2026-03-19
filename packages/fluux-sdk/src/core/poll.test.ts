import { describe, it, expect } from 'vitest'
import { createMockElement } from './test-utils'
import {
  POLL_OPTION_EMOJIS,
  MAX_POLL_OPTIONS,
  buildPollData,
  buildPollFallbackBody,
  parsePollElement,
  tallyPollResults,
  getTotalVoters,
  enforceSingleVote,
  enforceMultiVote,
  hasVotedOnPoll,
  getPollOptionEmojis,
} from './poll'

describe('poll utilities', () => {
  describe('constants', () => {
    it('should have 4 option emojis', () => {
      expect(POLL_OPTION_EMOJIS).toEqual(['1️⃣', '2️⃣', '3️⃣', '4️⃣'])
      expect(MAX_POLL_OPTIONS).toBe(4)
    })
  })

  describe('buildPollData', () => {
    it('should build poll data with default settings', () => {
      const poll = buildPollData('What for lunch?', ['Pizza', 'Sushi'])

      expect(poll.question).toBe('What for lunch?')
      expect(poll.options).toEqual([
        { emoji: '1️⃣', label: 'Pizza' },
        { emoji: '2️⃣', label: 'Sushi' },
      ])
      expect(poll.settings.allowMultiple).toBe(false)
    })

    it('should build poll with custom settings', () => {
      const poll = buildPollData('Pick topics', ['A', 'B', 'C'], { allowMultiple: true })

      expect(poll.options).toHaveLength(3)
      expect(poll.settings.allowMultiple).toBe(true)
    })

    it('should support up to 4 options', () => {
      const poll = buildPollData('Q?', ['A', 'B', 'C', 'D'])

      expect(poll.options).toHaveLength(4)
      expect(poll.options[3].emoji).toBe('4️⃣')
    })

    it('should throw for less than 2 options', () => {
      expect(() => buildPollData('Q?', ['Only one'])).toThrow('2-4 options')
    })

    it('should throw for more than 4 options', () => {
      expect(() => buildPollData('Q?', ['A', 'B', 'C', 'D', 'E'])).toThrow('2-4 options')
    })
  })

  describe('buildPollFallbackBody', () => {
    it('should build readable fallback text', () => {
      const body = buildPollFallbackBody('What for lunch?', ['Pizza', 'Sushi', 'Tacos'])

      expect(body).toBe(
        '📊 Poll: What for lunch?\n' +
        '1️⃣ Pizza\n' +
        '2️⃣ Sushi\n' +
        '3️⃣ Tacos'
      )
    })

    it('should work with 2 options', () => {
      const body = buildPollFallbackBody('Yes or no?', ['Yes', 'No'])

      expect(body).toBe(
        '📊 Poll: Yes or no?\n' +
        '1️⃣ Yes\n' +
        '2️⃣ No'
      )
    })
  })

  describe('parsePollElement', () => {
    it('should parse a valid poll element', () => {
      const pollEl = createMockElement('poll', { xmlns: 'urn:fluux:poll:0' }, [
        { name: 'question', text: 'What for lunch?' },
        { name: 'option', attrs: { emoji: '1️⃣' }, text: 'Pizza' },
        { name: 'option', attrs: { emoji: '2️⃣' }, text: 'Sushi' },
        { name: 'option', attrs: { emoji: '3️⃣' }, text: 'Tacos' },
      ])

      const poll = parsePollElement(pollEl)

      expect(poll).not.toBeNull()
      expect(poll!.question).toBe('What for lunch?')
      expect(poll!.options).toEqual([
        { emoji: '1️⃣', label: 'Pizza' },
        { emoji: '2️⃣', label: 'Sushi' },
        { emoji: '3️⃣', label: 'Tacos' },
      ])
      expect(poll!.settings.allowMultiple).toBe(false)
    })

    it('should parse allow-multiple attribute', () => {
      const pollEl = createMockElement('poll', { xmlns: 'urn:fluux:poll:0', 'allow-multiple': 'true' }, [
        { name: 'question', text: 'Pick topics' },
        { name: 'option', attrs: { emoji: '1️⃣' }, text: 'A' },
        { name: 'option', attrs: { emoji: '2️⃣' }, text: 'B' },
      ])

      const poll = parsePollElement(pollEl)

      expect(poll!.settings.allowMultiple).toBe(true)
    })

    it('should return null for missing question', () => {
      const pollEl = createMockElement('poll', { xmlns: 'urn:fluux:poll:0' }, [
        { name: 'option', attrs: { emoji: '1️⃣' }, text: 'A' },
        { name: 'option', attrs: { emoji: '2️⃣' }, text: 'B' },
      ])

      expect(parsePollElement(pollEl)).toBeNull()
    })

    it('should return null for less than 2 options', () => {
      const pollEl = createMockElement('poll', { xmlns: 'urn:fluux:poll:0' }, [
        { name: 'question', text: 'Q?' },
        { name: 'option', attrs: { emoji: '1️⃣' }, text: 'Only one' },
      ])

      expect(parsePollElement(pollEl)).toBeNull()
    })

    it('should skip options without emoji attribute', () => {
      const pollEl = createMockElement('poll', { xmlns: 'urn:fluux:poll:0' }, [
        { name: 'question', text: 'Q?' },
        { name: 'option', attrs: {}, text: 'No emoji' },
        { name: 'option', attrs: { emoji: '1️⃣' }, text: 'A' },
        { name: 'option', attrs: { emoji: '2️⃣' }, text: 'B' },
      ])

      const poll = parsePollElement(pollEl)

      expect(poll!.options).toHaveLength(2)
    })
  })

  describe('tallyPollResults', () => {
    const poll = buildPollData('Q?', ['Pizza', 'Sushi', 'Tacos'])

    it('should tally votes from reactions', () => {
      const reactions = {
        '1️⃣': ['alice', 'bob'],
        '2️⃣': ['carol'],
        '3️⃣': [],
      }

      const tally = tallyPollResults(poll, reactions)

      expect(tally).toEqual([
        { emoji: '1️⃣', label: 'Pizza', voters: ['alice', 'bob'], count: 2 },
        { emoji: '2️⃣', label: 'Sushi', voters: ['carol'], count: 1 },
        { emoji: '3️⃣', label: 'Tacos', voters: [], count: 0 },
      ])
    })

    it('should handle undefined reactions', () => {
      const tally = tallyPollResults(poll, undefined)

      expect(tally.every(t => t.count === 0)).toBe(true)
    })

    it('should handle empty reactions', () => {
      const tally = tallyPollResults(poll, {})

      expect(tally.every(t => t.count === 0)).toBe(true)
    })

    it('should ignore non-poll reactions', () => {
      const reactions = {
        '1️⃣': ['alice'],
        '👍': ['bob', 'carol'],
      }

      const tally = tallyPollResults(poll, reactions)

      expect(tally[0].count).toBe(1)
      expect(tally[1].count).toBe(0)
      expect(tally[2].count).toBe(0)
    })
  })

  describe('getTotalVoters', () => {
    const poll = buildPollData('Q?', ['A', 'B'])

    it('should count unique voters', () => {
      const reactions = {
        '1️⃣': ['alice', 'bob'],
        '2️⃣': ['carol'],
      }

      expect(getTotalVoters(poll, reactions)).toBe(3)
    })

    it('should deduplicate voters who voted multiple options', () => {
      const reactions = {
        '1️⃣': ['alice', 'bob'],
        '2️⃣': ['alice', 'carol'],
      }

      expect(getTotalVoters(poll, reactions)).toBe(3)
    })

    it('should return 0 for no reactions', () => {
      expect(getTotalVoters(poll, undefined)).toBe(0)
      expect(getTotalVoters(poll, {})).toBe(0)
    })
  })

  describe('enforceSingleVote', () => {
    const pollEmojis = ['1️⃣', '2️⃣', '3️⃣']

    it('should add new vote when no previous poll vote', () => {
      const result = enforceSingleVote([], '2️⃣', pollEmojis)
      expect(result).toEqual(['2️⃣'])
    })

    it('should replace previous poll vote with new one', () => {
      const result = enforceSingleVote(['1️⃣'], '2️⃣', pollEmojis)
      expect(result).toEqual(['2️⃣'])
    })

    it('should preserve non-poll reactions', () => {
      const result = enforceSingleVote(['👍', '1️⃣', '❤️'], '2️⃣', pollEmojis)
      expect(result).toEqual(['👍', '❤️', '2️⃣'])
    })

    it('should toggle off when voting same option', () => {
      const result = enforceSingleVote(['1️⃣'], '1️⃣', pollEmojis)
      expect(result).toEqual([])
    })

    it('should toggle off and preserve non-poll reactions', () => {
      const result = enforceSingleVote(['👍', '1️⃣'], '1️⃣', pollEmojis)
      expect(result).toEqual(['👍'])
    })
  })

  describe('enforceMultiVote', () => {
    it('should add new vote', () => {
      const result = enforceMultiVote([], '1️⃣')
      expect(result).toEqual(['1️⃣'])
    })

    it('should toggle off existing vote', () => {
      const result = enforceMultiVote(['1️⃣', '2️⃣'], '1️⃣')
      expect(result).toEqual(['2️⃣'])
    })

    it('should add vote alongside existing ones', () => {
      const result = enforceMultiVote(['1️⃣'], '2️⃣')
      expect(result).toEqual(['1️⃣', '2️⃣'])
    })
  })

  describe('hasVotedOnPoll', () => {
    const poll = buildPollData('Q?', ['A', 'B', 'C'])

    it('should return true when user has voted', () => {
      const reactions = { '2️⃣': ['alice', 'bob'] }
      expect(hasVotedOnPoll(poll, reactions, 'alice')).toBe(true)
    })

    it('should return false when user has not voted', () => {
      const reactions = { '1️⃣': ['alice'] }
      expect(hasVotedOnPoll(poll, reactions, 'bob')).toBe(false)
    })

    it('should return false for undefined reactions', () => {
      expect(hasVotedOnPoll(poll, undefined, 'alice')).toBe(false)
    })

    it('should return false for empty reactions', () => {
      expect(hasVotedOnPoll(poll, {}, 'alice')).toBe(false)
    })

    it('should not match non-poll reactions', () => {
      const reactions = { '👍': ['alice'] }
      expect(hasVotedOnPoll(poll, reactions, 'alice')).toBe(false)
    })
  })

  describe('getPollOptionEmojis', () => {
    it('should return emojis from poll options', () => {
      const poll = buildPollData('Q?', ['A', 'B', 'C'])
      expect(getPollOptionEmojis(poll)).toEqual(['1️⃣', '2️⃣', '3️⃣'])
    })
  })
})
