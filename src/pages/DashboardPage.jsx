import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Navbar from '../components/Navbar'

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

const gradients = {
  'Hydraulic':   ['#1e40af', '#3b82f6'],
  'Mechatronic': ['#6d28d9', '#a78bfa'],
  'Mechanic':    ['#92400e', '#f59e0b'],
  'IT':          ['#065f46', '#10b981'],
  'Logistics':   ['#9d174d', '#f472b6'],
  'Admin':       ['#334155', '#94a3b8'],
  'QC':          ['#164e63', '#22d3ee'],
  'Production':  ['#7c2d12', '#f97316'],
}

function ProductImage({ src, productName, section }) {
  const [imgError, setImgError] = useState(false)
  const letter = productName?.charAt(0)?.toUpperCase() || '?'
  const [from, to] = gradients[section] || ['#1e293b', '#475569']

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={productName}
        onError={() => setImgError(true)}
        className="w-full h-full object-cover"
      />
    )
  }
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <span className="text-4xl font-bold text-white/30 select-none">{letter}</span>
    </div>
  )
}

const formatDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  })
}

// Stock level indicator
function StockBadge({ qty }) {
  if (qty <= 0)  return <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">หมด</span>
  if (qty <= 5)  return <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">ใกล้หมด</span>
  return null
}

export default function DashboardPage() {
  const { user } = useAuth()

  // products with stock from product_stock_view
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  // summary stats (from scan_records for today/week counts)
  const [todayCount, setTodayCount] = useState(0)
  const [weekCount,  setWeekCount]  = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // ── 1. ดึงสินค้าทั้งหมดพร้อม stock จาก view ──────────────
        const { data: prods, error } = await supabase
          .from('product_stock_view')
          .select('*')
          .order('product_name', { ascending: true })

        if (error) throw error
        setProducts(prods || [])

        // ── 2. ดึงสถิติการสแกนวันนี้ / 7 วัน ─────────────────────
        const now       = new Date()
        const todayISO  = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        const weekAgo   = new Date(now); weekAgo.setDate(now.getDate() - 6)
        const weekISO   = weekAgo.toISOString()

        const [{ count: tCount }, { count: wCount }] = await Promise.all([
          supabase.from('scan_records').select('*', { count: 'exact', head: true }).gte('scanned_at', todayISO),
          supabase.from('scan_records').select('*', { count: 'exact', head: true }).gte('scanned_at', weekISO),
        ])

        setTodayCount(tCount || 0)
        setWeekCount(wCount  || 0)

      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Summary computations ────────────────────────────────────
  const totalStock   = products.reduce((s, p) => s + (p.stock_quantity || 0), 0)
  const uniqueItems  = products.length
  const lowStockItems = products.filter(p => p.stock_quantity <= 5 && p.stock_quantity >= 0).length

  // ── Filtered list ───────────────────────────────────────────
  const filtered = products.filter(p =>
    !search ||
    p.product_id?.toLowerCase().includes(search.toLowerCase()) ||
    p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.section?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">

        {/* ── Greeting ── */}
        <div className="mb-6 fade-in">
          <h2 className="text-xl font-bold text-white">สวัสดี, {user?.fullname} </h2>
          <p className="text-slate-500 text-sm mt-0.5">{formatDate(new Date().toISOString())}</p>
        </div>

        {/* ── Stats cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 fade-in">
          {[
            { label: 'รายการรับวันนี้',    value: todayCount,                   color: 'text-blue-400' },
            { label: 'รายการรับ 7 วัน',    value: weekCount,                   color: 'text-purple-400' },
            { label: 'ยอดคงเหลือรวม', value: totalStock.toLocaleString(),  color: 'text-amber-400' },
            { label: 'สินค้าทั้งหมด', value: uniqueItems,                  color: 'text-green-400' },
          ].map((s, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-lg mb-1">{s.icon}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Low stock alert ── */}
        {!loading && lowStockItems > 0 && (
          <div className="mb-4 fade-in flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-300 text-sm">
            <span className="text-lg">⚠️</span>
            <span>มีสินค้า <strong>{lowStockItems} รายการ</strong> ที่ใกล้หมดหรือหมดสต็อกแล้ว</span>
          </div>
        )}

        {/* ── Product grid ── */}
        <div className="fade-in">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <h3 className="font-semibold text-white">รายการสินค้าทั้งหมด</h3>
              <p className="text-slate-500 text-xs mt-0.5">
                {filtered.length} รายการ · ยอดคงเหลือจาก products (รับเข้า − เบิกออก)
              </p>
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาสินค้า / แผนก..."
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20 w-full sm:w-56"
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-square bg-white/5" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                    <div className="h-5 bg-white/10 rounded w-1/3 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-slate-500 text-sm">ยังไม่มีสินค้าในระบบ</p>
              <Link to="/scan" className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block">
                → เริ่มสแกน QR Code
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filtered.map(p => {
                const sectionCls = sectionColor[p.section] || 'bg-slate-500/15 text-slate-400 border-slate-500/25'

                return (
                  <Link
                    to={`/items/${p.product_id}`}
                    key={p.product_id}
                    className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/25 transition-all duration-200 hover:scale-[1.02]"
                  >
                    {/* ── รูปภาพ ── */}
                    <div className="aspect-square overflow-hidden relative">
                      <ProductImage
                        src={p.primary_image_url || null}
                        productName={p.product_name || p.product_id}
                        section={p.section}
                      />
                      {/* Section badge */}
                      {p.section && (
                        <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full border backdrop-blur-sm ${sectionCls}`}>
                          {p.section}
                        </span>
                      )}
                      {/* No image badge */}
                      {!p.primary_image_url && (
                        <span className="absolute bottom-2 right-2 text-xs px-1.5 py-0.5 rounded bg-black/40 text-white/30 backdrop-blur-sm">
                          ไม่มีรูป
                        </span>
                      )}
                      {/* Out of stock overlay */}
                      {p.stock_quantity <= 0 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-xs font-bold text-red-400 bg-red-500/20 border border-red-500/30 px-2 py-1 rounded-lg backdrop-blur-sm">
                            หมดสต็อก
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ── ข้อมูล ── */}
                    <div className="p-3">
                      <p className="text-xs font-semibold text-white truncate group-hover:text-blue-300 transition">
                        {p.product_name || '(ไม่มีชื่อ)'}
                      </p>
                      <p className="text-xs text-slate-600 font-mono mt-0.5 truncate">{p.product_id}</p>

                      {/* Stock quantity — source of truth จาก products table */}
                      <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                        <span className={`text-xl font-bold font-mono ${
                          p.stock_quantity <= 0 ? 'text-red-400' :
                          p.stock_quantity <= 5 ? 'text-amber-400' : 'text-white'
                        }`}>
                          {p.stock_quantity.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500">{p.unit || 'ชิ้น'}</span>
                        <StockBadge qty={p.stock_quantity} />
                      </div>

                      {/* In/Out summary */}
                      <div className="mt-1.5 flex gap-2 text-xs text-slate-700">
                        <span>↑{(p.total_in || 0).toLocaleString()}</span>
                        <span>↓{(p.total_out || 0).toLocaleString()}</span>
                      </div>

                      <p className="text-xs text-slate-700 mt-1 truncate">{formatDate(p.last_scan_at)}</p>
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
