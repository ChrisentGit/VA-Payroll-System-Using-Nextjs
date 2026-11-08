'use client'

import { Button } from '@/components/ui/button'

export default function PrintButton() {
  return (
    <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
      Print / Save as PDF
    </Button>
  )
}
