"use client"
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ThreeBackground from '@/components/ThreeBackground'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Trophy, Users, MapPin, Shield, Star, 
  ArrowRight, Play, CheckCircle2, Mail, 
  Phone, Globe, MessageSquare,
  ChevronRight, Quote
} from 'lucide-react'
import { Button } from '@/components/ui/button'

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const stats = [
  { label: "Active Students", value: "2,500+", icon: Users },
  { label: "Elite Trainers", value: "45+", icon: Star },
  { label: "Branches", value: "12", icon: MapPin },
  { label: "Championships", value: "150+", icon: Trophy },
]

const programs = [
  {
    title: "Karate Do",
    description: "Traditional martial arts focused on discipline, strength, and spiritual growth.",
    image: "https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2000",
    tags: ["Traditional", "Self-Defense"]
  },
  {
    title: "MMA Elite",
    description: "High-intensity mixed martial arts training for professional competition.",
    image: "https://images.unsplash.com/photo-1552072805-2a9039d00e57?q=80&w=2000",
    tags: ["Combat", "High-Intensity"]
  },
  {
    title: "Kids Warriors",
    description: "Building confidence and coordination in a fun, safe environment.",
    image: "https://images.unsplash.com/photo-1509564332502-3932750e3805?q=80&w=2000",
    tags: ["Beginner", "Youth"]
  }
]

const trainers = [
  { name: "Master Kenji", role: "Chief Instructor", rank: "7th Dan Black Belt" },
  { name: "Sarah Connor", role: "MMA Specialist", rank: "Pro Fighter" },
  { name: "Marcus Thorne", role: "Youth Coach", rank: "4th Dan Black Belt" },
]

const testimonials = [
  { name: "David Chen", role: "Student", text: "The data tracking here is insane. I can see my progress in real-time." },
  { name: "Elena Rossi", role: "Parent", text: "The professional atmosphere and management are top-notch." },
  { name: "James Wilson", role: "Pro Athlete", text: "Best facility for serious martial artists in the country." },
]

