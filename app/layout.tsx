import type { Metadata, Viewport } from 'next'
import { Archivo, Fraunces } from 'next/font/google'
import './globals.css'

/*
  Fraunces for display, Archivo for everything else.

  The logo's tagline is set in a sturdy, slightly wilful transitional serif;
  Fraunces is the closest thing on the web that is also variable, and its SOFT
  and WONK axes are what keep a headline in it from looking like a stock
  revival. Archivo carries the tracked-caps labels the print uses for its
  small type — a grotesque holds letterspacing at 10px where a serif falls
  apart. Neither is the default anything.
*/
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
})

const archivo = Archivo({ variable: '--font-archivo', subsets: ['latin'] })

export const metadata: Metadata = {
  /* Without this the OG image resolves against localhost, so the card is
     blank everywhere it is actually unfurled. */
  metadataBase: new URL('https://sushi-shop-neon.vercel.app'),
  title: 'SUSHIMEOW — 鮨 ねこもり',
  description:
    'A twelve-seat Edomae counter, rendered in the browser with react-three-fiber. Walk up to the shopfront, see tonight\u2019s set, and read the neta priced in yen.',
}

export const viewport: Viewport = {
  themeColor: '#e4d2b8',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
      The font variables go on <html>, not <body>: @theme's --font-sans is
      `var(--font-archivo), …`, and a custom property resolves its own
      var()s against the element it is declared on — :root. Declared any
      further down the tree and --font-sans computes to the
      guaranteed-invalid value everywhere, which is how the whole page
      silently reverts to the platform sans.
    */
    <html lang="en" className={`${fraunces.variable} ${archivo.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
