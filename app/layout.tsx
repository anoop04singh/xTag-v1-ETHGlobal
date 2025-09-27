import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AuthProvider } from '../context/AuthContext'

export const metadata: Metadata = {
  title: 'xTag',
  description: 'Your AI assistant, powered by xTag. Created with love by 0xanoop.',
  authors: [{ name: '0xanoop' }],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/XtagLogoBK.png" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/XtagLogoWh.png" media="(prefers-color-scheme: dark)" />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}