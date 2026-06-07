"use client"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Loader2, Calendar, Check, X, Clock } from 'lucide-react'
import { supabase, getUserRole } from '@/lib/supabase'
import { useBranch } from '@/context/BranchContext'

export default function AttendancePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null) // ID of student being saved
  const [role, setRole] = useState(null)
  const [students, setStudents] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState({}) // student_id -> status
  const { branches, selectedBranch, setSelectedBranch } = useBranch()
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
    if (role) {
      async function loadAttendance() {
        setLoading(true)
        try {
          let query = supabase
            .from('students')
            .select('id, dob, users(full_name), branches(name), belt_levels(name, hex)')

          if (selectedBranch !== 'all') {
            query = query.eq('branch_id', selectedBranch)
          }

          const { data: studentData } = await query
          const studentIds = studentData?.map(s => s.id) || []
          const { data: attData } = await supabase
            .from('attendance')
            .select('*')
            .eq('date', selectedDate)
            .in('student_id', studentIds.length ? studentIds : ['00000000-0000-0000-0000-000000000000'])

          const attMap = {}
          if (attData) {
            attData.forEach(r => {
              attMap[r.student_id] = r.status
            })
          }

          setStudents(studentData || [])
          setAttendanceRecords(attMap)
        } catch (error) {
          console.error('Error fetching attendance:', error)
        } finally {
          setLoading(false)
        }
      }

      loadAttendance()
    }
  }, [role, selectedBranch, selectedDate])

  const markAttendance = async (studentId, status) => {
    setSaving(studentId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      // Delete existing record for this date and student
      await supabase
        .from('attendance')
        .delete()
        .match({ student_id: studentId, date: selectedDate })

      // Insert new
      await supabase
        .from('attendance')
        .insert({
          student_id: studentId,
          date: selectedDate,
          status,
          marked_by: session?.user?.id
        })

      setAttendanceRecords(prev => ({
        ...prev,
        [studentId]: status
      }))
    } catch (error) {
      console.error('Error marking attendance:', error)
      alert('Failed to mark attendance')
    } finally {
      setSaving(null)
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
            Manage class rosters and record student attendance
          </p>
        </div>
      </header>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="date"
            className="w-full pl-12 bg-white border border-gray-200 focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] h-12 rounded-xl text-sm font-medium transition-all outline-none text-[#0A1F30] shadow-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        
        {/* Branch dropdown moved to Sidebar */}
      </div>

      {/* Table Section */}
      <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50 border-b border-gray-100">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold py-4">Student</TableHead>
              <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">Branch</TableHead>
              <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">Belt</TableHead>
              <TableHead className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <Loader2 className="animate-spin text-[#C5A059] mx-auto mb-4" size={32} />
                    <span className="text-xs text-gray-500">Loading Roster...</span>
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center text-gray-500 text-sm">
                    No students found for this branch.
                  </TableCell>
                </TableRow>
              ) : students.map((student, i) => {
                const currentStatus = attendanceRecords[student.id]
                return (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <TableCell className="py-4">
                      <div>
                        <div className="font-semibold text-sm text-[#0A1F30]">{student.users?.full_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {student.id.slice(0,8)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-500">{student.branches?.name}</span>
                    </TableCell>
                    <TableCell>
                      <span 
                        className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm border border-gray-100"
                        style={{ 
                          backgroundColor: student.belt_levels?.hex || '#ffffff', 
                          color: ['#ffffff', '#FFD700', '#F8F9FA'].includes(student.belt_levels?.hex?.toUpperCase()) ? '#0A1F30' : '#ffffff' 
                        }}
                      >
                        {student.belt_levels?.name || 'White'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
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
