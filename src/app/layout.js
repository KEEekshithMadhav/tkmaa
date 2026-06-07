import { Sora, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const fontSora = Sora({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-sora",
});

const fontHanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-hanken-grotesk",
});

const fontJetBrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
});

export const metadata = {
  title: "TKMAA | Thammando Karate Martial Arts Academy",
  description: "Premium Martial Arts Academy Management System — Real-time analytics, branch management, and performance tracking.",
  keywords: "martial arts, academy management, karate, thammando, TKMAA",
};

export default function RootLayout({ children }) {
  const fontVariables = `${fontSora.variable} ${fontHanken.variable} ${fontJetBrains.variable}`;
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${fontVariables} font-sans bg-[#f7faf9] text-[#0A1F30] antialiased selection:bg-[#C5A059]/40 selection:text-[#0A1F30] min-h-full flex flex-col`}>
        {children}
        <Toaster 
          position="top-right" 
          richColors 
          theme="light" 
          toastOptions={{
            style: {
              borderRadius: '0',
              border: '1px solid rgba(15, 23, 42, 0.06)',
              backdropFilter: 'blur(20px)',
              fontFamily: 'var(--font-hanken-grotesk)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: '700',
              fontSize: '11px',
              color: '#0f172a',
              background: 'rgba(255,255,255,0.92)',
            }
          }}
        />
      </body>
    </html>
  );
}
