"use client"
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useSpring, useTransform, animate } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, Users, MapPin, ShieldCheck, Loader2, 
  ArrowUpRight, ArrowDownRight, Plus, Download, 
  Calendar, MessageSquare, Bell, Filter, Trophy,
  Zap, Activity, Target, Cpu, ChevronRight
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { supabase, getUserRole } from '@/lib/supabase'
import { Skeleton } from "@/components/ui/skeleton"

const STATUS_STYLE = {
  paid: 'text-green-400 bg-green-400/10 border-green-400/20',
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  overdue: 'text-red-400 bg-red-400/10 border-red-400/20',
}

function Counter({ value, prefix = "", suffix = "" }) {
  const ref = useRef(null)
  
  useEffect(() => {
    const node = ref.current
    if (!node) return

    const controls = animate(0, value, {
      duration: 2,
      ease: "easeOut",
      onUpdate(value) {
        node.textContent = prefix + Math.floor(value).toLocaleString() + suffix
      }
    })

    return () => controls.stop()
  }, [value, prefix, suffix])

  return <span ref={ref}>0</span>
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0, filter: "blur(8px)" },
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

const SCAN_LINE_DELAY = Math.random() * 2

const MatrixCard = ({ children, className, delay = 0 }) => {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -5, scale: 1.01 }}
      className={`relative group overflow-hidden border border-white/[0.06] bg-[#1B2230]/60 backdrop-blur-xl rounded-none ${className}`}
    >
      <motion.div
        initial={{ top: "-100%" }}
        animate={{ top: "200%" }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: SCAN_LINE_DELAY }}
        className="absolute left-0 w-full h-px bg-gold/20 z-20 pointer-events-none"
      />
      {/* Corner Accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-gold/20 group-hover:border-gold/50 transition-colors duration-500" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-gold/20 group-hover:border-gold/50 transition-colors duration-500" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-gold/20 group-hover:border-gold/50 transition-colors duration-500" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-gold/20 group-hover:border-gold/50 transition-colors duration-500" />
      {children}
    </motion.div>
  )
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)
  const [stats, setStats] = useState({
    collected: 0,
    due: 0,
    students: 0,
    trainers: 0,
    recentTxns: [],
    branchSummaries: [],
    revenueHistory: [],
    totalBranches: 0,
  })

  async function fetchDashboardData() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const userRole = await getUserRole(session.user.id)
      setRole(userRole)

      if (userRole === 'admin') {
        const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true })
        const { count: trainerCount } = await supabase.from('trainers').select('*', { count: 'exact', head: true })
        const { count: branchCount } = await supabase.from('branches').select('*', { count: 'exact', head: true })
        const { data: payments } = await supabase.from('payments').select('*, students(users(full_name)), branches(name)')
        const { data: branches } = await supabase.from('branches').select(`
          id, name, 
          students:students(count), 
          trainers:trainers(count),
          payments:payments(amount, status)
        `)

        const collected = payments?.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0) || 0
        const due = payments?.filter(p => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0) || 0

        setStats({
          collected,
          due,
          students: studentCount || 0,
          trainers: trainerCount || 0,
          totalBranches: branchCount || 0,
          recentTxns: payments?.slice(0, 5).map(p => ({
            student: p.students?.users?.full_name || 'Unknown',
            branch: p.branches?.name,
            amount: p.amount,
            status: p.status
          })) || [],
          branchSummaries: branches?.map(b => ({
            name: b.name,
            members: b.students[0].count,
            trainers: b.trainers[0].count,
            collected: b.payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0),
            due: b.payments.filter(p => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0),
          })) || [],
          revenueHistory: [
            { name: 'JAN', members: 45, revenue: 12000 },
            { name: 'FEB', members: 52, revenue: 15000 },
            { name: 'MAR', members: 61, revenue: 18000 },
            { name: 'APR', members: 58, revenue: 16500 },
            { name: 'MAY', members: 72, revenue: 21000 },
            { name: 'JUN', members: 85, revenue: 25000 },
          ]
        })
      }
      // Other roles logic...
    } catch (err) {
      console.error('Dashboard Fetch Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function loadDashboardData() {
      await fetchDashboardData()
    }

    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-64" />
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="h-3 w-20 ml-auto" />
            <Skeleton className="h-5 w-32 ml-auto" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="lg:col-span-2 h-[450px]" />
          <Skeleton className="h-[450px]" />
        </div>
      </div>
    )
  }

  const renderAdminDashboard = () => (
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
              System Authorization Level: Alpha
            </h2>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none"
          >
            Command <span className="text-gold italic outline-text">Center</span>
          </motion.h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="border-white/10 text-white/40 hover:text-white hover:bg-white/5 uppercase text-[9px] tracking-[0.3em] font-black h-12 px-8 rounded-none transition-all group">
            <Download size={12} className="mr-2 group-hover:text-gold" /> Generate Log
          </Button>
          <Button className="bg-gold hover:bg-gold/90 text-black uppercase text-[9px] tracking-[0.3em] font-black h-12 px-8 rounded-none glow-gold transition-all group">
            <Plus size={14} className="mr-2 group-hover:scale-125 transition-transform" /> New Entry
          </Button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Gross Revenue", value: stats.collected, prefix: "₹", icon: TrendingUp, trend: "+8.2%", color: "text-green-400", bg: "bg-green-400/5" },
          { label: "Outstanding", value: stats.due, prefix: "₹", icon: Target, trend: "-2.4%", color: "text-red-400", bg: "bg-red-400/5" },
          { label: "Active Staff", value: stats.trainers, icon: ShieldCheck, trend: "Stable", color: "text-gold", bg: "bg-gold/5" },
          { label: "Registry", value: stats.students, icon: Users, trend: "+14", color: "text-blue-400", bg: "bg-blue-400/5" },
        ].map((kpi, i) => (
          <MatrixCard key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">
                {kpi.label}
              </CardTitle>
              <div className={`p-2 bg-white/5 border border-white/10 rounded-none group-hover:border-gold/30 transition-colors`}>
                <kpi.icon size={14} className={kpi.color} />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black mb-2 tracking-tighter">
                <Counter value={kpi.value} prefix={kpi.prefix} />
              </div>
              <div className="flex items-center gap-3">
                <div className={`text-[8px] px-2 py-0.5 font-black uppercase tracking-widest ${kpi.trend.startsWith('+') ? "text-green-400 bg-green-400/10" : kpi.trend === 'Stable' ? "text-gold bg-gold/10" : "text-red-400 bg-red-400/10"}`}>
                  {kpi.trend}
                </div>
                <span className="text-[8px] text-white/20 uppercase tracking-[0.2em] font-bold italic">Cycle Analysis</span>
              </div>
            </CardContent>
          </MatrixCard>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <MatrixCard className="p-8 h-[500px]">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gold mb-2 flex items-center gap-2">
                  <Activity size={12} /> Velocity Analytics
                </h3>
                <p className="text-[8px] text-white/20 uppercase tracking-[0.3em] font-bold italic">Member Growth & Financial Trajectory</p>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-gold shadow-[0_0_8px_rgba(214,184,106,0.5)]" />
                  <span className="text-[8px] uppercase tracking-[0.3em] font-black text-white/40">Registry</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                  <span className="text-[8px] uppercase tracking-[0.3em] font-black text-white/40">Revenue</span>
                </div>
              </div>
            </div>
            <div className="w-full h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenueHistory}>
                  <defs>
                    <linearGradient id="colorGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D6B86A" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#D6B86A" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="rgba(255,255,255,0.1)" 
                    fontSize={8} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={15}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.1)" 
                    fontSize={8} 
                    tickLine={false} 
                    axisLine={false} 
                    dx={-15}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(5,5,5,0.95)', 
                      border: '1px solid rgba(214,184,106,0.2)', 
                      borderRadius: '0',
                      backdropFilter: 'blur(20px)',
                      padding: '12px'
                    }}
                    itemStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.1em' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.3)', marginBottom: '8px', fontSize: '8px', fontWeight: '900', letterSpacing: '0.2em' }}
                  />
                  <Area type="monotone" dataKey="members" stroke="#D6B86A" fill="url(#colorGold)" strokeWidth={3} />
                  <Area type="monotone" dataKey="revenue" stroke="#60a5fa" fill="url(#colorBlue)" strokeWidth={2} strokeDasharray="10 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </MatrixCard>

          <MatrixCard>
            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gold mb-1">Operational Logs</h3>
                <p className="text-[8px] text-white/20 uppercase tracking-[0.3em] font-bold">Real-time system interactions</p>
              </div>
              <Button variant="ghost" className="text-[9px] uppercase tracking-[0.4em] font-black text-white/40 hover:text-white group">
                Full History <ChevronRight size={12} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            <div className="divide-y divide-white/5">
              {stats.recentTxns.map((tx, i) => (
                <motion.div 
                  key={i} 
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)', x: 5 }}
                  className="flex items-center justify-between p-6 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center text-gold font-black text-xs group-hover:border-gold/30 transition-colors">
                      {tx.student.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-black tracking-widest uppercase mb-1">{tx.student}</p>
                      <p className="text-[9px] text-white/30 uppercase tracking-[0.3em] font-bold">{tx.branch} HUB</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-gold tracking-tighter mb-1">₹{tx.amount.toLocaleString()}</p>
                    <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 border ${STATUS_STYLE[tx.status]}`}>
                      {tx.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </MatrixCard>
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-8">
          <MatrixCard className="p-8">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gold flex items-center gap-2">
                <Target size={12} /> Hub Performance
              </h3>
              <Filter size={12} className="text-white/20" />
            </div>
            <div className="space-y-10">
              {stats.branchSummaries.map((branch, i) => {
                const total = branch.collected + branch.due
                const rate = total > 0 ? Math.round((branch.collected / total) * 100) : 0
                return (
                  <div key={i} className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.1em] mb-1">{branch.name}</p>
                        <p className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-bold">
                          {branch.members} UNIT · {branch.trainers} STAFF
                        </p>
                      </div>
                      <p className="text-lg font-black text-gold tracking-tighter">{rate}%</p>
                    </div>
                    <div className="h-1 bg-white/5 w-full relative overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${rate}%` }}
                        transition={{ duration: 1.5, ease: "circOut", delay: 0.5 + (i * 0.1) }}
                        className="h-full bg-gold shadow-[0_0_15px_rgba(214,184,106,0.8)] relative"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                      </motion.div>
                    </div>
                    <div className="flex justify-between text-[8px] uppercase tracking-[0.2em] font-black">
                      <span className="text-green-400/60">₹{(branch.collected/1000).toFixed(1)}K AUTHORIZED</span>
                      <span className="text-red-400/60">₹{(branch.due/1000).toFixed(1)}K PENDING</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <Button variant="outline" className="w-full mt-12 border-white/10 text-white/40 hover:text-white hover:bg-white/5 uppercase text-[9px] tracking-[0.4em] font-black h-14 rounded-none transition-all italic">
              Access Full Distribution
            </Button>
          </MatrixCard>

          <MatrixCard className="bg-gold text-black p-10 group/secure">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover/secure:scale-110 transition-transform duration-700">
              <ShieldCheck size={120} />
            </div>
            <div className="relative z-10">
              <Cpu size={32} className="mb-8" />
              <h3 className="text-3xl font-black uppercase tracking-tighter mb-4 leading-none">Security Protocol<br/>Active</h3>
              <p className="text-black/60 text-[9px] uppercase tracking-[0.3em] font-black mb-10 leading-relaxed max-w-[200px]">
                End-to-end encryption engaged. Hub synchronization performing at peak efficiency.
              </p>
              <Button className="w-full bg-black text-gold hover:bg-black/90 uppercase text-[9px] tracking-[0.4em] font-black h-14 rounded-none transition-all glow-gold-intense">
                Review Access Logs
              </Button>
            </div>
          </MatrixCard>
          
          <MatrixCard className="p-8 border-gold/20">
             <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                   <Zap size={20} className="animate-pulse" />
                </div>
                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">System Uptime</h4>
                   <p className="text-xl font-black tracking-tighter uppercase">99.998%</p>
                </div>
             </div>
             <p className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-black italic">
                Next scheduled maintenance: Cycle 12.4
             </p>
          </MatrixCard>
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {role === 'admin' ? renderAdminDashboard() : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-40 text-center"
          >
            <ShieldCheck size={80} className="text-gold opacity-10 mb-8 animate-pulse" />
            <h3 className="text-3xl font-black uppercase tracking-[0.2em] mb-4">Matrix Access Verified</h3>
            <p className="text-white/30 text-[10px] uppercase tracking-[0.5em] font-black max-w-sm italic">
              Establishing secure connection... Please select a terminal from the navigation module.
            </p>
            <div className="mt-12 flex gap-4">
               {[1,2,3].map(i => (
                 <motion.div 
                  key={i}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1.5 h-1.5 bg-gold rounded-full" 
                 />
               ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
