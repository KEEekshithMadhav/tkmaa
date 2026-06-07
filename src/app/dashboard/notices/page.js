"use client"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Megaphone, Send, Info, Loader2, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useForm } from "react-hook-form"

export default function NoticesPage() {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)
  const [userId, setUserId] = useState(null)
  const [users, setUsers] = useState([])
  const [openCreate, setOpenCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const { register, handleSubmit, reset, watch } = useForm()
  const watchTarget = watch("target", "all")

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserId(session.user.id)
        const { data } = await supabase.from('users').select('role').eq('id', session.user.id).single()
        setRole(data?.role || 'student')
        
        if (data?.role === 'admin' || data?.role === 'trainer') {
          const { data: uData } = await supabase.from('users').select('id, full_name, role')
          setUsers(uData || [])
        }
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (userId) fetchNotices()
  }, [userId])

  async function fetchNotices() {
    setLoading(true)
    // Fetch global notices (user_id is null) AND personal notices (user_id = current user)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(50)
      
    if (data) setNotices(data)
    setLoading(false)
  }

  const markAsRead = async (id) => {
    // Only mark personal notifications as read
    const notice = notices.find(n => n.id === id)
    if (!notice || notice.user_id === null || notice.is_read) return

    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotices(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const onSubmit = async (data) => {
    setSubmitting(true)
    const toastId = toast.loading('Sending notification...')
    try {
      const targetUserId = data.target === 'all' ? null : data.targetUser
      const { error } = await supabase.from('notifications').insert([{
        user_id: targetUserId,
        title: data.title,
        message: data.message,
      }])
      if (error) throw error
      toast.success('Notification sent!', { id: toastId })
      setOpenCreate(false)
      reset()
      fetchNotices()
    } catch (err) {
      toast.error('Failed to send: ' + err.message, { id: toastId })
    } finally {
      setSubmitting(false)
    }
  }

  const canManage = role === 'admin' || role === 'trainer'

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0A1F30] sm:text-3xl">
            Notices & Alerts
          </h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            Academy announcements and personal notifications
          </p>
        </div>
        {canManage && (
          <>
          <Button onClick={() => setOpenCreate(true)} className="bg-[#0A1F30] hover:bg-[#0A1F30]/90 text-white rounded-lg text-xs font-semibold">
            <Send className="mr-2" size={16} /> Broadcast Notice
          </Button>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-md p-0 overflow-hidden">
              <DialogHeader className="p-6 border-b border-gray-100">
                <DialogTitle className="text-lg font-heading font-bold text-[#0A1F30]">Send Notification</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Target Audience</label>
                  <select {...register("target")} className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059]">
                    <option value="all">Broadcast to All Users</option>
                    <option value="specific">Specific User</option>
                  </select>
                </div>
                
                {watchTarget === 'specific' && (
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Select User</label>
                    <select {...register("targetUser", { required: true })} className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059]">
                      <option value="">Choose User...</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Notice Title</label>
                  <Input {...register("title", { required: true })} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Message Content</label>
                  <textarea 
                    {...register("message", { required: true })} 
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg min-h-[100px] p-3 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpenCreate(false)} className="flex-1 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</Button>
                  <Button type="submit" disabled={submitting} className="flex-1 bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-lg">
                    {submitting ? <Loader2 className="animate-spin" /> : "Send Notice"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="h-40 flex items-center justify-center bg-white border border-gray-100 rounded-2xl shadow-sm">
              <Loader2 className="animate-spin text-[#C5A059]" size={32} />
            </div>
          ) : notices.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400">
              <Bell size={32} className="opacity-20 mb-2" />
              <p className="text-sm">No notices at this time.</p>
            </div>
          ) : (
            <AnimatePresence>
              {notices.map((notice, i) => {
                const isGlobal = notice.user_id === null
                const isUnread = !isGlobal && !notice.is_read
                
                return (
                  <motion.div
                    key={notice.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onMouseEnter={() => markAsRead(notice.id)}
                    className={`p-5 rounded-2xl border transition-all relative overflow-hidden group ${
                      isGlobal 
                        ? 'bg-[#0A1F30] border-[#0A1F30] text-white' 
                        : isUnread 
                          ? 'bg-blue-50 border-blue-100 shadow-sm' 
                          : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {isGlobal && (
                      <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none -z-0" />
                    )}
                    
                    <div className="relative z-10 flex gap-4">
                      <div className={`mt-1 flex-shrink-0 ${isGlobal ? 'text-gold' : 'text-[#C5A059]'}`}>
                        {isGlobal ? <Megaphone size={20} /> : <Info size={20} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className={`text-sm font-bold ${isGlobal ? 'text-white' : 'text-[#0A1F30]'}`}>
                            {notice.title}
                          </h3>
                          <span className={`text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap ml-4 ${
                            isGlobal ? 'text-white/50' : 'text-gray-400'
                          }`}>
                            {new Date(notice.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed ${isGlobal ? 'text-white/80' : 'text-gray-600'}`}>
                          {notice.message}
                        </p>
                      </div>
                      {isUnread && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-100 p-6">
              <CardTitle className="text-sm uppercase tracking-wider text-[#0A1F30] font-bold">Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-3">
                <Megaphone size={16} className="text-[#0A1F30] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#0A1F30] mb-1">Broadcasts</h4>
                  <p className="text-[10px] text-gray-500 leading-relaxed">Dark navy cards indicate global broadcasts visible to all members of the academy.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Info size={16} className="text-[#C5A059] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#0A1F30] mb-1">Personal Alerts</h4>
                  <p className="text-[10px] text-gray-500 leading-relaxed">Light cards indicate personal notifications directed specifically to you. Unread alerts have a blue indicator.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#0A1F30] mb-1">Read Receipts</h4>
                  <p className="text-[10px] text-gray-500 leading-relaxed">Hovering over an unread personal notification will automatically mark it as read.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
