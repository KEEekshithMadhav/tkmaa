"use client"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "@/components/ui/dialog"
import { 
  Plus, MapPin, Phone, Clock, Users, ChevronRight, Globe, Activity, 
  Zap, MoreVertical, Edit2, Trash2, UserPlus, Shield, X, Check, Loader2,
  ChevronDown, ChevronUp, UserCog
} from 'lucide-react'
import { supabase, updateUserRole, getAllUsers } from '@/lib/supabase'
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from 'sonner'
import { useForm } from "react-hook-form"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { y: 25, opacity: 0, filter: "blur(8px)" },
  visible: { y: 0, opacity: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 100, damping: 15 } }
}

const ROLE_COLORS = {
  admin: 'bg-red-50 text-red-700 border-red-200',
  branch_manager: 'bg-purple-50 text-purple-700 border-purple-200',
  trainer: 'bg-blue-50 text-blue-700 border-blue-200',
  student: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  parent: 'bg-amber-50 text-amber-700 border-amber-200',
}

const ROLE_LABELS = {
  admin: 'Admin',
  branch_manager: 'Branch Manager',
  trainer: 'Trainer',
  student: 'Student',
  parent: 'Parent',
}

export default function BranchesPage() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [openCreate, setOpenCreate] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [expandedBranch, setExpandedBranch] = useState(null)
  const [branchPersonnel, setBranchPersonnel] = useState({})
  const [branchManagers, setBranchManagers] = useState({})
  const [allUsers, setAllUsers] = useState([])
  const [assignOpen, setAssignOpen] = useState(null) // branchId
  const [roleChangeUser, setRoleChangeUser] = useState(null) // {userId, currentRole}
  const [submitting, setSubmitting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(null)

  const { register, handleSubmit, reset, setValue } = useForm()
  const { register: regEdit, handleSubmit: handleEdit, reset: resetEdit, setValue: setEditValue } = useForm()

  async function fetchBranches() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('branches')
        .select(`*, students:students(count), trainers:trainers(count)`)
      if (data) setBranches(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPersonnel(branchId) {
    const [trainersRes, managersRes] = await Promise.all([
      supabase.from('trainers').select('id, user_id, experience_yrs, specialization, users(id, full_name, email, role)').eq('branch_id', branchId),
      supabase.from('branch_managers').select('id, user_id, users(id, full_name, email, role)').eq('branch_id', branchId)
    ])
    setBranchPersonnel(prev => ({ ...prev, [branchId]: trainersRes.data || [] }))
    setBranchManagers(prev => ({ ...prev, [branchId]: managersRes.data || [] }))
  }

  useEffect(() => { fetchBranches() }, [])

  const toggleExpand = async (branchId) => {
    if (expandedBranch === branchId) {
      setExpandedBranch(null)
    } else {
      setExpandedBranch(branchId)
      await fetchPersonnel(branchId)
    }
  }

  // Create Branch
  const onCreateBranch = async (formData) => {
    setSubmitting(true)
    const tid = toast.loading('Creating branch...')
    try {
      const { error } = await supabase.from('branches').insert([{
        name: formData.name,
        location: formData.location,
        address: formData.address || null,
        phone: formData.phone || null,
        timings: formData.timings || '6:00 AM – 8:00 PM'
      }])
      if (error) throw error
      toast.success('Branch created successfully', { id: tid })
      setOpenCreate(false)
      reset()
      fetchBranches()
    } catch (err) {
      toast.error('Failed: ' + err.message, { id: tid })
    } finally {
      setSubmitting(false)
    }
  }

  // Edit Branch
  const openEditDialog = (branch) => {
    setEditingBranch(branch)
    setEditValue('name', branch.name)
    setEditValue('location', branch.location)
    setEditValue('address', branch.address || '')
    setEditValue('phone', branch.phone || '')
    setEditValue('timings', branch.timings || '')
  }

  const onEditBranch = async (formData) => {
    setSubmitting(true)
    const tid = toast.loading('Updating branch...')
    try {
      const { error } = await supabase.from('branches')
        .update({
          name: formData.name,
          location: formData.location,
          address: formData.address || null,
          phone: formData.phone || null,
          timings: formData.timings || '6:00 AM – 8:00 PM'
        })
        .eq('id', editingBranch.id)
      if (error) throw error
      toast.success('Branch updated', { id: tid })
      setEditingBranch(null)
      resetEdit()
      fetchBranches()
    } catch (err) {
      toast.error('Failed: ' + err.message, { id: tid })
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Branch
  const deleteBranch = async (branchId) => {
    if (!confirm('Are you sure? This will unlink all students and trainers from this branch.')) return
    const tid = toast.loading('Deleting branch...')
    try {
      const { error } = await supabase.from('branches').delete().eq('id', branchId)
      if (error) throw error
      toast.success('Branch deleted', { id: tid })
      fetchBranches()
    } catch (err) {
      toast.error('Failed: ' + err.message, { id: tid })
    }
  }

  // Assign user to branch
  const openAssignDialog = async (branchId) => {
    setAssignOpen(branchId)
    const { data } = await getAllUsers()
    if (data) setAllUsers(data)
  }

  const assignTrainerToBranch = async (userId, branchId) => {
    const tid = toast.loading('Assigning trainer...')
    try {
      const { error } = await supabase.from('trainers')
        .update({ branch_id: branchId })
        .eq('user_id', userId)
      if (error) throw error
      toast.success('Trainer assigned', { id: tid })
      setAssignOpen(null)
      fetchPersonnel(branchId)
      fetchBranches()
    } catch (err) {
      toast.error('Failed: ' + err.message, { id: tid })
    }
  }

  const assignManagerToBranch = async (userId, branchId) => {
    const tid = toast.loading('Assigning manager...')
    try {
      // Update user role
      await supabase.from('users').update({ role: 'branch_manager' }).eq('id', userId)
      // Create assignment
      const { error } = await supabase.from('branch_managers')
        .insert([{ user_id: userId, branch_id: branchId }])
      if (error) throw error
      toast.success('Branch manager assigned', { id: tid })
      setAssignOpen(null)
      fetchPersonnel(branchId)
      fetchBranches()
    } catch (err) {
      toast.error('Failed: ' + err.message, { id: tid })
    }
  }

  const removeManagerFromBranch = async (userId, branchId) => {
    const tid = toast.loading('Removing manager...')
    try {
      const { error } = await supabase.from('branch_managers')
        .delete().eq('user_id', userId).eq('branch_id', branchId)
      if (error) throw error
      toast.success('Manager removed', { id: tid })
      fetchPersonnel(branchId)
    } catch (err) {
      toast.error('Failed: ' + err.message, { id: tid })
    }
  }

  // Change user role
  const changeRole = async (userId, newRole) => {
    const tid = toast.loading('Changing role...')
    try {
      const { error } = await updateUserRole(userId, newRole)
      if (error) throw error
      toast.success(`Role changed to ${ROLE_LABELS[newRole]}`, { id: tid })
      setRoleChangeUser(null)
      if (expandedBranch) fetchPersonnel(expandedBranch)
    } catch (err) {
      toast.error('Failed: ' + err.message, { id: tid })
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <header className="flex justify-between items-end">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 bg-gray-200" />
            <Skeleton className="h-10 w-64 bg-gray-200" />
          </div>
          <Skeleton className="h-10 w-32 bg-gray-200" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[300px] w-full bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0A1F30] sm:text-3xl">
            Branch Management
          </h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            Manage branches, assign personnel, and control access permissions
          </p>
        </div>
        <Button onClick={() => setOpenCreate(true)} className="bg-[#0A1F30] hover:bg-[#0A1F30]/90 text-white rounded-lg text-xs">
          <Plus className="mr-2" size={16} /> New Branch
        </Button>
      </header>

      {/* Branch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {branches.map((branch) => (
          <motion.div key={branch.id} variants={itemVariants}>
            <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden relative group hover:shadow-md transition-all duration-500">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none group-hover:scale-110 duration-700 transform text-gray-900">
                <Globe size={240} />
              </div>
              
              <CardHeader className="border-b border-gray-100 p-8">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse" />
                      <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Operational</span>
                    </div>
                    <CardTitle className="text-2xl font-heading font-bold text-[#0A1F30] uppercase mb-1">{branch.name}</CardTitle>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Ref ID: {branch.id.slice(0,12)}</p>
                  </div>
                  <div className="relative">
                    <Button variant="ghost" onClick={() => setMenuOpen(menuOpen === branch.id ? null : branch.id)} className="h-10 w-10 p-0 hover:bg-gray-50 text-gray-400 rounded-lg">
                      <MoreVertical size={18} />
                    </Button>
                    <AnimatePresence>
                      {menuOpen === branch.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-12 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2 w-48"
                        >
                          <button onClick={() => { openEditDialog(branch); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <Edit2 size={14} /> Edit Branch
                          </button>
                          <button onClick={() => { openAssignDialog(branch.id); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <UserPlus size={14} /> Assign User
                          </button>
                          <div className="border-t border-gray-100 my-1" />
                          <button onClick={() => { deleteBranch(branch.id); setMenuOpen(null) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} /> Delete Branch
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-8 space-y-8 relative z-10">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gray-50 flex items-center justify-center rounded-lg border border-gray-100">
                      <MapPin size={16} className="text-[#C5A059]" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Location</p>
                      <span className="text-sm font-semibold text-[#0A1F30]">{branch.address || branch.location}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gray-50 flex items-center justify-center rounded-lg border border-gray-100">
                        <Phone size={16} className="text-[#C5A059]" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Contact</p>
                        <span className="text-sm font-semibold text-[#0A1F30]">{branch.phone || 'Not set'}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gray-50 flex items-center justify-center rounded-lg border border-gray-100">
                        <Clock size={16} className="text-[#C5A059]" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Timings</p>
                        <span className="text-sm font-semibold text-[#0A1F30]">{branch.timings || '06:00 - 21:00'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-100">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Users size={14} className="text-[#C5A059]" />
                      <p className="text-3xl font-bold text-[#0A1F30] tracking-tight">{branch.students?.[0]?.count || 0}</p>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Students</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Activity size={14} className="text-blue-500" />
                      <p className="text-3xl font-bold text-[#0A1F30] tracking-tight">{branch.trainers?.[0]?.count || 0}</p>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Trainers</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Shield size={14} className="text-purple-500" />
                      <p className="text-3xl font-bold text-[#0A1F30] tracking-tight">{branchManagers[branch.id]?.length || 0}</p>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Managers</p>
                  </div>
                </div>
                
                {/* Expand/Collapse Personnel */}
                <button 
                  onClick={() => toggleExpand(branch.id)}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-lg text-xs font-semibold text-[#0A1F30] hover:bg-gray-50 transition-colors"
                >
                  <UserCog size={14} />
                  {expandedBranch === branch.id ? 'Hide' : 'View'} Personnel & Permissions
                  {expandedBranch === branch.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <AnimatePresence>
                  {expandedBranch === branch.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-4 pt-2">
                        {/* Branch Managers */}
                        <div>
                          <h4 className="text-[10px] uppercase tracking-widest text-purple-600 font-bold mb-3 flex items-center gap-2">
                            <Shield size={12} /> Branch Managers
                          </h4>
                          {(branchManagers[branch.id] || []).length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No managers assigned</p>
                          ) : (
                            <div className="space-y-2">
                              {(branchManagers[branch.id] || []).map(mgr => (
                                <div key={mgr.id} className="flex items-center justify-between bg-purple-50/50 rounded-lg px-4 py-2.5 border border-purple-100">
                                  <div>
                                    <p className="text-sm font-semibold text-[#0A1F30]">{mgr.users?.full_name}</p>
                                    <p className="text-[10px] text-gray-400">{mgr.users?.email}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold ${ROLE_COLORS.branch_manager}`}>
                                      Manager
                                    </span>
                                    <button onClick={() => removeManagerFromBranch(mgr.user_id, branch.id)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Trainers */}
                        <div>
                          <h4 className="text-[10px] uppercase tracking-widest text-blue-600 font-bold mb-3 flex items-center gap-2">
                            <Users size={12} /> Assigned Trainers
                          </h4>
                          {(branchPersonnel[branch.id] || []).length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No trainers assigned</p>
                          ) : (
                            <div className="space-y-2">
                              {(branchPersonnel[branch.id] || []).map(trainer => (
                                <div key={trainer.id} className="flex items-center justify-between bg-blue-50/50 rounded-lg px-4 py-2.5 border border-blue-100">
                                  <div>
                                    <p className="text-sm font-semibold text-[#0A1F30]">{trainer.users?.full_name}</p>
                                    <p className="text-[10px] text-gray-400">{trainer.users?.email}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold ${ROLE_COLORS[trainer.users?.role || 'trainer']}`}>
                                      {ROLE_LABELS[trainer.users?.role || 'trainer']}
                                    </span>
                                    <div className="relative">
                                      <button 
                                        onClick={() => setRoleChangeUser(roleChangeUser?.userId === trainer.users?.id ? null : { userId: trainer.users?.id, currentRole: trainer.users?.role })}
                                        className="text-gray-400 hover:text-[#C5A059] transition-colors p-1" title="Change Role"
                                      >
                                        <UserCog size={14} />
                                      </button>
                                      <AnimatePresence>
                                        {roleChangeUser?.userId === trainer.users?.id && (
                                          <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2 w-44"
                                          >
                                            {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'parent').map(([key, label]) => (
                                              <button
                                                key={key}
                                                onClick={() => changeRole(trainer.users.id, key)}
                                                disabled={key === roleChangeUser.currentRole}
                                                className={`w-full flex items-center gap-2 px-4 py-2 text-xs transition-colors ${key === roleChangeUser.currentRole ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                                              >
                                                {key === roleChangeUser.currentRole && <Check size={12} className="text-emerald-500" />}
                                                {label}
                                              </button>
                                            ))}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button 
                          onClick={() => openAssignDialog(branch.id)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-gray-300 rounded-lg text-xs font-semibold text-gray-500 hover:text-[#0A1F30] hover:border-[#C5A059] transition-colors"
                        >
                          <UserPlus size={14} /> Assign User to Branch
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Create Branch Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-gray-100">
            <DialogTitle className="text-lg font-heading font-bold text-[#0A1F30]">Create New Branch</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreateBranch)} className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Branch Name</label>
              <Input {...register("name", { required: true })} placeholder="e.g. Miyapur" className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Location</label>
              <Input {...register("location", { required: true })} placeholder="Miyapur, Hyderabad" className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Full Address</label>
              <Input {...register("address")} placeholder="Plot No, Road, Area" className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Phone</label>
                <Input {...register("phone")} placeholder="+91 98765 43210" className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Timings</label>
                <Input {...register("timings")} placeholder="6:00 AM – 8:00 PM" className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setOpenCreate(false); reset() }} className="flex-1 rounded-lg h-10 text-xs">Cancel</Button>
              <Button type="submit" disabled={submitting} className="flex-1 bg-[#C5A059] hover:bg-[#B08E48] text-white rounded-lg h-10 text-xs font-semibold">
                {submitting ? <Loader2 className="animate-spin mr-2" size={14} /> : <Plus className="mr-2" size={14} />}
                Create Branch
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Branch Dialog */}
      <Dialog open={!!editingBranch} onOpenChange={(open) => !open && setEditingBranch(null)}>
        <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-gray-100">
            <DialogTitle className="text-lg font-heading font-bold text-[#0A1F30]">Edit Branch</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit(onEditBranch)} className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Branch Name</label>
              <Input {...regEdit("name", { required: true })} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Location</label>
              <Input {...regEdit("location", { required: true })} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Full Address</label>
              <Input {...regEdit("address")} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Phone</label>
                <Input {...regEdit("phone")} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Timings</label>
                <Input {...regEdit("timings")} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingBranch(null)} className="flex-1 rounded-lg h-10 text-xs">Cancel</Button>
              <Button type="submit" disabled={submitting} className="flex-1 bg-[#C5A059] hover:bg-[#B08E48] text-white rounded-lg h-10 text-xs font-semibold">
                {submitting ? <Loader2 className="animate-spin mr-2" size={14} /> : <Check className="mr-2" size={14} />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign User Dialog */}
      <Dialog open={!!assignOpen} onOpenChange={(open) => !open && setAssignOpen(null)}>
        <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-lg p-0 overflow-hidden max-h-[80vh]">
          <DialogHeader className="p-6 border-b border-gray-100">
            <DialogTitle className="text-lg font-heading font-bold text-[#0A1F30]">Assign User to Branch</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
            <p className="text-xs text-gray-500 mb-4">Select a user and their role at this branch:</p>
            
            {allUsers.filter(u => u.role !== 'admin').length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No users available to assign</p>
            ) : (
              <div className="space-y-2">
                {allUsers.filter(u => u.role !== 'admin').map(user => (
                  <div key={user.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-100 hover:border-gray-200 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-[#0A1F30]">{user.full_name}</p>
                      <p className="text-[10px] text-gray-400">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold ${ROLE_COLORS[user.role] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                      {user.role === 'trainer' && (
                        <Button size="sm" onClick={() => assignTrainerToBranch(user.id, assignOpen)} className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3">
                          Assign as Trainer
                        </Button>
                      )}
                      <Button size="sm" onClick={() => assignManagerToBranch(user.id, assignOpen)} variant="outline" className="h-7 text-[10px] border-purple-300 text-purple-700 hover:bg-purple-50 rounded-lg px-3">
                        <Shield size={10} className="mr-1" /> Make Manager
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
