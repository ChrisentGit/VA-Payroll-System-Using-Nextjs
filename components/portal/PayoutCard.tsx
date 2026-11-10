import { Landmark } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { methodLabel, toMaskedDetail } from '@/lib/payment-details'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Read-only on purpose: a hijacked login must not be able to redirect anyone's pay.
export default async function PayoutCard({ contractorId }: { contractorId: string }) {
  const detail = await prisma.contractorPaymentDetail.findFirst({
    where: { contractorId, isDefault: true },
  })
  const masked = detail ? toMaskedDetail(detail) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where you get paid</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {masked ? (
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
              <Landmark className="size-[18px]" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="font-medium">{masked.bankName || methodLabel(masked.method)}</div>
              <div className="text-muted-foreground tabular-nums">{masked.accountNumberMasked}</div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">No payment details on file yet.</p>
        )}
        <p className="text-xs text-muted-foreground">To change this, contact your finance team.</p>
      </CardContent>
    </Card>
  )
}
