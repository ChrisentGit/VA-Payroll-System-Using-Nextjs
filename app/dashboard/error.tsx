'use client'

import ErrorPanel from '@/components/shell/ErrorPanel'

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorPanel error={error} retry={retry} />
}
