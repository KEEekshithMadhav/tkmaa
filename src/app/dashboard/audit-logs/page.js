"use client"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Search, Filter, Loader2, Database, History, User } from 'lucide-react'
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from '@/lib/supabase'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"

const ACTION_COLORS = {
  CREATE: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  UPDATE: 'text-blue-700 bg-blue-50 border-blue-200',
  DELETE: 'text-red-700 bg-red-50 border-red-200',
  LOGIN: 'text-purple-700 bg-purple-50 border-purple-200',
  SYSTEM: 'text-gray-700 bg-gray-100 border-gray-300'
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAction, setFilterAction] = useState('all')

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    setLoading(true)
    // Fetch logs with user details
    const { data } = await supabase
      .from('audit_logs')
      .select('*, users(full_name, email, role)')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (data) setLogs(data)
    setLoading(false)
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.entity_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.action?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesAction = filterAction === 'all' || log.action === filterAction
    return matchesSearch && matchesAction
  })

  // Derive unique actions for the filter dropdown
  const uniqueActions = ['all', ...Array.from(new Set(logs.map(l => l.action)))]

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0A1F30] sm:text-3xl flex items-center gap-3">
            <ShieldCheck className="text-[#C5A059]" size={32} />
            System Audit Logs
          </h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            Immutable record of all critical system activities and data modifications
          </p>
        </div>
      </header>

      <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C5A059] transition-colors" size={16} />
            <Input 
              placeholder="Search by user, entity, or action..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-gray-200 focus:border-[#C5A059] focus:ring-[#C5A059]/20 rounded-lg h-10 text-sm transition-all"
            />
          </div>
          <div className="flex gap-3 items-center w-full sm:w-auto">
            <Filter size={14} className="text-gray-400" />
            <select 
              value={filterAction} 
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-white border border-gray-200 h-10 px-4 rounded-lg text-xs font-semibold text-[#0A1F30] outline-none focus:border-[#C5A059] transition-all cursor-pointer shadow-sm uppercase tracking-wider"
            >
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/80 border-b border-gray-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider py-4 pl-6">Timestamp</TableHead>
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Actor</TableHead>
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Action</TableHead>
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Entity</TableHead>
                <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider pr-6 text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="h-64 text-center"><Loader2 className="animate-spin text-[#C5A059] mx-auto" size={32} /></TableCell></TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <History size={40} className="mb-3 opacity-20" />
                        <p className="text-sm">No audit records found matching your criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.map((log, i) => (
                  <motion.tr
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    key={log.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <TableCell className="pl-6 py-4">
                      <div className="text-xs font-semibold text-[#0A1F30]">
                        {new Date(log.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.users ? (
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-400" />
                          <div>
                            <p className="text-sm font-semibold text-[#0A1F30]">{log.users.full_name}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{log.users.role}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-1 rounded-md">SYSTEM</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${ACTION_COLORS[log.action] || ACTION_COLORS.SYSTEM}`}>
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Database size={14} className="text-gray-400" />
                        <span className="text-sm font-semibold text-[#0A1F30] uppercase tracking-wider">{log.entity_type}</span>
                      </div>
                      {log.entity_id && (
                        <p className="text-[9px] font-mono text-gray-400 mt-1">ID: {log.entity_id.split('-')[0]}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="inline-block text-left max-w-[250px]">
                        {log.metadata ? (
                          <pre className="text-[9px] font-mono bg-gray-50 border border-gray-100 rounded-md p-2 text-gray-600 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No metadata</span>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
