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
      {/*
        The GLB preload lives on the home route (components/preload-model),
        not here: a hint in the root layout fires on every route beneath it,
        including ones that never mount the canvas.
      */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
