"use client"
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Volume2, Printer, RotateCcw, X, Award, Shield, MapPin, ArrowRight, BarChart2, Zap } from 'lucide-react'

// Language options for announcements
const LANGUAGES = [
  { code: 'en-US', label: 'English' },
  { code: 'hi-IN', label: 'Hindi (हिंदी)' },
  { code: 'te-IN', label: 'Telugu (తెలుగు)' }
]

export default function WinnerCeremony({
  match,
  aoScore,
  akaScore,
  aoIppon = 0,
  aoWazaAri = 0,
  aoYuko = 0,
  aoBonusPoints = 0,
  akaIppon = 0,
  akaWazaAri = 0,
  akaYuko = 0,
  akaBonusPoints = 0,
  aoPenalties = [],
  akaPenalties = [],
  senshu = null,
  matchDuration = 90,
  extraTimeUsed = 0,
  onClose
}) {
  const [step, setStep] = useState(1)
  const [selectedLang, setSelectedLang] = useState('en-US')
  const [voiceSupported, setVoiceSupported] = useState(false)
  const canvasRef = useRef(null)
  const animationFrameId = useRef(null)
  const speechUtterance = useRef(null)

  const aoName = match.ao?.player?.users?.full_name || match.ao?.player?.name || 'AO Athlete'
  const akaName = match.aka?.player?.users?.full_name || match.aka?.player?.name || 'AKA Athlete'
  const aoDojo = match.ao?.player?.branches?.name || 'N/A'
  const akaDojo = match.aka?.player?.branches?.name || 'N/A'
  const aoState = match.ao?.player?.state || match.ao?.player?.district || ''
  const akaState = match.aka?.player?.state || match.aka?.player?.district || ''
  const aoBelt = match.ao?.player?.belt_levels || null
  const akaBelt = match.aka?.player?.belt_levels || null

  // Calculate winner
  let winnerSide = null
  let winMethod = 'score' // 'score' | 'senshu' | 'referee_decision' | 'disqualification'

  if (aoScore > akaScore) {
    winnerSide = 'ao'
  } else if (akaScore > aoScore) {
    winnerSide = 'aka'
  } else if (senshu) {
    winnerSide = senshu
    winMethod = 'senshu'
  } else {
    // If scores are equal and no senshu, we will default to 'ao' but allow referee decision to change it in Step 7
    winnerSide = 'ao'
    winMethod = 'referee_decision'
  }

  // Handle manual override for referee decision in Step 7
  const [winnerOverride, setWinnerOverride] = useState(null)
  const currentWinnerSide = winnerOverride || winnerSide
  const winnerName = currentWinnerSide === 'ao' ? aoName : akaName
  const winnerDojo = currentWinnerSide === 'ao' ? aoDojo : akaDojo
  const winnerState = currentWinnerSide === 'ao' ? aoState : akaState
  const winnerBelt = currentWinnerSide === 'ao' ? aoBelt : akaBelt

  const totalTechAo = aoIppon + aoWazaAri + aoYuko
  const totalTechAka = akaIppon + akaWazaAri + akaYuko
  const winningMargin = Math.abs(aoScore - akaScore)

  // Verify voice support
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setVoiceSupported(true)
    }
  }, [])

  // Web Audio API Synth SFX
  const playSound = (type) => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return
      const ctx = new AudioContextClass()
      
      if (type === 'whistle') {
        // High pitched referee whistle: sine wave burst
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(2200, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.4)
      } else if (type === 'sweep') {
        // Ascending trophy sweep
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(300, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 1.2)
        gain.gain.setValueAtTime(0.01, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.4)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 1.2)
      } else if (type === 'applause') {
        // Generate pseudo-applause/crowd noise using a buffer of noise
        const bufferSize = ctx.sampleRate * 2.5
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1
        }
        const noise = ctx.createBufferSource()
        noise.buffer = buffer
        
        // Filter the noise to sound more like a crowd
        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.value = 1000
        filter.Q.value = 1
        
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.01, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.3)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.5)
        
        noise.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)
        noise.start()
      }
    } catch (e) {
      console.warn('Web Audio API not allowed or supported', e)
    }
  }

  // Text to Speech
  const announceWinner = () => {
    if (!voiceSupported) return
    window.speechSynthesis.cancel() // Cancel ongoing speech

    let text = ''
    if (selectedLang === 'hi-IN') {
      text = `विजेता ${currentWinnerSide === 'ao' ? 'आओ' : 'अका'} कॉर्नर से, ${winnerName}, ${winnerDojo} का प्रतिनिधित्व करते हुए। अंतिम स्कोर ${currentWinnerSide === 'ao' ? aoScore : akaScore} और ${currentWinnerSide === 'ao' ? akaScore : aoScore}। बधाई हो।`
    } else if (selectedLang === 'te-IN') {
      text = `విజేత ${currentWinnerSide === 'ao' ? 'ఆవో' : 'అకా'} కార్నర్ నుండి, ${winnerName}, ${winnerDojo} తరపున ప్రాతినిధ్యం వహిస్తున్నారు. ముగింపు స్కోరు ${currentWinnerSide === 'ao' ? aoScore : akaScore} కి ${currentWinnerSide === 'ao' ? akaScore : aoScore}. అభినందనలు.`
    } else {
      text = `Winner from ${currentWinnerSide === 'ao' ? 'AO' : 'AKA'} Corner, ${winnerName}, representing ${winnerDojo}${winnerState ? ', ' + winnerState : ''}. Final score ${aoScore} to ${akaScore}. Congratulations.`
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = selectedLang
    utterance.rate = 0.85
    utterance.pitch = 0.95
    speechUtterance.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  // 7-step Auto Advance Timer
  useEffect(() => {
    if (step === 1) playSound('whistle')
    if (step === 4) {
      playSound('sweep')
      playSound('applause')
    }
    if (step === 5) {
      announceWinner()
    }

    if (step < 7) {
      const durations = {
        1: 2500, // Match Finished
        2: 2500, // Competitor Cards
        3: 2000, // Winner Highlight
        4: 2500, // Trophy Reveal
        5: 2500, // Winner Banner
        6: 2500, // Point Breakdown
      }
      const timer = setTimeout(() => {
        setStep(s => s + 1)
      }, durations[step])
      return () => clearTimeout(timer)
    }
  }, [step, currentWinnerSide])

  // Canvas Confetti
  useEffect(() => {
    if (step >= 4 && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      let width = (canvas.width = canvas.offsetWidth)
      let height = (canvas.height = canvas.offsetHeight)

      const colors = currentWinnerSide === 'ao' 
        ? ['#3b82f6', '#60a5fa', '#93c5fd', '#fcd34d', '#ffffff'] 
        : ['#ef4444', '#f87171', '#fca5a5', '#fcd34d', '#ffffff']

      const particles = []
      const particleCount = 100

      class Particle {
        constructor() {
          this.x = Math.random() * width
          this.y = Math.random() * height - height
          this.r = Math.random() * 6 + 4
          this.d = Math.random() * particleCount
          this.color = colors[Math.floor(Math.random() * colors.length)]
          this.tilt = Math.random() * 10 - 5
          this.tiltAngleIncremental = Math.random() * 0.07 + 0.02
          this.tiltAngle = 0
        }
        draw() {
          ctx.beginPath()
          ctx.lineWidth = this.r / 2
          ctx.strokeStyle = this.color
          ctx.moveTo(this.x + this.tilt + this.r / 2, this.y)
          ctx.lineTo(this.x + this.tilt, this.y + this.tilt + this.r / 2)
          ctx.stroke()
        }
        update() {
          this.tiltAngle += this.tiltAngleIncremental
          this.y += (Math.cos(this.d) + 3 + this.r / 2) / 2
          this.x += Math.sin(this.tiltAngle)
          this.tilt = Math.sin(this.tiltAngle - this.r / 2) * 5

          if (this.y > height) {
            this.y = -20
            this.x = Math.random() * width
          }
        }
      }

      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle())
      }

      const drawFrame = () => {
        ctx.clearRect(0, 0, width, height)
        particles.forEach(p => {
          p.update()
          p.draw()
        })
        animationFrameId.current = requestAnimationFrame(drawFrame)
      }

      drawFrame()

      const handleResize = () => {
        if (!canvasRef.current) return
        width = canvas.width = canvasRef.current.offsetWidth
        height = canvas.height = canvasRef.current.offsetHeight
      }
      window.addEventListener('resize', handleResize)

      return () => {
        cancelAnimationFrame(animationFrameId.current)
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [step, currentWinnerSide])

  const handlePrint = () => {
    window.print()
  }

  const handleReplay = () => {
    window.speechSynthesis.cancel()
    setStep(1)
  }

  // Format MM:SS
  const formatSecs = (s) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-slate-950/95 overflow-y-auto p-4 md:p-8 select-none print:bg-white print:p-0 print:static print:h-auto print:overflow-visible">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none print:hidden">
        <div className={`absolute top-1/4 left-1/4 w-[35vw] h-[35vw] rounded-full blur-[120px] opacity-20 transition-all duration-1000 ${currentWinnerSide === 'ao' ? 'bg-blue-600' : 'bg-red-600'}`} />
        <div className="absolute bottom-1/4 right-1/4 w-[30vw] h-[30vw] rounded-full bg-yellow-500/10 blur-[100px] opacity-30" />
      </div>

      {/* Confetti canvas */}
      {step >= 4 && (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10 print:hidden" />
      )}

      {/* Ceremony card container */}
      <div className="relative w-full max-w-4xl bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-20 flex flex-col my-auto max-h-[92vh] print:border-none print:shadow-none print:bg-white print:static print:max-h-none print:my-0">
        
        {/* Step Indicator / Skip button */}
        {step < 7 && (
          <div className="absolute top-4 right-4 flex items-center gap-3 z-30 print:hidden">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-yellow-500' : 'w-2 bg-slate-700'}`} />
              ))}
            </div>
            <button
              onClick={() => setStep(7)}
              className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition-all cursor-pointer"
            >
              Skip
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col justify-center items-center print:overflow-visible print:p-0">
          <AnimatePresence mode="wait">
            
            {/* Step 1: MATCH FINISHED */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.4 }}
                className="text-center py-12 flex flex-col items-center justify-center min-h-[300px]"
              >
                <div className="text-[12px] font-black uppercase tracking-[0.4em] text-yellow-500/70 mb-4 animate-pulse">WKF TOURNAMENT DIRECT</div>
                <div className="text-7xl font-extrabold text-slate-200 font-mono tracking-wider mb-6 bg-slate-950/40 px-8 py-4 rounded-2xl border border-slate-800/80">00:00</div>
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-500 to-blue-500 uppercase tracking-widest leading-none drop-shadow-lg"
                >
                  Match Finished
                </motion.h1>
                <p className="text-slate-400 mt-4 text-xs tracking-wider uppercase font-semibold">Freezing scoreboard &amp; verifying results...</p>
              </motion.div>
            )}

            {/* Step 2: COMPETITOR CARDS */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full py-6 flex flex-col md:flex-row gap-6 items-center justify-center min-h-[300px]"
              >
                {/* AO Card */}
                <motion.div
                  initial={{ x: -100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', damping: 20 }}
                  className="w-full md:w-80 bg-blue-950/40 border-2 border-blue-500/30 rounded-2xl p-6 flex flex-col items-center text-center shadow-lg relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600" />
                  <div className="w-24 h-24 rounded-full border-4 border-blue-500/50 bg-slate-800 flex items-center justify-center text-3xl font-black text-white shadow-inner mb-4 overflow-hidden">
                    {match.ao?.player?.photo_url ? (
                      <img src={match.ao.player.photo_url} alt={aoName} className="w-full h-full object-cover" />
                    ) : (
                      aoName.split(' ').map(n=>n[0]).join('')
                    )}
                  </div>
                  <div className="inline-block px-2.5 py-0.5 bg-blue-900/70 border border-blue-500/30 text-blue-300 rounded-full text-[9px] font-black uppercase tracking-widest mb-3">AO (BLUE)</div>
                  <h3 className="text-xl font-black text-slate-100 uppercase tracking-wide truncate max-w-full leading-tight">{aoName}</h3>
                  <p className="text-slate-400 text-xs font-semibold mt-1 flex items-center gap-1"><Shield size={12} className="text-blue-400" /> {aoDojo}</p>
                  {aoState && <p className="text-slate-500 text-[10px] mt-0.5 flex items-center gap-0.5"><MapPin size={10} /> {aoState}</p>}
                  {aoBelt && (
                    <div className="flex items-center gap-1.5 mt-3 px-2 py-0.5 rounded-md bg-slate-950/40 border border-slate-800">
                      <span className="w-2.5 h-2.5 rounded-full border border-black/40 shadow-sm" style={{ backgroundColor: aoBelt.hex }} />
                      <span className="text-[10px] font-bold text-slate-300">{aoBelt.name} Belt</span>
                    </div>
                  )}
                </motion.div>

                <div className="text-2xl font-black text-slate-700 font-mono tracking-widest">VS</div>

                {/* AKA Card */}
                <motion.div
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', damping: 20 }}
                  className="w-full md:w-80 bg-red-950/40 border-2 border-red-500/30 rounded-2xl p-6 flex flex-col items-center text-center shadow-lg relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
                  <div className="w-24 h-24 rounded-full border-4 border-red-500/50 bg-slate-800 flex items-center justify-center text-3xl font-black text-white shadow-inner mb-4 overflow-hidden">
                    {match.aka?.player?.photo_url ? (
                      <img src={match.aka.player.photo_url} alt={akaName} className="w-full h-full object-cover" />
                    ) : (
                      akaName.split(' ').map(n=>n[0]).join('')
                    )}
                  </div>
                  <div className="inline-block px-2.5 py-0.5 bg-red-900/70 border border-red-500/30 text-red-300 rounded-full text-[9px] font-black uppercase tracking-widest mb-3">AKA (RED)</div>
                  <h3 className="text-xl font-black text-slate-100 uppercase tracking-wide truncate max-w-full leading-tight">{akaName}</h3>
                  <p className="text-slate-400 text-xs font-semibold mt-1 flex items-center gap-1"><Shield size={12} className="text-red-400" /> {akaDojo}</p>
                  {akaState && <p className="text-slate-500 text-[10px] mt-0.5 flex items-center gap-0.5"><MapPin size={10} /> {akaState}</p>}
                  {akaBelt && (
                    <div className="flex items-center gap-1.5 mt-3 px-2 py-0.5 rounded-md bg-slate-950/40 border border-slate-800">
                      <span className="w-2.5 h-2.5 rounded-full border border-black/40 shadow-sm" style={{ backgroundColor: akaBelt.hex }} />
                      <span className="text-[10px] font-bold text-slate-300">{akaBelt.name} Belt</span>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* Step 3: WINNER HIGHLIGHT */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full py-6 flex flex-col md:flex-row gap-6 items-center justify-center min-h-[300px]"
              >
                {/* AO Card */}
                <div
                  className={`w-full md:w-80 rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-700 overflow-hidden relative ${
                    currentWinnerSide === 'ao'
                      ? 'bg-blue-900/50 border-4 border-blue-500 shadow-2xl scale-105 shadow-blue-500/20'
                      : 'bg-blue-950/10 border border-blue-950/20 opacity-30 scale-95'
                  }`}
                >
                  {currentWinnerSide === 'ao' && (
                    <div className="absolute top-3 right-3 text-2xl animate-bounce">👑</div>
                  )}
                  <div className="w-24 h-24 rounded-full border-4 border-blue-500/50 bg-slate-800 flex items-center justify-center text-3xl font-black text-white mb-4 overflow-hidden">
                    {match.ao?.player?.photo_url ? (
                      <img src={match.ao.player.photo_url} alt={aoName} className="w-full h-full object-cover" />
                    ) : (
                      aoName.split(' ').map(n=>n[0]).join('')
                    )}
                  </div>
                  <div className="inline-block px-2.5 py-0.5 bg-blue-900/70 border border-blue-500/30 text-blue-300 rounded-full text-[9px] font-black uppercase tracking-widest mb-3">AO (BLUE)</div>
                  <h3 className="text-xl font-black text-slate-100 uppercase tracking-wide truncate max-w-full leading-tight">{aoName}</h3>
                  <p className="text-slate-400 text-xs font-semibold mt-1">{aoDojo}</p>
                </div>

                <div className="text-2xl font-black text-slate-800 font-mono tracking-widest">VS</div>

                {/* AKA Card */}
                <div
                  className={`w-full md:w-80 rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-700 overflow-hidden relative ${
                    currentWinnerSide === 'aka'
                      ? 'bg-red-900/50 border-4 border-red-500 shadow-2xl scale-105 shadow-red-500/20'
                      : 'bg-red-950/10 border border-red-950/20 opacity-30 scale-95'
                  }`}
                >
                  {currentWinnerSide === 'aka' && (
                    <div className="absolute top-3 right-3 text-2xl animate-bounce">👑</div>
                  )}
                  <div className="w-24 h-24 rounded-full border-4 border-red-500/50 bg-slate-800 flex items-center justify-center text-3xl font-black text-white mb-4 overflow-hidden">
                    {match.aka?.player?.photo_url ? (
                      <img src={match.aka.player.photo_url} alt={akaName} className="w-full h-full object-cover" />
                    ) : (
                      akaName.split(' ').map(n=>n[0]).join('')
                    )}
                  </div>
                  <div className="inline-block px-2.5 py-0.5 bg-red-900/70 border border-red-500/30 text-red-300 rounded-full text-[9px] font-black uppercase tracking-widest mb-3">AKA (RED)</div>
                  <h3 className="text-xl font-black text-slate-100 uppercase tracking-wide truncate max-w-full leading-tight">{akaName}</h3>
                  <p className="text-slate-400 text-xs font-semibold mt-1">{akaDojo}</p>
                </div>
              </motion.div>
            )}

            {/* Step 4: TROPHY REVEAL */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                className="text-center py-8 flex flex-col items-center justify-center min-h-[300px]"
              >
                <div className="relative mb-6">
                  <motion.div 
                    animate={{ rotate: [0, 10, -10, 10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatType: 'mirror' }}
                    className="text-9xl filter drop-shadow-[0_0_35px_rgba(234,179,8,0.4)]"
                  >
                    🏆
                  </motion.div>
                  <div className={`absolute -inset-4 rounded-full border-4 border-dashed animate-spin duration-[8s] ${currentWinnerSide === 'ao' ? 'border-blue-500/40' : 'border-red-500/40'}`} />
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-yellow-500 uppercase tracking-wider mb-2">CHAMPION DECLARED</h2>
                <p className="text-slate-400 text-sm max-w-md mx-auto">Victory goes to the competitor who displayed exceptional speed, precision, and tactical superiority on the tatami!</p>
              </motion.div>
            )}

            {/* Step 5: WINNER BANNER */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 18 }}
                className="w-full max-w-xl mx-auto py-6 text-center"
              >
                <div className={`rounded-3xl overflow-hidden border-2 shadow-2xl relative bg-slate-950/50 ${currentWinnerSide === 'ao' ? 'border-blue-500/50' : 'border-red-500/50'}`}>
                  {/* Glowing background strip matching side */}
                  <div className={`h-28 w-full flex flex-col items-center justify-center p-4 text-white ${currentWinnerSide === 'ao' ? 'bg-gradient-to-r from-blue-700 to-blue-800' : 'bg-gradient-to-r from-red-700 to-red-800'}`}>
                    <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white/75 mb-1">🏆 MATCH RESULT 🏆</div>
                    <div className="px-3.5 py-0.5 bg-black/35 rounded-full text-[9px] font-black uppercase tracking-widest">
                      {currentWinnerSide === 'ao' ? 'Winner: AO (Blue)' : 'Winner: AKA (Red)'}
                    </div>
                  </div>

                  <div className="p-8">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-100 uppercase tracking-wide leading-tight mb-4">
                      {winnerName}
                    </h1>
                    <div className="flex flex-col gap-2 justify-center items-center text-slate-300">
                      <p className="text-sm font-semibold flex items-center gap-1.5">
                        <Shield size={14} className="text-yellow-500" />
                        Dojo: <span className="text-white font-bold">{winnerDojo}</span>
                      </p>
                      {winnerState && (
                        <p className="text-sm font-semibold flex items-center gap-1.5">
                          <MapPin size={14} className="text-yellow-500" />
                          State: <span className="text-white font-bold">{winnerState}</span>
                        </p>
                      )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-800 flex justify-center items-center gap-8">
                      <div className="text-center">
                        <div className="text-[10px] font-black uppercase tracking-wider text-blue-400 mb-1">AO SCORE</div>
                        <div className="text-4xl font-mono font-black text-slate-200">{aoScore}</div>
                      </div>
                      <div className="text-slate-600 font-bold text-xl font-mono">VS</div>
                      <div className="text-center">
                        <div className="text-[10px] font-black uppercase tracking-wider text-red-400 mb-1">AKA SCORE</div>
                        <div className="text-4xl font-mono font-black text-slate-200">{akaScore}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 6: POINT BREAKDOWN */}
            {step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-xl mx-auto py-4"
              >
                <div className="bg-slate-950/30 border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <div className="text-center mb-6">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500/70 mb-1">SCORE BREAKDOWN</div>
                    <div className="text-xl font-black text-slate-200">POINT STATISTICS</div>
                  </div>

                  <div className="space-y-4">
                    {/* Headers */}
                    <div className="grid grid-cols-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <div className="text-blue-400">AO</div>
                      <div>TECHNIQUE</div>
                      <div className="text-red-400">AKA</div>
                    </div>

                    {/* Ippon */}
                    <div className="grid grid-cols-3 items-center text-center py-2.5 border-t border-slate-800/60">
                      <div className="text-2xl font-mono font-black text-slate-200">{aoIppon}</div>
                      <div className="text-xs font-black text-slate-400">Ippon <span className="text-[9px] text-slate-500 font-mono">(3 pts)</span></div>
                      <div className="text-2xl font-mono font-black text-slate-200">{akaIppon}</div>
                    </div>

                    {/* Waza-ari */}
                    <div className="grid grid-cols-3 items-center text-center py-2.5 border-t border-slate-800/60">
                      <div className="text-2xl font-mono font-black text-slate-200">{aoWazaAri}</div>
                      <div className="text-xs font-black text-slate-400">Waza-ari <span className="text-[9px] text-slate-500 font-mono">(2 pts)</span></div>
                      <div className="text-2xl font-mono font-black text-slate-200">{akaWazaAri}</div>
                    </div>

                    {/* Yuko */}
                    <div className="grid grid-cols-3 items-center text-center py-2.5 border-t border-slate-800/60">
                      <div className="text-2xl font-mono font-black text-slate-200">{aoYuko}</div>
                      <div className="text-xs font-black text-slate-400">Yuko <span className="text-[9px] text-slate-500 font-mono">(1 pt)</span></div>
                      <div className="text-2xl font-mono font-black text-slate-200">{akaYuko}</div>
                    </div>

                    {/* Bonus points */}
                    <div className="grid grid-cols-3 items-center text-center py-2.5 border-t border-slate-800/60">
                      <div className="text-lg font-mono font-bold text-slate-400">+{aoBonusPoints}</div>
                      <div className="text-xs font-black text-slate-400">Bonus Points</div>
                      <div className="text-lg font-mono font-bold text-slate-400">+{akaBonusPoints}</div>
                    </div>

                    {/* Senshu */}
                    <div className="grid grid-cols-3 items-center text-center py-2.5 border-t border-slate-800/60">
                      <div>
                        {senshu === 'ao' ? (
                          <span className="px-2 py-0.5 bg-yellow-500 text-slate-950 text-[9px] font-black rounded-full uppercase tracking-wider">SENSHU</span>
                        ) : (
                          <span className="text-slate-600 font-bold">—</span>
                        )}
                      </div>
                      <div className="text-xs font-black text-slate-400">Senshu (First Pt)</div>
                      <div>
                        {senshu === 'aka' ? (
                          <span className="px-2 py-0.5 bg-yellow-500 text-slate-950 text-[9px] font-black rounded-full uppercase tracking-wider">SENSHU</span>
                        ) : (
                          <span className="text-slate-600 font-bold">—</span>
                        )}
                      </div>
                    </div>

                    {/* Penalties */}
                    <div className="grid grid-cols-3 items-center text-center py-2.5 border-t border-slate-800/60">
                      <div className={`text-lg font-bold font-mono ${aoPenalties.length > 0 ? 'text-amber-500' : 'text-slate-500'}`}>{aoPenalties.length}</div>
                      <div className="text-xs font-black text-slate-400">Penalties</div>
                      <div className={`text-lg font-bold font-mono ${akaPenalties.length > 0 ? 'text-amber-500' : 'text-slate-500'}`}>{akaPenalties.length}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 7: ADVANCED ANALYTICS & CONTROLS (PERSISTENT) */}
            {step === 7 && (
              <motion.div
                key="step7"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-4xl mx-auto flex flex-col gap-6 print:gap-4 print:max-w-none"
              >
                
                {/* Print layout header (visible only in print) */}
                <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-4">
                  <h1 className="text-3xl font-black uppercase tracking-wider text-slate-900">🏆 OFFICIAL MATCH REPORT 🏆</h1>
                  <p className="text-sm font-bold text-slate-600 mt-1">TKMAA KARATE TOURNAMENT DIRECT</p>
                  <p className="text-xs text-slate-500 mt-0.5">Date &amp; Time: {new Date().toLocaleString()}</p>
                </div>

                {/* Main analytical grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
                  
                  {/* Left Column: Ao Side Details */}
                  <div className="bg-slate-900/60 border border-blue-500/20 rounded-2xl p-5 relative overflow-hidden print:border-slate-300 print:bg-white print:text-slate-900">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">AO (BLUE)</span>
                      {currentWinnerSide === 'ao' && <Trophy size={14} className="text-yellow-500" />}
                    </div>
                    <h3 className="text-lg font-black text-slate-200 uppercase truncate print:text-slate-900">{aoName}</h3>
                    <p className="text-slate-400 text-xs font-semibold mt-0.5 print:text-slate-600">{aoDojo}</p>
                    
                    <div className="mt-5 space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-800/60 print:border-slate-200">
                        <span className="text-slate-500">Ippon</span>
                        <span className="font-bold text-slate-300 print:text-slate-900 font-mono">{aoIppon} (×3)</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/60 print:border-slate-200">
                        <span className="text-slate-500">Waza-ari</span>
                        <span className="font-bold text-slate-300 print:text-slate-900 font-mono">{aoWazaAri} (×2)</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/60 print:border-slate-200">
                        <span className="text-slate-500">Yuko</span>
                        <span className="font-bold text-slate-300 print:text-slate-900 font-mono">{aoYuko} (×1)</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/60 print:border-slate-200">
                        <span className="text-slate-500">Bonus Points</span>
                        <span className="font-bold text-slate-300 print:text-slate-900 font-mono">+{aoBonusPoints}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/60 print:border-slate-200">
                        <span className="text-slate-500">Senshu Advantage</span>
                        <span className="font-bold text-slate-300 print:text-slate-900">{senshu === 'ao' ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Penalties</span>
                        <span className={`font-bold font-mono ${aoPenalties.length > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{aoPenalties.join(', ') || '0'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Center Column: Overview / Quick stats */}
                  <div className="flex flex-col gap-6 print:gap-4 justify-between">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center flex-1 flex flex-col justify-center items-center print:border-slate-300 print:bg-white print:text-slate-900">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">FINAL SCORE</span>
                      <div className="flex items-center gap-4 justify-center">
                        <div className="text-center">
                          <span className="text-xs font-bold text-blue-400 block mb-0.5">AO</span>
                          <span className="text-4xl font-mono font-black text-slate-200 print:text-slate-900">{aoScore}</span>
                        </div>
                        <span className="text-slate-600 font-black text-xl">:</span>
                        <div className="text-center">
                          <span className="text-xs font-bold text-red-400 block mb-0.5">AKA</span>
                          <span className="text-4xl font-mono font-black text-slate-200 print:text-slate-900">{akaScore}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/60 w-full text-xs text-slate-400 flex flex-col gap-1 print:border-slate-200 print:text-slate-600">
                        <p>Category: <span className="font-bold text-slate-300 print:text-slate-900">{match.category || 'Kumite'}</span></p>
                        <p>Duration: <span className="font-bold text-slate-300 print:text-slate-900">{formatSecs(matchDuration)}</span></p>
                        {extraTimeUsed > 0 && <p className="text-orange-400">Extra Time: <span className="font-bold">+{formatSecs(extraTimeUsed)}</span></p>}
                        <p className="mt-1">
                          Win Method: <span className="font-bold text-yellow-500/80 uppercase text-[10px] tracking-wider">
                            {winMethod === 'score' && 'Points Decision'}
                            {winMethod === 'senshu' && 'Senshu Advantage'}
                            {winMethod === 'referee_decision' && 'Referee Decision (Hantei)'}
                            {winMethod === 'disqualification' && 'Disqualification'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Equal Score Hantei (Referee decision override) */}
                    {aoScore === akaScore && !senshu && (
                      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 text-center print:hidden">
                        <span className="text-[10px] font-black text-yellow-500 uppercase tracking-wider block mb-2">Tie Match: Referee Decision (Hantei)</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setWinnerOverride('ao'); playSound('whistle'); }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer border transition-all ${
                              currentWinnerSide === 'ao' 
                                ? 'bg-blue-600 text-white border-blue-500' 
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            Award AO
                          </button>
                          <button 
                            onClick={() => { setWinnerOverride('aka'); playSound('whistle'); }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer border transition-all ${
                              currentWinnerSide === 'aka' 
                                ? 'bg-red-600 text-white border-red-500' 
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            Award AKA
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Aka Side Details */}
                  <div className="bg-slate-900/60 border border-red-500/20 rounded-2xl p-5 relative overflow-hidden print:border-slate-300 print:bg-white print:text-slate-900">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">AKA (RED)</span>
                      {currentWinnerSide === 'aka' && <Trophy size={14} className="text-yellow-500" />}
                    </div>
                    <h3 className="text-lg font-black text-slate-200 uppercase truncate print:text-slate-900">{akaName}</h3>
                    <p className="text-slate-400 text-xs font-semibold mt-0.5 print:text-slate-600">{akaDojo}</p>
                    
                    <div className="mt-5 space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-800/60 print:border-slate-200">
                        <span className="text-slate-500">Ippon</span>
                        <span className="font-bold text-slate-300 print:text-slate-900 font-mono">{akaIppon} (×3)</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/60 print:border-slate-200">
                        <span className="text-slate-500">Waza-ari</span>
                        <span className="font-bold text-slate-300 print:text-slate-900 font-mono">{akaWazaAri} (×2)</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/60 print:border-slate-200">
                        <span className="text-slate-500">Yuko</span>
                        <span className="font-bold text-slate-300 print:text-slate-900 font-mono">{akaYuko} (×1)</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/60 print:border-slate-200">
                        <span className="text-slate-500">Bonus Points</span>
                        <span className="font-bold text-slate-300 print:text-slate-900 font-mono">+{akaBonusPoints}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/60 print:border-slate-200">
                        <span className="text-slate-500">Senshu Advantage</span>
                        <span className="font-bold text-slate-300 print:text-slate-900">{senshu === 'aka' ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Penalties</span>
                        <span className={`font-bold font-mono ${akaPenalties.length > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{akaPenalties.join(', ') || '0'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analytics Block */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 print:border-slate-300 print:bg-white print:text-slate-900">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <BarChart2 size={12} className="text-yellow-500" /> ADVANCED ANALYTICS
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60 print:border-slate-200 print:bg-white">
                      <span className="text-[9px] text-slate-500 font-bold block">TOTAL TECHNIQUES</span>
                      <span className="text-xl font-black text-slate-200 font-mono print:text-slate-900">{totalTechAo + totalTechAka}</span>
                      <span className="text-[8px] text-slate-500 block mt-0.5">{totalTechAo} AO vs {totalTechAka} AKA</span>
                    </div>
                    <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60 print:border-slate-200 print:bg-white">
                      <span className="text-[9px] text-slate-500 font-bold block">WINNING MARGIN</span>
                      <span className="text-xl font-black text-slate-200 font-mono print:text-slate-900">{winningMargin} pt{winningMargin !== 1 && 's'}</span>
                      <span className="text-[8px] text-slate-500 block mt-0.5">Final: {aoScore}-{akaScore}</span>
                    </div>
                    <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60 print:border-slate-200 print:bg-white">
                      <span className="text-[9px] text-slate-500 font-bold block">PENALTY RATIO</span>
                      <span className="text-xl font-black text-slate-200 font-mono print:text-slate-900">{aoPenalties.length}:{akaPenalties.length}</span>
                      <span className="text-[8px] text-slate-500 block mt-0.5">AO vs AKA penalties</span>
                    </div>
                    <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60 print:border-slate-200 print:bg-white">
                      <span className="text-[9px] text-slate-500 font-bold block">COMPETITIVE INTENSITY</span>
                      <span className="text-xl font-black text-slate-200 font-mono print:text-slate-900 flex items-center justify-center gap-1">
                        <Zap size={14} className="text-amber-400" />
                        {((totalTechAo + totalTechAka) / (matchDuration / 60)).toFixed(1)}/min
                      </span>
                      <span className="text-[8px] text-slate-500 block mt-0.5">Techniques per minute</span>
                    </div>
                  </div>
                </div>

                {/* Print signatures (visible only in print) */}
                <div className="hidden print:grid grid-cols-2 gap-16 mt-20 pt-8 border-t border-dashed border-slate-300 text-center text-xs font-bold text-slate-800">
                  <div>
                    <div className="border-t border-slate-400 pt-2 w-48 mx-auto">Chief Referee Signature</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 pt-2 w-48 mx-auto">Tournament Registrar Signature</div>
                  </div>
                </div>

                {/* Controls (hidden in print) */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center mt-4 border-t border-slate-800 pt-6 print:hidden">
                  {/* Language selection for announcements */}
                  <div className="flex items-center gap-2 bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-800/60">
                    <Volume2 size={14} className="text-yellow-500" />
                    <span className="text-[10px] text-slate-500 font-black uppercase">Voice:</span>
                    <select 
                      value={selectedLang}
                      onChange={(e) => setSelectedLang(e.target.value)}
                      className="bg-transparent text-slate-300 text-xs font-bold focus:outline-none border-none cursor-pointer"
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-300">{lang.label}</option>
                      ))}
                    </select>
                    <button 
                      onClick={announceWinner}
                      className="ml-1 p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Announce Again"
                    >
                      <Zap size={12} />
                    </button>
                  </div>

                  {/* Buttons group */}
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={handleReplay}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RotateCcw size={12} /> Replay Ceremony
                    </button>

                    <button
                      onClick={handlePrint}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Printer size={12} /> Print Result
                    </button>

                    <button
                      onClick={onClose}
                      className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-yellow-500/10 active:scale-95"
                    >
                      Next Match <ArrowRight size={12} />
                    </button>
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
