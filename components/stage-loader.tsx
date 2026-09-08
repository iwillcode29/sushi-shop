'use client'

import dynamic from 'next/dynamic'

const Stage = dynamic(() => import('@/components/stage'), {
  ssr: false,
  loading: () => (
    // The paper, lit from its middle the way the print is — so the canvas
    // fading in over this is a continuation rather than a swap.
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,#f4e7d2_0%,#e4d2b8_58%,#cdb492_100%)]" />
  ),
})

export function StageLoader() {
  return <Stage />
}
