'use client'
import { ShieldAlert } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AccessDenied() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden bg-white/[0.02] border border-black/[0.05] rounded-3xl backdrop-blur-md">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-red-500/[0.03] blur-[80px] rounded-full pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative z-10 max-w-md flex flex-col items-center gap-6"
      >
        {/* Animated Icon Container */}
        <motion.div
          animate={{ 
            boxShadow: [
              '0 0 20px rgba(239,68,68,0.1)',
              '0 0 40px rgba(239,68,68,0.2)',
              '0 0 20px rgba(239,68,68,0.1)'
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500"
        >
          <ShieldAlert size={38} className="animate-pulse" />
        </motion.div>

        <div className="space-y-3">
          <h2 className="text-xl font-black uppercase tracking-[0.2em] text-[#0A1F30]">
            Access Restricted
          </h2>
          <p className="text-sm font-medium text-[#0A1F30]/60 max-w-sm leading-relaxed">
            Your current account role does not have authorization to view this resource. If you believe this is an error, please contact your System Administrator.
          </p>
        </div>

        <Link href="/dashboard" passHref>
          <Button 
            className="mt-2 bg-[#0A1F30] text-white hover:bg-[#0A1F30]/90 font-black uppercase tracking-[0.2em] text-[10px] h-11 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all"
          >
            Back to Dashboard
          </Button>
        </Link>
      </motion.div>
    </div>
  )
}
