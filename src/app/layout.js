import { Rajdhani } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const font = Rajdhani({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-rajdhani",
});

export const metadata = {
  title: "TKMAA | Thammando Karate Martial Arts Academy",
  description: "Premium Martial Arts Academy Management System — Real-time analytics, branch management, and performance tracking.",
  keywords: "martial arts, academy management, karate, thammando, TKMAA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark h-full" suppressHydrationWarning>
      <body className={`${font.variable} font-sans bg-[#0B0F19] text-[#F8FAFC] antialiased selection:bg-[#D6B86A]/40 selection:text-white min-h-full flex flex-col`}>
        {children}
        <Toaster 
          position="top-right" 
          richColors 
          theme="dark" 
          toastOptions={{
            style: {
              borderRadius: '0',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              fontFamily: 'var(--font-rajdhani)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: '700',
              fontSize: '11px',
            }
          }}
        />
      </body>
    </html>
  );
}
