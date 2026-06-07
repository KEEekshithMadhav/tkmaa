"use client"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "@/components/ui/dialog"
import { 
  Search, Plus, Download, Filter, Loader2, 
  Calendar, Users, Mail, ChevronRight,
  Trash2, Edit3, Award, CreditCard, User, FileText
} from 'lucide-react'
import { useForm, useWatch } from "react-hook-form"
import { supabase } from '@/lib/supabase'
import { useBranch } from '@/context/BranchContext'
import { toast } from 'sonner'
import { Badge } from "@/components/ui/badge"

const BELT_COLORS = {
  White: 'bg-white text-gray-800 border-gray-200',
  Yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Orange: 'bg-orange-100 text-orange-800 border-orange-200',
  Green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Blue: 'bg-blue-100 text-blue-800 border-blue-200',
  Purple: 'bg-purple-100 text-purple-800 border-purple-200',
  Red: 'bg-red-100 text-red-800 border-red-200',
  Brown: 'bg-amber-100 text-amber-900 border-amber-300',
  Black: 'bg-gray-900 text-white border-gray-700'
}

export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const { branches, selectedBranch } = useBranch()
  const [trainers, setTrainers] = useState([])
  const [beltLevels, setBeltLevels] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [open, setOpen] = useState(false)
  
  // Profile state
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [profileTab, setProfileTab] = useState('details') // details, financials, certificates
  const [payments, setPayments] = useState([])
  const [certificates, setCertificates] = useState([])
  const [isDeleting, setIsDeleting] = useState(false)

  const { register, handleSubmit, reset, control, setValue, watch } = useForm({
    defaultValues: {
      originalFee: 2000,
      concessionType: 'none',
      concessionValue: 0
    }
  })
  const watchedBranchId = watch("branchId")
  const watchedFee = watch("originalFee")
  const watchedConcessionType = watch("concessionType")
  const watchedConcessionValue = watch("concessionValue")

  // Auto-calculate final fee
  const finalFee = (() => {
    let fee = parseFloat(watchedFee) || 0
    let val = parseFloat(watchedConcessionValue) || 0
    if (watchedConcessionType === 'none') return fee
    if (watchedConcessionType === 'percentage') return fee - (fee * (val / 100))
    if (watchedConcessionType === 'fixed') return Math.max(0, fee - val)
    if (watchedConcessionType === 'scholarship') return 0
    if (watchedConcessionType === 'sibling') return fee - (fee * 0.1) // Example fixed 10%
    return fee
  })()

  useEffect(() => {
    async function initData() {
      const { data: tData } = await supabase.from('trainers').select('id, branch_id, users(full_name)')
      if (tData) setTrainers(tData)
      const { data: beltData } = await supabase.from('belt_levels').select('*').order('order_rank')
      if (beltData) {
        // Deduplicate by name
        const seen = new Set()
        const unique = beltData.filter(b => {
          if (seen.has(b.name)) return false
          seen.add(b.name)
          return true
        })
        setBeltLevels(unique)
      }
      const { data: batchData } = await supabase.from('batches').select('*').eq('is_active', true)
      if (batchData) setBatches(batchData)
    }
    initData()
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [selectedBranch])

  async function fetchStudents() {
    setLoading(true)
    let query = supabase.from('students').select('*, users(*), branches(name), belt_levels(name, hex), trainers(users(full_name)), batches(batch_name)')
    if (selectedBranch !== 'all') query = query.eq('branch_id', selectedBranch)
    const { data } = await query
    if (data) setStudents(data)
    setLoading(false)
  }

  async function fetchStudentData(studentId) {
    const { data: pData } = await supabase.from('payments').select('*').eq('student_id', studentId).order('created_at', { ascending: false })
    if (pData) setPayments(pData)
    
    const { data: cData } = await supabase.from('certificates').select('*').eq('student_id', studentId).order('issued_date', { ascending: false })
    if (cData) setCertificates(cData)
  }

  const handleViewProfile = (student) => {
    setSelectedStudent(student)
    setProfileTab('details')
    fetchStudentData(student.id)
  }

  const handleDeleteStudent = async (studentId, userId) => {
    if (!confirm('Are you sure you want to remove this student? This will delete their profile and user account.')) return
    setIsDeleting(true)
    const toastId = toast.loading('Removing student...')
    try {
      const { error: sErr } = await supabase.from('students').delete().eq('id', studentId)
      if (sErr) throw sErr
      const { error: uErr } = await supabase.from('users').delete().eq('id', userId)
      if (uErr) throw uErr
      toast.success('Student removed successfully', { id: toastId })
      setSelectedStudent(null)
      fetchStudents()
    } catch (err) {
      toast.error('Delete failed: ' + err.message, { id: toastId })
    } finally {
      setIsDeleting(false)
    }
  }

  const onSubmit = async (formData) => {
    setIsSubmitting(true)
    const toastId = toast.loading('Registering student...')
    try {
      // Generate email if not provided
      const email = formData.email?.trim() || `${formData.fullName.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@tkmaa.local`

      // Check if email already exists
      const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
      if (existingUser) throw new Error('A user with this email already exists. Please use a different email.')

      const tempId = crypto.randomUUID()
      // 1. Create User — the DB trigger `handle_new_user_role` auto-creates a student record
      const { error: userError } = await supabase.from('users').insert([{
        id: tempId,
        clerk_id: tempId,
        email: email,
        full_name: formData.fullName,
        phone: formData.parentMobile,
        role: 'student'
      }])
      if (userError) throw userError

      // 2. UPDATE the trigger-created student record with full details
      const { data: updatedStudent, error: studentError } = await supabase.from('students')
        .update({
          branch_id: formData.branchId,
          trainer_id: formData.trainerId || null,
          batch_id: formData.batchId || null,
          belt_level_id: (formData.beltLevelId && formData.beltLevelId !== 'fresher') ? formData.beltLevelId : null,
          dob: formData.dob || null,
          gender: formData.gender,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          parent_name: formData.parentName,
          parent_phone: formData.parentMobile,
          join_date: new Date().toISOString().split('T')[0]
        })
        .eq('user_id', tempId)
        .select()
        .single()
      if (studentError) {
        // Cleanup: remove the user we just created if student update fails
        await supabase.from('users').delete().eq('id', tempId)
        throw studentError
      }

      // 3. Create Concession if applicable
      if (formData.concessionType !== 'none') {
        await supabase.from('concessions').insert([{
          student_id: updatedStudent.id,
          concession_type: formData.concessionType,
          concession_value: parseFloat(formData.concessionValue) || 0,
          final_fee: finalFee,
          reason: formData.concessionReason || 'Registration fee concession'
        }])
      }

      toast.success('Student registered successfully', { id: toastId })
      setOpen(false)
      reset()
      fetchStudents()
    } catch (err) {
      toast.error('Registration failed: ' + err.message, { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredStudents = students.filter(s => 
    s.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.belt_levels?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.member_id && s.member_id.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const exportCSV = () => {
    const headers = ['Member ID', 'Student Name', 'DOB', 'Gender', 'Parent Name', 'Parent Mobile', 'Branch', 'Batch', 'Join Date']
    const csvData = students.map(s => [
      s.member_id || '',
      s.users?.full_name || '',
      s.dob ? new Date(s.dob).toLocaleDateString('en-IN') : '',
      s.gender || '',
      s.parent_name || '',
      s.parent_phone ? `="${s.parent_phone}"` : '',
      s.branches?.name || '',
      s.batches?.batch_name || '',
      s.join_date ? new Date(s.join_date).toLocaleDateString('en-IN') : ''
    ])
    
    const csvContent = [headers.join(','), ...csvData.map(row => row.map(cell => {
      // Don't double-quote cells that already have ="..." format
      if (typeof cell === 'string' && cell.startsWith('="')) return cell
      return `"${cell}"`
    }).join(','))].join('\n')
    // Add BOM for proper Unicode in Excel
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `tkmaa_students_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Registry exported to CSV')
  }

  const issueCertificate = async () => {
    const title = prompt("Enter certificate title (e.g., Yellow Belt Completion)")
    if (!title || !selectedStudent) return
    const toastId = toast.loading('Generating certificate...')
    const { error } = await supabase.from('certificates').insert([{
      student_id: selectedStudent.id,
      title: title,
      certificate_url: 'https://tkmaa.com/certs/placeholder.pdf'
    }])
    if (!error) {
      toast.success('Certificate issued', { id: toastId })
      fetchStudentData(selectedStudent.id)
    } else {
      toast.error('Failed to issue', { id: toastId })
    }
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0A1F30] sm:text-3xl">
            Academy Students
          </h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            Manage student registry, profiles, batches, and concessions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportCSV} variant="outline" className="rounded-lg text-xs">
            <Download className="mr-2" size={14} /> Export
          </Button>
          
          <Button onClick={() => setOpen(true)} className="bg-[#0A1F30] hover:bg-[#0A1F30]/90 text-white rounded-lg text-xs">
            <Plus className="mr-2" size={16} /> Add Student
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-4xl p-0 overflow-y-auto max-h-[90vh]">
              <DialogHeader className="p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                <DialogTitle className="text-lg font-heading font-bold text-[#0A1F30]">Register New Trainee</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
                {/* Section 1: Personal Info */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 border-b pb-2">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Full Name</label>
                      <Input {...register("fullName", { required: true })} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Email Address</label>
                      <Input type="email" {...register("email", { required: true })} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Date of Birth</label>
                      <Input type="date" {...register("dob")} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Gender</label>
                      <select {...register("gender")} className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059]">
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Weight (kg)</label>
                      <Input type="number" step="0.1" {...register("weight")} placeholder="e.g. 32" className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Parent / Guardian Name</label>
                      <Input {...register("parentName")} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Parent Mobile</label>
                      <Input {...register("parentMobile")} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
                    </div>
                  </div>
                </div>

                {/* Section 2: Academy Details */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 border-b pb-2">Academy Assignment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Branch</label>
                      <select {...register("branchId", { required: true })} className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059]">
                        <option value="">Select Branch</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Batch Assignment</label>
                      <select {...register("batchId")} className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059]">
                        <option value="">No specific batch</option>
                        {batches.filter(b => !watchedBranchId || b.branch_id === watchedBranchId).map(b => (
                          <option key={b.id} value={b.id}>{b.batch_name} ({b.start_time.slice(0,5)} - {b.end_time.slice(0,5)})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Trainer</label>
                      <select {...register("trainerId")} className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059]">
                        <option value="">Unassigned</option>
                        {trainers.filter(t => t.branch_id === watchedBranchId).map(t => (
                          <option key={t.id} value={t.id}>{t.users?.full_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Starting Belt</label>
                      <select {...register("beltLevelId")} className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059]">
                        <option value="fresher">Fresher (No Belt)</option>
                        {beltLevels.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Fee & Concessions */}
                <div className="p-5 bg-gray-50 border border-gray-100 rounded-xl">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A1F30] mb-4">Fee Configuration & Concession</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Standard Fee (₹)</label>
                      <Input type="number" {...register("originalFee")} className="bg-white border-gray-200 rounded-lg h-10 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Concession Type</label>
                      <select {...register("concessionType")} className="w-full bg-white border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059]">
                        <option value="none">None</option>
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount Off</option>
                        <option value="scholarship">Full Scholarship</option>
                        <option value="sibling">Sibling Discount (10%)</option>
                        <option value="special">Special Case</option>
                      </select>
                    </div>
                    {(watchedConcessionType === 'percentage' || watchedConcessionType === 'fixed' || watchedConcessionType === 'special') && (
                      <div className="space-y-2">
                        <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Concession Value</label>
                        <Input type="number" {...register("concessionValue")} placeholder={watchedConcessionType === 'percentage' ? "e.g. 15" : "e.g. 500"} className="bg-white border-gray-200 rounded-lg h-10 text-sm" />
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200/60 flex justify-between items-center">
                    {(watchedConcessionType !== 'none') && (
                      <Input {...register("concessionReason")} placeholder="Reason for concession..." className="bg-white border-gray-200 rounded-lg h-10 text-sm max-w-xs" />
                    )}
                    <div className="ml-auto text-right">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Final Calculated Fee</p>
                      <p className="text-2xl font-bold text-emerald-600">₹{finalFee.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-lg">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Complete Registration"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C5A059] transition-colors" size={16} />
            <Input 
              placeholder="Search by ID, name or belt..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-gray-200 focus:border-[#C5A059] focus:ring-[#C5A059]/20 rounded-lg h-10 text-sm"
            />
          </div>
          <div className="flex gap-3 items-center w-full sm:w-auto">
            {/* Branch dropdown moved to Sidebar */}
          </div>
        </div>

        <div className="relative overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/80 border-b border-gray-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider py-4 pl-6">Trainee</TableHead>
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Rank</TableHead>
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Branch & Batch</TableHead>
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Lead Trainer</TableHead>
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="h-64 text-center"><Loader2 className="animate-spin text-[#C5A059] mx-auto" size={32}/></TableCell></TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-64 text-center text-gray-400"><Users size={40} className="mx-auto mb-3 opacity-20" /><p className="text-sm">No Trainees Found</p></TableCell></TableRow>
                ) : filteredStudents.map((student, i) => (
                  <motion.tr
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    key={student.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group cursor-pointer"
                    onClick={() => handleViewProfile(student)}
                  >
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-xs border border-indigo-100">
                          {student.users?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-[#0A1F30]">{student.users?.full_name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            <span className="font-mono bg-gray-100 px-1 py-0.5 rounded mr-1.5 font-semibold text-gray-600">{student.member_id}</span>
                            Joined {new Date(student.join_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${BELT_COLORS[student.belt_levels?.name] || 'bg-gray-100 text-gray-700 border-gray-200'} rounded-md font-semibold px-2.5 py-0.5`}>
                        {student.belt_levels?.name || 'White'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-600">{student.branches?.name}</p>
                      {student.batches && <p className="text-[10px] text-gray-400 uppercase tracking-wider">{student.batches.batch_name}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {student.trainers?.users?.full_name || <span className="text-gray-400 italic">Unassigned</span>}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-[#0A1F30] hover:bg-gray-100 rounded-lg">
                        <ChevronRight size={16} />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Student Profile View Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-5xl p-0 overflow-hidden shadow-xl">
          <AnimatePresence>
            {selectedStudent && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col md:flex-row h-full max-h-[85vh]">
                {/* Left Panel - Bio */}
                <div className="w-full md:w-80 bg-gray-50 border-r border-gray-100 flex flex-col items-center">
                  <div className="p-8 w-full flex flex-col items-center border-b border-gray-200/50 text-center">
                    <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-3xl border border-indigo-100 mb-4 shadow-sm">
                      {selectedStudent.users?.full_name?.charAt(0)}
                    </div>
                    <h3 className="text-xl font-heading font-bold text-[#0A1F30] mb-1">{selectedStudent.users?.full_name}</h3>
                    <p className="text-xs font-mono font-semibold text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-md mb-3 shadow-sm">{selectedStudent.member_id}</p>
                    <Badge variant="outline" className={`${BELT_COLORS[selectedStudent.belt_levels?.name] || 'bg-gray-100 text-gray-700 border-gray-200'} rounded-md font-semibold px-3 py-1`}>
                      {selectedStudent.belt_levels?.name} Rank
                    </Badge>
                  </div>
                  
                  {/* Navigation Tabs */}
                  <div className="w-full flex flex-col p-4 gap-1">
                    {[
                      { id: 'details', label: 'Student Details', icon: User },
                      { id: 'financials', label: 'Financial History', icon: CreditCard },
                      { id: 'certificates', label: 'Certificates', icon: Award }
                    ].map(tab => (
                      <button key={tab.id} onClick={() => setProfileTab(tab.id)}
                        className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition-all ${
                          profileTab === tab.id ? 'bg-[#0A1F30] text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-[#0A1F30]'
                        }`}>
                        <tab.icon size={16} /> {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-auto w-full p-4 border-t border-gray-200/50">
                    <Button variant="outline" onClick={() => handleDeleteStudent(selectedStudent.id, selectedStudent.user_id)} disabled={isDeleting}
                      className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg text-xs font-semibold">
                      <Trash2 size={14} className="mr-2" /> Remove Trainee
                    </Button>
                  </div>
                </div>

                {/* Right Panel - Content */}
                <div className="flex-1 p-8 overflow-y-auto">
                  
                  {/* Details Tab */}
                  {profileTab === 'details' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-[#0A1F30] border-b border-gray-100 pb-2 mb-6">Personal & Academy Information</h4>
                      <div className="grid grid-cols-2 gap-y-6 gap-x-8 mb-8">
                        <div><p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Email</p><p className="text-sm font-medium text-[#0A1F30]">{selectedStudent.users?.email}</p></div>
                        <div><p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Date of Birth</p><p className="text-sm font-medium text-[#0A1F30]">{selectedStudent.dob || 'N/A'}</p></div>
                        <div><p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Guardian</p><p className="text-sm font-medium text-[#0A1F30]">{selectedStudent.parent_name || 'N/A'}</p></div>
                        <div><p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Mobile</p><p className="text-sm font-medium text-[#0A1F30]">{selectedStudent.parent_phone}</p></div>
                      </div>
                      
                      <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Assigned Branch</p>
                          <p className="text-sm font-bold text-[#0A1F30]">{selectedStudent.branches?.name}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Assigned Batch</p>
                          <p className="text-sm font-bold text-[#0A1F30]">{selectedStudent.batches?.batch_name || 'No specific batch'}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Lead Trainer</p>
                          <p className="text-sm font-bold text-[#C5A059]">{selectedStudent.trainers?.users?.full_name || 'UNASSIGNED'}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Financials Tab */}
                  {profileTab === 'financials' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-4">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-[#0A1F30]">Transaction History</h4>
                      </div>
                      <div className="space-y-2">
                        {payments.length === 0 ? (
                          <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200 text-gray-500 text-sm">No transaction history found</div>
                        ) : payments.map((p, i) => (
                          <div key={i} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-lg shadow-sm">
                            <div className="flex items-center gap-4">
                              <div className={`w-2 h-2 rounded-full ${p.status === 'paid' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <div>
                                <p className="text-sm font-semibold text-[#0A1F30]">{p.notes || `${p.month || 'Fee'} Payment`}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{new Date(p.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-[#0A1F30]">₹{p.amount}</p>
                              <p className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${p.status === 'paid' ? 'text-emerald-600' : 'text-red-600'}`}>{p.status}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Certificates Tab */}
                  {profileTab === 'certificates' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-4">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-[#0A1F30]">Certificates & Awards</h4>
                        <Button onClick={issueCertificate} className="bg-[#0A1F30] hover:bg-[#0A1F30]/90 text-white rounded-lg text-xs h-8">
                          <Plus size={14} className="mr-1" /> Issue Certificate
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {certificates.length === 0 ? (
                          <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200 text-gray-500 text-sm flex flex-col items-center">
                            <Award size={32} className="opacity-20 mb-2" />
                            <p>No certificates issued yet.</p>
                          </div>
                        ) : certificates.map(cert => (
                          <div key={cert.id} className="p-4 border border-gray-200 rounded-xl flex items-center justify-between hover:shadow-md transition-all bg-white group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                                <Award size={20} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-[#0A1F30]">{cert.title}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider">Issued: {new Date(cert.issued_date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <Button variant="ghost" className="text-[#C5A059] opacity-0 group-hover:opacity-100 transition-opacity">
                              <FileText size={16} className="mr-2" /> View PDF
                            </Button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  )
}
