'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertDialog as Dialog, Toast } from 'radix-ui'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type ToastTone = 'success' | 'error' | 'info'

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  danger?: boolean
}

interface AskOptions extends ConfirmOptions {
  label: string
  placeholder?: string
  required?: boolean
  multiline?: boolean
}

interface Feedback {
  toast: (message: string, tone?: ToastTone) => void
  // Resolves to true when the user goes ahead
  confirm: (options: ConfirmOptions) => Promise<boolean>
  // Resolves to the typed text, or to null when the user cancels
  ask: (options: AskOptions) => Promise<string | null>
}

interface ToastEntry {
  id: number
  message: string
  tone: ToastTone
}

type OpenDialog = (ConfirmOptions & { field?: AskOptions }) | null

const FeedbackContext = createContext<Feedback | null>(null)

const TOAST_STYLE: Record<ToastTone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'text-emerald-600' },
  error: { icon: XCircle, className: 'text-destructive' },
  info: { icon: Info, className: 'text-primary' },
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const [text, setText] = useState('')
  const nextToastId = useRef(0)
  const settle = useRef<(result: string | null) => void>(() => {})
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    nextToastId.current += 1
    const id = nextToastId.current
    setToasts((current) => [...current, { id, message, tone }])
  }, [])

  const open = useCallback((next: NonNullable<OpenDialog>) => {
    setText('')
    setDialog(next)
    return new Promise<string | null>((resolve) => {
      settle.current = resolve
    })
  }, [])

  const value = useMemo<Feedback>(
    () => ({
      toast,
      confirm: async (options) => (await open(options)) !== null,
      ask: (options) => open({ ...options, field: options }),
    }),
    [open, toast]
  )

  function finish(result: string | null) {
    setDialog(null)
    settle.current(result)
  }

  const field = dialog?.field
  const isMissingText = Boolean(field?.required && !text.trim())

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isMissingText) finish(text.trim())
  }

  return (
    <FeedbackContext.Provider value={value}>
      <Toast.Provider swipeDirection="right" duration={5000}>
        {children}

        <Dialog.Root open={dialog !== null} onOpenChange={(isOpen) => !isOpen && finish(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50" />
            <Dialog.Content
              onOpenAutoFocus={(e) => {
                if (field) {
                  e.preventDefault()
                  ;(inputRef.current ?? textareaRef.current)?.focus()
                }
              }}
              className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-xl bg-card p-6 shadow-xl"
            >
              <form onSubmit={handleSubmit}>
                <Dialog.Title className="text-lg font-semibold">{dialog?.title}</Dialog.Title>
                <Dialog.Description
                  className={cn('mt-1.5 text-sm text-muted-foreground', !dialog?.description && 'sr-only')}
                >
                  {dialog?.description || dialog?.title}
                </Dialog.Description>

                {field && (
                  <div className="mt-4">
                    <Label htmlFor="feedback-field">{field.label}</Label>
                    {field.multiline ? (
                      <Textarea
                        ref={textareaRef}
                        id="feedback-field"
                        rows={3}
                        placeholder={field.placeholder}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                      />
                    ) : (
                      <Input
                        ref={inputRef}
                        id="feedback-field"
                        placeholder={field.placeholder}
                        autoComplete="off"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                      />
                    )}
                  </div>
                )}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Dialog.Cancel asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Dialog.Cancel>
                  <Button
                    type="submit"
                    disabled={isMissingText}
                    className={cn(dialog?.danger && 'bg-destructive text-white hover:bg-destructive/90')}
                  >
                    {dialog?.confirmLabel ?? 'Confirm'}
                  </Button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {toasts.map(({ id, message, tone }) => {
          const { icon: Icon, className } = TOAST_STYLE[tone]

          return (
            <Toast.Root
              key={id}
              type={tone === 'error' ? 'foreground' : 'background'}
              onOpenChange={(isOpen) => {
                if (!isOpen) setToasts((current) => current.filter((t) => t.id !== id))
              }}
              className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-lg"
            >
              <Icon className={cn('mt-0.5 size-5 shrink-0', className)} aria-hidden />
              <Toast.Description className="flex-1 text-sm">{message}</Toast.Description>
              <Toast.Close aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </Toast.Close>
            </Toast.Root>
          )
        })}

        {/* Sits above the contractor tab bar on phones */}
        <Toast.Viewport className="fixed right-0 bottom-20 z-[60] flex w-full max-w-sm flex-col gap-2 p-4 outline-none lg:bottom-0 print:hidden" />
      </Toast.Provider>
    </FeedbackContext.Provider>
  )
}

export function useFeedback(): Feedback {
  const feedback = useContext(FeedbackContext)
  if (!feedback) throw new Error('useFeedback must be used inside FeedbackProvider')

  return feedback
}
