'use client'

import dynamic from 'next/dynamic'

const Stage = dynamic(() => import('@/components/stage'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,#faf4ea_0%,#e7dccb_55%,#d8c9b3_100%)]" />
  ),
})

export function StageLoader() {
  return <Stage />
}