export default function Home() {
  const containerRef = useRef(null)
  const titleRef = useRef()
  const subRef = useRef()
  const [activeTestimonial, setActiveTestimonial] = useState(0)

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

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <main ref={containerRef} className="relative text-white overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #0B0F19 0%, #111827 50%, #0B0F19 100%)' }}>
      <ThreeBackground />
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 md:px-8 py-5 backdrop-blur-xl bg-[#0B0F19]/60 border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-pointer">
            <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="w-10 h-10 rounded-full overflow-hidden border border-gold/30 shadow-[0_0_20px_rgba(214,184,106,0.2)]">
              <Image src="/logo.png" alt="TKMAA" width={40} height={40} className="object-cover w-full h-full" />
            </motion.div>
            <h2 className="text-xl font-bold tracking-[0.2em] uppercase">TKMAA</h2>
          </div>
          <div className="hidden md:flex gap-12 text-[10px] uppercase tracking-[0.3em] font-bold text-white/30">
            {['About', 'Programs', 'Instructors', 'Contact'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-gold transition-colors duration-300 relative group/nav">
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-gold group-hover/nav:w-full transition-all duration-300" />
              </a>
            ))}
          </div>
          <div className="flex gap-4 md:gap-6 items-center">
            <Link href="/login" className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/50 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/login">
              <Button className="bg-white/5 border border-white/[0.08] px-6 md:px-8 py-5 md:py-6 text-[10px] uppercase tracking-[0.3em] font-bold text-white hover:bg-gold hover:text-black hover:border-gold transition-all rounded-none hover:shadow-[0_0_20px_rgba(214,184,106,0.3)]">
                Join Now
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F19] via-transparent to-[#0B0F19] z-10" />
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.06, 0.1, 0.06] }} transition={{ duration: 8, repeat: Infinity }} className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gold blur-[180px] rounded-full" />
          <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.04, 0.08, 0.04] }} transition={{ duration: 10, repeat: Infinity, delay: 2 }} className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500 blur-[180px] rounded-full" />
        </div>

        <div className="relative z-10 text-center max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8 inline-flex items-center gap-3 px-5 py-2 border border-gold/20 rounded-full bg-gold/[0.04] backdrop-blur-xl"
          >
            <div className="w-2 h-2 rounded-full bg-gold animate-ping" />
            <span className="text-gold text-[9px] tracking-[0.4em] uppercase font-black">
              Thammando Karate Martial Arts Academy
            </span>
          </motion.div>

          <h1 ref={titleRef} className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter mb-8 leading-[0.9] uppercase">
            Master the <br />
            <span className="text-gold italic outline-text">Martial Arts</span>
          </h1>

          <p ref={subRef} className="text-base md:text-xl text-white/30 mb-12 max-w-2xl mx-auto leading-relaxed uppercase tracking-[0.15em] md:tracking-[0.2em] font-light">
            The ultimate management system for modern martial arts academies. 
            Real-time analytics and branch management in a premium interface.
          </p>

          <div className="flex flex-wrap gap-4 md:gap-6 justify-center">
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.97 }}
                className="px-10 md:px-12 py-5 bg-gold text-black font-black uppercase tracking-[0.3em] text-xs rounded-none glow-gold transition-all relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative z-10">Enter Dashboard</span>
              </motion.button>
            </Link>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="px-10 md:px-12 py-5 border border-white/[0.08] text-white font-black uppercase tracking-[0.3em] text-xs rounded-none backdrop-blur-md flex items-center gap-3 group hover:border-white/20 transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">
                <Play size={10} fill="currentColor" />
              </div>
              Watch Demo
            </motion.button>
          </div>
        </div>

        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-12 flex flex-col items-center gap-2"
        >
          <span className="text-[8px] uppercase tracking-[0.4em] text-white/15 font-bold">Scroll to Explore</span>
          <div className="w-px h-12 bg-gradient-to-b from-gold/50 to-transparent" />
        </motion.div>
      </section>

      {/* Stats Section */}
      <section id="about" className="py-24 md:py-32 border-y border-white/[0.04] relative" style={{ background: 'linear-gradient(180deg, rgba(214,184,106,0.02) 0%, transparent 50%, rgba(214,184,106,0.02) 100%)' }}>
        <div className="absolute inset-0 grid-overlay opacity-15" />
        <div className="max-w-7xl mx-auto px-6 md:px-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {stats.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                whileHover={{ y: -5 }}
                className="text-center group"
              >
                <div className="mb-6 inline-flex p-4 bg-white/[0.03] border border-white/[0.08] group-hover:border-gold/30 group-hover:bg-gold/[0.05] transition-all duration-500">
                  <stat.icon size={24} className="text-gold" />
                </div>
                <h3 className="text-3xl md:text-5xl font-black mb-2 tracking-tighter">{stat.value}</h3>
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/25 font-bold">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section id="programs" className="py-24 md:py-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 md:mb-20 gap-8 reveal">
            <div>
              <h2 className="text-gold text-xs tracking-[0.5em] uppercase font-black mb-4">Elite Training</h2>
              <h3 className="text-4xl md:text-7xl font-black tracking-tighter uppercase leading-none">Curated <br />Programs</h3>
            </div>
            <p className="max-w-md text-white/30 text-sm uppercase tracking-widest leading-relaxed">
              We combine centuries-old traditions with modern sports science and data-driven performance tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {programs.map((program, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -15 }}
                className="group relative h-[500px] md:h-[600px] overflow-hidden"
              >
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.2s] group-hover:scale-110" style={{ backgroundImage: `url(${program.image})` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/50 to-transparent opacity-85 group-hover:opacity-90 transition-opacity" />
                
                <div className="absolute bottom-0 left-0 p-8 md:p-10 w-full transform transition-transform duration-500 group-hover:translate-y-[-8px]">
                  <div className="flex gap-2 mb-5">
                    {program.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-gold text-black text-[8px] font-black uppercase tracking-widest">{tag}</span>
                    ))}
                  </div>
                  <h4 className="text-2xl md:text-3xl font-black uppercase mb-3 tracking-tighter">{program.title}</h4>
                  <p className="text-sm text-white/50 mb-8 line-clamp-2 uppercase tracking-wide font-medium">{program.description}</p>
                  <Button variant="outline" className="w-full border-white/15 text-white rounded-none uppercase text-[10px] tracking-[0.3em] font-bold h-12 md:h-14 group-hover:bg-gold group-hover:text-black group-hover:border-gold transition-all duration-500">
                    Explore Program <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trainers Section */}
      <section id="trainers" className="py-24 md:py-32 relative" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(214,184,106,0.015) 50%, transparent 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16 md:mb-20 reveal">
            <h2 className="text-gold text-xs tracking-[0.5em] uppercase font-black mb-4">Mastery</h2>
            <h3 className="text-4xl md:text-7xl font-black tracking-tighter uppercase mb-8">Elite Instructors</h3>
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {trainers.map((trainer, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -8 }}
                className="reveal"
              >
                <div className="relative aspect-[3/4] bg-white/[0.03] border border-white/[0.08] overflow-hidden group hover:border-gold/20 transition-colors duration-500">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/30 to-transparent z-10" />
                  <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                    <p className="text-gold text-[10px] font-black uppercase tracking-[0.3em] mb-2">{trainer.rank}</p>
                    <h4 className="text-2xl font-black uppercase mb-1 tracking-tighter">{trainer.name}</h4>
                    <p className="text-white/35 text-[10px] uppercase tracking-[0.2em] font-bold">{trainer.role}</p>
                  </div>
                  <div className="absolute top-0 right-0 p-6 z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                    <div className="flex flex-col gap-3">
                      <motion.div whileHover={{ scale: 1.1 }} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-gold hover:text-black cursor-pointer transition-colors"><Globe size={16} /></motion.div>
                      <motion.div whileHover={{ scale: 1.1 }} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-gold hover:text-black cursor-pointer transition-colors"><MessageSquare size={16} /></motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 md:py-32 relative">
        <div className="max-w-4xl mx-auto px-6 md:px-8 text-center reveal">
          <Quote size={48} className="text-gold/15 mx-auto mb-10" />
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTestimonial}
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
              transition={{ duration: 0.5 }}
              className="mb-12"
            >
              <p className="text-xl md:text-3xl lg:text-4xl font-medium italic mb-10 leading-relaxed tracking-tight">
                &quot;{testimonials[activeTestimonial].text}&quot;
              </p>
              <h4 className="text-lg md:text-xl font-black uppercase tracking-widest text-gold mb-2">{testimonials[activeTestimonial].name}</h4>
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/25 font-bold">{testimonials[activeTestimonial].role}</p>
            </motion.div>
          </AnimatePresence>
          
          <div className="flex justify-center gap-3">
            {testimonials.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setActiveTestimonial(i)}
                className={`h-1 transition-all duration-500 ${i === activeTestimonial ? 'bg-gold w-16' : 'bg-white/10 w-8 hover:bg-white/20'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 md:py-32 border-t border-white/[0.04] relative" style={{ background: 'linear-gradient(180deg, #0B0F19 0%, #111827 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            <div className="reveal">
              <h2 className="text-gold text-xs tracking-[0.5em] uppercase font-black mb-6">Contact Us</h2>
              <h3 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase mb-12">Start Your <br />Journey</h3>
              
              <div className="space-y-10">
                {[
                  { icon: Mail, label: "Email Support", value: "hello@tkmaa.com" },
                  { icon: Phone, label: "Call Anytime", value: "+91 98765 43210" },
                ].map((item, i) => (
                  <motion.div key={i} whileHover={{ x: 5 }} className="flex items-center gap-6 md:gap-8 group cursor-pointer">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-white/[0.03] border border-white/[0.08] flex items-center justify-center group-hover:bg-gold group-hover:text-black group-hover:border-gold transition-all duration-300">
                      <item.icon size={22} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/25 font-bold mb-1">{item.label}</p>
                      <p className="text-lg md:text-xl font-bold">{item.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-16 flex gap-5">
                {[Globe, MessageSquare, Mail].map((Icon, i) => (
                  <motion.div key={i} whileHover={{ scale: 1.2, y: -2 }} className="cursor-pointer">
                    <Icon className="text-white/30 hover:text-gold transition-colors" size={22} />
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div 
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="bg-white/[0.03] border border-white/[0.08] p-8 md:p-12 rounded-none backdrop-blur-xl reveal relative overflow-hidden"
            >
              <div className="absolute inset-0 grid-overlay-dense opacity-10 pointer-events-none" />
              <div className="relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
                  {[{ label: "Full Name", type: "text" }, { label: "Email Address", type: "email" }].map((field, i) => (
                    <div key={i} className="space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-bold">{field.label}</label>
                      <input type={field.type} className="w-full bg-white/[0.03] border border-white/[0.08] p-4 outline-none focus:border-gold/40 transition-colors uppercase text-xs tracking-widest" />
                    </div>
                  ))}
                </div>
                <div className="space-y-3 mb-10">
                  <label className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-bold">Your Message</label>
                  <textarea rows={4} className="w-full bg-white/[0.03] border border-white/[0.08] p-4 outline-none focus:border-gold/40 transition-colors uppercase text-xs tracking-widest resize-none" />
                </div>
                <Button className="w-full bg-gold text-black h-14 md:h-16 font-black uppercase tracking-[0.4em] text-xs rounded-none glow-gold hover:bg-gold/90 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative z-10">Send Message</span>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 md:py-12 px-6 md:px-8 border-t border-white/[0.04] text-center">
        <p className="text-[9px] uppercase tracking-[0.5em] text-white/15 font-bold">
          &copy; 2026 Thammando Karate Martial Arts Academy. All Rights Reserved.
        </p>
      </footer>
    </main>
  )
}
