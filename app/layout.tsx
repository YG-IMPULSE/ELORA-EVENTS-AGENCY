import './globals.css'
import { metadata } from './metadata'

// oxlint-disable-next-line react/only-export-components
export { metadata }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}