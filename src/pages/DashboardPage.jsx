import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Navbar from '../components/Navbar'

const sectionColor = {
  Hydraulic: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  Mechatronic: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  Mechanic: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  IT: 'bg-green-500/15 text-green-400 border-green-500/25',
  Logistics: 'bg-pink-500/15 text-pink-400 border-pink-500/25',
  Admin: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
  QC: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  Production: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
}

const gradients = {
  Hydraulic: ['#1e40af', '#3b82f6'],
  Mechatronic: ['#6d28d9', '#a78bfa'],
  Mechanic: ['#92400e', '#f59e0b'],
  IT: ['#065f46', '#10b981'],
  Logistics: ['#9d174d', '#f472b6'],
  Admin: ['#334155', '#94a3b8'],
  QC: ['#164e63', '#22d3ee'],
  Production: ['#7c2d12', '#f97316'],
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
      <span className="text-4xl font-bold text-white/30">{letter}</span>
    </div>
  )
}

export default function DashboardPage() {

  const { user } = useAuth()

  const [records, setRecords] = useState([])
  const [imageMap, setImageMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {

    const load = async () => {

      setLoading(true)

      try {

        // โหลดสินค้า
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .order('name')

        const rows = products || []

        // โหลด scan records
        const { data: scans } = await supabase
          .from('scan_records')
          .select('product_id, quantity, scanned_at')

        const qtyMap = {}
        const lastScanMap = {}

        scans?.forEach(r => {

          if (!qtyMap[r.product_id]) qtyMap[r.product_id] = 0
          qtyMap[r.product_id] += r.quantity || 0

          if (!lastScanMap[r.product_id] || new Date(r.scanned_at) > new Date(lastScanMap[r.product_id])) {
            lastScanMap[r.product_id] = r.scanned_at
          }

        })

        const merged = rows.map(p => ({
          ...p,
          product_id: p.id,
          product_name: p.name,
          quantity: qtyMap[p.id] || 0,
          last_scan: lastScanMap[p.id] || null,
        }))

        setRecords(merged)

        // โหลดรูปสินค้า
        const pids = rows.map(r => r.id)

        if (pids.length > 0) {

          const { data: imgs } = await supabase
            .from('product_images')
            .select('product_id, image_url, is_primary')
            .in('product_id', pids)

          const map = {}

          imgs?.forEach(img => {
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

  const filtered = records.filter(p =>
    !search ||
    p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.section?.toLowerCase().includes(search.toLowerCase())
  )

  const totalQty = records.reduce((s, r) => s + (r.quantity || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading...
      </div>
    )
  }

  return (

    <div className="min-h-screen bg-slate-950 text-white">

      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h2 className="text-xl font-bold">
            สวัสดี, {user?.fullname} 👋
          </h2>
        </div>

        <div className="mb-6">

          <input
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
            placeholder="ค้นหาสินค้า..."
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm w-64"
          />

        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">

          {filtered.map(p => {

            const sectionCls = sectionColor[p.section] || 'bg-slate-500/15 text-slate-400 border-slate-500/25'
            const imgSrc = imageMap[p.product_id] || null

            return (

              <Link
                to={`/items/${p.product_id}`}
                key={p.product_id}
                className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/25 hover:scale-[1.02] transition"
              >

                <div className="aspect-square relative overflow-hidden">

                  <ProductImage
                    src={imgSrc}
                    productName={p.product_name}
                    section={p.section}
                  />

                  {p.section && (
                    <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full border ${sectionCls}`}>
                      {p.section}
                    </span>
                  )}

                </div>

                <div className="p-3">

                  <p className="text-xs font-semibold truncate">
                    {p.product_name}
                  </p>

                  <p className="text-xs text-slate-500 font-mono truncate">
                    {p.barcode}
                  </p>

                  <div className="mt-2">

                    <span className="text-xl font-bold font-mono">
                      {p.quantity}
                    </span>

                    <span className="text-xs text-slate-500 ml-1">
                      {p.unit || 'ชิ้น'}
                    </span>

                  </div>

                </div>

              </Link>

            )

          })}

        </div>

        <div className="mt-6 text-sm text-slate-500">
          จำนวนสินค้าทั้งหมด {records.length} รายการ | รวม {totalQty} ชิ้น
        </div>

      </div>

    </div>

  )
}