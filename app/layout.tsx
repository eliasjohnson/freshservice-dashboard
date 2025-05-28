import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PageTransition from './components/PageTransition'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pattern ITSM Dashboard',
  description: "IT Support Dashboard powered by Pattern's ITSM Freshservice",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PageTransition>
          {children}
        </PageTransition>
      </body>
    </html>
  )
}