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

const formatShort = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  })
}

const SECTIONS = ['', 'Hydraulic', 'Mechatronic', 'Mechanic', 'IT', 'Admin', 'Logistics', 'QC', 'Production']

// Component แสดง scan logs ใต้แถว
function ScanLogsRow({ recordId, unit }) {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('scan_logs')
        .select('*')
        .eq('record_id', recordId)
        .order('scanned_at', { ascending: false })
      setLogs(data || [])
      setLoading(false)
    }
    load()
  }, [recordId])

  if (loading) {
    return (
      <tr>
        <td colSpan={8} className="px-6 py-3 bg-white/3">
          <div className="flex gap-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-3 w-24 bg-white/10 rounded animate-pulse" />
            ))}
          </div>
        </td>
      </tr>
    )
  }

  if (logs.length === 0) {
    return (
      <tr>
        <td colSpan={8} className="px-6 py-4 bg-white/3 border-b border-white/5">
          <p className="text-xs text-slate-600 italic">ยังไม่มีประวัติการเพิ่ม (log จะบันทึกเมื่อมีการสแกนซ้ำ)</p>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td colSpan={8} className="bg-slate-900/60 border-b border-white/5">
        <div className="px-6 py-3">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-semibold">
            ประวัติการเพิ่ม · {logs.length} ครั้ง
          </p>
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={log.id} className="flex items-center gap-3">
                {/* เลขลำดับ (เรียงจากเก่า→ใหม่ = length-i) */}
                <span className="text-xs text-slate-700 w-5 text-right shrink-0">
                  #{logs.length - i}
                </span>

                {/* badge +qty */}
                <div className="w-14 h-7 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-green-400 text-xs font-mono font-bold">+{log.qty_added}</span>
                </div>

                {/* before → after */}
                <span className="text-xs text-white font-mono">
                  {log.qty_before}
                  <span className="text-slate-500 mx-1">→</span>
                  <span className="text-green-400">{log.qty_after}</span>
                  <span className="text-slate-500 ml-1">{unit || 'ชิ้น'}</span>
                </span>

                <span className="text-slate-600 text-xs">·</span>

                {/* ผู้สแกน + เวลา */}
                <span className="text-xs text-slate-400">{log.scanned_by}</span>
                <span className="text-xs text-slate-600">{formatShort(log.scanned_at)}</span>

                {/* หมายเหตุ */}
                {log.note && (
                  <span className="text-xs text-slate-600 italic">— {log.note}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </td>
    </tr>
  )
}

export default function HistoryPage() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [section, setSection] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [expanded, setExpanded] = useState(new Set()) // record ids ที่ expand อยู่

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      let q = supabase
        .from('scan_records')
        .select('*')
        .order('scanned_at', { ascending: false })
        .limit(500)

      if (section)  q = q.eq('section', section)
      if (dateFrom) q = q.gte('scanned_at', new Date(dateFrom).toISOString())

      const { data } = await q
      setRecords(data || [])
      setLoading(false)
    }
    fetchData()
  }, [section, dateFrom])

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = records.filter(r =>
    !search ||
    r.product_id?.toLowerCase().includes(search.toLowerCase()) ||
    r.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.scanned_by?.toLowerCase().includes(search.toLowerCase()) ||
    r.receiver?.toLowerCase().includes(search.toLowerCase())
  )

  const exportCSV = () => {
    const headers = ['ID สินค้า', 'ชื่อสินค้า', 'จำนวน', 'แผนก', 'ฝ่าย', 'ผู้รับ', 'ผู้สแกน', 'เวลา', 'หมายเหตุ']
    const rows = filtered.map(r => [
      r.product_id, r.product_name, r.quantity,
      r.section, r.division, r.receiver,
      r.scanned_by, formatDate(r.scanned_at), r.note
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
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold">ประวัติการสแกนทั้งหมด</h2>
            <p className="text-slate-500 text-sm">{filtered.length} รายการ · กดแถวเพื่อดูประวัติการเพิ่ม</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs bg-white/10 border border-white/10 text-white px-3 py-2 rounded-lg hover:bg-white/15 transition"
          >
            📥 Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหา..."
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20 flex-1 min-w-[160px]"
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
                  {/* คอลัมน์ expand toggle */}
                  <th className="px-3 py-3 w-8" />
                  {['ID สินค้า', 'ชื่อสินค้า', 'จำนวน', 'แผนก', 'ฝ่าย', 'ผู้รับ', 'ผู้สแกน', 'เวลา'].map(h => (
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
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : filtered.map(r => {
                  const isOpen = expanded.has(r.id)
                  return (
                    <>
                      {/* แถวหลัก */}
                      <tr
                        key={r.id}
                        onClick={() => toggleExpand(r.id)}
                        className={`border-t border-white/5 cursor-pointer transition ${
                          isOpen ? 'bg-white/8' : 'hover:bg-white/5'
                        }`}
                      >
                        {/* ปุ่ม expand */}
                        <td className="px-3 py-3 text-center">
                          <span className={`text-slate-500 transition-transform inline-block ${isOpen ? 'rotate-90' : ''}`}>
                            ▶
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-blue-400">
                          <Link
                            to={`/items/${r.id}`}
                            onClick={e => e.stopPropagation()}
                            className="hover:text-blue-300"
                          >
                            {r.product_id}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-white max-w-[140px] truncate">{r.product_name || '-'}</td>
                        <td className="px-4 py-3 font-mono text-center">×{r.quantity}</td>
                        <td className="px-4 py-3 text-slate-300">{r.section || '-'}</td>
                        <td className="px-4 py-3 text-slate-300 max-w-[120px] truncate">{r.division || '-'}</td>
                        <td className="px-4 py-3 text-slate-300">{r.receiver || '-'}</td>
                        <td className="px-4 py-3 text-slate-400">{r.scanned_by}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(r.scanned_at)}</td>
                      </tr>

                      {/* แถว logs (แสดงเมื่อ expand) */}
                      {isOpen && (
                        <ScanLogsRow
                          key={`logs-${r.id}`}
                          recordId={r.id}
                          unit={r.unit}
                        />
                      )}
                    </>
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
