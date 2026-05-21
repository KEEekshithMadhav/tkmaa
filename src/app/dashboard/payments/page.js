"use client"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Download, Filter, Search, Loader2, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const STATUS_STYLE = {
  paid: 'text-green-400 bg-green-400/10 border-green-400/20',
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  overdue: 'text-red-400 bg-red-400/10 border-red-400/20',
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  async function fetchPayments() {
    setLoading(true)
    const { data } = await supabase
      .from('payments')
      .select('*, students(users(full_name)), branches(name)')
      .order('created_at', { ascending: false })
    if (data) setPayments(data)
    setLoading(false)
  }

  useEffect(() => {
    async function loadPayments() {
      await fetchPayments()
    }

    loadPayments()
  }, [])

  const filtered = payments.filter(p => filter === 'all' || p.status === filter)

  const exportCSV = () => {
    const header = 'Student,Branch,Amount,Status,Date'
    const rows = filtered.map(p => 
      `${p.students?.users?.full_name},${p.branches?.name},${p.amount},${p.status},${new Date(p.created_at).toLocaleDateString()}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', 'tkmaa_payments.csv')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-gold animate-pulse shadow-[0_0_10px_rgba(214,184,106,0.5)]" />
            <h2 className="text-gold text-[10px] tracking-[0.5em] uppercase font-black">Finance</h2>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">Ledger <span className="text-gold italic outline-text">& Payments</span></h1>
        </div>
        <div className="flex gap-4">
          <Button 
            onClick={exportCSV}
            variant="outline" 
            className="border-white/10 hover:bg-white/5 uppercase tracking-widest text-xs h-12 rounded-none px-6"
          >
            <Download className="mr-2" size={16} /> Export CSV
          </Button>
          <Button className="bg-gold text-black hover:bg-gold-dark font-bold uppercase tracking-widest px-8 h-12 rounded-none">
            Generate Report
          </Button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Total Collected", val: filtered.filter(p=>p.status==='paid').reduce((s,p)=>s+Number(p.amount),0), color: "text-green-400", icon: CheckCircle2 },
          { label: "Total Pending", val: filtered.filter(p=>p.status==='pending').reduce((s,p)=>s+Number(p.amount),0), color: "text-yellow-400", icon: CreditCard },
          { label: "Total Overdue", val: filtered.filter(p=>p.status==='overdue').reduce((s,p)=>s+Number(p.amount),0), color: "text-red-400", icon: AlertCircle },
        ].map((stat, i) => (
          <Card key={i} className="bg-[#1B2230]/60 border-white/[0.06] backdrop-blur-xl rounded-none overflow-hidden relative group hover:shadow-[0_0_20px_rgba(214,184,106,0.06)] transition-shadow duration-500">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">{stat.label}</p>
                <stat.icon size={16} className={stat.color} />
              </div>
              <div className={`text-3xl font-bold tracking-tighter ${stat.color}`}>
                ₹{stat.val.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex gap-1 bg-white/[0.03] p-1 border border-white/[0.06] w-fit">
        {['all', 'paid', 'pending', 'overdue'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-6 py-2 text-[10px] uppercase tracking-widest font-bold transition-all ${
              filter === s ? "bg-gold text-black" : "text-white/40 hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table Section */}
      <Card className="bg-[#1B2230]/60 border-white/[0.06] backdrop-blur-xl overflow-hidden rounded-none relative">
        <motion.div initial={{ top: "-5%" }} animate={{ top: "105%" }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }} className="absolute left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent z-20 pointer-events-none" />
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-gold uppercase tracking-[0.2em] text-[10px] font-bold py-6">Reference</TableHead>
              <TableHead className="text-gold uppercase tracking-[0.2em] text-[10px] font-bold">Student</TableHead>
              <TableHead className="text-gold uppercase tracking-[0.2em] text-[10px] font-bold">Branch</TableHead>
              <TableHead className="text-gold uppercase tracking-[0.2em] text-[10px] font-bold">Amount</TableHead>
              <TableHead className="text-gold uppercase tracking-[0.2em] text-[10px] font-bold">Status</TableHead>
              <TableHead className="text-gold uppercase tracking-[0.2em] text-[10px] font-bold">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <Loader2 className="animate-spin text-gold mx-auto mb-4" size={32} />
                    <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">Fetching Ledger...</span>
                  </TableCell>
                </TableRow>
              ) : filtered.map((pay, i) => (
                <motion.tr
                  key={pay.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-white/[0.04] hover:bg-white/[0.03] hover:shadow-[inset_3px_0_0_rgba(214,184,106,0.4)] transition-all duration-300"
                >
                  <TableCell className="py-5">
                    <span className="text-[10px] font-mono text-white/40 uppercase">#{pay.id.slice(0,8)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-sm tracking-wide uppercase">{pay.students?.users?.full_name}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] tracking-widest uppercase text-white/60">{pay.branches?.name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-sm text-gold">₹{pay.amount}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest border ${STATUS_STYLE[pay.status]}`}>
                      {pay.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] uppercase tracking-widest text-white/40">
                      {new Date(pay.created_at).toLocaleDateString()}
                    </span>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
