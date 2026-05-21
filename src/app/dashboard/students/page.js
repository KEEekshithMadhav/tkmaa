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
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Search, Plus, Download, Filter, Loader2, 
  Calendar, User, Users, Mail, Phone, ChevronRight,
  MoreVertical, Trash2, Edit3, ExternalLink
} from 'lucide-react'
import { useForm } from "react-hook-form"
import { supabase, getBranches } from '@/lib/supabase'
import { toast } from 'sonner'
import { Badge } from "@/components/ui/badge"

const BELT_COLORS = {
  White: 'bg-white text-black',
  Yellow: 'bg-yellow-400 text-black',
  Orange: 'bg-orange-500 text-white',
  Green: 'bg-green-600 text-white',
  Blue: 'bg-blue-600 text-white',
  Purple: 'bg-purple-600 text-white',
  Red: 'bg-red-600 text-white',
  Brown: 'bg-[#5D4037] text-white',
  Black: 'bg-black text-white border border-white/20'
}

export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [branches, setBranches] = useState([])
  const [trainers, setTrainers] = useState([])
  const [beltLevels, setBeltLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [payments, setPayments] = useState([])
  const [isDeleting, setIsDeleting] = useState(false)

  const { register, handleSubmit, reset, watch } = useForm()
  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedBranchId = watch("branchId")

  useEffect(() => {
    async function initData() {
      await fetchInitialData()
    }
    initData()
  }, [])

  useEffect(() => {
    async function loadStudents() {
      setLoading(true)
      let query = supabase.from('students').select('*, users(*), branches(name), belt_levels(name, hex), trainers(users(full_name))')
      if (selectedBranch !== 'all') query = query.eq('branch_id', selectedBranch)
      const { data } = await query
      if (data) setStudents(data)
      setLoading(false)
    }

    loadStudents()
  }, [selectedBranch])

  async function fetchInitialData() {
    const { data: bData } = await getBranches()
    if (bData) setBranches(bData)
    const { data: tData } = await supabase.from('trainers').select('id, branch_id, users(full_name)')
    if (tData) setTrainers(tData)
    const { data: beltData } = await supabase.from('belt_levels').select('*').order('order_rank')
    if (beltData) setBeltLevels(beltData)
  }

  async function fetchStudents() {
    setLoading(true)
    let query = supabase.from('students').select('*, users(*), branches(name), belt_levels(name, hex), trainers(users(full_name))')
    if (selectedBranch !== 'all') query = query.eq('branch_id', selectedBranch)
    const { data } = await query
    if (data) setStudents(data)
    setLoading(false)
  }

  async function fetchStudentPayments(studentId) {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
    if (data) setPayments(data)
  }

  const handleViewProfile = (student) => {
    setSelectedStudent(student)
    fetchStudentPayments(student.id)
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
    const toastId = toast.loading('Adding new student...')
    try {
      const tempId = crypto.randomUUID()
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          id: tempId,
          clerk_id: tempId,
          email: formData.email,
          full_name: formData.fullName,
          phone: formData.parentMobile,
          role: 'student'
        }])
        
      if (userError) throw userError

      const { error: studentError } = await supabase
        .from('students')
        .insert([{
          user_id: tempId,
          branch_id: formData.branchId,
          trainer_id: formData.trainerId || null,
          belt_level_id: formData.beltLevelId || null,
          dob: formData.dob || null,
          gender: formData.gender,
          parent_name: formData.parentName,
          parent_phone: formData.parentMobile,
          join_date: new Date().toISOString().split('T')[0]
        }])

      if (studentError) throw studentError

      toast.success('Student added successfully', { id: toastId })
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
    s.belt_levels?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const exportCSV = () => {
    const headers = ['Student Name', 'DOB', 'Gender', 'Parent Name', 'Parent Mobile', 'Branch', 'Join Date']
    const csvData = students.map(s => [
      s.users?.full_name || '',
      s.dob || '',
      s.gender || '',
      s.parent_name || '',
      s.parent_phone || '',
      s.branches?.name || '',
      s.join_date ? new Date(s.join_date).toLocaleDateString() : ''
    ])
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'tkmaa_students.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Registry exported to CSV')
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="w-2 h-2 rounded-full bg-gold animate-pulse shadow-[0_0_10px_rgba(214,184,106,0.5)]" />
            <h2 className="text-gold text-[10px] tracking-[0.5em] uppercase font-black">
              Personnel Registry
            </h2>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none"
          >
            Academy <span className="text-gold italic outline-text">Students</span>
          </motion.h1>
        </div>
        <div className="flex gap-4">
          <Button onClick={exportCSV} variant="outline" className="border-white/10 text-white/40 hover:text-white hover:bg-white/5 uppercase tracking-[0.3em] text-[9px] font-black h-12 rounded-none px-8 transition-all">
            <Download className="mr-2" size={14} /> Export
          </Button>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gold text-black hover:bg-gold/90 font-black uppercase tracking-[0.2em] text-[10px] px-8 h-12 rounded-none glow-gold transition-all">
                <Plus className="mr-2" size={16} /> Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1B2230] border-white/10 backdrop-blur-2xl text-white rounded-none max-w-2xl p-0 overflow-hidden">
              <DialogHeader className="p-8 bg-white/5 border-b border-white/5">
                <DialogTitle className="text-xl font-black uppercase tracking-widest text-gold">Register New Trainee</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Full Name</label>
                    <Input {...register("fullName", { required: true })} className="bg-white/5 border-white/10 rounded-none h-12 text-sm uppercase tracking-wide" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Email Address</label>
                    <Input type="email" {...register("email", { required: true })} className="bg-white/5 border-white/10 rounded-none h-12 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Date of Birth</label>
                    <Input type="date" {...register("dob")} className="bg-white/5 border-white/10 rounded-none h-12 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Gender</label>
                    <select {...register("gender")} className="w-full bg-white/5 border border-white/10 rounded-none h-12 text-sm px-4 outline-none focus:border-gold uppercase">
                      <option value="male" className="bg-black">Male</option>
                      <option value="female" className="bg-black">Female</option>
                      <option value="other" className="bg-black">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Parent Name</label>
                    <Input {...register("parentName")} className="bg-white/5 border-white/10 rounded-none h-12 text-sm uppercase" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Parent Mobile</label>
                    <Input {...register("parentMobile")} className="bg-white/5 border-white/10 rounded-none h-12 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Assign Branch</label>
                    <select {...register("branchId", { required: true })} className="w-full bg-white/5 border border-white/10 rounded-none h-12 text-sm px-4 outline-none focus:border-gold uppercase">
                      <option value="" className="bg-black">Select Branch</option>
                      {branches.map(b => <option key={b.id} value={b.id} className="bg-black">{b.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Assign Trainer</label>
                    <select {...register("trainerId")} className="w-full bg-white/5 border border-white/10 rounded-none h-12 text-sm px-4 outline-none focus:border-gold uppercase">
                      <option value="" className="bg-black">Optional</option>
                      {trainers.filter(t => t.branch_id === watchedBranchId).map(t => (
                        <option key={t.id} value={t.id} className="bg-black">{t.users?.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Initial Belt</label>
                    <select {...register("beltLevelId")} className="w-full bg-white/5 border border-white/10 rounded-none h-12 text-sm px-4 outline-none focus:border-gold uppercase">
                      {beltLevels.map(b => <option key={b.id} value={b.id} className="bg-black">{b.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Initial Password</label>
                    <Input type="password" {...register("password", { required: true })} defaultValue="tkmaa123" className="bg-white/5 border-white/10 rounded-none h-12 text-sm" />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1 border-white/10 text-white hover:bg-white/5 h-14 rounded-none uppercase font-black tracking-widest text-xs">Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1 bg-gold text-black h-14 rounded-none uppercase font-black tracking-widest text-xs glow-gold">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Complete Registration"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Card className="bg-[#1B2230]/60 border-white/[0.06] backdrop-blur-xl rounded-none overflow-hidden relative">
        <motion.div initial={{ top: "-5%" }} animate={{ top: "105%" }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }} className="absolute left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent z-20 pointer-events-none" />
        <div className="p-6 border-b border-white/[0.06] bg-white/[0.02] flex flex-col md:flex-row gap-6 justify-between items-center">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold transition-colors" size={18} />
            <Input 
              placeholder="SEARCH BY NAME OR BELT..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 bg-white/5 border-white/10 focus:border-gold/50 rounded-none h-12 uppercase text-[10px] tracking-widest font-bold transition-all"
            />
          </div>
          <div className="flex gap-4 items-center w-full md:w-auto">
            <Filter size={16} className="text-white/20" />
            <select 
              value={selectedBranch} 
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-white/5 border border-white/10 h-12 px-6 rounded-none text-[10px] font-black uppercase tracking-widest outline-none focus:border-gold transition-all cursor-pointer"
            >
              <option value="all" className="bg-black">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id} className="bg-black">{b.name}</option>)}
            </select>
          </div>
        </div>

        <div className="relative">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-gold text-[10px] font-black uppercase tracking-widest h-14 pl-8">Trainee</TableHead>
                <TableHead className="text-gold text-[10px] font-black uppercase tracking-widest h-14">Rank</TableHead>
                <TableHead className="text-gold text-[10px] font-black uppercase tracking-widest h-14">Branch</TableHead>
                <TableHead className="text-gold text-[10px] font-black uppercase tracking-widest h-14">Lead Trainer</TableHead>
                <TableHead className="text-gold text-[10px] font-black uppercase tracking-widest h-14">Contact</TableHead>
                <TableHead className="text-gold text-[10px] font-black uppercase tracking-widest h-14 text-right pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {loading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <TableRow key={i} className="border-white/[0.04]">
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-white/[0.04] shimmer" />
                          <div className="space-y-2"><div className="h-3 w-28 bg-white/[0.04] shimmer" /><div className="h-2 w-20 bg-white/[0.03] shimmer" /></div>
                        </div>
                      </TableCell>
                      <TableCell><div className="h-5 w-14 bg-white/[0.04] shimmer" /></TableCell>
                      <TableCell><div className="h-3 w-20 bg-white/[0.04] shimmer" /></TableCell>
                      <TableCell><div className="h-3 w-24 bg-white/[0.04] shimmer" /></TableCell>
                      <TableCell><div className="h-3 w-20 bg-white/[0.04] shimmer" /></TableCell>
                      <TableCell><div className="h-6 w-6 bg-white/[0.04] shimmer ml-auto mr-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-white/20 uppercase tracking-[0.3em] font-black">
                        <Users size={48} className="mb-4 opacity-10" />
                        No Trainees Found
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.map((student, i) => (
                  <motion.tr
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    key={student.id}
                    className="group border-white/[0.04] hover:bg-white/[0.03] hover:shadow-[inset_3px_0_0_rgba(214,184,106,0.4)] transition-all duration-300 cursor-pointer"
                    onClick={() => handleViewProfile(student)}
                  >
                    <TableCell className="pl-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold font-black text-xs border border-gold/20">
                          {student.users?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-black uppercase tracking-wide text-sm group-hover:text-gold transition-colors">{student.users?.full_name}</p>
                          <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] mt-0.5">Joined {new Date(student.join_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${BELT_COLORS[student.belt_levels?.name] || 'bg-white/10'} rounded-none uppercase text-[8px] font-black tracking-widest px-2.5 py-1`}>
                        {student.belt_levels?.name || 'White'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white/60 font-bold uppercase text-[10px] tracking-widest">
                      {student.branches?.name}
                    </TableCell>
                    <TableCell className="text-white/60 font-bold uppercase text-[10px] tracking-widest">
                      {student.trainers?.users?.full_name || 'UNASSIGNED'}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-[10px] text-white/40 font-bold uppercase">{student.parent_phone}</p>
                        <p className="text-[9px] text-white/20 truncate max-w-[150px]">{student.users?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gold hover:text-black rounded-none">
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
        <DialogContent className="bg-[#1B2230]/95 border-white/[0.08] backdrop-blur-3xl text-white rounded-none max-w-4xl p-0 overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]">
          <AnimatePresence>
            {selectedStudent && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col md:flex-row h-full"
              >
                {/* Left Panel - Bio */}
                <div className="w-full md:w-80 bg-white/5 border-r border-white/5 p-8 flex flex-col items-center text-center">
                  <div className="w-32 h-32 rounded-full bg-gold/10 flex items-center justify-center text-gold font-black text-4xl border-2 border-gold/20 mb-6 shadow-[0_0_30px_rgba(214,184,106,0.1)]">
                    {selectedStudent.users?.full_name?.charAt(0)}
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight mb-2">{selectedStudent.users?.full_name}</h3>
                  <Badge className={`${BELT_COLORS[selectedStudent.belt_levels?.name] || 'bg-white/10'} rounded-none uppercase text-[9px] font-black tracking-widest px-4 py-1.5 mb-8`}>
                    {selectedStudent.belt_levels?.name} Rank
                  </Badge>

                  <div className="w-full space-y-4 text-left">
                    <div className="p-4 bg-black/40 border border-white/5 rounded-none">
                      <p className="text-[8px] uppercase tracking-[0.3em] text-white/20 font-black mb-1">Assigned Branch</p>
                      <p className="text-xs font-bold uppercase tracking-widest">{selectedStudent.branches?.name}</p>
                    </div>
                    <div className="p-4 bg-black/40 border border-white/5 rounded-none">
                      <p className="text-[8px] uppercase tracking-[0.3em] text-white/20 font-black mb-1">Primary Trainer</p>
                      <p className="text-xs font-bold uppercase tracking-widest text-gold">{selectedStudent.trainers?.users?.full_name || 'UNASSIGNED'}</p>
                    </div>
                  </div>

                  <div className="mt-auto pt-8 w-full flex flex-col gap-3">
                    <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 text-[10px] uppercase font-black tracking-[0.2em] h-12 rounded-none">
                      <Edit3 size={14} className="mr-2" /> Update Profile
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleDeleteStudent(selectedStudent.id, selectedStudent.user_id)}
                      disabled={isDeleting}
                      className="w-full border-red-900/30 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] uppercase font-black tracking-[0.2em] h-12 rounded-none"
                    >
                      <Trash2 size={14} className="mr-2" /> Remove Trainee
                    </Button>
                  </div>
                </div>

                {/* Right Panel - Details & Activity */}
                <div className="flex-1 p-8 overflow-y-auto max-h-[80vh]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div className="space-y-6">
                      <h4 className="text-xs font-black uppercase tracking-[0.3em] text-gold border-b border-gold/20 pb-2">Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-white/20 font-black">Date of Birth</p>
                          <p className="text-sm font-bold uppercase">{selectedStudent.dob || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-white/20 font-black">Gender</p>
                          <p className="text-sm font-bold uppercase">{selectedStudent.gender}</p>
                        </div>
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-white/20 font-black">Guardian</p>
                          <p className="text-sm font-bold uppercase">{selectedStudent.parent_name}</p>
                        </div>
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-white/20 font-black">Mobile</p>
                          <p className="text-sm font-bold uppercase">{selectedStudent.parent_phone}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <h4 className="text-xs font-black uppercase tracking-[0.3em] text-blue-400 border-b border-blue-400/20 pb-2">Credentials</h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Mail size={16} className="text-white/20" />
                          <p className="text-sm font-medium text-white/60">{selectedStudent.users?.email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Calendar size={16} className="text-white/20" />
                          <p className="text-sm font-medium text-white/60">Enrolled {new Date(selectedStudent.join_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <h4 className="text-xs font-black uppercase tracking-[0.3em] text-green-400">Recent Transactions</h4>
                      <Button variant="link" className="text-white/20 text-[10px] uppercase font-black hover:text-gold p-0 h-auto">View Ledger</Button>
                    </div>
                    <div className="space-y-2">
                      {payments.length === 0 ? (
                        <div className="p-8 text-center bg-white/5 border border-dashed border-white/10 text-white/20 uppercase text-[10px] tracking-widest font-black">
                          No transaction history found
                        </div>
                      ) : (
                        payments.map((p, i) => (
                          <div key={i} className="flex justify-between items-center p-4 bg-white/5 hover:bg-white/10 transition-colors group">
                            <div className="flex items-center gap-4">
                              <div className={`w-2 h-2 rounded-full ${p.status === 'paid' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                              <div>
                                <p className="text-xs font-bold uppercase tracking-widest">{p.month} Fees</p>
                                <p className="text-[9px] text-white/20 uppercase tracking-[0.2em]">{new Date(p.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-gold">₹{p.amount}</p>
                              <p className={`text-[8px] font-black uppercase tracking-widest ${p.status === 'paid' ? 'text-green-500' : 'text-red-500'}`}>{p.status}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  )
}
