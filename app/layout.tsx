import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'

const _inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'ZIP Explorer - Browse ZIP File Contents',
  description:
    'Upload a ZIP file, browse its file tree like macOS Finder, and export the structure to JSON.',
}

export const viewport: Viewport = {
  themeColor: '#f0f1f4',
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased overflow-hidden">{children}</body>
    </html>
  )
}
