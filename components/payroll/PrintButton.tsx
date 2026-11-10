'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PrintButton() {
  return (
    <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
      <Printer aria-hidden />
      Print / Save as PDF
    </Button>
  )
}
