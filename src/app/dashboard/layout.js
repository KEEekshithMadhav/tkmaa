"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Sidebar from "@/components/Sidebar"
import CommandPalette from "@/components/CommandPalette"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { BranchProvider } from "@/context/BranchContext"

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
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 relative overflow-hidden bg-[#F8F9FA]">
        {/* Subtle ambient glow */}
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-[#C5A059]/[0.04] blur-[120px] rounded-full" />
        <div className="absolute bottom-1/3 right-1/3 w-[300px] h-[300px] bg-[#0A1F30]/[0.03] blur-[100px] rounded-full" />
        
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
                '0 0 20px rgba(197,160,89,0.15)',
                '0 0 40px rgba(197,160,89,0.25)',
                '0 0 20px rgba(197,160,89,0.15)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center mb-8 border-2 border-[#C5A059]/30"
          >
            <Image src="/logo.png" alt="TKMAA" width={80} height={80} className="object-cover w-full h-full" />
          </motion.div>
          
          <p className="text-[10px] uppercase tracking-[0.5em] text-[#0A1F30]/40 font-black mb-6">
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
                className="w-1 h-4 bg-[#C5A059]/60 rounded-full"
              />
            ))}
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <BranchProvider>
      <div className="flex min-h-screen text-[#0A1F30] relative overflow-hidden bg-[#F8F9FA]">
        <Sidebar />
        <CommandPalette />
        <main className="flex-1 p-6 md:p-8 lg:p-12 relative z-10 overflow-y-auto">
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
    </BranchProvider>
  )
}
