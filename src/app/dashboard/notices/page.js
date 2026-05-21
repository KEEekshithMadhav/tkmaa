"use client"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Megaphone, Users, UserRound, MapPin, Loader2, Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function NoticesPage() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchAnnouncements() {
    setLoading(true)
    const { data } = await supabase
      .from('announcements')
      .select('*, branches(name)')
      .order('created_at', { ascending: false })
    if (data) setAnnouncements(data)
    setLoading(false)
  }

  useEffect(() => {
    async function loadAnnouncements() {
      await fetchAnnouncements()
    }

    loadAnnouncements()
  }, [])

  const ROLE_BADGE = { 
    all: 'border-gold text-gold bg-gold/10', 
    student: 'border-green-400 text-green-400 bg-green-400/10', 
    trainer: 'border-blue-400 text-blue-400 bg-blue-400/10', 
    parent: 'border-red-400 text-red-400 bg-red-400/10' 
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-gold animate-pulse shadow-[0_0_10px_rgba(214,184,106,0.5)]" />
            <h2 className="text-gold text-[10px] tracking-[0.5em] uppercase font-black">Communications</h2>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">Academy <span className="text-gold italic outline-text">Notices</span></h1>
        </div>
        <Button className="bg-gold text-black hover:bg-gold-dark font-bold uppercase tracking-widest px-8 h-12 rounded-none">
          <Plus className="mr-2" size={18} /> New Announcement
        </Button>
      </header>

      <div className="grid gap-6">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-gold" size={32} />
            <p className="text-[10px] uppercase tracking-widest text-white/40">Syncing Broadcasts...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="h-64 border border-dashed border-white/10 flex items-center justify-center text-white/30 uppercase tracking-widest text-xs">
            No active announcements found
          </div>
        ) : (
          announcements.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="bg-[#1B2230]/60 border-white/[0.06] backdrop-blur-xl rounded-none overflow-hidden group hover:border-gold/20 transition-all duration-500 hover:shadow-[0_0_25px_rgba(214,184,106,0.06)]">
                <CardContent className="p-0 flex flex-col md:flex-row">
                  <div className="p-6 md:w-16 bg-white/5 flex items-center justify-center border-b md:border-b-0 md:border-r border-white/10">
                    <Megaphone className="text-gold group-hover:scale-110 transition-transform" size={20} />
                  </div>
                  <div className="flex-1 p-6 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold tracking-tight uppercase text-white group-hover:text-gold transition-colors">{a.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] uppercase tracking-widest text-white/40">
                            {new Date(a.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                          </span>
                          <div className="w-1 h-1 rounded-full bg-white/20" />
                          <span className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-1">
                            <MapPin size={10} /> {a.branches?.name || 'All Branches'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-3 py-0.5 border text-[9px] font-black uppercase tracking-widest ${ROLE_BADGE[a.target_role]}`}>
                          Target: {a.target_role}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed max-w-4xl italic font-light">
                      &quot;{a.content}&quot;
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
