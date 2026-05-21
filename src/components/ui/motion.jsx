"use client"
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'

// ═══════════════════════════════════════════
// MOTION SYSTEM — Standardized Timings
// ═══════════════════════════════════════════
export const TIMING = {
  fast: 0.2,
  medium: 0.4,
  slow: 0.7,
}

export const EASE = {
  out: [0.16, 1, 0.3, 1],
  anticipate: [0.36, 0.7, 0.19, 0.97],
  spring: { type: "spring", stiffness: 200, damping: 20 },
  springSnappy: { type: "spring", stiffness: 400, damping: 25 },
  springGentle: { type: "spring", stiffness: 100, damping: 15 },
}

// ═══════════════════════════════════════════
// RevealUp — Scroll/mount reveal animation
// ═══════════════════════════════════════════
export function RevealUp({ children, delay = 0, className = "", once = true }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, margin: "-50px" }}
      transition={{ 
        duration: TIMING.slow, 
        delay, 
        ease: EASE.out 
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════
// StaggerContainer — Staggers child animations
// ═══════════════════════════════════════════
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2
    }
  }
}

export const staggerItem = {
  hidden: { y: 20, opacity: 0, filter: "blur(8px)" },
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: EASE.springGentle
  }
}

export function StaggerContainer({ children, className = "" }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className = "" }) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════
// GlowCard — Card with hover glow + lift
// ═══════════════════════════════════════════
export function GlowCard({ children, className = "", glowColor = "gold", noPadding = false }) {
  const [delay] = useState(() => Math.random() * 3)
  const glowMap = {
    gold: "group-hover:shadow-[0_0_30px_rgba(214,184,106,0.12)]",
    blue: "group-hover:shadow-[0_0_30px_rgba(59,130,246,0.12)]",
    green: "group-hover:shadow-[0_0_30px_rgba(34,197,94,0.12)]",
    red: "group-hover:shadow-[0_0_30px_rgba(239,68,68,0.12)]",
  }
  
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.005 }}
      transition={EASE.springSnappy}
      className={`relative group overflow-hidden border border-white/[0.08] bg-[#1B2230]/60 backdrop-blur-xl rounded-none transition-shadow duration-500 ${glowMap[glowColor] || glowMap.gold} ${className}`}
    >
      {/* Ambient top glow line */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      
      {/* Corner Accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-gold/20 group-hover:border-gold/50 transition-colors duration-500" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-gold/20 group-hover:border-gold/50 transition-colors duration-500" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-gold/20 group-hover:border-gold/50 transition-colors duration-500" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-gold/20 group-hover:border-gold/50 transition-colors duration-500" />
      
      {/* Scanline */}
      <motion.div
        initial={{ top: "-5%" }}
        animate={{ top: "105%" }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear", delay }}
        className="absolute left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent z-20 pointer-events-none"
      />
      
      <div className={`relative z-10 ${noPadding ? '' : 'p-6'}`}>
        {children}
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════
// HoverScale — Simple hover scale wrapper
// ═══════════════════════════════════════════
export function HoverScale({ children, scale = 1.03, className = "" }) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: scale * 0.97 }}
      transition={EASE.springSnappy}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════
// PageTransition — Wrapper for page content
// ═══════════════════════════════════════════
export function PageTransition({ children, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
      transition={{ duration: TIMING.medium, ease: EASE.out }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════
// GlassPanel — Glassmorphism container
// ═══════════════════════════════════════════
export function GlassPanel({ children, className = "" }) {
  return (
    <div className={`bg-[#1B2230]/50 backdrop-blur-2xl border border-white/[0.08] rounded-none relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 grid-overlay-dense opacity-20 pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// ═══════════════════════════════════════════
// FloatingGlow — Ambient floating glow orb
// ═══════════════════════════════════════════
export function FloatingGlow({ color = "gold", size = 300, className = "" }) {
  const colorMap = {
    gold: "bg-[#D6B86A]",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
  }
  
  return (
    <motion.div
      animate={{ 
        scale: [1, 1.15, 1],
        opacity: [0.03, 0.06, 0.03]
      }}
      transition={{ 
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className={`absolute rounded-full blur-[120px] pointer-events-none -z-10 ${colorMap[color] || colorMap.gold} ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

// ═══════════════════════════════════════════
// AnimatedCounter — Smooth number animation
// ═══════════════════════════════════════════
export function AnimatedCounter({ value, prefix = "", suffix = "", className = "" }) {
  const ref = useRef(null)
  const [hasAnimated, setHasAnimated] = useState(false)
  
  useEffect(() => {
    const node = ref.current
    if (!node || hasAnimated) return
    
    setHasAnimated(true)
    let startTime = null
    const duration = 2000
    
    function animate(timestamp) {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      const current = Math.floor(eased * value)
      node.textContent = prefix + current.toLocaleString() + suffix
      if (progress < 1) requestAnimationFrame(animate)
    }
    
    requestAnimationFrame(animate)
  }, [value, prefix, suffix, hasAnimated])
  
  return <span ref={ref} className={className}>0</span>
}

// ═══════════════════════════════════════════
// PageHeader — Consistent page header style
// ═══════════════════════════════════════════
export function PageHeader({ subtitle, title, highlightedTitle, children }) {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 mb-2"
        >
          <div className="w-2 h-2 rounded-full bg-gold animate-pulse shadow-[0_0_10px_rgba(214,184,106,0.5)]" />
          <h2 className="text-gold text-[10px] tracking-[0.5em] uppercase font-black">
            {subtitle}
          </h2>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none"
        >
          {title} <span className="text-gold italic outline-text">{highlightedTitle}</span>
        </motion.h1>
      </div>
      {children && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-4 flex-wrap"
        >
          {children}
        </motion.div>
      )}
    </header>
  )
}
