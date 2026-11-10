const BLOCK = 'animate-pulse rounded-lg bg-slate-200/70'

export default function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <div className={`${BLOCK} mb-2 h-7 w-48`} />
      <div className={`${BLOCK} mb-6 h-4 w-72 max-w-full`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className={`${BLOCK} h-24`} />
        <div className={`${BLOCK} h-24`} />
        <div className={`${BLOCK} hidden h-24 lg:block`} />
      </div>
      <div className={`${BLOCK} h-72`} />
    </div>
  )
}
