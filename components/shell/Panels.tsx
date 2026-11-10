import { Card, CardContent } from '@/components/ui/card'

// Frames a table, which scrolls inside the frame on narrow screens
export function TablePanel({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-xl border bg-card shadow-xs">{children}</div>
}

export function FormPanel({ children }: { children: React.ReactNode }) {
  return (
    <Card className="max-w-2xl">
      <CardContent>{children}</CardContent>
    </Card>
  )
}
