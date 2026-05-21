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
  Plus, Search, Filter, MoreVertical, 
  Shield, Star, Loader2, Award, Mail, 
  Phone, Briefcase, ChevronRight, Download
} from 'lucide-react'
import { useForm } from "react-hook-form"
import { supabase, getTrainers, getBranches } from '@/lib/supabase'
import { toast } from 'sonner'
import { Badge } from "@/components/ui/badge"

export default function TrainersPage() {
  const [trainers, setTrainers] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [open, setOpen] = useState(false)

  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    async function loadInitialData() {
      const { data } = await getBranches()
      if (data) setBranches(data)
    }

    loadInitialData()
  }, [])

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
      const tempId = crypto.randomUUID()
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          id: tempId,
          clerk_id: tempId,
          email: formData.email,
          full_name: formData.fullName,
          phone: formData.phone,
          role: 'trainer'
        }])
        
      if (userError) throw userError

      const { error: trainerError } = await supabase
        .from('trainers')
        .insert([{
          user_id: tempId,
          branch_id: formData.branchId,
          experience_yrs: parseInt(formData.experience) || 0,
          specialization: formData.specialization ? formData.specialization.split(',').map(s => s.trim()) : []
        }])

      if (trainerError) throw trainerError

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
    t.specialization?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const exportPersonnel = () => {
    toast.info('Generating personnel report...')
    // Export logic can be added here
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
              Elite Personnel
            </h2>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none"
          >
            Academy <span className="text-gold italic outline-text">Trainers</span>
          </motion.h1>
        </div>
        
        <div className="flex gap-4">
          <Button onClick={exportPersonnel} variant="outline" className="border-white/10 text-white/40 hover:text-white hover:bg-white/5 uppercase tracking-[0.3em] text-[9px] font-black h-12 rounded-none px-8 transition-all">
            <Download className="mr-2" size={14} /> Export
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gold text-black hover:bg-gold/90 font-black uppercase tracking-[0.2em] text-[10px] px-8 h-12 rounded-none glow-gold transition-all">
                <Plus className="mr-2" size={16} /> Add Trainer
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1B2230]/95 border-white/[0.08] backdrop-blur-3xl text-white rounded-none max-w-lg p-0 overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]">
              <DialogHeader className="p-8 bg-white/5 border-b border-white/5">
                <DialogTitle className="text-xl font-black uppercase tracking-widest text-gold">Establish Personnel Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Full Identity</label>
                  <Input {...register("fullName")} className="bg-white/5 border-white/10 rounded-none h-12 text-sm uppercase tracking-wide" placeholder="Enter Full Name" required />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Email Interface</label>
                    <Input {...register("email")} type="email" className="bg-white/5 border-white/10 rounded-none h-12 text-sm" placeholder="email@tkmaa.com" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Access Key</label>
                    <Input {...register("password")} type="text" className="bg-white/5 border-white/10 rounded-none h-12 text-sm" placeholder="Set Password" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Experience (Cycles)</label>
                    <Input {...register("experience")} type="number" className="bg-white/5 border-white/10 rounded-none h-12 text-sm" placeholder="Years" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Operational Hub</label>
                    <select 
                      {...register("branchId")}
                      className="w-full bg-white/5 border border-white/10 rounded-none h-12 px-4 text-sm focus:border-gold outline-none uppercase font-bold"
                    >
                      {branches.map(b => <option key={b.id} value={b.id} className="bg-black">{b.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Core Specializations</label>
                  <Input {...register("specialization")} placeholder="e.g. Karate, MMA, Weaponry" className="bg-white/5 border-white/10 rounded-none h-12 text-sm uppercase tracking-widest" />
                </div>
                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1 border-white/10 text-white hover:bg-white/5 h-14 rounded-none uppercase font-black tracking-widest text-xs">Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1 bg-gold text-black h-14 rounded-none uppercase font-black tracking-widest text-xs glow-gold">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Authorize Entry"}
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
              placeholder="SEARCH BY NAME OR SPECIALIZATION..." 
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
              <option value="all" className="bg-black">All Hubs</option>
              {branches.map(b => <option key={b.id} value={b.id} className="bg-black">{b.name}</option>)}
            </select>
          </div>
        </div>

        <div className="relative overflow-x-auto">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-gold text-[10px] font-black uppercase tracking-widest h-14 pl-8">Instructor</TableHead>
                <TableHead className="text-gold text-[10px] font-black uppercase tracking-widest h-14">Branch</TableHead>
                <TableHead className="text-gold text-[10px] font-black uppercase tracking-widest h-14">Experience</TableHead>
                <TableHead className="text-gold text-[10px] font-black uppercase tracking-widest h-14">Specialization</TableHead>
                <TableHead className="text-gold text-[10px] font-black uppercase tracking-widest h-14 text-right pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {loading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <TableRow key={i} className="border-white/[0.04]">
                      <TableCell className="pl-8 py-5"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-white/[0.04] shimmer" /><div className="space-y-2"><div className="h-3 w-28 bg-white/[0.04] shimmer" /><div className="h-2 w-20 bg-white/[0.03] shimmer" /></div></div></TableCell>
                      <TableCell><div className="h-3 w-20 bg-white/[0.04] shimmer" /></TableCell>
                      <TableCell><div className="h-3 w-16 bg-white/[0.04] shimmer" /></TableCell>
                      <TableCell><div className="h-5 w-24 bg-white/[0.04] shimmer" /></TableCell>
                      <TableCell><div className="h-6 w-6 bg-white/[0.04] shimmer ml-auto mr-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredTrainers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-white/20 uppercase tracking-[0.3em] font-black">
                        <Award size={48} className="mb-4 opacity-10" />
                        No Personnel Found
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTrainers.map((trainer, i) => {
                  const trainerUser = trainer.users
                  return (
                  <motion.tr
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    key={trainer.id}
                    className="group border-white/[0.04] hover:bg-white/[0.03] hover:shadow-[inset_3px_0_0_rgba(214,184,106,0.4)] transition-all duration-300 cursor-pointer"
                  >
                    <TableCell className="pl-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold font-black text-xs border border-gold/20">
                          {trainerUser?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-black uppercase tracking-wide text-sm group-hover:text-gold transition-colors">{trainerUser?.full_name}</p>
                          <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] mt-0.5">{trainerUser?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-white/60 font-bold uppercase text-[10px] tracking-widest">
                      {trainer.branches?.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Star size={12} className="text-gold" />
                        <span className="text-white font-bold text-[10px] uppercase tracking-widest">{trainer.experience_yrs} Cycles</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {trainer.specialization?.map((spec, idx) => (
                          <Badge key={idx} variant="outline" className="border-white/10 bg-white/5 rounded-none uppercase text-[8px] font-black tracking-widest px-2 py-0.5 text-white/60">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gold hover:text-black rounded-none">
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
