import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Navbar from '../components/Navbar'

const formatDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  })
}

const SECTIONS = ['', 'Hydraulic', 'Mechatronic', 'Mechanic', 'IT', 'Admin', 'Logistics', 'QC', 'Production']

const sectionColor = {
  'Hydraulic':   'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'Mechatronic': 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  'Mechanic':    'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'IT':          'bg-green-500/15 text-green-400 border-green-500/25',
  'Logistics':   'bg-pink-500/15 text-pink-400 border-pink-500/25',
  'Admin':       'bg-slate-500/15 text-slate-400 border-slate-500/25',
  'QC':          'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  'Production':  'bg-orange-500/15 text-orange-400 border-orange-500/25',
}

export default function WithdrawHistoryPage() {
  const [records,  setRecords]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [section,  setSection]  = useState('')
  const [dateFrom, setDateFrom] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      let q = supabase
        .from('withdraw_records')
        .select('*')
        .order('withdrawn_at', { ascending: false })
        .limit(500)

      if (section)  q = q.eq('section', section)
      if (dateFrom) q = q.gte('withdrawn_at', new Date(dateFrom).toISOString())

      const { data } = await q
      setRecords(data || [])
      setLoading(false)
    }
    fetchData()
  }, [section, dateFrom])

  const filtered = records.filter(r =>
    !search ||
    r.product_id?.toLowerCase().includes(search.toLowerCase()) ||
    r.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.requester?.toLowerCase().includes(search.toLowerCase()) ||
    r.withdrawn_by?.toLowerCase().includes(search.toLowerCase()) ||
    r.purpose?.toLowerCase().includes(search.toLowerCase())
  )

  // สรุปยอด
  const totalQty      = filtered.reduce((s, r) => s + (r.quantity || 0), 0)
  const uniqueItems   = new Set(filtered.map(r => r.product_id)).size
  const todayStart    = new Date(); todayStart.setHours(0,0,0,0)
  const todayWithdraw = records.filter(r => new Date(r.withdrawn_at) >= todayStart).length

  const exportCSV = () => {
    const headers = ['ID สินค้า', 'ชื่อสินค้า', 'จำนวน', 'หน่วย', 'แผนก', 'ฝ่าย', 'ผู้เบิก', 'วัตถุประสงค์', 'ผู้ดำเนินการ', 'เวลา', 'หมายเหตุ']
    const rows = filtered.map(r => [
      r.product_id, r.product_name, r.quantity, r.unit,
      r.section, r.division, r.requester, r.purpose,
      r.withdrawn_by, formatDate(r.withdrawn_at), r.note
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = `scan_records_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold">ประวัติการเบิก</h2>
            <p className="text-slate-500 text-sm">{filtered.length} รายการ</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs bg-white/10 border border-white/10 text-white px-3 py-2 rounded-lg hover:bg-white/15 transition"
          >
             Export CSV
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'เบิกวันนี้',    value: todayWithdraw,            color: 'text-red-400' },
            { label: 'รวมชิ้นที่เบิก', value: totalQty.toLocaleString(),  color: 'text-amber-400' },
            { label: 'สินค้าไม่ซ้ำ',  value: uniqueItems,               color: 'text-purple-400' },
          ].map((s, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-lg mb-1">{s.icon}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาสินค้า / ผู้เบิก / วัตถุประสงค์..."
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20 flex-1 min-w-45"
          />
          <select
            value={section}
            onChange={e => setSection(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            {SECTIONS.map(s => <option key={s} value={s}>{s || 'ทุกแผนก'}</option>)}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
          />
          {(search || section || dateFrom) && (
            <button
              onClick={() => { setSearch(''); setSection(''); setDateFrom('') }}
              className="text-xs text-slate-500 hover:text-white px-2 transition"
            >
              ล้าง
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  {['ID สินค้า', 'ชื่อสินค้า', 'จำนวน', 'แผนก', 'ฝ่าย', 'ผู้เบิก', 'วัตถุประสงค์', 'ผู้ดำเนินการ', 'เวลา'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-slate-500 font-medium uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(9)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 bg-white/5 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <div className="text-3xl mb-2"></div>
                      <p className="text-slate-500">ยังไม่มีประวัติการเบิก</p>
                    </td>
                  </tr>
                ) : filtered.map(r => {
                  const secCls = sectionColor[r.section] || 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                  return (
                    <tr key={r.id} className="border-t border-white/5 hover:bg-white/3 transition">
                      <td className="px-4 py-3 font-mono text-red-400 whitespace-nowrap">
                        <Link to={`/items/${r.product_id}?tab=withdraw`} className="hover:text-red-300 transition">
                          {r.product_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-white max-w-35 truncate">{r.product_name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-red-400">−{r.quantity}</span>
                        <span className="text-slate-500 ml-1">{r.unit || 'ชิ้น'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {r.section ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${secCls}`}>{r.section}</span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-300 max-w-30 truncate">{r.division || '-'}</td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{r.requester || '-'}</td>
                      <td className="px-4 py-3 text-slate-400 max-w-40 truncate">{r.purpose || '-'}</td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{r.withdrawn_by}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(r.withdrawn_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
