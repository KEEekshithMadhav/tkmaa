"use client"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Plus, Search, Loader2, Edit3, Trash2, Power, PowerOff,
  Dumbbell, MapPin, Users, UserRound, ChevronRight, X, Check
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBranch } from '@/context/BranchContext'
import { useSport } from '@/context/SportContext'
import { toast } from 'sonner'

const SPORT_EMOJIS = {
  'Karate': '🥋',
  'Music': '🎵',
  'Dance': '💃',
  'Chess': '♟️',
  'Yoga': '🧘',
  'Skating': '⛸️',
}

const SPORT_COLORS = {
  'Karate': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', accent: '#ef4444' },
  'Music': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', accent: '#8b5cf6' },
  'Dance': { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', accent: '#ec4899' },
  'Chess': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', accent: '#10b981' },
  'Yoga': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', accent: '#f59e0b' },
  'Skating': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', accent: '#3b82f6' },
}

const defaultColor = { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', accent: '#6b7280' }

export default function SportsPage() {
  const [sports, setSports] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [openCreate, setOpenCreate] = useState(false)
  const [editSport, setEditSport] = useState(null)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formIcon, setFormIcon] = useState('trophy')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Branch-sport mapping
  const [selectedSportForMapping, setSelectedSportForMapping] = useState(null)
  const [branchSports, setBranchSports] = useState([])
  const [allBranches, setAllBranches] = useState([])

  // Stats
  const [sportStats, setSportStats] = useState({})

  const { refreshSports } = useSport()

  useEffect(() => {
    fetchSports()
    fetchBranches()
  }, [])

  async function fetchSports() {
    setLoading(true)
    const { data } = await supabase.from('sports').select('*').order('sport_name')
    if (data) {
      setSports(data)
      // Fetch stats for each sport
      const stats = {}
      for (const sport of data) {
        const { count: studentCount } = await supabase
          .from('student_sports')
          .select('*', { count: 'exact', head: true })
          .eq('sport_id', sport.id)
        const { count: trainerCount } = await supabase
          .from('trainer_sports')
          .select('*', { count: 'exact', head: true })
          .eq('sport_id', sport.id)
        const { count: branchCount } = await supabase
          .from('branch_sports')
          .select('*', { count: 'exact', head: true })
          .eq('sport_id', sport.id)
        stats[sport.id] = {
          students: studentCount || 0,
          trainers: trainerCount || 0,
          branches: branchCount || 0,
        }
      }
      setSportStats(stats)
    }
    setLoading(false)
  }

  async function fetchBranches() {
    const { data } = await supabase.from('branches').select('*').order('name')
    if (data) setAllBranches(data)
  }

  async function fetchBranchSports(sportId) {
    const { data } = await supabase
      .from('branch_sports')
      .select('*, branches(id, name, location)')
      .eq('sport_id', sportId)
    if (data) setBranchSports(data)
  }

  async function handleCreate() {
    if (!formName.trim()) return toast.error('Sport name is required')
    setIsSubmitting(true)
    const toastId = toast.loading('Creating sport...')
    try {
      const { error } = await supabase.from('sports').insert([{
        sport_name: formName.trim(),
        description: formDesc.trim(),
        icon: formIcon,
        status: 'active'
      }])
      if (error) throw error
      toast.success('Sport created', { id: toastId })
      setOpenCreate(false)
      resetForm()
      fetchSports()
      refreshSports()
    } catch (e) {
      toast.error(e.message, { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUpdate() {
    if (!editSport || !formName.trim()) return
    setIsSubmitting(true)
    const toastId = toast.loading('Updating sport...')
    try {
      const { error } = await supabase.from('sports')
        .update({ sport_name: formName.trim(), description: formDesc.trim(), icon: formIcon })
        .eq('id', editSport.id)
      if (error) throw error
      toast.success('Sport updated', { id: toastId })
      setEditSport(null)
      resetForm()
      fetchSports()
      refreshSports()
    } catch (e) {
      toast.error(e.message, { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function toggleStatus(sport) {
    const newStatus = sport.status === 'active' ? 'inactive' : 'active'
    const toastId = toast.loading(`${newStatus === 'active' ? 'Activating' : 'Deactivating'}...`)
    const { error } = await supabase.from('sports').update({ status: newStatus }).eq('id', sport.id)
    if (error) {
      toast.error(error.message, { id: toastId })
    } else {
      toast.success(`${sport.sport_name} ${newStatus}`, { id: toastId })
      fetchSports()
      refreshSports()
    }
  }

  async function handleDelete(sport) {
    if (!confirm(`Delete "${sport.sport_name}"? This will remove all branch/trainer/student mappings for this sport.`)) return
    const toastId = toast.loading('Deleting...')
    const { error } = await supabase.from('sports').delete().eq('id', sport.id)
    if (error) {
      toast.error(error.message, { id: toastId })
    } else {
      toast.success('Deleted', { id: toastId })
      fetchSports()
      refreshSports()
    }
  }

  async function toggleBranchSport(branchId, sportId, isAssigned) {
    if (isAssigned) {
      await supabase.from('branch_sports').delete().eq('branch_id', branchId).eq('sport_id', sportId)
    } else {
      await supabase.from('branch_sports').insert([{ branch_id: branchId, sport_id: sportId }])
    }
    fetchBranchSports(sportId)
    fetchSports() // refresh stats
  }

  function resetForm() {
    setFormName('')
    setFormDesc('')
    setFormIcon('trophy')
  }

  function openEdit(sport) {
    setEditSport(sport)
    setFormName(sport.sport_name)
    setFormDesc(sport.description || '')
    setFormIcon(sport.icon || 'trophy')
  }

  function openMapping(sport) {
    setSelectedSportForMapping(sport)
    fetchBranchSports(sport.id)
  }

  const filtered = sports.filter(s =>
    s.sport_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0A1F30] sm:text-3xl">
            Sports Management
          </h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            Add, manage, and configure sports offered by TKMAA
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setOpenCreate(true) }}
          className="bg-[#0A1F30] hover:bg-[#0A1F30]/90 text-white rounded-lg text-xs"
        >
          <Plus className="mr-2" size={16} /> Add Sport
        </Button>
      </header>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <Input
          placeholder="Search sports..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-white border-gray-200 focus:border-[#C5A059] rounded-lg h-10 text-sm"
        />
      </div>

      {/* Sports Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#C5A059]" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Dumbbell size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-sm">No sports found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {filtered.map((sport, i) => {
              const colors = SPORT_COLORS[sport.sport_name] || defaultColor
              const emoji = SPORT_EMOJIS[sport.sport_name] || '🏆'
              const stats = sportStats[sport.id] || { students: 0, trainers: 0, branches: 0 }
              const isActive = sport.status === 'active'

              return (
                <motion.div
                  key={sport.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={`rounded-2xl border ${isActive ? colors.border : 'border-gray-200'} bg-white shadow-sm overflow-hidden group hover:shadow-md transition-all relative`}>
                    {!isActive && (
                      <div className="absolute inset-0 bg-white/60 z-10 pointer-events-none" />
                    )}
                    
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center text-2xl`}>
                            {emoji}
                          </div>
                          <div>
                            <CardTitle className="text-base font-bold text-[#0A1F30]">
                              {sport.sport_name}
                            </CardTitle>
                            <Badge
                              variant="outline"
                              className={`mt-1 text-[9px] uppercase tracking-wider font-bold ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                  : 'bg-gray-100 text-gray-400 border-gray-200'
                              }`}
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative z-20">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-[#0A1F30]"
                            onClick={() => openEdit(sport)}
                          >
                            <Edit3 size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${isActive ? 'text-amber-500 hover:text-amber-600' : 'text-emerald-500 hover:text-emerald-600'}`}
                            onClick={() => toggleStatus(sport)}
                          >
                            {isActive ? <PowerOff size={14} /> : <Power size={14} />}
                          </Button>
                          {sport.sport_name !== 'Karate' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-600"
                              onClick={() => handleDelete(sport)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {sport.description && (
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{sport.description}</p>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                          <p className="text-lg font-bold text-[#0A1F30]">{stats.students}</p>
                          <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">Students</p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                          <p className="text-lg font-bold text-[#0A1F30]">{stats.trainers}</p>
                          <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">Trainers</p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                          <p className="text-lg font-bold text-[#0A1F30]">{stats.branches}</p>
                          <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">Branches</p>
                        </div>
                      </div>

                      {/* Branch Mapping Button */}
                      <Button
                        variant="outline"
                        className="w-full text-xs border-gray-200 text-gray-500 hover:border-[#C5A059] hover:text-[#C5A059] rounded-lg relative z-20"
                        onClick={() => openMapping(sport)}
                      >
                        <MapPin size={14} className="mr-2" />
                        Manage Branches
                        <ChevronRight size={14} className="ml-auto" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Sport Dialog */}
      <Dialog open={openCreate || !!editSport} onOpenChange={(v) => { if (!v) { setOpenCreate(false); setEditSport(null); resetForm() } }}>
        <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-gray-100">
            <DialogTitle className="text-lg font-heading font-bold text-[#0A1F30]">
              {editSport ? 'Edit Sport' : 'Add New Sport'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Sport Name *</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Karate, Dance, Chess"
                className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Description</label>
              <Input
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Brief description of the sport"
                className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Icon Key</label>
              <div className="flex gap-2 flex-wrap">
                {['swords', 'music', 'drama', 'brain', 'heart', 'zap', 'trophy'].map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormIcon(icon)}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg transition-all ${
                      formIcon === icon
                        ? 'border-[#C5A059] bg-[#C5A059]/10 scale-110'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    {icon === 'swords' ? '🥋' : icon === 'music' ? '🎵' : icon === 'drama' ? '💃' : icon === 'brain' ? '♟️' : icon === 'heart' ? '🧘' : icon === 'zap' ? '⛸️' : '🏆'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                onClick={() => { setOpenCreate(false); setEditSport(null); resetForm() }}
                className="flex-1 rounded-lg border-gray-200 text-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={editSport ? handleUpdate : handleCreate}
                disabled={isSubmitting}
                className="flex-1 bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-lg"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : editSport ? 'Save Changes' : 'Create Sport'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Branch-Sport Mapping Dialog */}
      <Dialog open={!!selectedSportForMapping} onOpenChange={(v) => { if (!v) setSelectedSportForMapping(null) }}>
        <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-gray-100">
            <DialogTitle className="text-lg font-heading font-bold text-[#0A1F30]">
              Branch Mapping — {selectedSportForMapping?.sport_name}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
            <p className="text-xs text-gray-500 mb-4">Select which branches offer {selectedSportForMapping?.sport_name}:</p>
            {allBranches.map(branch => {
              const isAssigned = branchSports.some(bs => bs.branches?.id === branch.id || bs.branch_id === branch.id)
              return (
                <motion.div
                  key={branch.id}
                  whileHover={{ x: 4 }}
                  onClick={() => toggleBranchSport(branch.id, selectedSportForMapping?.id, isAssigned)}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    isAssigned
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin size={16} className={isAssigned ? 'text-emerald-600' : 'text-gray-400'} />
                    <div>
                      <p className="text-sm font-semibold text-[#0A1F30]">{branch.name}</p>
                      <p className="text-[10px] text-gray-400">{branch.location}</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isAssigned ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                  }`}>
                    {isAssigned && <Check size={14} className="text-white" />}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
