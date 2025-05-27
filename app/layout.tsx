import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PageTransition from './components/PageTransition'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Freshservice Dashboard',
  description: 'IT Support Dashboard powered by Freshservice',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50/50">
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </body>
    </html>
  )
} 