import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sushi — Handcrafted in WebGL',
  description:
    'A low-poly sushi set rendered in the browser with react-three-fiber, shown with its authored unlit materials and with a converted PBR treatment.',
}

export const viewport: Viewport = {
  themeColor: '#efe7dc',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          The GLB is the largest thing on the critical path and is fetched by a
          lazily-imported client chunk, so the browser would otherwise not
          learn about it until late.
        */}
        <link rel="preload" href="/models/sushis.glb" as="fetch" crossOrigin="anonymous" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
