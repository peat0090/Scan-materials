import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Navbar from '../components/Navbar'

const sectionColor = {                          // ✅ เปลี่ยนชื่อให้ตรงกับ field จริง
  'Hydraulic':   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Mechatronic': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Mechanic':    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'IT':          'bg-green-500/10 text-green-400 border-green-500/20',
  'Logistics':   'bg-pink-500/10 text-pink-400 border-pink-500/20',
}

const formatDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  })
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('scan_records')
          .select('*')
          .order('scanned_at', { ascending: false })
          .limit(200)
        setRecords(data || [])
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const now        = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 6)

  const todayCount  = records.filter(r => new Date(r.scanned_at) >= todayStart).length
  const weekCount   = records.filter(r => new Date(r.scanned_at) >= weekStart).length
  const totalQty    = records.reduce((s, r) => s + (r.quantity || 0), 0)
  const uniqueItems = new Set(records.map(r => r.product_id)).size

  const filtered = records.filter(r =>
    !search ||
    r.product_id?.toLowerCase().includes(search.toLowerCase()) ||
    r.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.receiver?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">

        {/* Welcome */}
        <div className="mb-6 fade-in">
          <h2 className="text-xl font-bold text-white">สวัสดี, {user?.fullname} 👋</h2>
          <p className="text-slate-500 text-sm mt-0.5">{formatDate(new Date().toISOString())}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 fade-in">
          {[
            { label: 'สแกนวันนี้',   value: todayCount,  icon: '📦', color: 'text-blue-400' },
            { label: 'สแกน 7 วัน',   value: weekCount,   icon: '📅', color: 'text-purple-400' },
            { label: 'รวมจำนวนชิ้น', value: totalQty.toLocaleString(), icon: '🔢', color: 'text-amber-400' },
            { label: 'สินค้าไม่ซ้ำ', value: uniqueItems, icon: '🏷️', color: 'text-green-400' },
          ].map((s, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-lg mb-1">{s.icon}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Recent scans */}
        <div className="bg-white/5 border border-white/10 rounded-2xl fade-in">
          <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-semibold text-sm">ประวัติการสแกนล่าสุด</h3>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหา ID / ชื่อสินค้า / ผู้รับ..."
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20 w-full sm:w-56"
            />
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-slate-500 text-sm">ยังไม่มีข้อมูลการสแกน</p>
              <Link to="/scan" className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block">
                → เริ่มสแกน QR Code
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.slice(0, 50).map((r, i) => {
                const sectionCls = sectionColor[r.section] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'  // ✅ ใช้ r.section
                return (
                  <Link
                    to={`/items/${r.id}`}
                    key={r.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition group"
                  >
                    <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-xs font-mono text-slate-400 border border-white/10 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition">
                        {r.product_name || '(ไม่มีชื่อ)'}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">{r.product_id} · {r.receiver || r.scanned_by}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.section && (                                         // ✅ ใช้ r.section
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${sectionCls} hidden sm:inline`}>
                          {r.section}
                        </span>
                      )}
                      <span className="text-xs text-white/80 bg-white/10 px-2 py-0.5 rounded-full font-mono">
                        ×{r.quantity}
                      </span>
                      <span className="text-xs text-slate-600">{formatDate(r.scanned_at)}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
