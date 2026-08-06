import type { Metadata } from 'next';
import { Lexend } from 'next/font/google';
import { MotionConfig } from 'framer-motion';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';

const lexend = Lexend({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'CodeForge — DSA & Competitive Programming',
  description:
    'Practice DSA, execute code in 5 languages, get guided code reviews and hints, compete in rated contests, and prepare for technical interviews — all in one platform.',
  keywords: ['DSA', 'competitive programming', 'coding practice', 'code review', 'interview prep', 'LeetCode alternative'],
  openGraph: {
    title: 'CodeForge',
    description: 'DSA and competitive programming platform',
    type: 'website',
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${lexend.variable} bg-[#08080a] text-stone-100 min-h-screen antialiased flex flex-col font-sans`}
      >
        <AuthProvider>
          <MotionConfig reducedMotion="user">
            <ToastProvider>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </ToastProvider>
          </MotionConfig>
        </AuthProvider>
      </body>
    </html>
  );
}
