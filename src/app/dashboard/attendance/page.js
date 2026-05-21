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
import { supabase, getUserRole, getBranches } from '@/lib/supabase'

export default function AttendancePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null) // ID of student being saved
  const [role, setRole] = useState(null)
  const [branches, setBranches] = useState([])
  const [students, setStudents] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState({}) // student_id -> status
  
  const [selectedBranch, setSelectedBranch] = useState('all')
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
    } else if (userRole === 'admin') {
      const { data } = await getBranches()
      if (data) setBranches(data)
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
      
      // Since we don't know if there's a unique constraint, let's delete existing record for this date and student
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
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-gold animate-pulse shadow-[0_0_10px_rgba(214,184,106,0.5)]" />
            <h2 className="text-gold text-[10px] tracking-[0.5em] uppercase font-black">Class Registry</h2>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">Daily <span className="text-gold italic outline-text">Attendance</span></h1>
        </div>
      </header>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-gold transition-colors" size={18} />
          <input 
            type="date"
            className="w-full pl-12 bg-white/5 border border-white/10 focus:border-gold/50 h-12 rounded-none uppercase text-xs tracking-widest transition-all outline-none text-white/80 color-scheme-dark"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        
        {role === 'admin' && (
          <select 
            className="bg-white/5 border border-white/10 text-white/60 text-xs tracking-widest uppercase px-6 h-12 outline-none focus:border-gold/50 transition-all"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="all">ALL BRANCHES</option>
            {branches.map(b => <option key={b.id} value={b.id} className="bg-black">{b.name}</option>)}
          </select>
        )}
      </div>

      {/* Table Section */}
      <Card className="bg-[#1B2230]/60 border-white/[0.06] backdrop-blur-xl overflow-hidden rounded-none relative">
        <motion.div initial={{ top: "-5%" }} animate={{ top: "105%" }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }} className="absolute left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent z-20 pointer-events-none" />
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-gold uppercase tracking-[0.2em] text-[10px] font-bold py-6">Student</TableHead>
              <TableHead className="text-gold uppercase tracking-[0.2em] text-[10px] font-bold">Branch</TableHead>
              <TableHead className="text-gold uppercase tracking-[0.2em] text-[10px] font-bold">Belt</TableHead>
              <TableHead className="text-gold uppercase tracking-[0.2em] text-[10px] font-bold text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <Loader2 className="animate-spin text-gold mx-auto mb-4" size={32} />
                    <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">Loading Roster...</span>
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center text-white/40 text-xs uppercase tracking-widest">
                    No students found for this branch.
                  </TableCell>
                </TableRow>
              ) : students.map((student, i) => {
                const currentStatus = attendanceRecords[student.id]
                return (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-white/[0.04] hover:bg-white/[0.03] hover:shadow-[inset_3px_0_0_rgba(214,184,106,0.4)] transition-all duration-300"
                  >
                    <TableCell className="py-5">
                      <div>
                        <div className="font-bold text-sm tracking-wide uppercase">{student.users?.full_name}</div>
                        <div className="text-[10px] text-white/40 tracking-widest uppercase mt-1">ID: {student.id.slice(0,8)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] tracking-widest uppercase text-white/60">{student.branches?.name}</span>
                    </TableCell>
                    <TableCell>
                      <span 
                        className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full"
                        style={{ 
                          backgroundColor: student.belt_levels?.hex || '#ffffff', 
                          color: ['#ffffff', '#FFD700'].includes(student.belt_levels?.hex?.toUpperCase()) ? '#000' : '#fff' 
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
                          className={`h-8 w-8 p-0 rounded-none border-white/10 transition-all ${
                            currentStatus === 'present' 
                              ? 'bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30' 
                              : 'text-white/40 hover:text-green-400 hover:border-green-400/50 hover:bg-green-500/10'
                          }`}
                        >
                          <Check size={14} />
                        </Button>
                        <Button 
                          onClick={() => markAttendance(student.id, 'late')}
                          disabled={saving === student.id}
                          variant={currentStatus === 'late' ? 'default' : 'outline'}
                          className={`h-8 w-8 p-0 rounded-none border-white/10 transition-all ${
                            currentStatus === 'late' 
                              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/30' 
                              : 'text-white/40 hover:text-yellow-400 hover:border-yellow-400/50 hover:bg-yellow-500/10'
                          }`}
                        >
                          <Clock size={14} />
                        </Button>
                        <Button 
                          onClick={() => markAttendance(student.id, 'absent')}
                          disabled={saving === student.id}
                          variant={currentStatus === 'absent' ? 'default' : 'outline'}
                          className={`h-8 w-8 p-0 rounded-none border-white/10 transition-all ${
                            currentStatus === 'absent' 
                              ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30' 
                              : 'text-white/40 hover:text-red-400 hover:border-red-400/50 hover:bg-red-500/10'
                          }`}
                        >
                          <X size={14} />
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
