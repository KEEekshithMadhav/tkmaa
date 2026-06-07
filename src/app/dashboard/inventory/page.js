"use client"
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import {
  Plus, Search, Filter, Loader2, Package, Edit3, Trash2,
  AlertTriangle, CheckCircle2, XCircle
} from 'lucide-react'
import { useForm } from "react-hook-form"
import { supabase } from '@/lib/supabase'
import { useBranch } from '@/context/BranchContext'
import { toast } from 'sonner'
import { Badge } from "@/components/ui/badge"

const STATUS_MAP = {
  in_stock: { label: 'In Stock', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  low_stock: { label: 'Low Stock', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  out_of_stock: { label: 'Out of Stock', color: 'bg-red-50 text-red-700 border-red-200' },
}

export default function InventoryPage() {
  const [items, setItems] = useState([])
  const { branches, selectedBranch } = useBranch()
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const { register, handleSubmit, reset, setValue } = useForm()


  useEffect(() => { fetchItems() }, [selectedBranch])

  async function fetchItems() {
    setLoading(true)
    let query = supabase.from('inventory').select('*, branches(name)').order('item_name')
    if (selectedBranch !== 'all') query = query.eq('branch_id', selectedBranch)
    const { data } = await query
    if (data) setItems(data)
    setLoading(false)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setValue("itemName", item.item_name)
    setValue("branchId", item.branch_id)
    setValue("quantity", item.quantity)
    setValue("status", item.status)
    setOpen(true)
  }

  const openCreate = () => { setEditingItem(null); reset(); setOpen(true) }

  const onSubmit = async (formData) => {
    setIsSubmitting(true)
    const toastId = toast.loading(editingItem ? 'Updating item...' : 'Adding item...')
    try {
      const qty = parseInt(formData.quantity) || 0
      const autoStatus = qty === 0 ? 'out_of_stock' : qty <= 5 ? 'low_stock' : 'in_stock'
      const payload = {
        item_name: formData.itemName,
        branch_id: formData.branchId,
        quantity: qty,
        status: formData.status || autoStatus,
      }
      if (editingItem) {
        const { error } = await supabase.from('inventory').update(payload).eq('id', editingItem.id)
        if (error) throw error
        toast.success('Item updated', { id: toastId })
      } else {
        const { error } = await supabase.from('inventory').insert([payload])
        if (error) throw error
        toast.success('Item added', { id: toastId })
      }
      setOpen(false); reset(); setEditingItem(null); fetchItems()
    } catch (err) {
      toast.error('Failed: ' + err.message, { id: toastId })
    } finally { setIsSubmitting(false) }
  }

  const deleteItem = async (id) => {
    if (!confirm('Delete this inventory item?')) return
    const { error } = await supabase.from('inventory').delete().eq('id', id)
    if (!error) { toast.success('Item deleted'); fetchItems() }
  }

  const filtered = items.filter(i =>
    i.item_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const lowStockCount = items.filter(i => i.status === 'low_stock').length
  const outOfStockCount = items.filter(i => i.status === 'out_of_stock').length

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0A1F30] sm:text-3xl">
            Inventory Management
          </h1>
          <p className="mt-1 font-sans text-sm text-gray-500">
            Track academy assets and equipment
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#0A1F30] hover:bg-[#0A1F30]/90 text-white rounded-lg text-xs">
          <Plus className="mr-2" size={16} /> Add Item
        </Button>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: "Total Items", val: items.length, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Low Stock", val: lowStockCount, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Out of Stock", val: outOfStockCount, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
        ].map((stat, i) => (
          <Card key={i} className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{stat.label}</p>
                <div className={`p-2 rounded-lg ${stat.bg}`}><stat.icon size={16} className={stat.color} /></div>
              </div>
              <div className={`text-3xl font-bold tracking-tight ${stat.color}`}>{stat.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C5A059] transition-colors" size={16} />
            <Input placeholder="Search items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-gray-200 focus:border-[#C5A059] rounded-lg h-10 text-sm" />
          </div>
          <div className="flex gap-3 items-center w-full sm:w-auto">
            {/* Branch dropdown moved to Sidebar */}
          </div>
        </div>
        <Table>
          <TableHeader className="bg-gray-50/80 border-b border-gray-100">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider py-4 pl-6">Item</TableHead>
              <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Branch</TableHead>
              <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Quantity</TableHead>
              <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {loading ? (
                <TableRow><TableCell colSpan={5} className="h-64 text-center">
                  <Loader2 className="animate-spin text-[#C5A059] mx-auto mb-4" size={32} />
                  <span className="text-xs text-gray-500">Loading Inventory...</span>
                </TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-64 text-center text-gray-400 text-sm">
                  <Package size={40} className="mx-auto mb-3 opacity-20" />
                  <p>No items found</p>
                </TableCell></TableRow>
              ) : filtered.map((item, i) => (
                <motion.tr key={item.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border ${item.status === 'out_of_stock' ? 'bg-red-50 text-red-600 border-red-100' : item.status === 'low_stock' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        <Package size={16} />
                      </div>
                      <p className="font-semibold text-sm text-[#0A1F30]">{item.item_name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{item.branches?.name}</TableCell>
                  <TableCell>
                    <span className={`text-lg font-bold ${item.quantity === 0 ? 'text-red-600' : item.quantity <= 5 ? 'text-amber-600' : 'text-[#0A1F30]'}`}>
                      {item.quantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`rounded-md font-semibold px-2.5 py-0.5 ${STATUS_MAP[item.status]?.color}`}>
                      {STATUS_MAP[item.status]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" onClick={() => openEdit(item)} className="h-8 w-8 p-0 text-gray-400 hover:text-[#0A1F30] hover:bg-gray-100 rounded-lg"><Edit3 size={14} /></Button>
                      <Button variant="ghost" onClick={() => deleteItem(item.id)} className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </Card>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600" />
          <p className="text-sm text-amber-700 font-medium">
            <strong>{lowStockCount} item{lowStockCount > 1 ? 's' : ''}</strong> running low on stock. Consider restocking soon.
          </p>
        </motion.div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingItem(null); reset() } }}>
        <DialogContent className="bg-white border border-gray-200 rounded-2xl max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-gray-100">
            <DialogTitle className="text-lg font-heading font-bold text-[#0A1F30]">
              {editingItem ? 'Edit Item' : 'Add Inventory Item'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Item Name</label>
              <Input {...register("itemName", { required: true })} placeholder="e.g. Boxing Gloves" className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Branch</label>
                <select {...register("branchId", { required: true })} className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059]">
                  <option value="">Select Branch</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Quantity</label>
                <Input type="number" {...register("quantity")} defaultValue={0} className="bg-gray-50 border-gray-200 rounded-lg h-10 text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Status</label>
              <select {...register("status")} className="w-full bg-gray-50 border border-gray-200 rounded-lg h-10 px-4 text-sm text-[#0A1F30] outline-none focus:border-[#C5A059]">
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); setEditingItem(null) }} className="flex-1 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[#C5A059] hover:bg-[#C5A059]/90 text-white rounded-lg">
                {isSubmitting ? <Loader2 className="animate-spin" /> : editingItem ? "Update" : "Add Item"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
