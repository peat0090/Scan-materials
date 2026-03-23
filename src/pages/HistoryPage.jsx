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

export default function HistoryPage() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [section, setSection] = useState('')
  const [dateFrom, setDateFrom] = useState('')

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      let q = supabase
        .from('scan_records')
        .select('*')
        .order('scanned_at', { ascending: false })
        .limit(500)

      if (section) q = q.eq('section', section)
      if (dateFrom) q = q.gte('scanned_at', new Date(dateFrom).toISOString())

      const { data } = await q
      setRecords(data || [])
      setLoading(false)
    }
    fetch()
  }, [section, dateFrom])

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
            <p className="text-slate-500 text-sm">{filtered.length} รายการ</p>
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
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 bg-white/5 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/5 transition">
                    <td className="px-4 py-3 font-mono text-blue-400">
                      <Link to={`/items/${r.id}`} className="hover:text-blue-300">{r.product_id}</Link>
                    </td>
                    <td className="px-4 py-3 text-white max-w-[140px] truncate">{r.product_name || '-'}</td>
                    <td className="px-4 py-3 font-mono text-center">×{r.quantity}</td>
                    <td className="px-4 py-3 text-slate-300">{r.section || '-'}</td>
                    <td className="px-4 py-3 text-slate-300 max-w-[120px] truncate">{r.division || '-'}</td>
                    <td className="px-4 py-3 text-slate-300">{r.receiver || '-'}</td>
                    <td className="px-4 py-3 text-slate-400">{r.scanned_by}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(r.scanned_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
