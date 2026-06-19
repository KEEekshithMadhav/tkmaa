"use client"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Loader2, Calendar, Check, X, Clock, Layers } from 'lucide-react'
import { supabase, getUserRole } from '@/lib/supabase'
import { useBranch } from '@/context/BranchContext'
import { useSport } from '@/context/SportContext'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'

export default function AttendancePage() {
  const { permissions, role: authRole } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null) // ID of student being saved
  const [role, setRole] = useState(null)
  const [students, setStudents] = useState([])
  const [batches, setBatches] = useState([])
  const [selectedBatchId, setSelectedBatchId] = useState('all')
  const [attendanceRecords, setAttendanceRecords] = useState({}) // student_id -> status
  const [remarksState, setRemarksState] = useState({}) // student_id -> remarks
  const { branches, selectedBranch, setSelectedBranch } = useBranch()
  const { selectedSport, selectedSportName } = useSport()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  async function initData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const userRole = await getUserRole(session.user.id)
    setRole(userRole)

    if (userRole === 'trainer') {
      const { data: trainerData } = await supabase
        .from('trainers')
        .select('branch_id')
        .eq('user_id', session.user.id)
        .single()
      if (trainerData?.branch_id) {
        setSelectedBranch(trainerData.branch_id)
      }
    }
  }

  useEffect(() => {
    async function loadInitialData() {
      await initData()
    }
    loadInitialData()
  }, [])

  useEffect(() => {
    async function loadBatches() {
      let query = supabase.from('batches').select('*').eq('is_active', true)
      
      if (selectedBranch !== 'all') {
        query = query.eq('branch_id', selectedBranch)
      } else if (permissions?.branchIds && permissions.branchIds.length > 0) {
        query = query.in('branch_id', permissions.branchIds)
      }

      if (selectedSport !== 'all') {
        query = query.eq('sport_id', selectedSport)
      } else if (authRole === 'sport_admin' && permissions?.sportIds?.length > 0) {
        query = query.in('sport_id', permissions.sportIds)
      }

      const { data } = await query
      setBatches(data || [])
      setSelectedBatchId('all')
    }
    if (role) loadBatches()
  }, [role, selectedBranch, selectedSport, permissions])

  useEffect(() => {
    if (role) {
      async function loadAttendance() {
        setLoading(true)
        try {
          let studentIds = null
          
          if (selectedBatchId !== 'all') {
            // Check student_batches junction table
            const { data: sb } = await supabase
              .from('student_batches')
              .select('student_id')
              .eq('batch_id', selectedBatchId)
            const junctionIds = sb?.map(x => x.student_id) || []

            // Also check legacy students.batch_id column
            const { data: directBatch } = await supabase
              .from('students')
              .select('id')
              .eq('batch_id', selectedBatchId)
            const directIds = directBatch?.map(x => x.id) || []

            // Merge and deduplicate
            studentIds = [...new Set([...junctionIds, ...directIds])]
          } else if (selectedSport !== 'all') {
            const { data: ss } = await supabase
              .from('student_sports')
              .select('student_id')
              .eq('sport_id', selectedSport)
            studentIds = ss?.map(x => x.student_id) || []
          } else if (authRole === 'sport_admin' && permissions?.sportIds?.length > 0) {
            const { data: ss } = await supabase
              .from('student_sports')
              .select('student_id')
              .in('sport_id', permissions.sportIds)
            studentIds = ss?.map(x => x.student_id) || []
          }

          let query = supabase
            .from('students')
            .select('id, dob, users(full_name), branches(name), belt_levels(name, hex), trainer_id, batch_id, student_sports(sport_id), student_batches(batch_id)')

          if (selectedBranch !== 'all') {
            query = query.eq('branch_id', selectedBranch)
          } else if (permissions?.branchIds && permissions.branchIds.length > 0) {
            query = query.in('branch_id', permissions.branchIds)
          }

          if (studentIds !== null) {
            if (studentIds.length === 0) {
              setStudents([])
              setAttendanceRecords({})
              setRemarksState({})
              setLoading(false)
              return
            }
            query = query.in('id', studentIds)
          }

          const { data: studentData } = await query
          const fetchIds = studentData?.map(s => s.id) || []
          
          const { data: attData } = await supabase
            .from('attendance')
            .select('*')
            .eq('date', selectedDate)
            .in('student_id', fetchIds.length ? fetchIds : ['00000000-0000-0000-0000-000000000000'])

          const attMap = {}
          const remMap = {}
          if (attData) {
            attData.forEach(r => {
              attMap[r.student_id] = r.status
              remMap[r.student_id] = r.remarks || ''
            })
          }

          setStudents(studentData || [])
          setAttendanceRecords(attMap)
          setRemarksState(remMap)
        } catch (error) {
          console.error('Error fetching attendance:', error)
        } finally {
          setLoading(false)
        }
      }

      loadAttendance()
    }
  }, [role, selectedBranch, selectedSport, selectedBatchId, selectedDate, permissions])

  const markAttendance = async (studentId, status) => {
    setSaving(studentId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const student = students.find(s => s.id === studentId)
      if (!student) return

      const sSports = student.student_sports || []
      const sBatches = student.student_batches || []
      const remark = remarksState[studentId] || ''

      const finalSportId = selectedSport !== 'all' ? selectedSport : (sSports[0]?.sport_id || null)
      const finalBatchId = selectedBatchId !== 'all' ? selectedBatchId : (sBatches[0]?.batch_id || student.batch_id || null)
      
      let finalTrainerId = student.trainer_id || null
      if (finalBatchId) {
        const batchObj = batches.find(b => b.id === finalBatchId)
        if (batchObj?.trainer_id) finalTrainerId = batchObj.trainer_id
      }

      // Resolve the public.users ID for marked_by
      // First try the auth session user ID directly (often matches public.users.id)
      // Then fall back to email lookup, then null to avoid FK violations
      let markedByUserId = null
      if (session?.user?.id) {
        // Try auth uid directly (works when public.users.id = auth.users.id)
        const { data: directUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', session.user.id)
          .maybeSingle()
        if (directUser?.id) {
          markedByUserId = directUser.id
        } else if (session?.user?.email) {
          // Fall back to email lookup
          const { data: pubUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', session.user.email)
            .maybeSingle()
          markedByUserId = pubUser?.id || null
        }
      }
      
      // Delete existing record for this date and student
      await supabase
        .from('attendance')
        .delete()
        .match({ student_id: studentId, date: selectedDate })

      // Build insert payload — only include marked_by if we resolved a valid user ID
      const insertPayload = {
        student_id: studentId,
        date: selectedDate,
        status,
        remarks: remark,
        sport_id: finalSportId,
        batch_id: finalBatchId,
        trainer_id: finalTrainerId,
      }
      if (markedByUserId) {
        insertPayload.marked_by = markedByUserId
      }

      // Insert new
      const { error } = await supabase
        .from('attendance')
        .insert(insertPayload)

      if (error) throw error

      setAttendanceRecords(prev => ({
        ...prev,
        [studentId]: status
      }))
      toast.success('Attendance updated')
    } catch (error) {
      console.error('Error marking attendance:', error)
      toast.error('Failed to mark attendance: ' + error.message)
    } finally {
      setSaving(null)
    }
  }

  const handleRemarksChange = (studentId, val) => {
    setRemarksState(prev => ({
      ...prev,
      [studentId]: val
    }))
  }

  const saveRemarks = async (studentId) => {
    const status = attendanceRecords[studentId]
    if (!status) return // Don't save remarks if attendance status is not recorded yet
    
    try {
      const remark = remarksState[studentId] || ''
      const { error } = await supabase
        .from('attendance')
        .update({ remarks: remark })
        .match({ student_id: studentId, date: selectedDate })
      if (error) throw error
      toast.success('Remarks saved')
    } catch (error) {
      toast.error('Failed to save remarks: ' + error.message)
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0A1F30] sm:text-3xl">
            Daily Attendance
          </h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            Manage class rosters and record student attendance for {selectedSportName}
          </p>
        </div>
      </header>

      {/* Control Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="date"
            className="w-full pl-12 pr-4 bg-white border border-gray-200 focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] h-12 rounded-xl text-sm font-medium transition-all outline-none text-[#0A1F30] shadow-sm cursor-pointer"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        
        <div className="relative">
          <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-white border border-gray-200 rounded-xl text-sm font-medium text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all cursor-pointer shadow-sm appearance-none"
          >
            <option value="all">All Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.batch_name} ({b.start_time?.slice(0,5)} - {b.end_time?.slice(0,5)})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Section */}
      <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50 border-b border-gray-100">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold py-4 pl-6">Student</TableHead>
              <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">Branch</TableHead>
              <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">Rank/Status</TableHead>
              <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">Remarks</TableHead>
              <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold text-right pr-6">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <Loader2 className="animate-spin text-[#C5A059] mx-auto mb-4" size={32} />
                    <span className="text-xs text-gray-500">Loading Roster...</span>
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center text-gray-500 text-sm">
                    No students found for this configuration.
                  </TableCell>
                </TableRow>
              ) : students.map((student, i) => {
                const currentStatus = attendanceRecords[student.id]
                const isKarateStudent = student.student_sports?.some(ss => {
                  const spObj = batches.find(b => b.id === student.batch_id)?.sport_id 
                  // Fallback checks
                  return true // Or check name
                })
                
                return (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <TableCell className="py-4 pl-6">
                      <div>
                        <div className="font-semibold text-sm text-[#0A1F30]">{student.users?.full_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {student.id.slice(0,8)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-500">{student.branches?.name}</span>
                    </TableCell>
                    <TableCell>
                      {student.belt_levels ? (
                        <span 
                          className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border border-gray-100"
                          style={{ 
                            backgroundColor: student.belt_levels.hex || '#ffffff', 
                            color: ['#ffffff', '#FFD700', '#F8F9FA'].includes(student.belt_levels.hex?.toUpperCase()) ? '#0A1F30' : '#ffffff' 
                          }}
                        >
                          {student.belt_levels.name || 'White'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border bg-gray-50 text-gray-400">
                          Active
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Add note..."
                        value={remarksState[student.id] || ''}
                        onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                        onBlur={() => saveRemarks(student.id)}
                        className="h-8 text-xs bg-gray-50 border-gray-200 focus:bg-white rounded-lg w-full max-w-[200px]"
                      />
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          onClick={() => markAttendance(student.id, 'present')}
                          disabled={saving === student.id}
                          variant={currentStatus === 'present' ? 'default' : 'outline'}
                          className={`h-9 w-9 p-0 rounded-lg transition-all ${
                            currentStatus === 'present' 
                              ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 shadow-sm' 
                              : 'text-gray-400 border-gray-200 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          <Check size={16} />
                        </Button>
                        <Button 
                          onClick={() => markAttendance(student.id, 'late')}
                          disabled={saving === student.id}
                          variant={currentStatus === 'late' ? 'default' : 'outline'}
                          className={`h-9 w-9 p-0 rounded-lg transition-all ${
                            currentStatus === 'late' 
                              ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600 shadow-sm' 
                              : 'text-gray-400 border-gray-200 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50'
                          }`}
                        >
                          <Clock size={16} />
                        </Button>
                        <Button 
                          onClick={() => markAttendance(student.id, 'absent')}
                          disabled={saving === student.id}
                          variant={currentStatus === 'absent' ? 'default' : 'outline'}
                          className={`h-9 w-9 p-0 rounded-lg transition-all ${
                            currentStatus === 'absent' 
                              ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 shadow-sm' 
                              : 'text-gray-400 border-gray-200 hover:text-red-600 hover:border-red-200 hover:bg-red-50'
                          }`}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                )
              })}
            </AnimatePresence>
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
