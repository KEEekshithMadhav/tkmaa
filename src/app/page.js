"use client"
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ThreeBackground from '@/components/ThreeBackground'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Trophy, Users, MapPin, Shield, Star, 
  ArrowRight, Play, CheckCircle2, Mail, 
  Phone, Globe, MessageSquare,
  ChevronRight, Quote, UserRound, Calendar,
  Award, Clock, ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const stats = [
  { label: "Years Experience", value: "25+", icon: Star },
  { label: "Active Members", value: "500+", icon: Users },
  { label: "Licensed Trainers", value: "12", icon: UserRound },
  { label: "State Dojos", value: "5", icon: MapPin },
]

const programs = [
  {
    title: "Karate Do",
    subtitle: "Traditional Shotokan",
    description: "Traditional martial arts focused on discipline, strength, and spiritual growth. Master the ancient forms.",
    image: "https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2000",
    tags: ["Traditional", "Self-Defense"],
    schedule: "Mon, Wed, Fri",
    level: "All Levels"
  },
  {
    title: "MMA Elite",
    subtitle: "Mixed Martial Arts",
    description: "High-intensity mixed martial arts training for professional competition and fitness.",
    image: "https://images.unsplash.com/photo-1552072805-2a9039d00e57?q=80&w=2000",
    tags: ["Combat", "High-Intensity"],
    schedule: "Tue, Thu, Sat",
    level: "Intermediate+"
  },
  {
    title: "Kids Warriors",
    subtitle: "Youth Development",
    description: "Building confidence and coordination in a fun, safe environment for ages 5-12.",
    image: "https://images.unsplash.com/photo-1509564332502-3932750e3805?q=80&w=2000",
    tags: ["Beginner", "Youth"],
    schedule: "Sat, Sun",
    level: "Ages 5-12"
  }
]

const trainers = [
  { 
    name: "Master Rajesh Vishnoi", 
    role: "Chief Instructor", 
    rank: "Shotokan 6th Dan", 
    bio: "Over 30 years of competitive and coaching experience in traditional Shotokan karate.",
    image: "https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2000",
    specialties: ["Kata", "Weapons"]
  },
  { 
    name: "Sensei Priya Sharma", 
    role: "Kata Specialist", 
    rank: "2nd Dan", 
    bio: "National champion with expertise in precision kata forms and youth development programs.",
    image: "https://images.unsplash.com/photo-1552072805-2a9039d00e57?q=80&w=2000",
    specialties: ["Youth", "Competition"]
  },
  { 
    name: "Coach Amit Varma", 
    role: "Kumite Lead", 
    rank: "National Champion", 
    bio: "Former national kumite champion now leading the competitive sparring division.",
    image: "https://images.unsplash.com/photo-1509564332502-3932750e3805?q=80&w=2000",
    specialties: ["Kumite", "Fitness"]
  },
]

const branches = [
  { name: "Central Dojo", location: "Main Campus, Sector 12", members: 180, established: "2001" },
  { name: "South Wing Academy", location: "South District, Block A", members: 120, established: "2008" },
  { name: "North Point Center", location: "North Hills, Phase II", members: 95, established: "2015" },
  { name: "East Valley Branch", location: "East Valley, Unit 4", members: 70, established: "2019" },
  { name: "West Side Studio", location: "West Park, Floor 2", members: 55, established: "2022" },
]

