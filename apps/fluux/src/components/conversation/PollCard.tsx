/**
 * PollCard — Renders a poll within a message bubble.
 *
 * Shows the question, options with progress bars and vote counts,
 * and allows voting by clicking options.
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, BarChart3 } from 'lucide-react'
import { tallyPollResults, getTotalVoters, type PollData, type PollTally } from '@fluux/sdk'

export interface PollCardProps {
  poll: PollData
  reactions: Record<string, string[]>
  myReactions: string[]
  onVote?: (emoji: string) => void
  getReactorName: (reactor: string) => string
}

export function PollCard({ poll, reactions, myReactions, onVote, getReactorName }: PollCardProps) {
  const { t } = useTranslation()

  const tally = useMemo(() => tallyPollResults(poll, reactions), [poll, reactions])
  const totalVoters = useMemo(() => getTotalVoters(poll, reactions), [poll, reactions])

  const myVotedEmojis = useMemo(() => {
    const pollEmojis = new Set(poll.options.map((o) => o.emoji))
    return new Set(myReactions.filter((e) => pollEmojis.has(e)))
  }, [poll.options, myReactions])

  const hasVoted = myVotedEmojis.size > 0

  return (
    <div className="mt-1 rounded-lg border border-fluux-border bg-fluux-surface p-3 flex flex-col gap-2">
      {/* Question header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-fluux-brand flex-shrink-0" />
        <span className="font-medium text-fluux-text text-sm">{poll.question}</span>
      </div>

      {/* Voting mode indicator */}
      {poll.settings.allowMultiple && (
        <span className="text-xs text-fluux-muted">{t('poll.multipleAllowed', 'Select multiple options')}</span>
      )}

      {/* Options */}
      <div className="flex flex-col gap-1.5">
        {tally.map((option) => (
          <PollOption
            key={option.emoji}
            option={option}
            totalVoters={totalVoters}
            isMyVote={myVotedEmojis.has(option.emoji)}
            hasVoted={hasVoted}
            onVote={onVote}
            getReactorName={getReactorName}
          />
        ))}
      </div>

      {/* Total votes */}
      <div className="text-xs text-fluux-muted pt-0.5">
        {totalVoters === 0
          ? t('poll.noVotes', 'No votes yet')
          : t('poll.totalVotes', '{{count}} vote(s)', { count: totalVoters })}
      </div>
    </div>
  )
}

interface PollOptionProps {
  option: PollTally
  totalVoters: number
  isMyVote: boolean
  hasVoted: boolean
  onVote?: (emoji: string) => void
  getReactorName: (reactor: string) => string
}

function PollOption({ option, totalVoters, isMyVote, hasVoted, onVote, getReactorName }: PollOptionProps) {
  const percentage = totalVoters > 0 ? Math.round((option.count / totalVoters) * 100) : 0

  const voterNames = useMemo(() => {
    if (option.voters.length === 0) return ''
    return option.voters.map(getReactorName).join(', ')
  }, [option.voters, getReactorName])

  return (
    <button
      onClick={onVote ? () => onVote(option.emoji) : undefined}
      disabled={!onVote}
      className={`
        relative flex items-center gap-2 px-3 py-2 rounded-md border text-left transition-colors
        ${isMyVote
          ? 'border-fluux-brand bg-fluux-brand/10'
          : 'border-fluux-border bg-fluux-bg hover:bg-fluux-hover'
        }
        ${onVote ? 'cursor-pointer' : 'cursor-default'}
      `}
      title={voterNames || undefined}
    >
      {/* Progress bar background */}
      {hasVoted && totalVoters > 0 && (
        <div
          className={`absolute inset-0 rounded-md transition-all ${
            isMyVote ? 'bg-fluux-brand/15' : 'bg-fluux-hover/50'
          }`}
          style={{ width: `${percentage}%` }}
        />
      )}

      {/* Content (above progress bar) */}
      <div className="relative flex items-center gap-2 w-full">
        {/* Emoji */}
        <span className="text-sm flex-shrink-0">{option.emoji}</span>

        {/* Label */}
        <span className="text-sm text-fluux-text flex-1 truncate">{option.label}</span>

        {/* Vote count + check */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {hasVoted && (
            <span className="text-xs font-medium text-fluux-muted">
              {percentage}%
            </span>
          )}
          {option.count > 0 && (
            <span className="text-xs text-fluux-muted">
              ({option.count})
            </span>
          )}
          {isMyVote && (
            <Check className="w-3.5 h-3.5 text-fluux-brand" />
          )}
        </div>
      </div>
    </button>
  )
}
