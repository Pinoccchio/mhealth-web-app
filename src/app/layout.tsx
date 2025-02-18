import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "mHealth Admin Dashboard",
  description: "Admin management system for mHealth Barangay San Cristobal",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geist.className} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}

