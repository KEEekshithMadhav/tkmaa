"use client"
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import {
  Download, Loader2, CreditCard, AlertCircle, CheckCircle2,
  Plus, Receipt, Zap, Settings, QrCode, Printer, FileDown
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBranch } from '@/context/BranchContext'
import { useSport } from '@/context/SportContext'
import { useForm } from "react-hook-form"
import { toast } from 'sonner'
import { Badge } from "@/components/ui/badge"

const STATUS_STYLE = {
  paid: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  pending: 'text-amber-700 bg-amber-50 border-amber-200',
  overdue: 'text-red-700 bg-red-50 border-red-200',
}

const TABS = [
  { id: 'ledger', label: 'Ledger', icon: CreditCard },
  { id: 'quick_collect', label: 'Quick Collect', icon: Zap },
  { id: 'fee_structure', label: 'Fee Structure', icon: Settings },
  { id: 'receipts', label: 'Receipts', icon: Receipt },
]

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState('ledger')
  const [payments, setPayments] = useState([])
  const [feeStructures, setFeeStructures] = useState([])
  const [receipts, setReceipts] = useState([])
  const { branches, selectedBranch } = useBranch()
  const { selectedSport } = useSport()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  // Quick collect state
  const [qcStudent, setQcStudent] = useState('')
  const [qcType, setQcType] = useState('full')
  const [qcDays, setQcDays] = useState(30)
  const [qcAmount, setQcAmount] = useState(0)
  const [qcReason, setQcReason] = useState('')
  const [qcSubmitting, setQcSubmitting] = useState(false)
  const [studentFee, setStudentFee] = useState(0)

  // Fee structure
  const [fsOpen, setFsOpen] = useState(false)
  const [fsSubmitting, setFsSubmitting] = useState(false)
  const { register: regFs, handleSubmit: handleFs, reset: resetFs } = useForm()

  // Receipt view
  const [viewingReceipt, setViewingReceipt] = useState(null)

  useEffect(() => {
    async function init() {
      const { data: sData } = await supabase.from('students').select('id, users(full_name), branches(name)')
      if (sData) setStudents(sData)
    }
    init()
  }, [])

  useEffect(() => {
    if (activeTab === 'ledger') fetchPayments()
    if (activeTab === 'fee_structure') fetchFeeStructures()
    if (activeTab === 'receipts') fetchReceipts()
  }, [activeTab, selectedBranch, selectedSport])

  async function fetchPayments() {
    setLoading(true)
    
    let studentIds = null
    if (selectedSport && selectedSport !== 'all') {
      const { data: ss } = await supabase
        .from('student_sports')
        .select('student_id')
        .eq('sport_id', selectedSport)
      studentIds = ss?.map(s => s.student_id) || []
      if (studentIds.length === 0) {
        setPayments([])
        setLoading(false)
        return
      }
    }

    let query = supabase
      .from('payments')
      .select('*, students(users(full_name)), branches(name)')
      .order('created_at', { ascending: false })
      
    if (selectedBranch !== 'all') query = query.eq('branch_id', selectedBranch)
    if (studentIds !== null) query = query.in('student_id', studentIds)
    
    const { data } = await query
    if (data) setPayments(data)
    setLoading(false)
  }

  async function fetchFeeStructures() {
    setLoading(true)
    const { data } = await supabase.from('fee_structure').select('*, branches(name)').order('course_type')
    if (data) setFeeStructures(data)
    setLoading(false)
  }

  async function fetchReceipts() {
    setLoading(true)
    const { data } = await supabase
      .from('receipts')
      .select('*, payments(amount, status, students(users(full_name)))')
      .order('generated_at', { ascending: false })
    if (data) setReceipts(data)
    setLoading(false)
  }

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
    a.href = url; a.download = 'tkmaa_payments.csv'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  // Quick Collect logic
  useEffect(() => {
    if (qcType === 'full') {
      setQcAmount(studentFee)
    } else if (qcType === 'partial') {
      const perDay = studentFee / 30
      setQcAmount(Math.round(perDay * qcDays))
    }
  }, [qcType, qcDays, studentFee])

  useEffect(() => {
    async function loadStudentFee() {
      if (!qcStudent) return
      const { data: student } = await supabase.from('students').select('branch_id').eq('id', qcStudent).single()
      if (student?.branch_id) {
        const { data: fee } = await supabase.from('fee_structure').select('standard_fee').eq('branch_id', student.branch_id).limit(1).single()
        setStudentFee(fee?.standard_fee || 2000)
      }
    }
    loadStudentFee()
  }, [qcStudent])

  const submitQuickCollect = async () => {
    if (!qcStudent || qcAmount <= 0) return toast.error('Select student and amount')
    setQcSubmitting(true)
    const toastId = toast.loading('Processing collection...')
    try {
      // Insert payment
      const { data: payment, error: pErr } = await supabase.from('payments').insert([{
        student_id: qcStudent,
        amount: qcAmount,
        status: 'paid',
        notes: qcReason || `Quick collect - ${qcType}`,
      }]).select().single()
      if (pErr) throw pErr

      // Insert quick collection record
      await supabase.from('quick_collections').insert([{
        student_id: qcStudent,
        collection_type: qcType,
        days_attended: qcType === 'partial' ? qcDays : null,
        calculated_amount: qcAmount,
        reason: qcReason,
      }])

      // Auto-generate receipt
      const receiptNo = `TKMAA-${Date.now().toString(36).toUpperCase()}`
      await supabase.from('receipts').insert([{
        payment_id: payment.id,
        receipt_no: receiptNo,
        qr_code: `https://tkmaa.com/receipt/${receiptNo}`,
      }])

      toast.success(`₹${qcAmount} collected! Receipt: ${receiptNo}`, { id: toastId })
      setQcStudent(''); setQcAmount(0); setQcReason('')
    } catch (err) {
      toast.error('Collection failed: ' + err.message, { id: toastId })
    } finally { setQcSubmitting(false) }
  }

  // Fee Structure CRUD
  const onSubmitFs = async (formData) => {
    setFsSubmitting(true)
    const toastId = toast.loading('Saving fee structure...')
    try {
      const { error } = await supabase.from('fee_structure').insert([{
        branch_id: formData.fsBranchId,
        course_type: formData.courseType,
        standard_fee: parseFloat(formData.standardFee),
      }])
      if (error) throw error
      toast.success('Fee structure added', { id: toastId })
      setFsOpen(false); resetFs(); fetchFeeStructures()
    } catch (err) {
      toast.error('Failed: ' + err.message, { id: toastId })
    } finally { setFsSubmitting(false) }
  }

  const deleteFs = async (id) => {
    if (!confirm('Delete this fee structure?')) return
    await supabase.from('fee_structure').delete().eq('id', id)
    fetchFeeStructures()
  }

  // Generate receipt for a payment
  const generateReceipt = async (paymentId) => {
    const receiptNo = `TKMAA-${Date.now().toString(36).toUpperCase()}`
    const { error } = await supabase.from('receipts').insert([{
      payment_id: paymentId,
      receipt_no: receiptNo,
      qr_code: `https://tkmaa.com/receipt/${receiptNo}`,
    }])
    if (!error) toast.success(`Receipt generated: ${receiptNo}`)
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0A1F30] sm:text-3xl">
            Financial Management
          </h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            Ledger, fee structures, collections, and receipts
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'ledger' && (
            <Button onClick={exportCSV} variant="outline" className="rounded-lg text-xs">
              <Download className="mr-2" size={16} /> Export CSV
            </Button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-white p-1 border border-gray-200 rounded-lg w-fit shadow-sm">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setLoading(true) }}
            className={`flex items-center gap-2 px-4 py-2 text-xs capitalize font-semibold transition-all rounded-md ${
              activeTab === tab.id ? "bg-[#0A1F30] text-white" : "text-gray-500 hover:text-[#0A1F30] hover:bg-gray-50"
            }`}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ─── LEDGER TAB ─── */}
      {activeTab === 'ledger' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "Total Collected", val: filtered.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0), color: "text-emerald-600", bgIcon: "bg-emerald-50", icon: CheckCircle2 },
              { label: "Total Pending", val: filtered.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0), color: "text-amber-600", bgIcon: "bg-amber-50", icon: CreditCard },
              { label: "Total Overdue", val: filtered.filter(p => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0), color: "text-red-600", bgIcon: "bg-red-50", icon: AlertCircle },
            ].map((stat, i) => (
              <Card key={i} className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{stat.label}</p>
                    <div className={`p-2 rounded-lg ${stat.bgIcon}`}><stat.icon size={16} className={stat.color} /></div>
                  </div>
                  <div className={`text-3xl font-bold tracking-tight ${stat.color}`}>₹{stat.val.toLocaleString()}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filter */}
          <div className="flex gap-1 bg-white p-1 border border-gray-200 rounded-lg w-fit shadow-sm">
            {['all', 'paid', 'pending', 'overdue'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-4 py-2 text-xs capitalize font-semibold transition-all rounded-md ${
                  filter === s ? "bg-[#0A1F30] text-white" : "text-gray-500 hover:text-[#0A1F30] hover:bg-gray-50"
                }`}>{s}</button>
            ))}
          </div>

          {/* Payments Table */}
          <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50 border-b border-gray-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold py-4">Ref</TableHead>
                  <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">Student</TableHead>
                  <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">Amount</TableHead>
                  <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">Status</TableHead>
                  <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">Date</TableHead>
                  <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold text-right pr-6">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="h-64 text-center">
                    <Loader2 className="animate-spin text-[#C5A059] mx-auto mb-4" size={32} />
                  </TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-64 text-center text-gray-500 text-sm">No transactions found</TableCell></TableRow>
                ) : filtered.map((pay, i) => (
                  <motion.tr key={pay.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="py-4"><span className="text-[11px] font-mono text-gray-500 uppercase">#{pay.id.slice(0, 8)}</span></TableCell>
                    <TableCell><div className="font-semibold text-sm text-[#0A1F30]">{pay.students?.users?.full_name}</div></TableCell>
                    <TableCell><span className="font-bold text-sm text-[#0A1F30]">₹{pay.amount}</span></TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md border ${STATUS_STYLE[pay.status]}`}>{pay.status}</span>
                    </TableCell>
                    <TableCell><span className="text-xs text-gray-500">{new Date(pay.created_at).toLocaleDateString()}</span></TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" onClick={() => generateReceipt(pay.id)} className="h-8 text-xs text-[#C5A059] hover:text-[#0A1F30] rounded-lg">
                        <Receipt size={14} className="mr-1" /> Gen
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* ─── QUICK COLLECT TAB ─── */}
      {activeTab === 'quick_collect' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-100 p-6">
              <CardTitle className="text-sm uppercase tracking-wider text-[#0A1F30] font-bold flex items-center gap-2">
                <Zap size={16} className="text-[#C5A059]" /> Quick Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Select Student</label>
                <select value={qcStudent} onChange={(e) => setQcStudent(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059]">
                  <option value="">Choose Student</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.users?.full_name} — {s.branches?.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Collection Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {['full', 'partial', 'custom', 'discontinuation'].map(t => (
                    <button key={t} onClick={() => setQcType(t)}
                      className={`px-3 py-2.5 text-xs font-semibold capitalize rounded-lg border transition-all ${
                        qcType === t ? 'bg-[#0A1F30] text-white border-[#0A1F30]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}>{t}</button>
                  ))}
                </div>
              </div>
              {qcType === 'partial' && (
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Days Attended</label>
                  <Input type="number" value={qcDays} onChange={(e) => setQcDays(parseInt(e.target.value) || 0)}
                    className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
                  <p className="text-[10px] text-gray-400">Per day: ₹{(studentFee / 30).toFixed(2)} × {qcDays} days</p>
                </div>
              )}
              {(qcType === 'custom' || qcType === 'discontinuation') && (
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Custom Amount</label>
                  <Input type="number" value={qcAmount} onChange={(e) => setQcAmount(parseFloat(e.target.value) || 0)}
                    className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Reason / Notes</label>
                <Input value={qcReason} onChange={(e) => setQcReason(e.target.value)} placeholder="Optional"
                  className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
              </div>

              {/* Summary */}
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold mb-1">Amount to Collect</p>
                <p className="text-3xl font-bold text-emerald-700">₹{qcAmount.toLocaleString()}</p>
              </div>

              <Button onClick={submitQuickCollect} disabled={qcSubmitting || !qcStudent}
                className="w-full bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-lg h-10 font-semibold">
                {qcSubmitting ? <Loader2 className="animate-spin" /> : <>
                  <Zap size={16} className="mr-2" /> Collect & Generate Receipt
                </>}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-100 p-6">
              <CardTitle className="text-sm uppercase tracking-wider text-[#0A1F30] font-bold">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {[
                { title: "Full Payment", desc: "Collects the standard monthly fee defined in Fee Structure." },
                { title: "Partial Payment", desc: "Calculates fee pro-rata based on days attended. e.g., ₹2000/30 × 10 days = ₹667." },
                { title: "Custom Collection", desc: "Enter any custom amount with a reason. Useful for event fees or special charges." },
                { title: "Discontinuation", desc: "Final settlement collection when a student leaves the academy." },
              ].map((item, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <h4 className="text-sm font-bold text-[#0A1F30] mb-1">{item.title}</h4>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── FEE STRUCTURE TAB ─── */}
      {activeTab === 'fee_structure' && (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setFsOpen(true)} className="bg-[#0A1F30] hover:bg-[#0A1F30]/90 text-white rounded-lg text-xs">
              <Plus className="mr-2" size={16} /> Add Fee Structure
            </Button>
          </div>
          <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50 border-b border-gray-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold py-4 pl-6">Branch</TableHead>
                  <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">Course Type</TableHead>
                  <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">Standard Fee</TableHead>
                  <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="h-40 text-center"><Loader2 className="animate-spin text-[#C5A059] mx-auto" size={24} /></TableCell></TableRow>
                ) : feeStructures.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="h-40 text-center text-gray-400 text-sm">No fee structures defined yet.</TableCell></TableRow>
                ) : feeStructures.map(fs => (
                  <TableRow key={fs.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <TableCell className="pl-6 py-4 font-semibold text-sm text-[#0A1F30]">{fs.branches?.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{fs.course_type}</TableCell>
                    <TableCell className="font-bold text-sm text-[#0A1F30]">₹{fs.standard_fee}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" onClick={() => deleteFs(fs.id)} className="h-8 text-xs text-red-500 hover:bg-red-50 rounded-lg">Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Dialog open={fsOpen} onOpenChange={setFsOpen}>
            <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-md p-0 overflow-hidden">
              <DialogHeader className="p-6 border-b border-gray-100">
                <DialogTitle className="text-lg font-heading font-bold text-[#0A1F30]">Add Fee Structure</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleFs(onSubmitFs)} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Branch</label>
                  <select {...regFs("fsBranchId", { required: true })} className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059]">
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Course Type</label>
                  <Input {...regFs("courseType", { required: true })} placeholder="e.g. Karate, MMA, Self-Defense" className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Standard Monthly Fee (₹)</label>
                  <Input type="number" {...regFs("standardFee", { required: true })} placeholder="2000" className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setFsOpen(false)} className="flex-1 rounded-lg border-gray-200">Cancel</Button>
                  <Button type="submit" disabled={fsSubmitting} className="flex-1 bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-lg">
                    {fsSubmitting ? <Loader2 className="animate-spin" /> : "Save"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* ─── RECEIPTS TAB ─── */}
      {activeTab === 'receipts' && (
        <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50 border-b border-gray-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold py-4 pl-6">Receipt No</TableHead>
                <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">Student</TableHead>
                <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">Amount</TableHead>
                <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">Date</TableHead>
                <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="animate-spin text-[#C5A059] mx-auto" size={24} /></TableCell></TableRow>
              ) : receipts.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center text-gray-400 text-sm">No receipts generated yet.</TableCell></TableRow>
              ) : receipts.map(r => (
                <TableRow key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <TableCell className="pl-6 py-4">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 rounded-md font-mono text-xs">{r.receipt_no}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-sm text-[#0A1F30]">{r.payments?.students?.users?.full_name}</TableCell>
                  <TableCell className="font-bold text-sm text-[#0A1F30]">₹{r.payments?.amount}</TableCell>
                  <TableCell className="text-xs text-gray-500">{new Date(r.generated_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" className="h-8 text-xs text-gray-500 hover:text-[#0A1F30] rounded-lg">
                        <Printer size={14} className="mr-1" /> Print
                      </Button>
                      <Button variant="ghost" className="h-8 text-xs text-gray-500 hover:text-[#0A1F30] rounded-lg">
                        <FileDown size={14} className="mr-1" /> PDF
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
