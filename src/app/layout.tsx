import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ToastProvider from '@/components/ToastProvider';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Attendance Pro - Modern Attendance Management System",
  description: "A professional attendance management system for schools and colleges with admin, teacher, and student portals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
