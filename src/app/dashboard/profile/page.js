"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { User, Shield, Mail, Phone, Lock, RefreshCw, Save, Loader2, Key } from "lucide-react"
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
    <div className="h-full flex items-center justify-center">
      <Loader2 className="animate-spin text-gold" size={40} />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 rounded-full bg-gold animate-pulse shadow-[0_0_10px_rgba(214,184,106,0.5)]" />
          <h2 className="text-gold text-[10px] tracking-[0.5em] uppercase font-black">Account Settings</h2>
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">My <span className="text-gold italic outline-text">Profile</span></h1>
      </header>

      {msg.text && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 text-xs font-bold uppercase tracking-widest border ${
            msg.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500'
          }`}
        >
          {msg.text}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Personal Details */}
        <Card className="bg-[#1B2230]/60 border-white/[0.06] backdrop-blur-xl rounded-none">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-xs uppercase tracking-[0.3em] text-gold font-black flex items-center gap-2">
              <User size={14} /> Personal Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40">Full Name</label>
                <Input 
                  value={user.full_name || ''} 
                  onChange={e => setUser({...user, full_name: e.target.value})}
                  className="bg-white/5 border-white/10 rounded-none h-12 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40">Email Address (Read-only)</label>
                <Input 
                  value={user.email || ''} 
                  disabled
                  className="bg-white/5 border-white/10 rounded-none h-12 text-sm opacity-50 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40">Phone Number</label>
                <Input 
                  value={user.phone || ''} 
                  onChange={e => setUser({...user, phone: e.target.value})}
                  className="bg-white/5 border-white/10 rounded-none h-12 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40">System Role</label>
                <div className="h-12 flex items-center px-4 bg-white/5 border border-dashed border-white/20 text-gold font-black uppercase text-xs tracking-widest">
                  {user.role}
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={updating}
                className="w-full bg-gold text-black hover:bg-gold-dark font-black uppercase tracking-widest h-12 rounded-none mt-4"
              >
                {updating ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} className="mr-2" /> Save Changes</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="bg-[#1B2230]/60 border-white/[0.06] backdrop-blur-xl rounded-none">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-xs uppercase tracking-[0.3em] text-gold font-black flex items-center gap-2">
              <Lock size={14} /> Security & Access
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40">New Password</label>
                <Input 
                  type="password"
                  value={passwords.new} 
                  onChange={e => setPasswords({...passwords, new: e.target.value})}
                  className="bg-white/5 border-white/10 rounded-none h-12 text-sm"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40">Confirm New Password</label>
                <Input 
                  type="password"
                  value={passwords.confirm} 
                  onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                  className="bg-white/5 border-white/10 rounded-none h-12 text-sm"
                  required
                />
              </div>
              <div className="p-4 bg-white/5 border border-white/10 text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">
                Password must be at least 6 characters long. For security, do not share your password with anyone.
              </div>
              <Button 
                type="submit" 
                disabled={updating}
                variant="outline"
                className="w-full border-white/10 hover:bg-white/5 text-white font-black uppercase tracking-widest h-12 rounded-none mt-4"
              >
                {updating ? <Loader2 className="animate-spin" size={18} /> : <><RefreshCw size={18} className="mr-2" /> Update Password</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
