"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  LayoutDashboard, Users, UserRound, MapPin, 
  CreditCard, Bell, Settings, LogOut, Trophy, 
  CalendarCheck, Menu, X, ChevronRight, Shield
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { supabase, getUserRole } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard", roles: ['admin', 'trainer', 'student'] },
  { icon: Users, label: "Students", href: "/dashboard/students", roles: ['admin', 'trainer'] },
  { icon: UserRound, label: "Trainers", href: "/dashboard/trainers", roles: ['admin'] },
  { icon: MapPin, label: "Branches", href: "/dashboard/branches", roles: ['admin'] },
  { icon: Trophy, label: "Tournaments", href: "/dashboard/tournaments", roles: ['admin', 'trainer', 'student'] },
  { icon: CalendarCheck, label: "Attendance", href: "/dashboard/attendance", roles: ['admin', 'trainer'] },
  { icon: CreditCard, label: "Payments", href: "/dashboard/payments", roles: ['admin'] },
  { icon: Bell, label: "Notices", href: "/dashboard/notices", roles: ['admin', 'trainer', 'student'] },
]

function SidebarContent({ role, pathname, isMobile, setIsOpen, handleLogout }) {
  return (
    <div className="flex flex-col h-full bg-[#111827]/90 backdrop-blur-3xl border-r border-white/[0.08] p-8 relative overflow-hidden group/sidebar">
      {/* Matrix Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_2px,3px_100%]" />
      
      {/* Decorative Gradient Background */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gold/[0.04] blur-[80px] -z-10" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-500/[0.02] blur-[60px] -z-10" />
      
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 grid-overlay-dense opacity-30 pointer-events-none" />
      
      <div className="flex items-center gap-4 mb-16 px-2 group cursor-pointer relative z-10">
        <motion.div 
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center shadow-[0_0_30px_rgba(214,184,106,0.3)] transition-shadow duration-500 group-hover:shadow-[0_0_40px_rgba(214,184,106,0.5)] border-2 border-gold/30"
        >
          <Image 
            src="/logo.png" 
            alt="TKMAA Logo" 
            width={56} 
            height={56} 
            className="object-cover w-full h-full"
          />
        </motion.div>
        <div className="flex flex-col">
          <span className="text-lg font-black tracking-[0.15em] text-white uppercase leading-none">TKMAA</span>
          <span className="text-[8px] uppercase tracking-[0.4em] text-gold font-black mt-1.5 opacity-60">Academy System</span>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1.5 relative z-10">
        <div className="flex items-center gap-3 mb-5 px-4">
           <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
           <p className="text-[8px] uppercase tracking-[0.5em] text-white/20 font-black italic whitespace-nowrap">Navigation</p>
           <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </div>
        {navItems
          .filter(item => !role || item.roles.includes(role))
          .map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} onClick={() => isMobile && setIsOpen(false)}>
                <motion.div
                  whileHover={{ x: 6 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`flex items-center gap-5 px-5 py-3.5 rounded-none transition-all group relative overflow-hidden ${
                    isActive 
                    ? "text-gold" 
                    : "text-white/30 hover:text-white/70"
                  }`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="active-bg"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      className="absolute inset-0 bg-gradient-to-r from-gold/[0.08] via-gold/[0.04] to-transparent border-l-[3px] border-gold -z-10"
                    />
                  )}
                  
                  {/* Hover highlight */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.02] transition-colors -z-10" />
                  )}
                  
                  <motion.div
                    whileHover={{ rotate: isActive ? 0 : 15 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <item.icon size={18} className={`${isActive ? "text-gold drop-shadow-[0_0_8px_rgba(214,184,106,0.5)]" : "text-white/20 group-hover:text-gold/60"} transition-all duration-300`} />
                  </motion.div>
                  <span className="font-black tracking-[0.2em] uppercase text-[10px]">{item.label}</span>
                  
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                      className="ml-auto"
                    >
                      <div className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse shadow-[0_0_8px_rgba(214,184,106,1),0_0_16px_rgba(214,184,106,0.5)]" />
                    </motion.div>
                  )}
                </motion.div>
              </Link>
            )
        })}
      </nav>

      <div className="mt-auto pt-8 border-t border-white/[0.04] flex flex-col gap-1.5 relative z-10">
        <Link href="/dashboard/profile" onClick={() => isMobile && setIsOpen(false)}>
          <motion.div 
            whileHover={{ x: 6 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`flex items-center gap-5 px-5 py-3.5 rounded-none transition-all group ${
              pathname === '/dashboard/profile' 
              ? "text-gold" 
              : "text-white/30 hover:text-white/70"
            }`}
          >
            <motion.div whileHover={{ rotate: 90 }} transition={{ type: "spring", stiffness: 300 }}>
              <Settings size={18} className="text-white/20 group-hover:text-gold/60 transition-colors" />
            </motion.div>
            <span className="font-black tracking-[0.2em] uppercase text-[10px]">Settings</span>
          </motion.div>
        </Link>
        <motion.button 
          onClick={handleLogout}
          whileHover={{ x: 6 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-5 px-5 py-3.5 text-red-500/30 hover:text-red-500 transition-all uppercase text-[10px] font-black tracking-[0.3em] group relative overflow-hidden"
        >
          <LogOut size={18} className="opacity-30 group-hover:opacity-100 transition-opacity" />
          <span>Logout</span>
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-red-500/0 via-red-500/30 to-red-500/0 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-center duration-500" />
        </motion.button>
      </div>
    </div>
  )

}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth >= 1024) setIsOpen(true)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const r = await getUserRole(session.user.id)
        setRole(r)
      }
    }
    fetchRole()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const sidebarVariants = {
    open: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
    closed: { x: "-100%", opacity: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
  }


  return (
    <>
      {/* Mobile Toggle Button */}
      {isMobile && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button 
            onClick={() => setIsOpen(true)}
            className="fixed top-6 left-6 z-[60] bg-gold text-black rounded-none h-12 w-12 p-0 shadow-[0_0_20px_rgba(214,184,106,0.3)] lg:hidden hover:shadow-[0_0_30px_rgba(214,184,106,0.5)] transition-shadow"
          >
            <Menu size={24} />
          </Button>
        </motion.div>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-72 h-screen sticky top-0 z-50">
          <SidebarContent role={role} pathname={pathname} isMobile={isMobile} setIsOpen={setIsOpen} handleLogout={handleLogout} />
        </aside>
      )}

      {/* Mobile Overlay & Sidebar */}
      <AnimatePresence>
        {isMobile && isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70]"
            />
            <motion.aside
              variants={sidebarVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="fixed top-0 left-0 w-80 h-full z-[80] shadow-[10px_0_40px_rgba(0,0,0,0.5)]"
            >
              <SidebarContent role={role} pathname={pathname} isMobile={isMobile} setIsOpen={setIsOpen} handleLogout={handleLogout} />
              <motion.button 
                onClick={() => setIsOpen(false)}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"
              >
                <X size={24} />
              </motion.button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
