"use client"
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Link from 'next/link'
import Image from 'next/image'
import {
  Trophy, Users, MapPin, Shield, Star,
  ArrowRight, Play, CheckCircle2, Mail,
  Phone, Globe, MessageSquare,
  ChevronRight, Quote, UserRound, Calendar,
  Award, Clock, ChevronDown, Menu, X,
  Swords, Target, Heart, Flame,
  ArrowUpRight, Maximize2, Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

// Brand icons (lucide-react doesn't include brand logos)
const Instagram = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><circle cx="12" cy="12" r="5"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.51"/>
  </svg>
)
const Youtube = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>
  </svg>
)
const Facebook = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
)

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

/* ═══════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════ */

const navLinks = ['About', 'Programs', 'Trainers', 'Branches', 'Gallery', 'Contact']

const stats = [
  { label: "Years Experience", value: "25+", icon: Star, suffix: "" },
  { label: "Active Members", value: "500+", icon: Users, suffix: "" },
  { label: "Licensed Trainers", value: "12", icon: UserRound, suffix: "" },
  { label: "Branches", value: "2", icon: MapPin, suffix: "" },
]

const aboutFeatures = [
  {
    icon: Swords,
    title: "Traditional Roots",
    desc: "Founded on authentic Shotokan principles passed down through generations of masters."
  },
  {
    icon: Target,
    title: "Competition Ready",
    desc: "Producing state and national level champions with proven competitive training methods."
  },
  {
    icon: Heart,
    title: "Character Building",
    desc: "Martial arts isn't just physical — we cultivate discipline, respect, and mental fortitude."
  },
  {
    icon: Flame,
    title: "Modern Methods",
    desc: "Blending traditional kata with modern sports science and real-time performance analytics."
  },
]

// Static fallback programs (used when Supabase sports table is unavailable)
const FALLBACK_PROGRAMS = [
  {
    title: "Karate Do",
    subtitle: "Traditional Shotokan",
    description: "Traditional martial arts focused on discipline, strength, and spiritual growth. Master the ancient forms passed down through generations.",
    image: "https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2000",
    tags: ["Traditional", "Self-Defense"],
    schedule: "Mon, Wed, Fri",
    level: "All Levels",
    color: "#C5A059"
  },
  {
    title: "MMA Elite",
    subtitle: "Mixed Martial Arts",
    description: "High-intensity mixed martial arts training for professional competition and peak physical fitness.",
    image: "https://images.unsplash.com/photo-1552072805-2a9039d00e57?q=80&w=2000",
    tags: ["Combat", "High-Intensity"],
    schedule: "Tue, Thu, Sat",
    level: "Intermediate+",
    color: "#E84545"
  },
  {
    title: "Kids Warriors",
    subtitle: "Youth Development",
    description: "Building confidence, coordination, and character in a fun, safe environment for ages 5-12.",
    image: "https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?q=80&w=2000",
    tags: ["Beginner", "Youth"],
    schedule: "Sat, Sun",
    level: "Ages 5-12",
    color: "#4CAF50"
  }
]

// Sport-name → visual defaults mapping (for dynamic cards)
const SPORT_VISUALS = {
  'Karate': {
    subtitle: 'Traditional Shotokan',
    image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2000',
    tags: ['Traditional', 'Self-Defense'],
    schedule: 'Mon, Wed, Fri',
    level: 'All Levels',
    color: '#C5A059',
  },
  'Music': {
    subtitle: 'Vocal & Instrumental',
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=2000',
    tags: ['Creative', 'Vocal'],
    schedule: 'Tue, Thu',
    level: 'All Levels',
    color: '#8B5CF6',
  },
  'Dance': {
    subtitle: 'Classical & Contemporary',
    image: 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?q=80&w=2000',
    tags: ['Rhythm', 'Expression'],
    schedule: 'Mon, Wed, Sat',
    level: 'All Levels',
    color: '#EC4899',
  },
  'Chess': {
    subtitle: 'Strategic Board Game',
    image: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?q=80&w=2000',
    tags: ['Strategy', 'Mental'],
    schedule: 'Wed, Fri',
    level: 'All Levels',
    color: '#10B981',
  },
  'Yoga': {
    subtitle: 'Mind-Body Wellness',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=2000',
    tags: ['Wellness', 'Flexibility'],
    schedule: 'Daily',
    level: 'All Levels',
    color: '#F59E0B',
  },
  'Skating': {
    subtitle: 'Roller & Ice Skating',
    image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?q=80&w=2000',
    tags: ['Speed', 'Balance'],
    schedule: 'Sat, Sun',
    level: 'All Levels',
    color: '#3B82F6',
  },
}

