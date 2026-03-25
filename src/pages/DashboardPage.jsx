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

export default function DashboardPage() {
  const { user } = useAuth()
  const [records,  setRecords]  = useState([])
  const [imageMap, setImageMap] = useState({})
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: recs } = await supabase
          .from('products')
          .select('*')
          .order('scanned_at', { ascending: false })
          .limit(500)

        const rows = recs || []
        setRecords(rows)

        const pids = [...new Set(rows.map(r => r.product_id))]
        if (pids.length > 0) {
          const { data: imgs } = await supabase
            .from('product_images')
            .select('product_id, image_url, is_primary')
            .in('product_id', pids)

          const map = {}
          ;(imgs || []).forEach(img => {
            if (!map[img.product_id] || img.is_primary) {
              map[img.product_id] = img.image_url
            }
          })
          setImageMap(map)
        }
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

  const productMap = {}
  records.forEach(r => {
    if (!productMap[r.product_id]) {
      productMap[r.product_id] = {
        product_id:   r.product_id,
        product_name: r.product_name,
        section:      r.section,
        unit:         r.unit || 'ชิ้น',
        quantity:     0,
        last_scan:    r.scanned_at,
        last_id:      r.id,
      }
    }
    productMap[r.product_id].quantity += (r.quantity || 0)
  })

  const productList = Object.values(productMap)
  const filtered = productList.filter(p =>
    !search ||
    p.product_id?.toLowerCase().includes(search.toLowerCase()) ||
    p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.section?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">

        <div className="mb-6 fade-in">
          <h2 className="text-xl font-bold text-white">สวัสดี, {user?.fullname} 👋</h2>
          <p className="text-slate-500 text-sm mt-0.5">{formatDate(new Date().toISOString())}</p>
        </div>

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

        <div className="fade-in">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <h3 className="font-semibold text-white">รายการสินค้าทั้งหมด</h3>
              <p className="text-slate-500 text-xs mt-0.5">{filtered.length} รายการ · ยอดจำนวนสุทธิรวมทุก record</p>
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
              <Link to="/scan" className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block">→ เริ่มสแกน QR Code</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filtered.map(p => {
                const sectionCls = sectionColor[p.section] || 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                const imgSrc = imageMap[p.product_id] || null
                return (
                  <Link
                    to={`/items/${p.last_id}`}
                    key={p.product_id}
                    className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/25 transition-all duration-200 hover:scale-[1.02]"
                  >
                    <div className="aspect-square overflow-hidden relative">
                      <ProductImage src={imgSrc} productName={p.product_name || p.product_id} section={p.section} />
                      {p.section && (
                        <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full border backdrop-blur-sm ${sectionCls}`}>
                          {p.section}
                        </span>
                      )}
                      {!imgSrc && (
                        <span className="absolute bottom-2 right-2 text-xs px-1.5 py-0.5 rounded bg-black/40 text-white/30 backdrop-blur-sm">
                          ไม่มีรูป
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-white truncate group-hover:text-blue-300 transition">
                        {p.product_name || '(ไม่มีชื่อ)'}
                      </p>
                      <p className="text-xs text-slate-600 font-mono mt-0.5 truncate">{p.product_id}</p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-xl font-bold text-white font-mono">{p.quantity.toLocaleString()}</span>
                        <span className="text-xs text-slate-500">{p.unit}</span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1 truncate">{formatDate(p.last_scan)}</p>
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
