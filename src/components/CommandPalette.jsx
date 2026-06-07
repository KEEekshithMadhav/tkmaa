"use client"
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Command, Users, MapPin, CreditCard, Award, X, CornerDownLeft, Trophy, Bell, CalendarCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

const searchItems = [
  { id: 'overview', title: 'Dashboard Overview', icon: Command, href: '/dashboard', shortcut: 'D' },
  { id: 'students', title: 'Search Students', icon: Users, href: '/dashboard/students', shortcut: 'S' },
  { id: 'trainers', title: 'Manage Trainers', icon: Award, href: '/dashboard/trainers', shortcut: 'T' },
  { id: 'branches', title: 'Branch Distribution', icon: MapPin, href: '/dashboard/branches', shortcut: 'B' },
  { id: 'payments', title: 'Financial Ledger', icon: CreditCard, href: '/dashboard/payments', shortcut: 'P' },
  { id: 'tournaments', title: 'Tournament Manager', icon: Trophy, href: '/dashboard/tournaments', shortcut: 'M' },
  { id: 'attendance', title: 'Attendance Registry', icon: CalendarCheck, href: '/dashboard/attendance', shortcut: 'A' },
  { id: 'notices', title: 'Announcements', icon: Bell, href: '/dashboard/notices', shortcut: 'N' },
]

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const inputRef = useRef(null)

  const toggle = useCallback(() => setIsOpen(open => !open), [])

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggle()
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [toggle])

  const navigate = useCallback((href) => {
    router.push(href)
    setIsOpen(false)
    setQuery('')
    setSelectedIndex(0)
  }, [router])

  const filteredItems = searchItems.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase())
  )

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
        navigate(filteredItems[selectedIndex].href)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, filteredItems, navigate])



  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[18vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-2xl bg-[#0A1F30]/95 border border-white/[0.08] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_40px_rgba(197,160,89,0.05)] overflow-hidden rounded-none backdrop-blur-2xl"
          >
            {/* Animated top border */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent origin-center"
            />

            {/* Search Input */}
            <div className="flex items-center px-6 border-b border-white/[0.08] h-16 relative">
              <Search className="text-gold/40 mr-4" size={18} />
              <input
                ref={inputRef}
                autoFocus
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent border-none outline-none text-sm uppercase tracking-widest font-bold placeholder:text-white/10 text-white"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedIndex(0)
                }}
              />
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/[0.08] text-[8px] font-black uppercase tracking-widest text-white/30">
                ESC
              </div>
            </div>

            {/* Results */}
            <div className="p-2 max-h-[380px] overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="p-10 text-center">
                  <Search size={32} className="text-white/5 mx-auto mb-4" />
                  <p className="text-white/20 uppercase text-[10px] tracking-widest font-black">
                    No commands found
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredItems.map((item, index) => (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => navigate(item.href)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center justify-between p-4 transition-all group text-left relative overflow-hidden ${
                        index === selectedIndex 
                          ? 'bg-gold text-black' 
                          : 'hover:bg-white/[0.03] text-white'
                      }`}
                    >
                      {/* Active indicator glow */}
                      {index === selectedIndex && (
                        <motion.div 
                          layoutId="command-active"
                          className="absolute inset-0 bg-gold -z-10"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      
                      <div className="flex items-center gap-4 relative z-10">
                        <item.icon size={16} className={`${index === selectedIndex ? 'text-black' : 'text-white/30 group-hover:text-gold/60'} transition-colors`} />
                        <span className="text-xs font-black uppercase tracking-widest">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-3 relative z-10">
                        <span className={`text-[9px] font-bold uppercase tracking-widest transition-opacity ${index === selectedIndex ? 'opacity-70' : 'opacity-0 group-hover:opacity-30'}`}>
                          Jump to
                        </span>
                        <div className={`w-6 h-6 border flex items-center justify-center text-[10px] font-black ${
                          index === selectedIndex ? 'border-black/20' : 'border-white/[0.08]'
                        }`}>
                          {item.shortcut}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-white/[0.02] border-t border-white/[0.08] flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-white/20">
                  <div className="p-1 border border-white/[0.08] rounded-sm bg-white/5"><CornerDownLeft size={8} /></div>
                  select
                </div>
                <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-white/20">
                  <div className="p-1 border border-white/[0.08] rounded-sm bg-white/5">↑↓</div>
                  navigate
                </div>
              </div>
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-gold/30 italic">
                TKMAA Academy
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