const DEFAULT_SPORT_VISUAL = {
  subtitle: 'Training Program',
  image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2000',
  tags: ['Training', 'Fitness'],
  schedule: 'Flexible',
  level: 'All Levels',
  color: '#6B7280',
}

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
    image: "https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?q=80&w=2000",
    specialties: ["Kumite", "Fitness"]
  },
]

const branches = [
  { name: "Pragati Nagar Dojo", location: "Pragati Nagar, Hyderabad", members: 180, established: "2001" },
  { name: "Nizampet Academy", location: "Nizampet, Hyderabad", members: 120, established: "2008" },
]

const galleryImages = [
  { src: "https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=1200", alt: "Karate training session", aspect: "tall" },
  { src: "https://images.unsplash.com/photo-1552072805-2a9039d00e57?q=80&w=1200", alt: "MMA sparring", aspect: "wide" },
  { src: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1200", alt: "Kids class", aspect: "square" },
  { src: "https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?q=80&w=1200", alt: "Belt ceremony", aspect: "tall" },
  { src: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1200", alt: "Group training", aspect: "wide" },
  { src: "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1200", alt: "Kata performance", aspect: "square" },
  { src: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1200", alt: "Competition", aspect: "wide" },
  { src: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200", alt: "Training facility", aspect: "tall" },
]

/* ═══════════════════════════════════════════════════
   ANIMATED COUNTER COMPONENT
   ═══════════════════════════════════════════════════ */
function AnimatedCounter({ value, inView }) {
  const [count, setCount] = useState(0)
  const numericValue = parseInt(value.replace(/\D/g, ''))
  const suffix = value.replace(/[0-9]/g, '')

  useEffect(() => {
    if (!inView) return
    let start = 0
    const duration = 2000
    const increment = numericValue / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= numericValue) {
        setCount(numericValue)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [inView, numericValue])

  return <span>{count}{suffix}</span>
}

/* ═══════════════════════════════════════════════════
   SECTION HEADER COMPONENT
   ═══════════════════════════════════════════════════ */
function SectionHeader({ label, title, subtitle, light = false }) {
  return (
    <div className="text-center mb-16 md:mb-20">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`text-[11px] tracking-[0.4em] uppercase font-bold mb-4 ${light ? 'text-[#C5A059]' : 'text-[#C5A059]'}`}
      >
        {label}
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className={`text-3xl md:text-5xl lg:text-6xl font-black tracking-tight font-heading leading-[1.1] ${light ? 'text-white' : 'text-[#0A1F30]'}`}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className={`mt-5 max-w-xl mx-auto text-sm md:text-base leading-relaxed ${light ? 'text-white/40' : 'text-gray-500'}`}
        >
          {subtitle}
        </motion.p>
      )}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="w-20 h-1 bg-gradient-to-r from-[#C5A059] to-[#dfc491] mx-auto mt-6 rounded-full origin-center"
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   GALLERY LIGHTBOX COMPONENT
   ═══════════════════════════════════════════════════ */
function GalleryLightbox({ image, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative max-w-5xl max-h-[85vh] w-full"
        onClick={e => e.stopPropagation()}
      >
        <Image
          src={image.src}
          alt={image.alt}
          width={1200}
          height={800}
          className="w-full h-full object-contain rounded-lg"
        />
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 md:top-4 md:right-4 w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <X size={20} />
        </button>
        <p className="absolute -bottom-10 left-0 text-white/50 text-sm">{image.alt}</p>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════ */
export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const [lightboxImage, setLightboxImage] = useState(null)
  const [statsInView, setStatsInView] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', program: '', message: '' })
  const [programs, setPrograms] = useState(FALLBACK_PROGRAMS)
  const heroRef = useRef(null)
  const statsRef = useRef(null)

  // Fetch active sports from Supabase and build dynamic programs list
  useEffect(() => {
    async function fetchSports() {
      try {
        const { data, error } = await supabase
          .from('sports')
          .select('id, sport_name, description, icon, status')
          .eq('status', 'active')
          .order('sport_name')

        if (error) throw error
        if (!data || data.length === 0) return // keep fallback

        // Karate first, then alphabetical
        const sorted = [...data].sort((a, b) => {
          if (a.sport_name === 'Karate') return -1
          if (b.sport_name === 'Karate') return 1
          return a.sport_name.localeCompare(b.sport_name)
        })

        const dynamicPrograms = sorted.map(sport => {
          const visuals = SPORT_VISUALS[sport.sport_name] || DEFAULT_SPORT_VISUAL
          return {
            title: sport.sport_name,
            subtitle: visuals.subtitle,
            description: sport.description || `${sport.sport_name} training program at TKMAA Academy.`,
            image: visuals.image,
            tags: visuals.tags,
            schedule: visuals.schedule,
            level: visuals.level,
            color: visuals.color,
          }
        })

        setPrograms(dynamicPrograms)
      } catch (err) {
        console.warn('Sports table not available — using fallback programs:', err.message)
        // Keep fallback programs
      }
    }
    fetchSports()
  }, [])

  // Nav background on scroll
  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // GSAP scroll animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.reveal-up').forEach((elem) => {
        gsap.from(elem, {
          scrollTrigger: { trigger: elem, start: "top 88%" },
          y: 50,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out"
        })
      })

      gsap.utils.toArray('.reveal-left').forEach((elem) => {
        gsap.from(elem, {
          scrollTrigger: { trigger: elem, start: "top 85%" },
          x: -60,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out"
        })
      })

      gsap.utils.toArray('.reveal-right').forEach((elem) => {
        gsap.from(elem, {
          scrollTrigger: { trigger: elem, start: "top 85%" },
          x: 60,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out"
        })
      })
    })

    return () => ctx.revert()
  }, [])

  // Stats intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsInView(true) },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  const scrollToSection = useCallback((id) => {
    setMobileMenuOpen(false)
    const el = document.getElementById(id.toLowerCase())
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <main className="relative text-[#0A1F30] overflow-x-hidden bg-[#F8F9FA]">

      {/* ════════ NAVIGATION ════════ */}
      <nav className={`fixed top-0 w-full z-[60] px-5 md:px-8 transition-all duration-500 ${
        navScrolled
          ? 'py-3 bg-[#0A1F30]/95 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.3)] border-b border-white/[0.06]'
          : 'py-5 bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group text-white">
            <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="w-10 h-10 rounded-full overflow-hidden border border-[#C5A059]/30 shadow-[0_0_20px_rgba(197,160,89,0.2)]">
              <Image src="/logo.png" alt="TKMAA" width={40} height={40} className="object-cover w-full h-full" />
            </motion.div>
            <h2 className="text-lg font-bold tracking-[0.2em] uppercase font-heading">TKMAA</h2>
          </Link>

          {/* Desktop Links */}
          <div className="hidden lg:flex gap-8 xl:gap-10 text-[11px] uppercase tracking-[0.2em] font-semibold text-white/50">
            {navLinks.map(item => (
              <button
                key={item}
                onClick={() => scrollToSection(item)}
                className="hover:text-[#C5A059] transition-colors duration-300 relative group/nav py-1"
              >
                {item}
                <span className="absolute -bottom-0.5 left-0 w-0 h-[2px] bg-[#C5A059] group-hover/nav:w-full transition-all duration-300" />
              </button>
            ))}
          </div>

          {/* CTA + Mobile Toggle */}
          <div className="flex gap-3 items-center">
            <Link href="/login" className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/50 hover:text-white transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link href="/login" className="hidden sm:block">
              <Button className="bg-[#C5A059] hover:bg-[#b8943f] text-[#0A1F30] px-5 py-5 text-[11px] uppercase tracking-[0.2em] font-bold rounded-lg shadow-lg hover:shadow-xl transition-all">
                Join Academy
              </Button>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-10 h-10 flex items-center justify-center text-white"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ════════ MOBILE MENU ════════ */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[55] bg-[#0A1F30] flex flex-col items-center justify-center gap-6"
          >
            {navLinks.map((item, i) => (
              <motion.button
                key={item}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => scrollToSection(item)}
                className="text-2xl font-bold text-white/70 hover:text-[#C5A059] transition-colors tracking-[0.15em] uppercase font-heading"
              >
                {item}
              </motion.button>
            ))}
            <div className="flex flex-col gap-3 mt-6 w-60">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-[#C5A059] hover:bg-[#b8943f] text-[#0A1F30] py-5 text-[11px] uppercase tracking-[0.2em] font-bold rounded-lg">
                  Join Academy
                </Button>
              </Link>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-center text-white/40 text-sm uppercase tracking-widest hover:text-white transition-colors">
                Sign In
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════ HERO SECTION — VIDEO ════════ */}
      <section ref={heroRef} id="hero" className="relative min-h-screen flex flex-col items-center justify-center px-5 overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="/logo.png"
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/videos/hero-bg.mp4" type="video/mp4" />
          </video>
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A1F30]/80 via-[#0A1F30]/60 to-[#0A1F30]/90 z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A1F30]/40 to-transparent z-10" />
          {/* Subtle animated glow orbs */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.12, 0.05] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#C5A059] blur-[200px] rounded-full z-[11]"
          />
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.03, 0.08, 0.03] }}
            transition={{ duration: 10, repeat: Infinity, delay: 2, ease: "easeInOut" }}
            className="absolute bottom-1/3 right-1/5 w-[400px] h-[400px] bg-[#1B3022] blur-[180px] rounded-full z-[11]"
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-20 text-center max-w-5xl pt-24 md:pt-20">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-8 inline-flex items-center gap-3 px-5 py-2.5 border border-[#C5A059]/25 rounded-full bg-[#C5A059]/[0.06] backdrop-blur-xl"
          >
            <div className="w-2 h-2 rounded-full bg-[#C5A059] animate-ping" />
            <span className="text-[#C5A059] text-[10px] tracking-[0.35em] uppercase font-bold">
              Thammando Karate Martial Arts Academy
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1.2, ease: [0.25, 0.1, 0, 1] }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] xl:text-[6.5rem] font-black tracking-tight mb-8 leading-[0.92] text-white font-heading"
          >
            Forge Your<br />
            <span className="bg-gradient-to-r from-[#C5A059] via-[#dfc491] to-[#C5A059] bg-clip-text text-transparent bg-[length:200%_100%] animate-text-shimmer">
              Legacy
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-base md:text-lg text-white/45 mb-12 max-w-2xl mx-auto leading-relaxed tracking-wide"
          >
            Where ancient martial arts wisdom meets modern training excellence.
            Join 500+ warriors transforming body, mind, and spirit.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex flex-wrap gap-4 justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => scrollToSection('Programs')}
              className="px-10 py-4 bg-[#C5A059] text-[#0A1F30] font-bold uppercase tracking-[0.15em] text-sm rounded-lg shadow-[0_8px_32px_rgba(197,160,89,0.3)] hover:shadow-[0_12px_40px_rgba(197,160,89,0.45)] transition-all relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative z-10 flex items-center gap-2">Explore Programs <ArrowRight size={16} /></span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => scrollToSection('About')}
              className="px-10 py-4 border border-white/[0.15] text-white font-bold uppercase tracking-[0.15em] text-sm rounded-lg backdrop-blur-md flex items-center gap-3 group hover:border-white/30 hover:bg-white/[0.04] transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-[#0A1F30] transition-all duration-300">
                <Play size={12} fill="currentColor" />
              </div>
              Our Story
            </motion.button>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 flex flex-col items-center gap-2 z-20"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-2 cursor-pointer"
            onClick={() => scrollToSection('About')}
          >
            <span className="text-[9px] uppercase tracking-[0.3em] text-white/25 font-semibold">Discover</span>
            <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1">
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-1.5 h-1.5 rounded-full bg-[#C5A059]"
              />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ════════ ABOUT ACADEMY ════════ */}
      <section id="about" className="py-20 md:py-32 bg-white relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C5A059]/[0.03] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />

        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <SectionHeader
            label="Our Academy"
            title="25 Years of Martial Excellence"
            subtitle="From a single dojo to a multi-sport academy — TKMAA shapes warriors and builds character through Karate, Music, Dance, Chess, Yoga, Skating, and more."
          />

          {/* Stats Bar */}
          <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 mb-20">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="text-center group"
              >
                <div className="mb-4 inline-flex p-4 bg-gradient-to-br from-[#C5A059]/10 to-[#C5A059]/[0.03] rounded-2xl group-hover:from-[#C5A059]/20 group-hover:to-[#C5A059]/[0.08] transition-all duration-500 shadow-sm">
                  <stat.icon size={24} className="text-[#C5A059]" strokeWidth={1.5} />
                </div>
                <h3 className="text-3xl md:text-4xl font-black mb-1 tracking-tight text-[#0A1F30] font-heading">
                  <AnimatedCounter value={stat.value} inView={statsInView} />
                </h3>
                <p className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-semibold">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {aboutFeatures.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="group flex gap-5 p-6 md:p-7 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 hover:border-[#C5A059]/20 hover:shadow-lg transition-all duration-500"
              >
                <div className="shrink-0 w-12 h-12 bg-[#0A1F30] rounded-xl flex items-center justify-center group-hover:bg-[#C5A059] transition-colors duration-300">
                  <feature.icon size={20} className="text-[#C5A059] group-hover:text-[#0A1F30] transition-colors duration-300" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-[#0A1F30] mb-1.5 font-heading">{feature.title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ PROGRAMS ════════ */}
      <section id="programs" className="py-20 md:py-32 bg-[#F8F9FA] relative">
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(10,31,48,0.4) 1px, transparent 0)', backgroundSize: '48px 48px' }} />

        <div className="max-w-7xl mx-auto px-5 md:px-8 relative">
          <SectionHeader
            label="Programs"
            title="Train With Purpose"
            subtitle="From traditional karate to creative arts and strategic sports — find the discipline that ignites your fire."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {programs.map((program, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.7 }}
                whileHover={{ y: -10 }}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-gray-200"
              >
                <div className="relative h-60 overflow-hidden">
                  <Image
                    src={program.image}
                    alt={program.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1F30] via-[#0A1F30]/30 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    {program.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-[#C5A059] text-[#0A1F30] text-[9px] font-bold uppercase tracking-wider rounded-full">{tag}</span>
                    ))}
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-[#0A1F30]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-[#C5A059] flex items-center justify-center transform scale-50 group-hover:scale-100 transition-transform duration-300">
                      <ArrowUpRight size={24} className="text-[#0A1F30]" />
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-7">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059] font-bold mb-1">{program.subtitle}</p>
                  <h4 className="text-xl font-black text-[#0A1F30] mb-2 font-heading">{program.title}</h4>
                  <p className="text-sm text-gray-500 mb-6 leading-relaxed">{program.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-gray-100">
                    <span className="flex items-center gap-1.5"><Calendar size={13} /> {program.schedule}</span>
                    <span className="px-3 py-1.5 bg-[#0A1F30]/5 rounded-lg font-semibold text-[#0A1F30]">{program.level}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link href="/login">
              <Button className="bg-[#0A1F30] hover:bg-[#0d2a40] text-white px-8 py-5 text-[11px] uppercase tracking-[0.2em] font-bold rounded-lg shadow-lg hover:shadow-xl transition-all group">
                View All Programs <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ════════ TRAINERS ════════ */}
      <section id="trainers" className="py-20 md:py-32 bg-[#0A1F30] relative overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(197,160,89,0.5) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.06, 0.03] }} transition={{ duration: 12, repeat: Infinity }} className="absolute -bottom-32 -left-32 w-[600px] h-[600px] bg-[#C5A059] blur-[250px] rounded-full" />

        <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
          <SectionHeader
            label="Mastery"
            title="Learn From The Best"
            subtitle="Our elite instructors bring decades of competition, coaching, and traditional mastery to every session."
            light
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {trainers.map((trainer, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.7 }}
                whileHover={{ y: -8 }}
                className="group"
              >
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-md group-hover:shadow-2xl group-hover:shadow-[#C5A059]/10 transition-all duration-500">
                  <Image
                    src={trainer.image}
                    alt={trainer.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1F30] via-[#0A1F30]/40 to-transparent z-10" />

                  {/* Info Overlay */}
                  <div className="absolute bottom-0 left-0 p-6 z-20 w-full">
                    <div className="flex gap-2 mb-3">
                      {trainer.specialties?.map(s => (
                        <span key={s} className="px-2.5 py-1 bg-[#C5A059]/20 text-[#C5A059] text-[8px] font-bold uppercase tracking-wider rounded-full border border-[#C5A059]/30">{s}</span>
                      ))}
                    </div>
                    <p className="text-[#C5A059] text-[10px] font-bold uppercase tracking-[0.2em] mb-1">{trainer.rank}</p>
                    <h4 className="text-xl font-black text-white mb-1 font-heading">{trainer.name}</h4>
                    <p className="text-white/50 text-xs font-medium mb-3">{trainer.role}</p>
                    {/* Bio - appears on hover */}
                    <motion.p className="text-white/40 text-xs leading-relaxed max-h-0 group-hover:max-h-20 overflow-hidden transition-all duration-500">
                      {trainer.bio}
                    </motion.p>
                  </div>

                  {/* Social Links */}
                  <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                    <div className="flex flex-col gap-2">
                      {[Instagram, Globe, MessageSquare].map((Icon, idx) => (
                        <motion.div key={idx} whileHover={{ scale: 1.15 }} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-[#C5A059] hover:text-[#0A1F30] cursor-pointer transition-colors text-white">
                          <Icon size={14} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ BRANCHES ════════ */}
      <section id="branches" className="py-20 md:py-32 bg-[#F8F9FA] relative">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <SectionHeader
            label="Network"
            title="Our Legacy Branches"
            subtitle="A growing network of dojos spreading the art of Thammando karate across the region."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.map((branch, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
                whileHover={{ y: -6, scale: 1.01 }}
                className="bg-white rounded-xl p-6 md:p-7 border border-gray-100 shadow-sm hover:shadow-xl hover:border-[#C5A059]/15 transition-all duration-500 group relative overflow-hidden"
              >
                {/* Decorative accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C5A059] to-[#dfc491] transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />

                <div className="flex items-start justify-between mb-5">
                  <div className="w-11 h-11 bg-[#0A1F30] rounded-xl flex items-center justify-center group-hover:bg-[#C5A059] transition-colors duration-300">
                    <MapPin size={18} className="text-[#C5A059] group-hover:text-[#0A1F30] transition-colors" />
                  </div>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider bg-gray-50 px-2.5 py-1 rounded-md">Est. {branch.established}</span>
                </div>
                <h4 className="text-lg font-bold text-[#0A1F30] mb-1.5 font-heading">{branch.name}</h4>
                <p className="text-sm text-gray-400 mb-5">{branch.location}</p>
                <div className="flex items-center gap-2 text-sm pt-4 border-t border-gray-100">
                  <Users size={14} className="text-[#C5A059]" />
                  <span className="font-bold text-[#0A1F30]">{branch.members}</span>
                  <span className="text-gray-400">active members</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ GALLERY ════════ */}
      <section id="gallery" className="py-20 md:py-32 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <SectionHeader
            label="Gallery"
            title="Moments of Excellence"
            subtitle="Snapshots from our dojos, competitions, and community — the spirit of TKMAA in action."
          />

          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-5 space-y-4 md:space-y-5">
            {galleryImages.map((image, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.6 }}
                className="break-inside-avoid group cursor-pointer relative rounded-xl overflow-hidden"
                onClick={() => setLightboxImage(image)}
              >
                <div className={`relative ${image.aspect === 'tall' ? 'aspect-[3/4]' : image.aspect === 'wide' ? 'aspect-[4/3]' : 'aspect-square'}`}>
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-[#0A1F30]/0 group-hover:bg-[#0A1F30]/60 transition-all duration-500 flex items-center justify-center">
                    <motion.div
                      className="opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center gap-2"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                        <Maximize2 size={20} className="text-white" />
                      </div>
                      <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">{image.alt}</span>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <GalleryLightbox
            image={lightboxImage}
            onClose={() => setLightboxImage(null)}
          />
        )}
      </AnimatePresence>

      {/* ════════ CONTACT ════════ */}
      <section id="contact" className="py-20 md:py-32 bg-[#0A1F30] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(197,160,89,0.3) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.06, 0.03] }} transition={{ duration: 10, repeat: Infinity }} className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#C5A059] blur-[200px] rounded-full" />

        <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            {/* Left: Info */}
            <div className="reveal-left">
              <p className="text-[11px] tracking-[0.4em] uppercase font-bold text-[#C5A059] mb-4">Get Started</p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6 font-heading leading-[1.1]">
                Begin Your<br />Journey Today
              </h2>
              <p className="text-white/40 text-sm md:text-base leading-relaxed mb-12 max-w-md">
                Register for an orientation session and discover the transformative power of martial arts training at TKMAA.
              </p>

              <div className="space-y-6">
                {[
                  { icon: Mail, label: "Email", value: "durgaprasadtmaa@gmail.com" },
                  { icon: Phone, label: "Call Us", value: "+91 76598 01431 / 77992 77710" },
                  { icon: MapPin, label: "Branches", value: "Pragati Nagar & Nizampet, Hyderabad" },
                ].map((item, i) => (
                  <motion.div key={i} whileHover={{ x: 8 }} className="flex items-center gap-5 group cursor-pointer">
                    <div className="w-13 h-13 bg-white/[0.05] border border-white/[0.1] rounded-xl flex items-center justify-center group-hover:bg-[#C5A059] group-hover:text-[#0A1F30] group-hover:border-[#C5A059] transition-all duration-300 text-white shrink-0">
                      <item.icon size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-semibold mb-0.5">{item.label}</p>
                      <p className="text-white font-semibold text-base">{item.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Social Links */}
              <div className="flex gap-3 mt-10">
                {[
                  { icon: Instagram, label: "Instagram" },
                  { icon: Youtube, label: "YouTube" },
                  { icon: Facebook, label: "Facebook" },
                  { icon: Globe, label: "Website" },
                ].map(({ icon: Icon, label }) => (
                  <motion.div
                    key={label}
                    whileHover={{ scale: 1.15, y: -3 }}
                    className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-[#C5A059] hover:bg-[#C5A059]/10 hover:border-[#C5A059]/30 cursor-pointer transition-all duration-300"
                  >
                    <Icon size={18} />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right: Form */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="bg-white rounded-2xl p-8 md:p-10 shadow-2xl relative overflow-hidden"
            >
              {/* Gold accent line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C5A059] via-[#dfc491] to-[#C5A059]" />

              <h4 className="text-xl font-bold text-[#0A1F30] mb-1 font-heading">Request Orientation</h4>
              <p className="text-sm text-gray-400 mb-8">Fill in your details and we&apos;ll get back to you within 24 hours.</p>

              <div className="space-y-5">
                <div>
                  <label className="text-[11px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2 block">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-[#0A1F30] placeholder:text-gray-300 outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10 transition-all"
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
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-[#0A1F30] placeholder:text-gray-300 outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2 block">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-[#0A1F30] placeholder:text-gray-300 outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2 block">Preferred Program</label>
                  <select
                    value={formData.program}
                    onChange={e => setFormData({ ...formData, program: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10 transition-all appearance-none"
                  >
                    <option value="">Select a program</option>
                    {programs.map(p => (
                      <option key={p.title} value={p.title.toLowerCase().replace(/\s+/g, '-')}>{p.title} — {p.subtitle}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2 block">Message (Optional)</label>
                  <textarea
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your goals..."
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-[#0A1F30] placeholder:text-gray-300 outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/10 transition-all resize-none"
                  />
                </div>
                <Button className="w-full bg-[#0A1F30] hover:bg-[#0d2a40] text-white h-13 font-bold uppercase tracking-[0.15em] text-sm rounded-xl transition-all shadow-lg hover:shadow-xl group mt-2">
                  <span className="flex items-center gap-2">
                    Request Orientation
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
                <p className="text-[10px] text-gray-400 text-center mt-1">We respect your privacy. No spam, ever.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="py-12 px-5 md:px-8 bg-[#071620] border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-[#C5A059]/20">
                  <Image src="/logo.png" alt="TKMAA" width={40} height={40} className="object-cover w-full h-full" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-[0.15em] uppercase font-heading">TKMAA</h3>
              </div>
              <p className="text-white/25 text-xs leading-relaxed max-w-xs">
                Thammando Karate Martial Arts Academy — Forging warriors with discipline, honor, and excellence since 2001.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold mb-4">Navigate</h4>
              <div className="space-y-2.5">
                {navLinks.map(link => (
                  <button key={link} onClick={() => scrollToSection(link)} className="block text-white/25 text-sm hover:text-[#C5A059] transition-colors">
                    {link}
                  </button>
                ))}
              </div>
            </div>

            {/* Programs */}
            <div>
              <h4 className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold mb-4">Programs</h4>
              <div className="space-y-2.5">
                {programs.map(p => (
                  <p key={p.title} className="text-white/25 text-sm">{p.title}</p>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold mb-4">Contact</h4>
              <div className="space-y-2.5 text-white/25 text-sm">
                <p>durgaprasadtmaa@gmail.com</p>
                <p>+91 76598 01431</p>
                <p>+91 77992 77710</p>
                <p>Pragati Nagar & Nizampet</p>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-white/[0.04] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/15 font-semibold">
              &copy; {new Date().getFullYear()} Thammando Karate Martial Arts Academy. All Rights Reserved.
            </p>
            <div className="flex gap-4">
              {[Instagram, Youtube, Facebook, Globe, Mail].map((Icon, i) => (
                <motion.div key={i} whileHover={{ scale: 1.2, y: -2 }} className="cursor-pointer">
                  <Icon className="text-white/15 hover:text-[#C5A059] transition-colors" size={16} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
