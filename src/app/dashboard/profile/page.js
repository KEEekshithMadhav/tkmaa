"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { User, Lock, RefreshCw, Save, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [user, setUser] = useState(null)
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [msg, setMsg] = useState({ type: '', text: '' })

  async function fetchProfile() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()
      setUser({ ...data, email: session.user.email })
    }
    setLoading(false)
  }

  useEffect(() => {
    async function loadProfile() {
      await fetchProfile()
    }

    loadProfile()
  }, [])

  const handleUpdate = async (e) => {
    e.preventDefault()
    setUpdating(true)
    setMsg({ type: '', text: '' })

    const { error } = await supabase
      .from('users')
      .update({
        full_name: user.full_name,
        phone: user.phone
      })
      .eq('id', user.id)

    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setMsg({ type: 'success', text: 'Profile updated successfully!' })
    }
    setUpdating(false)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) {
      setMsg({ type: 'error', text: 'Passwords do not match!' })
      return
    }
    setUpdating(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.new })
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setMsg({ type: 'success', text: 'Password changed successfully!' })
      setPasswords({ current: '', new: '', confirm: '' })
    }
    setUpdating(false)
  }

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="animate-spin text-[#C5A059]" size={40} />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0A1F30] sm:text-3xl">
            My Profile
          </h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            Manage your account settings and preferences
          </p>
        </div>
      </header>

      {msg.text && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl text-xs font-semibold ${
            msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {msg.text}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Personal Details */}
        <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <CardHeader className="border-b border-gray-100 p-6">
            <CardTitle className="text-sm uppercase tracking-wider text-[#0A1F30] font-bold flex items-center gap-2">
              <User size={16} className="text-[#C5A059]" /> Personal Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleUpdate} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Full Name</label>
                <Input 
                  value={user?.full_name || ''} 
                  onChange={e => setUser({...user, full_name: e.target.value})}
                  className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Email Address (Read-only)</label>
                <Input 
                  value={user?.email || ''} 
                  disabled
                  className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm opacity-60 cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Phone Number</label>
                <Input 
                  value={user?.phone || ''} 
                  onChange={e => setUser({...user, phone: e.target.value})}
                  className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">System Role</label>
                <div className="h-10 flex items-center px-4 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-[#C5A059] font-bold uppercase text-xs tracking-widest">
                  {user?.role}
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={updating}
                className="w-full bg-[#0A1F30] hover:bg-[#0A1F30]/90 text-white font-semibold rounded-lg h-10 mt-6"
              >
                {updating ? <Loader2 className="animate-spin" size={18} /> : <><Save size={16} className="mr-2" /> Save Changes</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <CardHeader className="border-b border-gray-100 p-6">
            <CardTitle className="text-sm uppercase tracking-wider text-[#0A1F30] font-bold flex items-center gap-2">
              <Lock size={16} className="text-[#C5A059]" /> Security & Access
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">New Password</label>
                <Input 
                  type="password"
                  value={passwords.new} 
                  onChange={e => setPasswords({...passwords, new: e.target.value})}
                  className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">Confirm New Password</label>
                <Input 
                  type="password"
                  value={passwords.confirm} 
                  onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                  className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm"
                  required
                />
              </div>
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-500 leading-relaxed">
                Password must be at least 6 characters long. For security, do not share your password with anyone.
              </div>
              <Button 
                type="submit" 
                disabled={updating}
                variant="outline"
                className="w-full border-gray-200 hover:bg-gray-50 text-[#0A1F30] font-semibold rounded-lg h-10 mt-6"
              >
                {updating ? <Loader2 className="animate-spin" size={18} /> : <><RefreshCw size={16} className="mr-2" /> Update Password</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
