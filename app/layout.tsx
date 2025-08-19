import './globals.css'

export const metadata = {
  title: 'Video Clipper',
  description: 'Clip videos with ease using Next.js and FFmpeg',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  )
}
