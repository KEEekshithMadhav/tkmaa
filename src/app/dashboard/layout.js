"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Sidebar from "@/components/Sidebar"
import CommandPalette from "@/components/CommandPalette"
import ThreeBackground from "@/components/ThreeBackground"
import { supabase } from "@/lib/supabase"
import { Shield } from "lucide-react"
import Image from "next/image"

export default function DashboardLayout({ children }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
      } else {
        setSession(session)
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 relative overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at center, #111827 0%, #0B0F19 100%)' }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 grid-overlay opacity-30" />
        
        {/* Ambient glows */}
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-gold/[0.04] blur-[120px] rounded-full animate-glow-pulse" />
        <div className="absolute bottom-1/3 right-1/3 w-[300px] h-[300px] bg-blue-500/[0.03] blur-[100px] rounded-full animate-glow-pulse" style={{ animationDelay: '2s' }} />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col items-center"
        >
          {/* Animated logo */}
          <motion.div
            animate={{ 
              boxShadow: [
                '0 0 20px rgba(214,184,106,0.2)',
                '0 0 40px rgba(214,184,106,0.4)',
                '0 0 20px rgba(214,184,106,0.2)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center mb-8 border-2 border-gold/30"
          >
            <Image src="/logo.png" alt="TKMAA" width={80} height={80} className="object-cover w-full h-full" />
          </motion.div>
          
          <p className="text-[10px] uppercase tracking-[0.5em] text-white/40 font-black mb-6">
            Establishing Secure Connection
          </p>
          
          {/* Loading dots */}
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                animate={{ 
                  opacity: [0.2, 1, 0.2],
                  scaleY: [1, 2, 1]
                }}
                transition={{ 
                  duration: 0.8, 
                  repeat: Infinity, 
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
                className="w-1 h-4 bg-gold/60"
              />
            ))}
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen text-white font-rajdhani relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 70% 20%, #1B2230 0%, #111827 40%, #0B0F19 100%)' }}
    >
      <ThreeBackground />
      <Sidebar />
      <CommandPalette />
      <main className="flex-1 p-6 md:p-8 lg:p-12 relative z-10 overflow-y-auto">
        {/* Grid overlay for depth */}
        <div className="fixed inset-0 grid-overlay opacity-20 pointer-events-none z-0" />
        
        {/* Ambient background gradients */}
        <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-gold/[0.03] blur-[150px] -z-10 pointer-events-none animate-glow-pulse" />
        <div className="fixed bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-500/[0.02] blur-[130px] -z-10 pointer-events-none animate-glow-pulse" style={{ animationDelay: '3s' }} />
        
        <AnimatePresence mode="wait">
          <motion.div 
            key="dashboard-content"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-7xl mx-auto relative z-10"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
