"use client"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Shield, Key, Mail, Loader2, Eye, EyeOff, ArrowRight, Lock, Terminal, Cpu } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ThreeBackground from '@/components/ThreeBackground'
import { toast } from 'sonner'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const router = useRouter()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      
      toast.success('Access Granted. Redirecting to Dashboard...')
      router.push('/dashboard')
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('Invalid login credentials')) {
        toast.error('Authentication Failed: Invalid credentials')
      } else {
        toast.error(`Error: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 30% 20%, #1B2230 0%, #111827 40%, #0B0F19 100%)' }}
    >
      <ThreeBackground />
      
      {/* Background overlays */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] z-0" />
      <div className="absolute inset-0 grid-overlay opacity-20 z-0" />
      
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-gold/[0.04] blur-[150px] rounded-full animate-glow-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/[0.03] blur-[120px] rounded-full animate-glow-pulse" style={{ animationDelay: '2s' }} />

      {/* Decorative corner elements */}
      <div className="fixed top-8 left-8 flex items-center gap-3 z-20">
        <Terminal size={14} className="text-gold/30" />
        <span className="text-[8px] uppercase tracking-[0.4em] text-white/15 font-black">Secure Login</span>
      </div>
      <div className="fixed top-8 right-8 flex items-center gap-3 z-20">
        <span className="text-[8px] uppercase tracking-[0.4em] text-white/15 font-black">TKMAA Portal</span>
        <Cpu size={14} className="text-gold/30" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] relative z-10"
      >
        {/* Logo/Header */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="relative inline-block"
          >
            <motion.div
              animate={{ 
                boxShadow: [
                  '0 0 30px rgba(214,184,106,0.2)',
                  '0 0 50px rgba(214,184,106,0.4)',
                  '0 0 30px rgba(214,184,106,0.2)'
                ]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center mx-auto mb-6 group cursor-pointer border-2 border-gold/30"
            >
              <Image src="/logo.png" alt="TKMAA Logo" width={96} height={96} className="object-cover w-full h-full group-hover:scale-110 transition-transform" />
            </motion.div>
          </motion.div>
          
          <motion.h1 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-black tracking-tighter uppercase mb-2 text-white"
          >
            Academy <span className="text-gold italic">Login</span>
          </motion.h1>
          <motion.p 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/25 text-[10px] uppercase tracking-[0.5em] font-black"
          >
            Secure Access · TKMAA Portal
          </motion.p>
        </div>

        <Card className="bg-[#1B2230]/80 backdrop-blur-2xl border border-white/[0.08] p-10 rounded-none relative overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
          {/* Animated top border */}
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent origin-center" 
          />
          
          {/* Scanline effect */}
          <motion.div
            initial={{ top: "-5%" }}
            animate={{ top: "105%" }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 w-full h-px bg-gold/10 z-20 pointer-events-none"
          />
          
          {/* Grid overlay */}
          <div className="absolute inset-0 grid-overlay-dense opacity-15 pointer-events-none" />
          
          <form onSubmit={handleAuth} className="space-y-7 relative z-10">
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black">Email</label>
                <motion.span 
                  animate={{ opacity: focusedField === 'email' ? 1 : 0.5 }}
                  className="text-[8px] uppercase tracking-widest text-gold font-bold flex items-center gap-1.5"
                >
                  <div className={`w-1 h-1 rounded-full ${focusedField === 'email' ? 'bg-gold animate-pulse' : 'bg-gold/30'}`} />
                  Encrypted
                </motion.span>
              </div>
              <div className="relative group">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${focusedField === 'email' ? 'text-gold' : 'text-white/20'}`} size={16} />
                <Input
                  type="email"
                  placeholder="Enter Registered Email"
                  className="bg-white/[0.03] border-white/[0.08] pl-12 h-14 rounded-none focus:border-gold/40 text-sm transition-all uppercase tracking-widest placeholder:text-white/10"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  required
                />
                {focusedField === 'email' && (
                  <motion.div 
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent origin-center"
                  />
                )}
              </div>
            </motion.div>

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black">Password</label>
                <button type="button" className="text-[8px] uppercase tracking-widest text-white/20 hover:text-gold transition-colors font-bold">Forgot?</button>
              </div>
              <div className="relative group">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${focusedField === 'password' ? 'text-gold' : 'text-white/20'}`} size={16} />
                <Input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="bg-white/[0.03] border-white/[0.08] pl-12 pr-12 h-14 rounded-none focus:border-gold/40 text-sm transition-all tracking-[0.5em] placeholder:text-white/10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {focusedField === 'password' && (
                  <motion.div 
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent origin-center"
                  />
                )}
              </div>
            </motion.div>

            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <input type="checkbox" id="remember" className="w-4 h-4 accent-gold bg-white/5 border-white/10 rounded-none cursor-pointer" />
              <label htmlFor="remember" className="text-[9px] uppercase tracking-widest text-white/40 font-bold cursor-pointer hover:text-white transition-colors">Remember Me</label>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-16 bg-gold text-black hover:bg-gold/90 font-black uppercase tracking-[0.4em] text-xs rounded-none transition-all glow-gold group relative overflow-hidden"
              >
                {/* Sweep effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                
                {loading ? (
                  <Loader2 className="animate-spin relative z-10" size={20} />
                ) : (
                  <span className="flex items-center gap-3 relative z-10">
                    Sign In <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform duration-300" />
                  </span>
                )}
              </Button>
            </motion.div>
          </form>

          {/* Decorative elements */}
          <motion.div 
            className="mt-10 flex justify-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {[0, 1, 2].map(i => (
              <motion.div 
                key={i}
                animate={{ opacity: [0.15, 0.5, 0.15] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                className="w-1.5 h-1.5 rounded-full bg-gold" 
              />
            ))}
          </motion.div>
        </Card>

        {/* Footer info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-10"
        >
          <p className="text-[8px] uppercase tracking-[0.5em] text-white/15 font-bold">
            Thammando Karate Martial Arts Academy · Secure Portal
          </p>
        </motion.div>
      </motion.div>
    </main>
  )
}
