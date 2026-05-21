"use client"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Plus, MapPin, Phone, Clock, Users, 
  ShieldCheck, Loader2, ChevronRight, Globe,
  Activity, Zap, MoreVertical
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Skeleton } from "@/components/ui/skeleton"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { y: 25, opacity: 0, filter: "blur(8px)" },
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
}

export default function BranchesPage() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchBranches() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('branches')
        .select(`
          *,
          students:students(count),
          trainers:trainers(count)
        `)
      if (data) setBranches(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function loadBranches() {
      await fetchBranches()
    }

    loadBranches()
  }, [])

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <header className="flex justify-between items-end">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-64" />
          </div>
          <Skeleton className="h-12 w-48" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[450px] w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-20"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="w-2 h-2 rounded-full bg-gold animate-pulse shadow-[0_0_10px_rgba(214,184,106,0.5)]" />
            <h2 className="text-gold text-[10px] tracking-[0.5em] uppercase font-black">
              Network Architecture
            </h2>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none"
          >
            Operational <span className="text-gold italic outline-text">Hubs</span>
          </motion.h1>
        </div>
        <Button className="bg-gold text-black hover:bg-gold/90 font-black uppercase tracking-[0.3em] text-[9px] px-8 h-12 rounded-none glow-gold transition-all group">
          <Plus className="mr-2 group-hover:scale-125 transition-transform" size={16} /> Establish Hub
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {branches.map((branch, i) => (
          <motion.div key={branch.id} variants={itemVariants}>
            <Card className="bg-[#1B2230]/60 border-white/[0.06] backdrop-blur-xl rounded-none overflow-hidden relative group hover:border-gold/20 transition-all duration-500 hover:shadow-[0_0_30px_rgba(214,184,106,0.08)]">
              {/* Decorative Background Icon */}
              <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none group-hover:scale-110 duration-700 transform">
                <Globe size={240} />
              </div>
              <motion.div initial={{ top: "-5%" }} animate={{ top: "105%" }} transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: i * 0.5 }} className="absolute left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/10 to-transparent z-20 pointer-events-none" />
              
              <CardHeader className="border-b border-white/[0.04] p-8">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                      <span className="text-[9px] text-green-500 font-black uppercase tracking-[0.3em]">Operational</span>
                    </div>
                    <CardTitle className="text-2xl font-black text-white uppercase tracking-tighter mb-1">{branch.name}</CardTitle>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black">Ref ID: {branch.id.slice(0,12)}</p>
                  </div>
                  <Button variant="ghost" className="h-10 w-10 p-0 hover:bg-white/5 text-white/20 rounded-none">
                    <MoreVertical size={18} />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-8 space-y-10">
                <div className="space-y-6">
                  <div className="flex items-start gap-4 group/item">
                    <div className="w-10 h-10 bg-white/5 flex items-center justify-center border border-white/10 group-hover/item:border-gold/30 transition-colors">
                      <MapPin size={16} className="text-gold" />
                    </div>
                    <div>
                      <p className="text-[8px] uppercase tracking-[0.3em] text-white/20 font-black mb-1">Vector Coordinates</p>
                      <span className="text-xs uppercase tracking-widest leading-relaxed text-white/60 font-bold">{branch.address || branch.location}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8">
                    <div className="flex items-start gap-4 group/item">
                      <div className="w-10 h-10 bg-white/5 flex items-center justify-center border border-white/10 group-hover/item:border-gold/30 transition-colors">
                        <Phone size={16} className="text-gold" />
                      </div>
                      <div>
                        <p className="text-[8px] uppercase tracking-[0.3em] text-white/20 font-black mb-1">Comm Link</p>
                        <span className="text-xs uppercase tracking-widest text-white/60 font-bold">{branch.phone || '+91 98765 43210'}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 group/item">
                      <div className="w-10 h-10 bg-white/5 flex items-center justify-center border border-white/10 group-hover/item:border-gold/30 transition-colors">
                        <Clock size={16} className="text-gold" />
                      </div>
                      <div>
                        <p className="text-[8px] uppercase tracking-[0.3em] text-white/20 font-black mb-1">Uptime</p>
                        <span className="text-xs uppercase tracking-widest text-white/60 font-bold">{branch.timings || '06:00 - 21:00'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 pt-10 border-t border-white/[0.04]">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Users size={14} className="text-gold/40" />
                      <p className="text-3xl font-black text-white tracking-tighter">{branch.students?.[0]?.count || 0}</p>
                    </div>
                    <p className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-black">Registry</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Activity size={14} className="text-blue-400/40" />
                      <p className="text-3xl font-black text-blue-400 tracking-tighter">{branch.trainers?.[0]?.count || 0}</p>
                    </div>
                    <p className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-black">Personnel</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Zap size={14} className="text-green-400/40" />
                      <p className="text-3xl font-black text-green-400 tracking-tighter">98%</p>
                    </div>
                    <p className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-black">Efficiency</p>
                  </div>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <Button variant="outline" className="flex-1 rounded-none border-white/10 uppercase tracking-[0.2em] text-[10px] font-black h-14 hover:bg-gold hover:text-black hover:border-gold transition-all">
                    Personnel Access
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-none border-white/10 uppercase tracking-[0.2em] text-[10px] font-black h-14 hover:bg-white/10 transition-all group/btn">
                    Details <ChevronRight size={14} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
