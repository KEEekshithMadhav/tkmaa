"use client"
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, ChevronUp, ChevronDown, RotateCcw, Loader2, Save, ChevronLeft, Maximize2, Minimize2, Eye, EyeOff, Sliders, Users, HelpCircle, Volume2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

function KataScoreboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const tournamentId = searchParams.get('tournamentId')
  const categoryParam = searchParams.get('category')
  const roundParam = parseInt(searchParams.get('round') || '1', 10)
  const studentIdParam = searchParams.get('studentId')

  // Scoreboard State
  const [activeStudentId, setActiveStudentId] = useState(studentIdParam)
  const [category, setCategory] = useState(categoryParam || '')
  const [round, setRound] = useState(roundParam)
  
  // Data State
  const [tournament, setTournament] = useState(null)
  const [activeStudent, setActiveStudent] = useState(null)
  const [performance, setPerformance] = useState(null)
  const [allCompetitors, setAllCompetitors] = useState([])
  const [loading, setLoading] = useState(true)

  // Animation Stage
  // 0: Competitor Details Ready
  // 1: Reveal Judge Scores (individual animation)
  // 2: Discard High/Low Scores (red diagonal strike-through)
  // 3: Reveal Final Calculated Total Score (gold glow + chime)
  const [animationStage, setAnimationStage] = useState(0)

  // Manual & Scoring Panel State (collapsible coordinator controls)
  const [showControlPanel, setShowControlPanel] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Coordinator Score Input Form (for live scoring fallback/alternative)
  const [kataName, setKataName] = useState('')
  const [judgeCount, setJudgeCount] = useState(5)
  const [scores, setScores] = useState([7.0, 7.0, 7.0, 7.0, 7.0])
  const [savingScore, setSavingScore] = useState(false)

  // Real-time synchronization lock
  const lastSyncTimeRef = useRef(0)

  // Load Tournament Details
  useEffect(() => {
    async function loadTournament() {
      if (!tournamentId) return
      const { data } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .maybeSingle()
      if (data) {
        setTournament(data)
      }
    }
    loadTournament()
  }, [tournamentId])

  // Load Competitors & Performances
  useEffect(() => {
    if (tournamentId && category) {
      fetchCompetitorsAndPerformances()
    }
  }, [tournamentId, category, round])

  const fetchCompetitorsAndPerformances = async () => {
    try {
      // Fetch all registered participants in this category
      const { data: participants, error: pError } = await supabase
        .from('tournament_participants')
        .select(`
          student_id,
          students (
            id,
            users (full_name),
            branches (name),
            belt_levels (name, hex, order_rank)
          )
        `)
        .eq('tournament_id', tournamentId)
        .eq('category', category)

      if (pError) throw pError

      const competitorsList = participants?.map(p => p.students).filter(Boolean) || []
      setAllCompetitors(competitorsList)

      // Fetch performances for this category and round
      const { data: performances, error: perfError } = await supabase
        .from('tournament_kata_performances')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('category', category)
        .eq('round', round)

      if (perfError) throw perfError

      // Map performances to competitors
      const mapped = competitorsList.map(comp => {
        const perf = performances?.find(row => row.student_id === comp.id)
        return {
          student: comp,
          performance: perf || null,
          hasPerformance: !!perf,
          status: perf?.status || 'pending',
          total_score: perf?.total_score || 0
        }
      })

      // Sort by total score descending (highest first), secondary sorting by name
      mapped.sort((a, b) => {
        if (b.total_score !== a.total_score) {
          return b.total_score - a.total_score
        }
        return (a.student.users?.full_name || '').localeCompare(b.student.users?.full_name || '')
      })

      // Update current active student details
      const targetId = activeStudentId || competitorsList[0]?.id
      if (targetId) {
        const match = mapped.find(item => item.student.id === targetId)
        if (match) {
          setActiveStudent(match.student)
          setPerformance(match.performance)
          setKataName(match.performance?.kata_name || '')
          const count = match.performance?.judge_scores?.length || 5
          setJudgeCount(count)
          setScores(match.performance?.judge_scores || Array.from({ length: count }, () => 7.0))
          
          // Automatically advance stage to 3 if already completed
          if (match.performance?.status === 'completed' && animationStage === 0) {
            setAnimationStage(3)
          }
        }
      }
    } catch (err) {
      console.error('Failed to load scoreboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle active student change
  useEffect(() => {
    if (activeStudentId && allCompetitors.length > 0) {
      const student = allCompetitors.find(c => c.id === activeStudentId)
      if (student) {
        setActiveStudent(student)
        setAnimationStage(0) // Reset animations for new competitor
        fetchCompetitorsAndPerformances()
      }
    }
  }, [activeStudentId])

  // Realtime Supabase Subscription
  useEffect(() => {
    if (!tournamentId) return

    const channel = supabase
      .channel('kata_scoreboard_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_kata_performances',
        filter: `tournament_id=eq.${tournamentId}`
      }, (payload) => {
        const now = Date.now()
        // Simple throttle to prevent double triggers
        if (now - lastSyncTimeRef.current > 500) {
          lastSyncTimeRef.current = now
          fetchCompetitorsAndPerformances()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tournamentId, category, round, activeStudentId])

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return
      
      switch (e.key) {
        case ' ':
          e.preventDefault()
          // Advance animation stage
          setAnimationStage(prev => {
            const next = prev < 3 ? prev + 1 : 3
            if (next === 3) playChime()
            return next
          })
          break
        case 'ArrowRight':
          e.preventDefault()
          setAnimationStage(prev => {
            const next = prev < 3 ? prev + 1 : 3
            if (next === 3) playChime()
            return next
          })
          break
        case 'ArrowLeft':
          e.preventDefault()
          setAnimationStage(prev => (prev > 0 ? prev - 1 : 0))
          break
        case 'r':
        case 'R':
          // Reset stage to 0
          setAnimationStage(0)
          break
        case 'c':
        case 'C':
          // Toggle control panel
          setShowControlPanel(p => !p)
          break
        case 'f':
        case 'F':
          // Toggle fullscreen
          toggleFullscreen()
          break
        case 'h':
        case 'H':
          // Toggle help
          setShowHelpModal(m => !m)
          break
        case 'b':
        case 'B':
          // Play buzzer
          playBuzzer()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Audio effects
  const playBuzzer = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.connect(g)
      g.connect(ctx.destination)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(110, ctx.currentTime)
      g.gain.setValueAtTime(0.4, ctx.currentTime)
      osc.start()
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5)
      osc.stop(ctx.currentTime + 1.5)
    } catch (e) {}
  }

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.connect(g)
      g.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      g.gain.setValueAtTime(0.3, ctx.currentTime)
      osc.start()
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2)
      osc.stop(ctx.currentTime + 1.2)
    } catch (e) {}
  }

  // WKF exclusion logic
  const getDiscards = () => {
    if (scores.length < 3) return []
    const indexed = scores.map((val, idx) => ({ val, idx }))
    indexed.sort((a, b) => a.val - b.val)
    
    const discards = []
    if (judgeCount === 5) {
      discards.push(indexed[0].idx)
      discards.push(indexed[4].idx)
    } else if (judgeCount === 7) {
      discards.push(indexed[0].idx)
      discards.push(indexed[1].idx)
      discards.push(indexed[5].idx)
      discards.push(indexed[6].idx)
    }
    return discards
  }

  const calculateTotal = () => {
    if (scores.length < 3) return 0
    const sorted = [...scores].sort((a, b) => a - b)
    let toSum = []
    if (judgeCount === 3) {
      toSum = sorted
    } else if (judgeCount === 5) {
      toSum = sorted.slice(1, 4)
    } else if (judgeCount === 7) {
      toSum = sorted.slice(2, 5)
    }
    const sum = toSum.reduce((acc, curr) => acc + curr, 0)
    return parseFloat(sum.toFixed(2))
  }

  const discardIndexes = animationStage >= 2 ? getDiscards() : []
  const totalScore = calculateTotal()

  // Fullscreen controller
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Save score directly from scoreboard control panel (coordinator override/standalone mode)
  const handleSaveScores = async () => {
    if (!activeStudentId) return
    if (!kataName.trim()) {
      toast.error('Please specify a Kata Name.')
      return
    }

    setSavingScore(true)
    const toastId = toast.loading('Syncing Kata scores to database...')
    try {
      const scoreTotal = calculateTotal()
      
      if (performance?.id) {
        const { error } = await supabase
          .from('tournament_kata_performances')
          .update({
            kata_name: kataName,
            judge_scores: scores,
            total_score: scoreTotal,
            status: 'completed'
          })
          .eq('id', performance.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('tournament_kata_performances')
          .insert([{
            tournament_id: tournamentId,
            category: category,
            round: round,
            student_id: activeStudentId,
            kata_name: kataName,
            judge_scores: scores,
            total_score: scoreTotal,
            status: 'completed'
          }])
        if (error) throw error
      }

      toast.success('Scores synchronized successfully!', { id: toastId })
      setAnimationStage(3) // Jump to final stage
      await fetchCompetitorsAndPerformances()
    } catch (e) {
      toast.error('Failed to sync scores: ' + e.message, { id: toastId })
    } finally {
      setSavingScore(false)
    }
  }

  const handleScoreChange = (idx, value) => {
    const updated = [...scores]
    updated[idx] = parseFloat(value) || 0.0
    setScores(updated)
  }

  const changeJudgeCount = (count) => {
    setJudgeCount(count)
    setScores(Array.from({ length: count }, (_, i) => scores[i] || 7.0))
  }

  if (loading) {
    return (
      <div className="w-screen h-screen bg-[#071420] flex flex-col items-center justify-center gap-4 text-white">
        <Loader2 className="animate-spin text-[#C5A059]" size={48} />
        <span className="text-sm uppercase font-mono tracking-widest text-[#C5A059]/70 animate-pulse">
          Loading electronic scoreboard...
        </span>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen flex overflow-hidden select-none bg-[#071420] text-white relative font-sans">
      {/* Decorative Nebula Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-blue-900/10 blur-[140px] -top-96 -left-96" />
        <div className="absolute w-[800px] h-[800px] rounded-full bg-[#C5A059]/5 blur-[160px] -bottom-96 -right-96" />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '16px 16px' }}
        />
      </div>

      {/* LEFT PRESENTATION MAIN BOARD (Presenter Mode) */}
      <div className="flex-1 flex flex-col h-full z-10 p-6 relative">
        {/* TOP STATUS BAR */}
        <div className="flex justify-between items-center bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-3 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { if (confirm('Leave scoreboard?')) router.back() }}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} /> Exit
            </button>
            <div className="h-4 w-px bg-white/20" />
            <span className="text-[#C5A059] font-black text-xs uppercase tracking-widest font-mono">
              {tournament?.title || 'Karate Tournament'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Stage indicator pill */}
            <div className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[9px] uppercase tracking-widest font-mono text-gray-400">
              Stage: {animationStage === 0 ? 'READY' : animationStage === 1 ? 'REVEAL SCORES' : animationStage === 2 ? 'EXCLUDED' : 'FINAL TOTAL'}
            </div>
            
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 cursor-pointer text-gray-300 hover:text-white"
              title="Help & Shortcuts (H)"
            >
              <HelpCircle size={16} />
            </button>

            <button
              onClick={() => setShowControlPanel(c => !c)}
              className={`p-2 rounded-xl transition-all border cursor-pointer ${
                showControlPanel 
                  ? 'bg-[#C5A059] border-[#C5A059] text-[#0A1F30]' 
                  : 'bg-white/5 border-white/5 text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              title="Toggle Control Panel (C)"
            >
              <Sliders size={16} />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 cursor-pointer text-gray-300 hover:text-white"
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* COMPETITOR CARD & PERFORMANCE DETAILS */}
        <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full gap-8">
          
          <div className="text-center space-y-1">
            <span className="text-[#C5A059] text-xs font-black uppercase tracking-[0.3em] font-mono">
              KATA DIVISION · ROUND {round}
            </span>
            <h1 className="text-white text-3xl md:text-4xl font-black uppercase tracking-wider">
              {category}
            </h1>
          </div>

          {activeStudent ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/35 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-8"
            >
              {/* Belt colored ring */}
              <div 
                className="w-24 h-24 rounded-full border-4 flex items-center justify-center bg-black/60 shadow-inner relative flex-shrink-0"
                style={{ borderColor: activeStudent.belt_levels?.hex || '#ffffff' }}
              >
                <div className="text-2xl font-black text-white/90">
                  {activeStudent.users?.full_name?.split(' ').map(n=>n[0]).join('') || 'K'}
                </div>
                {/* Small indicator */}
                <div 
                  className="absolute bottom-0 right-0 h-4 w-4 rounded-full border border-black/80 shadow-md"
                  style={{ backgroundColor: activeStudent.belt_levels?.hex || '#fff' }}
                />
              </div>

              {/* Competitor Profile info */}
              <div className="flex-1 text-center md:text-left space-y-2">
                <span className="text-[#C5A059] text-[10px] font-black uppercase tracking-[0.25em] font-mono bg-[#C5A059]/10 px-3 py-1 rounded-full border border-[#C5A059]/15">
                  {activeStudent.belt_levels?.name || 'White'} Belt
                </span>
                <h2 className="text-white text-3xl md:text-5xl font-black uppercase tracking-wider mt-1.5 leading-tight">
                  {activeStudent.users?.full_name}
                </h2>
                <div className="text-gray-400 text-sm font-semibold flex flex-col sm:flex-row gap-2 justify-center md:justify-start items-center">
                  <span>Dojo/Branch: <strong className="text-white">{activeStudent.branches?.name || 'N/A'}</strong></span>
                  <span className="hidden sm:inline text-white/20">|</span>
                  <span>Rank: <strong className="text-white">#{activeStudent.belt_levels?.order_rank || 1}</strong></span>
                </div>
              </div>

              {/* Kata name display */}
              <div className="bg-[#C5A059]/5 border border-[#C5A059]/15 rounded-2xl px-6 py-4 flex flex-col items-center justify-center min-w-[200px] text-center">
                <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-widest font-mono">
                  Kata Form
                </span>
                <span className="text-white text-lg font-mono uppercase tracking-wider mt-1 block">
                  {kataName || <span className="text-gray-500 italic">Pending...</span>}
                </span>
              </div>
            </motion.div>
          ) : (
            <div className="text-center p-12 bg-black/40 rounded-3xl border border-white/10">
              <p className="text-gray-400 text-sm uppercase font-mono font-bold">No active competitor selected</p>
            </div>
          )}

          {/* SCORES BOARD */}
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.25em] font-mono">
                Judge Panel Scores ({judgeCount} Judges)
              </span>
            </div>

            <div className="flex flex-wrap gap-4 items-center justify-center">
              {Array.from({ length: judgeCount }).map((_, idx) => {
                const isDiscarded = discardIndexes.includes(idx)
                const isRevealed = animationStage >= 1
                const scoreValue = scores[idx]

                return (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`h-24 w-24 sm:h-28 sm:w-28 bg-black/30 backdrop-blur-xl border rounded-2xl flex flex-col items-center justify-center relative shadow-lg ${
                      isDiscarded
                        ? 'border-red-500/40 bg-red-950/20 opacity-40 transition-all duration-300'
                        : isRevealed
                        ? 'border-[#C5A059]/40 bg-[#C5A059]/5'
                        : 'border-white/10'
                    }`}
                  >
                    {/* Judge Label */}
                    <span className="text-[9px] font-mono uppercase text-gray-400 font-black absolute top-2">
                      J{idx + 1}
                    </span>

                    {/* Score Value */}
                    <AnimatePresence mode="wait">
                      {isRevealed ? (
                        <motion.span
                          key={scoreValue}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className={`text-2xl sm:text-3xl font-black font-mono leading-none ${
                            isDiscarded ? 'text-red-500 line-through' : 'text-white'
                          }`}
                        >
                          {scoreValue.toFixed(1)}
                        </motion.span>
                      ) : (
                        <span className="text-2xl sm:text-3xl font-black font-mono text-white/20">—</span>
                      )}
                    </AnimatePresence>

                    {/* Animated Line Strikeout SVG overlay */}
                    {isDiscarded && (
                      <motion.svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <line 
                          x1="10%" y1="90%" x2="90%" y2="10%" 
                          stroke="#ef4444" strokeWidth="4" 
                          strokeLinecap="round" 
                        />
                      </motion.svg>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* FINAL TOTAL CONTAINER */}
          <AnimatePresence>
            {animationStage >= 3 && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 15 }}
                className="flex justify-center mt-2"
              >
                <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/20 to-amber-500/10 border-2 border-[#C5A059]/50 shadow-[0_0_35px_rgba(197,160,89,0.25)] rounded-2xl px-12 py-5 flex items-center gap-8 relative overflow-hidden">
                  <div className="absolute top-0 bottom-0 left-0 right-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'repeating-linear-gradient(90deg, #fff 0, #fff 1px, transparent 0, transparent 10%)', backgroundSize: '8px' }}
                  />
                  
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase font-mono tracking-[0.3em] text-[#C5A059]">
                      WKF OFFICIAL SCORE
                    </span>
                    <span className="text-white text-xs font-bold font-mono mt-0.5">
                      {judgeCount === 3 
                        ? 'Sum of all scores' 
                        : judgeCount === 5 
                        ? 'Highest / Lowest dropped' 
                        : '2 Highest / 2 Lowest dropped'}
                    </span>
                  </div>

                  <div className="h-10 w-px bg-white/20" />

                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black font-mono text-yellow-400 tracking-wider">
                      {totalScore.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-yellow-400/80 font-black uppercase font-mono tracking-widest">
                      PTS
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* BOTTOM SHORTCUT TIP BAR */}
        <div className="mt-auto flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-widest font-mono border-t border-white/5 pt-4">
          <span>TKMAA Karate Scoring System</span>
          <div className="flex gap-4">
            <span>[Space/Right Arrow] Next Stage</span>
            <span>[Left Arrow] Prev Stage</span>
            <span>[R] Reset Board</span>
            <span>[C] Toggle Controls</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR PANEL (Coordinator Controls & Selector) */}
      <AnimatePresence>
        {showControlPanel && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="w-[320px] h-full bg-[#0d1f30] border-l border-white/10 z-20 flex flex-col p-5 shadow-2xl relative"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-5">
              <h3 className="font-mono text-xs font-black uppercase tracking-widest text-[#C5A059]">
                Mat Coordinator Controls
              </h3>
              <button
                onClick={() => setShowControlPanel(false)}
                className="text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Content list */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              
              {/* Animation Stage Controls */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-mono block">
                  1. Board Animation Step
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { stage: 0, label: '0. Ready' },
                    { stage: 1, label: '1. Scores' },
                    { stage: 2, label: '2. Drop' },
                    { stage: 3, label: '3. Total' }
                  ].map(({ stage, label }) => (
                    <button
                      key={stage}
                      onClick={() => {
                        setAnimationStage(stage)
                        if (stage === 3) playChime()
                      }}
                      className={`py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer border ${
                        animationStage === stage
                          ? 'bg-[#C5A059] border-[#C5A059] text-[#0A1F30] font-black'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* sound actions */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-mono block">
                  2. Audio Signal Trigger
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={playBuzzer}
                    className="flex-1 py-2 bg-red-950/20 border border-red-500/30 text-red-400 hover:bg-red-900/20 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <Volume2 size={12} /> Buzzer (B)
                  </button>
                  <button
                    onClick={playChime}
                    className="flex-1 py-2 bg-yellow-950/20 border border-[#C5A059]/30 text-yellow-400 hover:bg-yellow-900/20 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <Volume2 size={12} /> Chime
                  </button>
                </div>
              </div>

              {/* Registered Competitor selector */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-mono block">
                  3. Select Active Competitor
                </span>
                
                <div className="bg-black/25 rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5 max-h-40 overflow-y-auto">
                  {allCompetitors.length === 0 ? (
                    <p className="p-4 text-center text-xs text-gray-500 font-mono">No competitors found</p>
                  ) : (
                    allCompetitors.map(comp => {
                      const isActive = comp.id === activeStudentId
                      return (
                        <button
                          key={comp.id}
                          onClick={() => setActiveStudentId(comp.id)}
                          className={`w-full text-left p-2.5 transition-colors block text-xs cursor-pointer ${
                            isActive
                              ? 'bg-[#C5A059]/10 text-white font-bold'
                              : 'text-gray-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="font-black uppercase">{comp.users?.full_name}</div>
                          <div className="text-[9px] text-[#C5A059]/70 mt-0.5 font-mono">{comp.branches?.name || 'Main Dojo'}</div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Direct Scoring panel */}
              <div className="space-y-3 border-t border-white/10 pt-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#C5A059] font-mono block">
                  4. Score Entry Sheet
                </span>

                <div className="space-y-2 text-xs">
                  <div className="space-y-1">
                    <label className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Kata Name</label>
                    <input
                      type="text"
                      value={kataName}
                      onChange={e => setKataName(e.target.value)}
                      placeholder="e.g. Bassai Dai"
                      className="w-full bg-black/40 border border-white/10 rounded-lg h-9 px-3 text-xs outline-none focus:border-[#C5A059] font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 text-[10px] uppercase font-bold tracking-wider block">Panel Size</label>
                    <div className="flex gap-1">
                      {[3, 5, 7].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => changeJudgeCount(c)}
                          className={`flex-1 py-1 rounded border text-[10px] font-black transition-all cursor-pointer ${
                            judgeCount === c 
                              ? 'bg-[#C5A059] border-[#C5A059] text-[#0A1F30]' 
                              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          {c} J
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-gray-400 text-[10px] uppercase font-bold tracking-wider block">Individual scores</label>
                    <div className="grid grid-cols-3 gap-2">
                      {scores.map((s, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-0.5">
                          <span className="text-[8px] font-mono text-gray-500 font-black">J{idx + 1}</span>
                          <input
                            type="number"
                            step="0.1"
                            min="5.0"
                            max="10.0"
                            value={s}
                            onChange={e => handleScoreChange(idx, e.target.value)}
                            className="w-full text-center h-8 bg-black/40 border border-white/10 rounded text-xs font-black text-white focus:border-[#C5A059] outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-black/50 rounded-xl p-3 border border-white/5 flex justify-between items-center mt-3">
                    <div className="flex flex-col text-left">
                      <span className="text-[8px] uppercase tracking-wider text-gray-400 font-bold block">Live total</span>
                      <span className="text-[9px] text-[#C5A059] font-black tracking-widest font-mono">WKF STANDARD</span>
                    </div>
                    <span className="text-xl font-black font-mono text-[#C5A059]">{totalScore.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={handleSaveScores}
                    disabled={savingScore}
                    className="w-full mt-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {savingScore ? 'Syncing...' : 'Save & Sync to DB'}
                  </button>

                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HELP SHORTCUTS MODAL */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0A1F30] border-2 border-white/10 max-w-sm w-full rounded-2xl p-6 shadow-2xl relative text-left"
            >
              <h3 className="font-mono text-sm font-black uppercase text-[#C5A059] tracking-wider mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                <HelpCircle size={16} /> Keyboard Shortcuts
              </h3>
              
              <div className="space-y-3 font-mono text-xs text-gray-300">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>[Space] / [→]</span>
                  <span className="text-white font-bold">Next Stage</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>[←] Arrow</span>
                  <span className="text-white font-bold">Prev Stage</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>[R] key</span>
                  <span className="text-white font-bold">Reset Animation</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>[C] key</span>
                  <span className="text-white font-bold">Toggle Sidebar</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>[F] key</span>
                  <span className="text-white font-bold">Toggle Fullscreen</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>[B] key</span>
                  <span className="text-white font-bold">Play Buzzer Audio</span>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-4 py-2 bg-[#C5A059] hover:bg-[#C5A059]/90 text-[#0A1F30] rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

export default function KataScoreboardPage() {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen bg-[#071420] flex flex-col items-center justify-center gap-4 text-white">
        <Loader2 className="animate-spin text-[#C5A059]" size={48} />
        <span className="text-xs uppercase font-mono tracking-widest text-[#C5A059]/70">
          Loading scoreboard...
        </span>
      </div>
    }>
      <KataScoreboardContent />
    </Suspense>
  )
}
