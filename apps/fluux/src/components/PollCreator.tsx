/**
 * PollCreator — Modal for creating a new poll in a MUC room.
 */
import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Minus, Loader2 } from 'lucide-react'
import { MAX_POLL_OPTIONS, POLL_OPTION_EMOJIS } from '@fluux/sdk'
import { ModalShell } from './ModalShell'

interface PollCreatorProps {
  onClose: () => void
  onCreatePoll: (question: string, options: string[], allowMultiple: boolean) => Promise<void>
}

export function PollCreator({ onClose, onCreatePoll }: PollCreatorProps) {
  const { t } = useTranslation()

  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [sending, setSending] = useState(false)

  const canAddOption = options.length < MAX_POLL_OPTIONS
  const canRemoveOption = options.length > 2
  const isValid = question.trim().length > 0 && options.filter((o) => o.trim().length > 0).length >= 2

  const addOption = useCallback(() => {
    if (canAddOption) {
      setOptions((prev) => [...prev, ''])
    }
  }, [canAddOption])

  const removeOption = useCallback((index: number) => {
    if (canRemoveOption) {
      setOptions((prev) => prev.filter((_, i) => i !== index))
    }
  }, [canRemoveOption])

  const updateOption = useCallback((index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)))
  }, [])

  const handleSubmit = async () => {
    if (!isValid || sending) return
    const trimmedOptions = options.map((o) => o.trim()).filter((o) => o.length > 0)
    if (trimmedOptions.length < 2) return

    setSending(true)
    try {
      await onCreatePoll(question.trim(), trimmedOptions, allowMultiple)
      onClose()
    } catch {
      setSending(false)
    }
  }

  return (
    <ModalShell title={t('poll.create', 'Create Poll')} onClose={onClose} width="max-w-sm">
      <div className="p-4 flex flex-col gap-4">
        {/* Question */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-fluux-text">
            {t('poll.question', 'Question')}
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('poll.questionPlaceholder', 'Ask a question...')}
            className="px-3 py-2 rounded-md border border-fluux-border bg-fluux-bg text-fluux-text text-sm placeholder:text-fluux-muted focus:outline-none focus:border-fluux-brand"
            autoFocus
            maxLength={200}
          />
        </div>

        {/* Options */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-fluux-text">
            {t('poll.options', 'Options')}
          </label>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm flex-shrink-0 w-6 text-center">{POLL_OPTION_EMOJIS[index]}</span>
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={t('poll.optionPlaceholder', 'Option {{number}}', { number: index + 1 })}
                className="flex-1 px-3 py-2 rounded-md border border-fluux-border bg-fluux-bg text-fluux-text text-sm placeholder:text-fluux-muted focus:outline-none focus:border-fluux-brand"
                maxLength={100}
              />
              {canRemoveOption && (
                <button
                  onClick={() => removeOption(index)}
                  className="p-1 text-fluux-muted hover:text-red-500 transition-colors"
                  aria-label={t('poll.removeOption', 'Remove option')}
                >
                  <Minus className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {canAddOption && (
            <button
              onClick={addOption}
              className="flex items-center gap-1.5 text-sm text-fluux-brand hover:text-fluux-text transition-colors mt-1"
            >
              <Plus className="w-4 h-4" />
              {t('poll.addOption', 'Add option')}
            </button>
          )}
        </div>

        {/* Settings */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allowMultiple}
            onChange={(e) => setAllowMultiple(e.target.checked)}
            className="rounded border-fluux-border"
          />
          <span className="text-sm text-fluux-text">
            {t('poll.allowMultiple', 'Allow multiple votes')}
          </span>
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-fluux-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-fluux-muted hover:text-fluux-text transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || sending}
            className="px-4 py-2 text-sm font-medium text-white bg-fluux-brand rounded-md hover:bg-fluux-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('poll.send', 'Send Poll')}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
