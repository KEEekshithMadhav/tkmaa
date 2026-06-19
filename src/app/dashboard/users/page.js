'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Shield, Users, MapPin, Dumbbell, Award,
  Loader2, Plus, Edit, Check, X, RefreshCw
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import PermissionGate from '@/components/PermissionGate'
import AccessDenied from '@/components/AccessDenied'
import { useAuth } from '@/context/AuthContext'
import { ROLES, ROLE_LABELS } from '@/lib/permissions'

export default function UsersPage() {
  return (
    <PermissionGate permission="USER_MANAGEMENT" fallback={<AccessDenied />}>
      <UsersManagementContent />
    </PermissionGate>
  )
}

function UsersManagementContent() {
  const { permissions, role } = useAuth()
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [sports, setSports] = useState([])
  const [branchSports, setBranchSports] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit form states
  const [targetRole, setTargetRole] = useState('')
  const [targetBranchIds, setTargetBranchIds] = useState([])
  const [targetSportIds, setTargetSportIds] = useState([])

  // Add form states
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addFullName, setAddFullName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addRole, setAddRole] = useState('')
  const [addBranchIds, setAddBranchIds] = useState([])
  const [addSportIds, setAddSportIds] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // 1. Fetch all users
      const { data: usersData, error: uErr } = await supabase
        .from('users')
        .select('*')
        .order('full_name')
      if (uErr) throw uErr

      // 2. Fetch assignments
      const { data: branchMgrs } = await supabase.from('branch_managers').select('*')
      const { data: sportAdmins } = await supabase.from('sport_admin_assignments').select('*')
      const { data: trainers } = await supabase.from('trainers').select('user_id, branch_id')
      const { data: students } = await supabase.from('students').select('user_id, branch_id')

      // 3. Fetch branches, sports, and branch sports metadata
      const { data: bData } = await supabase.from('branches').select('id, name')
      const { data: sData } = await supabase.from('sports').select('id, sport_name')
      const { data: bsData } = await supabase.from('branch_sports').select('branch_id, sport_id')
      
      setBranches(bData || [])
      setSports(sData || [])
      setBranchSports(bsData || [])

      // Map assignments to user objects
      const mappedUsers = (usersData || []).map(user => {
        const mgrBranches = [...new Set((branchMgrs || [])
          .filter(bm => bm.user_id === user.id)
          .map(bm => bm.branch_id))]
        
        const saSports = (sportAdmins || [])
          .filter(sa => sa.user_id === user.id)
          .map(sa => sa.sport_id)

        const trainerBranch = (trainers || []).find(t => t.user_id === user.id)?.branch_id
        const studentBranch = (students || []).find(s => s.user_id === user.id)?.branch_id

        return {
          ...user,
          assignedBranchIds: user.role === ROLES.BRANCH_ADMIN || user.role === ROLES.SPORT_ADMIN
            ? mgrBranches 
            : (trainerBranch ? [trainerBranch] : (studentBranch ? [studentBranch] : [])),
          assignedSportIds: user.role === ROLES.SPORT_ADMIN ? saSports : [],
        }
      })

      setUsers(mappedUsers)
    } catch (err) {
      console.error('Failed to load users management data:', err)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  // Derive scopes
  const myBranchIds = permissions?.branchIds || []
  const myBranchSports = (branchSports || [])
    .filter(bs => myBranchIds.includes(bs.branch_id))
    .map(bs => bs.sport_id)

  const isBranchAdminUser = role === ROLES.BRANCH_ADMIN

  const availableBranchesForForm = isBranchAdminUser
    ? branches.filter(b => myBranchIds.includes(b.id))
    : branches

  const availableSportsForForm = isBranchAdminUser
    ? sports.filter(s => myBranchSports.includes(s.id))
    : sports

  const resetAddForm = () => {
    setAddFullName('')
    setAddEmail('')
    setAddPassword('')
    setAddRole(isBranchAdminUser ? ROLES.SPORT_ADMIN : ROLES.SUPER_ADMIN)
    setAddBranchIds([])
    setAddSportIds([])
  }

  const handleOpenAddModal = () => {
    resetAddForm()
    setAddModalOpen(true)
  }

  const handleOpenEdit = (user) => {
    setSelectedUser(user)
    setTargetRole(user.role || ROLES.TRAINER)
    setTargetBranchIds(user.assignedBranchIds || [])
    setTargetSportIds(user.assignedSportIds || [])
    setEditModalOpen(true)
  }

  const toggleBranchSelection = (branchId) => {
    setTargetBranchIds(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId) 
        : [...prev, branchId]
    )
  }

  const toggleSportSelection = (sportId) => {
    setTargetSportIds(prev => 
      prev.includes(sportId) 
        ? prev.filter(id => id !== sportId) 
        : [...prev, sportId]
    )
  }

  const toggleAddBranchSelection = (branchId) => {
    setAddBranchIds(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId) 
        : [...prev, branchId]
    )
  }

  const toggleAddSportSelection = (sportId) => {
    setAddSportIds(prev => 
      prev.includes(sportId) 
        ? prev.filter(id => id !== sportId) 
        : [...prev, sportId]
    )
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    if (!addFullName || !addEmail || !addPassword || !addRole) {
      toast.error('All fields are required.')
      return
    }

    if (addPassword.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading('Creating new user record...')

    try {
      // 1. Create user via API with assignments
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addEmail.trim(),
          password: addPassword,
          full_name: addFullName.trim(),
          role: addRole,
          branch_ids: addBranchIds,
          sport_ids: addSportIds
        })
      })

      const resData = await res.json()
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to create user account')
      }

      toast.success(`${ROLE_LABELS[addRole] || addRole} added successfully`, { id: toastId })
      setAddModalOpen(false)
      resetAddForm()
      loadData()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to create user', { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSave = async () => {
    if (!selectedUser) return
    setIsSubmitting(true)
    const toastId = toast.loading(`Updating ${selectedUser.full_name || 'User'} role & scope...`)

    try {
      const userId = selectedUser.id

      // 1. Call server-side API to update role & scopes securely bypassing RLS
      const res = await fetch('/api/users/update-scope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          role: targetRole,
          branch_ids: targetBranchIds,
          sport_ids: targetSportIds
        })
      })

      const resData = await res.json()
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to update user permissions')
      }

      toast.success('User updated successfully', { id: toastId })
      setEditModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Update failed: ' + err.message, { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtering users
  const filteredUsers = users
    .filter(u => u.role !== ROLES.STUDENT && u.role !== ROLES.PARENT)
    .filter(u => {
      if (isBranchAdminUser) {
        // Branch Admin only sees sport_admin and trainer
        if (u.role !== ROLES.SPORT_ADMIN && u.role !== ROLES.TRAINER) return false
        // Trainer must belong to the branches this admin manages
        if (u.role === ROLES.TRAINER) {
          const matches = u.assignedBranchIds?.some(id => myBranchIds.includes(id))
          if (!matches) return false
        }
        // Sport Admin must belong to the sports offered in this admin's branches
        if (u.role === ROLES.SPORT_ADMIN) {
          const matches = u.assignedSportIds?.some(id => myBranchSports.includes(id))
          if (!matches) return false
        }
      }
      return true
    })
    .filter(u => 
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.role && u.role.toLowerCase().includes(searchQuery.toLowerCase()))
    )

  const getBranchNames = (branchIds) => {
    if (!branchIds || branchIds.length === 0) return 'None'
    return branchIds
      .map(id => branches.find(b => b.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  const getSportNames = (sportIds) => {
    if (!sportIds || sportIds.length === 0) return 'None'
    return sportIds
      .map(id => sports.find(s => s.id === id)?.sport_name)
      .filter(Boolean)
      .join(', ')
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0A1F30] sm:text-3xl">
            User Roles & Access Control
          </h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            Configure system roles, scopes, and access permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenAddModal} className="bg-[#0A1F30] hover:bg-[#0A1F30]/90 text-white rounded-lg text-xs gap-2">
            <Plus size={14} /> Add User
          </Button>
          <Button onClick={loadData} variant="outline" className="rounded-lg text-xs gap-2">
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </header>

      <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C5A059] transition-colors" size={16} />
            <Input 
              placeholder="Search by name, email or role..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-gray-200 focus:border-[#C5A059] focus:ring-[#C5A059]/20 rounded-lg h-10 text-sm transition-all"
            />
          </div>
        </div>

        <div className="relative overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/80 border-b border-gray-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider py-4 pl-6">User Profile</TableHead>
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Role</TableHead>
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Branch Scope</TableHead>
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Sports Scope</TableHead>
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {loading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <TableRow key={i} className="border-b border-gray-50">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
                          <div className="space-y-2">
                            <div className="h-3 w-24 bg-gray-100 animate-pulse rounded" />
                            <div className="h-2 w-32 bg-gray-100 animate-pulse rounded" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><div className="h-4 w-20 bg-gray-100 animate-pulse rounded-full" /></TableCell>
                      <TableCell><div className="h-3 w-24 bg-gray-100 animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-3 w-16 bg-gray-100 animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-8 w-16 bg-gray-100 animate-pulse rounded ml-auto mr-4" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <Users size={40} className="mb-3 opacity-20" />
                        <p className="text-sm">No Users Found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.map((user, i) => (
                  <motion.tr
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    key={user.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group cursor-default"
                  >
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold text-xs border border-gold/25 shadow-sm">
                          {user.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-[#0A1F30]">{user.full_name || 'Unnamed'}</p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                        user.role === ROLES.SUPER_ADMIN ? 'bg-red-50 text-red-700 border-red-100' :
                        user.role === ROLES.BRANCH_ADMIN ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        user.role === ROLES.SPORT_ADMIN ? 'bg-purple-50 text-purple-700 border-purple-100' :
                        user.role === ROLES.TRAINER ? 'bg-orange-50 text-orange-700 border-orange-100' :
                        'bg-gray-50 text-gray-700 border-gray-100'
                      }`}>
                        {ROLE_LABELS[user.role] || user.role || 'Trainer'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-600 font-medium">
                      {user.role === ROLES.SUPER_ADMIN ? (
                        <span className="text-gray-400 italic">All Branches</span>
                      ) : user.role === ROLES.SPORT_ADMIN && (!user.assignedBranchIds || user.assignedBranchIds.length === 0) ? (
                        <span className="text-gray-400 italic">All Branches (Offering Sport)</span>
                      ) : (
                        getBranchNames(user.assignedBranchIds)
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-gray-600 font-medium">
                      {user.role === ROLES.SUPER_ADMIN || user.role === ROLES.BRANCH_ADMIN ? (
                        <span className="text-gray-400 italic">All Sports</span>
                      ) : (
                        getSportNames(user.assignedSportIds)
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button 
                        onClick={() => handleOpenEdit(user)}
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-gray-400 hover:text-[#0A1F30] hover:bg-gray-100 rounded-lg"
                      >
                        <Edit size={14} />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add User Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-lg p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 border-b border-gray-100">
            <DialogTitle className="text-lg font-heading font-bold text-[#0A1F30]">
              Create New Staff Member
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-black">Full Name</label>
              <Input 
                value={addFullName}
                onChange={e => setAddFullName(e.target.value)}
                placeholder="Enter full name"
                className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm focus:border-[#C5A059]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-black">Email Address</label>
                <Input 
                  type="email"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  placeholder="name@tkmaa.com"
                  className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm focus:border-[#C5A059]"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-black">Initial Password</label>
                <Input 
                  type="password"
                  value={addPassword}
                  onChange={e => setAddPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm focus:border-[#C5A059]"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-black">Role Authority</label>
              <select
                value={addRole}
                onChange={(e) => {
                  setAddRole(e.target.value)
                  setAddBranchIds([])
                  setAddSportIds([])
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10 transition-all"
              >
                {Object.entries(ROLE_LABELS)
                  .filter(([val]) => val !== ROLES.STUDENT && val !== ROLES.PARENT)
                  .filter(([val]) => !isBranchAdminUser || (val === ROLES.SPORT_ADMIN || val === ROLES.TRAINER))
                  .map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))
                }
              </select>
            </div>

            {/* Scope selectors for creation */}
            {addRole === ROLES.SUPER_ADMIN && (
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-start gap-3">
                <Shield className="text-emerald-600 size-5 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-emerald-800">Unrestricted Master Access</p>
                  <p className="text-[11px] text-emerald-600 mt-1 leading-relaxed">
                    Overall Administrators have full permissions across all branches and sports. No manual scope selection is required.
                  </p>
                </div>
              </div>
            )}

            {(addRole === ROLES.BRANCH_ADMIN || addRole === ROLES.SPORT_ADMIN || addRole === ROLES.TRAINER) && (
              <div className="space-y-3">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-black flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#C5A059]" />
                  {addRole === ROLES.BRANCH_ADMIN || addRole === ROLES.SPORT_ADMIN ? 'Branch Scope (Multi-Select)' : 'Operational Hub (Single Select)'}
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/30">
                  {availableBranchesForForm.map(branch => {
                    const isSelected = addBranchIds.includes(branch.id)
                    return (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => {
                          if (addRole === ROLES.BRANCH_ADMIN || addRole === ROLES.SPORT_ADMIN) {
                            toggleAddBranchSelection(branch.id)
                          } else {
                            setAddBranchIds([branch.id])
                          }
                        }}
                        className={`flex items-center justify-between px-3 py-2 border rounded-lg text-xs font-semibold transition-all ${
                          isSelected 
                            ? 'bg-[#0A1F30] text-white border-transparent shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span>{branch.name}</span>
                        {isSelected && <Check size={12} className="text-gold" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {addRole === ROLES.SPORT_ADMIN && (
              <div className="space-y-3">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-black flex items-center gap-1.5">
                  <Dumbbell size={14} className="text-[#C5A059]" />
                  Sports Scope (Multi-Select)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/30">
                  {availableSportsForForm.map(sport => {
                    const isSelected = addSportIds.includes(sport.id)
                    return (
                      <button
                        key={sport.id}
                        type="button"
                        onClick={() => toggleAddSportSelection(sport.id)}
                        className={`flex items-center justify-between px-3 py-2 border rounded-lg text-xs font-semibold transition-all ${
                          isSelected 
                            ? 'bg-[#0A1F30] text-white border-transparent shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span>{sport.sport_name}</span>
                        {isSelected && <Check size={12} className="text-gold" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setAddModalOpen(false)} 
                className="flex-1 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50 h-10 font-semibold"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting} 
                className="flex-1 bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-lg h-10 font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {isSubmitting ? <Loader2 className="animate-spin size-4" /> : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role & Scope Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-lg p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 border-b border-gray-100">
            <DialogTitle className="text-lg font-heading font-bold text-[#0A1F30]">
              Configure Permissions: {selectedUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-6">
            
            {/* Role Select */}
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-black">Role Authority</label>
              <select
                value={targetRole}
                onChange={(e) => {
                  setTargetRole(e.target.value)
                  setTargetBranchIds([])
                  setTargetSportIds([])
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10 transition-all"
              >
                {Object.entries(ROLE_LABELS)
                  .filter(([val]) => val !== ROLES.STUDENT && val !== ROLES.PARENT)
                  .filter(([val]) => !isBranchAdminUser || (val === ROLES.SPORT_ADMIN || val === ROLES.TRAINER))
                  .map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))
                }
              </select>
            </div>

            {/* Scope selectors based on target role */}
            {targetRole === ROLES.SUPER_ADMIN && (
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-start gap-3">
                <Shield className="text-emerald-600 size-5 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-emerald-800">Unrestricted Master Access</p>
                  <p className="text-[11px] text-emerald-600 mt-1 leading-relaxed">
                    Overall Administrators have full permissions across all branches and sports. No manual scope selection is required.
                  </p>
                </div>
              </div>
            )}

            {(targetRole === ROLES.BRANCH_ADMIN || targetRole === ROLES.SPORT_ADMIN || targetRole === ROLES.TRAINER) && (
              <div className="space-y-3">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-black flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#C5A059]" />
                  {targetRole === ROLES.BRANCH_ADMIN || targetRole === ROLES.SPORT_ADMIN ? 'Branch Scope (Multi-Select)' : 'Operational Hub (Single Select)'}
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/30">
                  {availableBranchesForForm.map(branch => {
                    const isSelected = targetBranchIds.includes(branch.id)
                    return (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => {
                          if (targetRole === ROLES.BRANCH_ADMIN || targetRole === ROLES.SPORT_ADMIN) {
                            toggleBranchSelection(branch.id)
                          } else {
                            setTargetBranchIds([branch.id])
                          }
                        }}
                        className={`flex items-center justify-between px-3 py-2 border rounded-lg text-xs font-semibold transition-all ${
                          isSelected 
                            ? 'bg-[#0A1F30] text-white border-transparent shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span>{branch.name}</span>
                        {isSelected && <Check size={12} className="text-gold" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {targetRole === ROLES.SPORT_ADMIN && (
              <div className="space-y-3">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-black flex items-center gap-1.5">
                  <Dumbbell size={14} className="text-[#C5A059]" />
                  Sports Scope (Multi-Select)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/30">
                  {availableSportsForForm.map(sport => {
                    const isSelected = targetSportIds.includes(sport.id)
                    return (
                      <button
                        key={sport.id}
                        type="button"
                        onClick={() => toggleSportSelection(sport.id)}
                        className={`flex items-center justify-between px-3 py-2 border rounded-lg text-xs font-semibold transition-all ${
                          isSelected 
                            ? 'bg-[#0A1F30] text-white border-transparent shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span>{sport.sport_name}</span>
                        {isSelected && <Check size={12} className="text-gold" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditModalOpen(false)} 
                className="flex-1 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50 h-10 font-semibold"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSubmitting} 
                className="flex-1 bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-lg h-10 font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {isSubmitting ? <Loader2 className="animate-spin size-4" /> : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
