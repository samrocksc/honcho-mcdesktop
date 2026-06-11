import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Honcho Helpdesk',
  description: 'Read-only dashboard for self-hosted Honcho',
}

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body className="min-h-screen bg-base-200">
        <nav className="navbar bg-base-100 shadow-sm px-4">
          <a href="/" className="btn btn-ghost text-xl font-bold">
            Honcho Helpdesk
          </a>
        </nav>
        <main className="container mx-auto px-4 py-6 max-w-6xl">
          {children}
        </main>
      </body>
    </html>
  )
}