export default function Home() {
  const containerRef = useRef(null)
  const titleRef = useRef()
  const subRef = useRef()
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', program: '' })

  useEffect(() => {
    const tl = gsap.timeline()
    tl.from(titleRef.current, {
      y: 100,
      opacity: 0,
      duration: 1.2,
      ease: "power4.out"
    })
    .from(subRef.current, {
      y: 50,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out"
    }, "-=0.6")

    gsap.utils.toArray('.reveal').forEach((elem) => {
      gsap.from(elem, {
        scrollTrigger: {
          trigger: elem,
          start: "top 85%",
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
      })
    })
  }, [])

  return (
    <main ref={containerRef} className="relative text-[#0A1F30] overflow-x-hidden bg-[#F8F9FA]">
      <ThreeBackground />
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 md:px-8 py-4 backdrop-blur-xl bg-[#0A1F30]/90 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-pointer text-white">
            <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="w-10 h-10 rounded-full overflow-hidden border border-gold/30 shadow-[0_0_20px_rgba(197,160,89,0.2)]">
              <Image src="/logo.png" alt="TKMAA" width={40} height={40} className="object-cover w-full h-full" />
            </motion.div>
            <h2 className="text-xl font-bold tracking-[0.2em] uppercase font-heading">TKMAA</h2>
          </div>
          <div className="hidden md:flex gap-10 text-[11px] uppercase tracking-[0.25em] font-semibold text-white/40">
            {['About', 'Programs', 'Instructors', 'Branches', 'Contact'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-[#C5A059] transition-colors duration-300 relative group/nav">
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#C5A059] group-hover/nav:w-full transition-all duration-300" />
              </a>
            ))}
          </div>
          <div className="flex gap-4 items-center">
            <Link href="/login" className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/50 hover:text-white transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link href="/login">
              <Button className="bg-[#C5A059] hover:bg-[#b8943f] text-[#0A1F30] px-6 py-5 text-[11px] uppercase tracking-[0.2em] font-bold rounded-lg shadow-lg hover:shadow-xl transition-all">
                Join Academy
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A1F30] via-[#0A1F30]/95 to-[#F8F9FA] z-10" />
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }} transition={{ duration: 8, repeat: Infinity }} className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#C5A059] blur-[200px] rounded-full" />
          <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.03, 0.07, 0.03] }} transition={{ duration: 10, repeat: Infinity, delay: 2 }} className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-[#1B3022] blur-[180px] rounded-full" />
        </div>

        <div className="relative z-10 text-center max-w-5xl pt-20">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8 inline-flex items-center gap-3 px-5 py-2.5 border border-[#C5A059]/25 rounded-full bg-[#C5A059]/[0.06] backdrop-blur-xl"
          >
            <div className="w-2 h-2 rounded-full bg-[#C5A059] animate-ping" />
            <span className="text-[#C5A059] text-[10px] tracking-[0.35em] uppercase font-bold">
              Thammando Karate Martial Arts Academy
            </span>
          </motion.div>

          <h1 ref={titleRef} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[0.95] text-white font-heading">
            Discipline.<br />
            <span className="bg-gradient-to-r from-[#C5A059] to-[#dfc491] bg-clip-text text-transparent">Mastery.</span><br />
            Excellence.
          </h1>

          <p ref={subRef} className="text-base md:text-lg text-white/40 mb-12 max-w-2xl mx-auto leading-relaxed tracking-wide">
            The premier martial arts academy combining centuries-old traditions 
            with modern training methodologies and real-time performance analytics.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="px-10 py-4 bg-[#C5A059] text-[#0A1F30] font-bold uppercase tracking-[0.15em] text-sm rounded-lg shadow-[0_8px_32px_rgba(197,160,89,0.3)] hover:shadow-[0_12px_40px_rgba(197,160,89,0.4)] transition-all relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative z-10 flex items-center gap-2">Enter Dashboard <ArrowRight size={16} /></span>
              </motion.button>
            </Link>
            
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-10 py-4 border border-white/[0.12] text-white font-bold uppercase tracking-[0.15em] text-sm rounded-lg backdrop-blur-md flex items-center gap-3 group hover:border-white/25 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-[#0A1F30] transition-all duration-300">
                <Play size={12} fill="currentColor" />
              </div>
              Watch Demo
            </motion.button>
          </div>
        </div>

        <motion.div 
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 flex flex-col items-center gap-2"
        >
          <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-semibold">Scroll</span>
          <ChevronDown size={16} className="text-white/20" />
        </motion.div>
      </section>

      {/* Stats Bar */}
      <section id="about" className="py-16 md:py-20 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {stats.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center group"
              >
                <div className="mb-4 inline-flex p-3.5 bg-[#C5A059]/[0.08] rounded-xl group-hover:bg-[#C5A059]/[0.15] transition-all duration-300">
                  <stat.icon size={22} className="text-[#C5A059]" />
                </div>
                <h3 className="text-3xl md:text-4xl font-black mb-1 tracking-tight text-[#0A1F30] font-heading">{stat.value}</h3>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Training Programs */}
      <section id="programs" className="py-20 md:py-28 bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center mb-14 reveal">
            <h2 className="text-xs tracking-[0.4em] uppercase font-bold text-[#C5A059] mb-3">Programs</h2>
            <h3 className="text-3xl md:text-5xl font-black tracking-tight text-[#0A1F30] font-heading">Our Training Programs</h3>
            <div className="w-16 h-1 bg-gradient-to-r from-[#C5A059] to-[#dfc491] mx-auto mt-6 rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {programs.map((program, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -8 }}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100"
              >
                <div className="relative h-56 overflow-hidden">
                  <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${program.image})` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1F30] via-[#0A1F30]/30 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    {program.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-[#C5A059] text-[#0A1F30] text-[9px] font-bold uppercase tracking-wider rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
                
                <div className="p-6">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059] font-bold mb-1">{program.subtitle}</p>
                  <h4 className="text-xl font-black text-[#0A1F30] mb-2 font-heading">{program.title}</h4>
                  <p className="text-sm text-gray-500 mb-5 leading-relaxed">{program.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1.5"><Calendar size={13} /> {program.schedule}</span>
                    <span className="px-2.5 py-1 bg-[#0A1F30]/5 rounded-md font-semibold text-[#0A1F30]">{program.level}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Instructors */}
      <section id="instructors" className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center mb-14 reveal">
            <h2 className="text-xs tracking-[0.4em] uppercase font-bold text-[#C5A059] mb-3">Mastery</h2>
            <h3 className="text-3xl md:text-5xl font-black tracking-tight text-[#0A1F30] font-heading">Elite Instructors</h3>
            <div className="w-16 h-1 bg-gradient-to-r from-[#C5A059] to-[#dfc491] mx-auto mt-6 rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {trainers.map((trainer, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -8 }}
                className="group reveal"
              >
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-sm group-hover:shadow-xl transition-all duration-500">
                  {trainer.image && (
                    <Image 
                      src={trainer.image} 
                      alt={trainer.name} 
                      fill 
                      className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" 
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1F30] via-[#0A1F30]/40 to-transparent z-10" />
                  <div className="absolute bottom-0 left-0 p-6 z-20 w-full">
                    <div className="flex gap-2 mb-3">
                      {trainer.specialties?.map(s => (
                        <span key={s} className="px-2.5 py-1 bg-[#C5A059]/20 text-[#C5A059] text-[8px] font-bold uppercase tracking-wider rounded-full border border-[#C5A059]/30">{s}</span>
                      ))}
                    </div>
                    <p className="text-[#C5A059] text-[10px] font-bold uppercase tracking-[0.2em] mb-1">{trainer.rank}</p>
                    <h4 className="text-xl font-black text-white mb-1 font-heading">{trainer.name}</h4>
                    <p className="text-white/50 text-xs font-medium">{trainer.role}</p>
                  </div>
                  <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                    <div className="flex flex-col gap-2">
                      <motion.div whileHover={{ scale: 1.1 }} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-[#C5A059] hover:text-[#0A1F30] cursor-pointer transition-colors text-white">
                        <Globe size={14} />
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.1 }} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-[#C5A059] hover:text-[#0A1F30] cursor-pointer transition-colors text-white">
                        <MessageSquare size={14} />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Legacy Branches */}
      <section id="branches" className="py-20 md:py-28 bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center mb-14 reveal">
            <h2 className="text-xs tracking-[0.4em] uppercase font-bold text-[#C5A059] mb-3">Network</h2>
            <h3 className="text-3xl md:text-5xl font-black tracking-tight text-[#0A1F30] font-heading">Our Legacy Branches</h3>
            <p className="mt-4 text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">A growing network of dojos spreading the art of Thammando karate across the region.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.map((branch, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-[#1B3022]/5 rounded-lg flex items-center justify-center group-hover:bg-[#1B3022]/10 transition-colors">
                    <MapPin size={18} className="text-[#1B3022]" />
                  </div>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Est. {branch.established}</span>
                </div>
                <h4 className="text-lg font-bold text-[#0A1F30] mb-1 font-heading">{branch.name}</h4>
                <p className="text-sm text-gray-400 mb-4">{branch.location}</p>
                <div className="flex items-center gap-2 text-sm">
                  <Users size={14} className="text-[#C5A059]" />
                  <span className="font-semibold text-[#0A1F30]">{branch.members}</span>
                  <span className="text-gray-400">active members</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Registration / Contact */}
      <section id="contact" className="py-20 md:py-28 bg-[#0A1F30] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(197,160,89,0.3) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.06, 0.03] }} transition={{ duration: 10, repeat: Infinity }} className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#C5A059] blur-[200px] rounded-full" />

        <div className="max-w-7xl mx-auto px-6 md:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            <div className="reveal">
              <h2 className="text-xs tracking-[0.4em] uppercase font-bold text-[#C5A059] mb-4">Get Started</h2>
              <h3 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-6 font-heading leading-tight">
                Begin Your<br />Journey Today
              </h3>
              <p className="text-white/40 text-sm leading-relaxed mb-10 max-w-md">
                Register for an orientation session and discover the transformative power of martial arts training at TKMAA.
              </p>
              
              <div className="space-y-8">
                {[
                  { icon: Mail, label: "Email Support", value: "hello@tkmaa.com" },
                  { icon: Phone, label: "Call Anytime", value: "+91 98765 43210" },
                  { icon: MapPin, label: "Main Campus", value: "Central Dojo, Sector 12" },
                ].map((item, i) => (
                  <motion.div key={i} whileHover={{ x: 5 }} className="flex items-center gap-5 group cursor-pointer">
                    <div className="w-12 h-12 bg-white/[0.05] border border-white/[0.1] rounded-xl flex items-center justify-center group-hover:bg-[#C5A059] group-hover:text-[#0A1F30] group-hover:border-[#C5A059] transition-all duration-300 text-white">
                      <item.icon size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-semibold mb-0.5">{item.label}</p>
                      <p className="text-white font-semibold">{item.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 md:p-10 shadow-2xl reveal relative"
            >
              <h4 className="text-xl font-bold text-[#0A1F30] mb-1 font-heading">Request Orientation</h4>
              <p className="text-sm text-gray-400 mb-8">Fill in your details and we'll get back to you within 24 hours.</p>
              
              <div className="space-y-5">
                <div>
                  <label className="text-[11px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2 block">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3.5 text-sm text-[#0A1F30] placeholder:text-gray-300 outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10 transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2 block">Email</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@email.com"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3.5 text-sm text-[#0A1F30] placeholder:text-gray-300 outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2 block">Phone</label>
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3.5 text-sm text-[#0A1F30] placeholder:text-gray-300 outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2 block">Preferred Program</label>
                  <select 
                    value={formData.program}
                    onChange={e => setFormData({ ...formData, program: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3.5 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10 transition-all appearance-none"
                  >
                    <option value="">Select a program</option>
                    <option value="karate">Karate Do - Traditional</option>
                    <option value="mma">MMA Elite</option>
                    <option value="kids">Kids Warriors</option>
                  </select>
                </div>
                <Button className="w-full bg-[#0A1F30] hover:bg-[#0d2a40] text-white h-13 font-bold uppercase tracking-[0.15em] text-sm rounded-lg transition-all shadow-lg hover:shadow-xl group mt-2">
                  <span className="flex items-center gap-2">
                    Request Orientation
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 md:px-8 bg-[#0A1F30] border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-semibold">
            &copy; 2026 Thammando Karate Martial Arts Academy. All Rights Reserved.
          </p>
          <div className="flex gap-5">
            {[Globe, MessageSquare, Mail].map((Icon, i) => (
              <motion.div key={i} whileHover={{ scale: 1.2, y: -2 }} className="cursor-pointer">
                <Icon className="text-white/20 hover:text-[#C5A059] transition-colors" size={18} />
              </motion.div>
            ))}
          </div>
        </div>
      </footer>
    </main>
  )
}
