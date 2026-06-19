"use client"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import {
  Plus, Search, Filter, Loader2, Users, Clock, Edit3, Trash2,
  Layers, CheckCircle2, XCircle, ChevronRight
} from 'lucide-react'
import { useForm } from "react-hook-form"
import { supabase, getTrainers } from '@/lib/supabase'
import { toast } from 'sonner'
import { Badge } from "@/components/ui/badge"
import { useBranch } from "@/context/BranchContext"
import { useSport } from "@/context/SportContext"
import { useAuth } from "@/context/AuthContext"

export default function BatchesPage() {
  const [batches, setBatches] = useState([])
  const { branches, selectedBranch } = useBranch()
  const { selectedSport, sports } = useSport()
  const { permissions } = useAuth()
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState(null)

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      sportId: ''
    }
  })
  const watchedBranchId = watch("branchId")
  const watchedSportId = watch("sportId")

  useEffect(() => {
    async function init() {
      const { data: tData } = await getTrainers()
      if (tData) setTrainers(tData)
    }
    init()
  }, [])

  useEffect(() => {
    fetchBatches()
  }, [selectedBranch, selectedSport, permissions])

  async function fetchBatches() {
    if (!permissions) return
    setLoading(true)
    let query = supabase
      .from('batches')
      .select('*, branches(name), trainers(users(full_name)), sports(sport_name), student_batches:student_batches(count)')
      .order('created_at', { ascending: false })

    if (selectedBranch !== 'all') {
      query = query.eq('branch_id', selectedBranch)
    } else if (permissions.branchIds && permissions.branchIds.length > 0) {
      query = query.in('branch_id', permissions.branchIds)
    }

    if (selectedSport !== 'all') {
      query = query.eq('sport_id', selectedSport)
    } else if (permissions.role === 'sport_admin' && permissions.sportIds?.length > 0) {
      query = query.in('sport_id', permissions.sportIds)
    }

    const { data } = await query
    if (data) setBatches(data)
    setLoading(false)
  }

  const openEdit = (batch) => {
    setEditingBatch(batch)
    setValue("batchName", batch.batch_name)
    setValue("branchId", batch.branch_id)
    setValue("sportId", batch.sport_id || '')
    setValue("trainerId", batch.trainer_id || '')
    setValue("startTime", batch.start_time)
    setValue("endTime", batch.end_time)
    setValue("maxStudents", batch.max_students)
    setValue("isActive", batch.is_active)
    setOpen(true)
  }

  const openCreate = () => {
    setEditingBatch(null)
    reset()
    if (selectedSport !== 'all') {
      setValue("sportId", selectedSport)
    }
    setOpen(true)
  }

  const onSubmit = async (formData) => {
    setIsSubmitting(true)
    const toastId = toast.loading(editingBatch ? 'Updating batch...' : 'Creating batch...')
    try {
      const payload = {
        batch_name: formData.batchName,
        branch_id: formData.branchId,
        sport_id: formData.sportId || null,
        trainer_id: formData.trainerId || null,
        start_time: formData.startTime,
        end_time: formData.endTime,
        max_students: parseInt(formData.maxStudents) || 30,
        is_active: formData.isActive !== false && formData.isActive !== 'false',
      }

      if (editingBatch) {
        const { error } = await supabase.from('batches').update(payload).eq('id', editingBatch.id)
        if (error) throw error
        toast.success('Batch updated successfully', { id: toastId })
      } else {
        const { error } = await supabase.from('batches').insert([payload])
        if (error) throw error
        toast.success('Batch created successfully', { id: toastId })
      }

      setOpen(false)
      reset()
      setEditingBatch(null)
      fetchBatches()
    } catch (err) {
      toast.error('Operation failed: ' + err.message, { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteBatch = async (id) => {
    if (!confirm('Are you sure you want to delete this batch?')) return
    const toastId = toast.loading('Deleting batch...')
    const { error } = await supabase.from('batches').delete().eq('id', id)
    if (error) {
      toast.error('Delete failed: ' + error.message, { id: toastId })
    } else {
      toast.success('Batch deleted', { id: toastId })
      fetchBatches()
    }
  }

  const toggleActive = async (batch) => {
    const { error } = await supabase.from('batches').update({ is_active: !batch.is_active }).eq('id', batch.id)
    if (!error) fetchBatches()
  }

  const filtered = batches.filter(b =>
    b.batch_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.branches?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.sports?.sport_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0A1F30] sm:text-3xl">
            Batch Management
          </h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            Create and manage academy class groups
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#0A1F30] hover:bg-[#0A1F30]/90 text-white rounded-lg text-xs">
          <Plus className="mr-2" size={16} /> Create Batch
        </Button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: "Total Batches", val: batches.length, icon: Layers, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Active Batches", val: batches.filter(b => b.is_active).length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Inactive", val: batches.filter(b => !b.is_active).length, icon: XCircle, color: "text-gray-500", bg: "bg-gray-100" },
        ].map((stat, i) => (
          <Card key={i} className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{stat.label}</p>
                <div className={`p-2 rounded-lg ${stat.bg}`}><stat.icon size={16} className={stat.color} /></div>
              </div>
              <div className={`text-3xl font-bold tracking-tight ${stat.color}`}>{stat.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C5A059] transition-colors" size={16} />
            <Input
              placeholder="Search batches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-gray-200 focus:border-[#C5A059] focus:ring-[#C5A059]/20 rounded-lg h-10 text-sm"
            />
          </div>
          <div className="flex gap-3 items-center w-full sm:w-auto">
            {/* Branch dropdown moved to Sidebar */}
          </div>
        </div>
        <Table>
          <TableHeader className="bg-gray-50/80 border-b border-gray-100">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider py-4 pl-6">Batch</TableHead>
              <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Branch</TableHead>
              <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Trainer</TableHead>
              <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Schedule</TableHead>
              <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Capacity</TableHead>
              <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {loading ? (
                <TableRow><TableCell colSpan={7} className="h-64 text-center">
                  <Loader2 className="animate-spin text-[#C5A059] mx-auto mb-4" size={32} />
                  <span className="text-xs text-gray-500">Loading Batches...</span>
                </TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-64 text-center text-gray-400 text-sm">
                  <Layers size={40} className="mx-auto mb-3 opacity-20" />
                  <p>No batches found</p>
                </TableCell></TableRow>
              ) : filtered.map((batch, i) => (
                <motion.tr
                  key={batch.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-xs border border-blue-100">
                        <Layers size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-[#0A1F30]">{batch.batch_name}</p>
                          {batch.sports && (
                            <Badge variant="outline" className="text-[8px] px-1.5 py-0 font-bold tracking-tight bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/20">
                              {batch.sports.sport_name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {batch.id.slice(0,8)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{batch.branches?.name}</TableCell>
                  <TableCell className="text-sm text-gray-600">{batch.trainers?.users?.full_name || <span className="text-gray-400 italic">Unassigned</span>}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-[#0A1F30]">
                      <Clock size={14} className="text-[#C5A059]" />
                      {batch.start_time?.slice(0,5)} – {batch.end_time?.slice(0,5)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-gray-400" />
                      <span className="text-sm font-medium text-[#0A1F30]">{batch.student_batches?.[0]?.count || 0}</span>
                      <span className="text-xs text-gray-400">/ {batch.max_students}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => toggleActive(batch)}>
                      <Badge variant="outline" className={`cursor-pointer rounded-md font-semibold px-2.5 py-0.5 ${batch.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {batch.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" onClick={() => openEdit(batch)} className="h-8 w-8 p-0 text-gray-400 hover:text-[#0A1F30] hover:bg-gray-100 rounded-lg">
                        <Edit3 size={14} />
                      </Button>
                      <Button variant="ghost" onClick={() => deleteBatch(batch.id)} className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingBatch(null); reset() } }}>
        <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-gray-100">
            <DialogTitle className="text-lg font-heading font-bold text-[#0A1F30]">
              {editingBatch ? 'Edit Batch' : 'Create New Batch'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Batch Name</label>
              <Input {...register("batchName", { required: true })} placeholder="e.g. Morning Karate A" className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Sport Enrollment <span className="text-red-500">*</span></label>
                <select {...register("sportId", { required: true })} className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059]">
                  <option value="">Select Sport</option>
                  {sports.map(s => <option key={s.id} value={s.id}>{s.sport_name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Branch</label>
                <select {...register("branchId", { required: true })} className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059]">
                  <option value="">Select Branch</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Trainer</label>
                <select {...register("trainerId")} className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059]">
                  <option value="">Unassigned</option>
                  {trainers.filter(t => !watchedBranchId || t.branch_id === watchedBranchId).map(t => (
                    <option key={t.id} value={t.id}>{t.users?.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Start Time</label>
                <Input type="time" {...register("startTime", { required: true })} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">End Time</label>
                <Input type="time" {...register("endTime", { required: true })} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Max Students</label>
                <Input type="number" {...register("maxStudents")} defaultValue={30} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Status</label>
                <select {...register("isActive")} defaultValue="true" className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059]">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditingBatch(null); reset() }} className="flex-1 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-lg">
                {isSubmitting ? <Loader2 className="animate-spin" /> : editingBatch ? "Update Batch" : "Create Batch"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
