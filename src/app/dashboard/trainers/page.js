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
  DialogTitle 
} from "@/components/ui/dialog"
import { 
  Plus, Search, Filter,
  Star, Loader2, Award, 
  ChevronRight, Download
} from 'lucide-react'
import { useForm } from "react-hook-form"
import { supabase, getTrainers } from '@/lib/supabase'
import { toast } from 'sonner'
import { useBranch } from '@/context/BranchContext'
import { Badge } from "@/components/ui/badge"

export default function TrainersPage() {
  const [trainers, setTrainers] = useState([])
  const { branches, selectedBranch } = useBranch()
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [open, setOpen] = useState(false)

  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    async function loadTrainers() {
      setLoading(true)
      const { data } = await getTrainers(selectedBranch)
      if (data) setTrainers(data)
      setLoading(false)
    }

    loadTrainers()
  }, [selectedBranch])

  const onSubmit = async (formData) => {
    setIsSubmitting(true)
    const toastId = toast.loading('Initializing personnel record...')
    try {
      const email = formData.email?.trim()
      if (!email) throw new Error('Email is required')

      // Check if email already exists
      const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
      if (existingUser) throw new Error('A user with this email already exists. Please use a different email.')

      const tempId = crypto.randomUUID()
      // 1. Create User — the DB trigger `handle_new_user_role` auto-creates a trainer record
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          id: tempId,
          clerk_id: tempId,
          email: email,
          full_name: formData.fullName,
          phone: formData.phone,
          role: 'trainer'
        }])
        
      if (userError) throw userError

      // 2. UPDATE the trigger-created trainer record with full details
      const { error: trainerError } = await supabase
        .from('trainers')
        .update({
          branch_id: formData.branchId,
          experience_yrs: parseInt(formData.experience) || 0,
          specialization: formData.specialization ? formData.specialization.split(',').map(s => s.trim()) : []
        })
        .eq('user_id', tempId)

      if (trainerError) {
        // Cleanup: remove the user we just created if trainer update fails
        await supabase.from('users').delete().eq('id', tempId)
        throw trainerError
      }

      toast.success('Personnel record established successfully', { id: toastId })
      setOpen(false)
      reset()
      fetchTrainers()
    } catch (err) {
      toast.error('Initialization failed: ' + err.message, { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredTrainers = trainers.filter(t => 
    t.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.specialization?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.member_id && t.member_id.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const exportPersonnel = () => {
    toast.info('Generating personnel report...')
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0A1F30] sm:text-3xl">
            Academy Trainers
          </h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            Manage elite personnel and instructor assignments
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={exportPersonnel} variant="outline" className="rounded-lg text-xs">
            <Download className="mr-2" size={14} /> Export
          </Button>

          <Button onClick={() => setOpen(true)} className="bg-[#0A1F30] hover:bg-[#0A1F30]/90 text-white rounded-lg text-xs">
            <Plus className="mr-2" size={16} /> Add Trainer
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-lg p-0 overflow-hidden">
              <DialogHeader className="p-6 border-b border-gray-100">
                <DialogTitle className="text-lg font-heading font-bold text-[#0A1F30]">Establish Personnel Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Full Identity</label>
                  <Input {...register("fullName")} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" placeholder="Enter Full Name" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Email Interface</label>
                    <Input {...register("email")} type="email" className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" placeholder="email@tkmaa.com" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Access Key</label>
                    <Input {...register("password")} type="text" className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" placeholder="Set Password" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Experience (Cycles)</label>
                    <Input {...register("experience")} type="number" className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" placeholder="Years" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Operational Hub</label>
                    <select 
                      {...register("branchId")}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10"
                    >
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Core Specializations</label>
                  <Input {...register("specialization")} placeholder="e.g. Karate, MMA, Weaponry" className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-lg">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Authorize Entry"}
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
              placeholder="Search by ID, name or specialization..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-gray-200 focus:border-[#C5A059] focus:ring-[#C5A059]/20 rounded-lg h-10 text-sm transition-all"
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
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider py-4 pl-6">Instructor</TableHead>
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Branch</TableHead>
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Experience</TableHead>
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Specialization</TableHead>
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {loading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <TableRow key={i} className="border-b border-gray-50">
                      <TableCell className="pl-6 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" /><div className="space-y-2"><div className="h-3 w-24 bg-gray-100 animate-pulse rounded" /><div className="h-2 w-32 bg-gray-100 animate-pulse rounded" /></div></div></TableCell>
                      <TableCell><div className="h-3 w-20 bg-gray-100 animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-3 w-16 bg-gray-100 animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-5 w-24 bg-gray-100 animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-6 w-6 bg-gray-100 animate-pulse rounded ml-auto mr-4" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredTrainers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <Award size={40} className="mb-3 opacity-20" />
                        <p className="text-sm">No Personnel Found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTrainers.map((trainer, i) => {
                  const trainerUser = trainer.users
                  return (
                  <motion.tr
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    key={trainer.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group cursor-pointer"
                  >
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-xs border border-blue-100">
                          {trainerUser?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-[#0A1F30]">{trainerUser?.full_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            <span className="font-mono bg-gray-100 px-1 py-0.5 rounded mr-1.5 font-semibold text-gray-600">{trainer.member_id}</span>
                            {trainerUser?.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {trainer.branches?.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Star size={14} className="text-[#C5A059]" />
                        <span className="text-sm font-medium text-[#0A1F30]">{trainer.experience_yrs} Cycles</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {trainer.specialization?.map((spec, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium px-2 py-0.5">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-[#0A1F30] hover:bg-gray-100 rounded-lg">
                        <ChevronRight size={16} />
                      </Button>
                    </TableCell>
                  </motion.tr>
                )})}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
