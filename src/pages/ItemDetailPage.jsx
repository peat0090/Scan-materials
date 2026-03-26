import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

const formatDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
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
const formatDay = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleString('th-TH', { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' })
}

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

// ── Mini SVG Bar Chart ─────────────────────────────────────────
function BarChart({ data, color = '#60a5fa', label = '' }) {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-28 text-slate-700 text-xs">ไม่มีข้อมูล</div>
  )
  const max = Math.max(...data.map(d => d.value), 1)
  const W = 320, H = 90, barW = Math.max(6, Math.floor((W - data.length * 2) / data.length))

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ minWidth: 200 }}>
        {data.map((d, i) => {
          const barH = Math.max(2, (d.value / max) * H)
          const x = i * (W / data.length) + (W / data.length - barW) / 2
          const y = H - barH
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={3} fill={color} opacity={0.7} />
              {d.value > 0 && (
                <text x={x + barW / 2} y={y - 3} textAnchor="middle" fill={color} fontSize={8} opacity={0.9}>
                  {d.value}
                </text>
              )}
              <text x={x + barW / 2} y={H + 14} textAnchor="middle" fill="#64748b" fontSize={8}>
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Mini SVG Line Chart ────────────────────────────────────────
function LineChart({ data, color = '#34d399' }) {
  if (!data || data.length < 2) return (
    <div className="flex items-center justify-center h-28 text-slate-700 text-xs">ข้อมูลไม่เพียงพอ</div>
  )
  const max = Math.max(...data.map(d => d.value), 1)
  const W = 320, H = 80
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - (d.value / max) * H,
    ...d,
  }))
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = `M${pts[0].x},${H} ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length-1].x},${H} Z`

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ minWidth: 200 }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#lineGrad)" />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={color} />
            <text x={p.x} y={H + 14} textAnchor="middle" fill="#64748b" fontSize={8}>{p.label}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// ── Image Gallery (unchanged) ──────────────────────────────────
function ImageGallery({ productId, canUpload, uploaderName }) {
  const fileRef   = useRef(null)
  const dropRef   = useRef(null)
  const [images,    setImages]    = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [lightbox,  setLightbox]  = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const loadImages = async () => {
    const { data } = await supabase.from('product_images').select('*')
      .eq('product_id', productId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })
    setImages(data || [])
  }
  useEffect(() => { loadImages() }, [productId])

  const uploadFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) { setUploadErr('รองรับเฉพาะไฟล์รูปภาพ'); return }
    setUploading(true); setUploadErr('')
    try {
      const ext = file.name?.split('.').pop() || 'png'
      const fileName = `${productId}/${Date.now()}.${ext}`
      const { error: storageErr } = await supabase.storage.from('product-images').upload(fileName, file, { upsert: false })
      if (storageErr) throw storageErr
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName)
      const isFirst = images.length === 0
      const { error: dbErr } = await supabase.from('product_images').insert({ product_id: productId, image_url: publicUrl, is_primary: isFirst, uploaded_by: uploaderName })
      if (dbErr) throw dbErr
      await loadImages()
    } catch (err) { setUploadErr('อัปโหลดไม่สำเร็จ: ' + err.message) }
    finally { setUploading(false) }
  }, [productId, uploaderName, images.length])

  useEffect(() => {
    if (!canUpload) return
    const handlePaste = (e) => {
      for (const item of e.clipboardData?.items || []) {
        if (item.type.startsWith('image/')) { uploadFile(item.getAsFile()); break }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [canUpload, uploadFile])

  const setPrimary = async (id) => {
    await supabase.from('product_images').update({ is_primary: false }).eq('product_id', productId)
    await supabase.from('product_images').update({ is_primary: true }).eq('id', id)
    await loadImages()
  }
  const deleteImage = async (img) => {
    if (!window.confirm('ลบรูปนี้?')) return
    const path = img.image_url.split('/product-images/')[1]
    if (path) await supabase.storage.from('product-images').remove([path])
    await supabase.from('product_images').delete().eq('id', img.id)
    await loadImages()
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4">
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">รูปภาพสินค้า</p>
          <span className="text-xs text-slate-500">{images.length} รูป</span>
        </div>
        {canUpload && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Ctrl+V วางรูปได้เลย</span>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 text-xs bg-white/10 border border-white/10 text-white px-3 py-1.5 rounded-lg hover:bg-white/15 transition disabled:opacity-50">
              {uploading ? <span className="flex items-center gap-1.5"><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />กำลังอัปโหลด...</span> : '📷 เลือกไฟล์'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { uploadFile(e.target.files?.[0]); e.target.value = '' }} />
          </div>
        )}
      </div>
      {uploadErr && <div className="mx-5 mt-3 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">⚠️ {uploadErr}</div>}
      <div ref={dropRef}
        onDragOver={canUpload ? (e) => { e.preventDefault(); setIsDragging(true) } : undefined}
        onDragLeave={canUpload ? () => setIsDragging(false) : undefined}
        onDrop={canUpload ? (e) => { e.preventDefault(); setIsDragging(false); uploadFile(e.dataTransfer.files?.[0]) } : undefined}
        className={`p-4 transition-all ${isDragging ? 'bg-blue-500/10 ring-2 ring-inset ring-blue-500/40' : ''}`}>
        {images.length === 0 && !canUpload ? (
          <div className="py-8 text-center text-slate-600 text-xs">ยังไม่มีรูปภาพ</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {images.map(img => (
              <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-white/10">
                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                {img.is_primary && <span className="absolute top-1 left-1 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-medium">หลัก</span>}
                {canUpload && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    {!img.is_primary && <button onClick={() => setPrimary(img.id)} className="text-xs bg-blue-500 text-white px-2 py-1 rounded-lg">ตั้งหลัก</button>}
                    <button onClick={() => deleteImage(img)} className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg">ลบ</button>
                  </div>
                )}
                <button onClick={() => setLightbox(img.image_url)} className="absolute inset-0" />
              </div>
            ))}
            {canUpload && (
              <button onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-white/25 flex flex-col items-center justify-center gap-1 text-slate-600 hover:text-slate-400 transition">
                <span className="text-2xl">+</span>
                <span className="text-xs">เพิ่มรูป</span>
              </button>
            )}
          </div>
        )}
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute top-5 right-5 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-lg">✕</button>
        </div>
      )}
    </div>
  )
}

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="text-lg mb-1">{icon}</div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function ItemDetailPage() {
  // รับ barcode (product_id) จาก URL param
  const { id }        = useParams()   // id คือ barcode / product_id
  const { can, user } = useAuth()
  const navigate      = useNavigate()

  const [product,      setProduct]      = useState(null)
  const [scanRecords,  setScanRecords]  = useState([])   // ประวัติสแกนเข้า
  const [withdrawRecs, setWithdrawRecs] = useState([])   // ประวัติเบิกออก
  const [scanLogs,     setScanLogs]     = useState([])   // scan_logs
  const [loading,      setLoading]      = useState(true)
  const [activeTab,    setActiveTab]    = useState('dashboard')  // dashboard | scan | withdraw

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // 1. ดึงข้อมูลสินค้าจาก products (ใช้ barcode = id)
        const { data: prod } = await supabase
          .from('products').select('*').eq('barcode', id).maybeSingle()
        setProduct(prod)

        // 2. ประวัติสแกนเข้า (scan_records)
        const { data: scans } = await supabase
          .from('scan_records').select('*').eq('product_id', id)
          .order('scanned_at', { ascending: false }).limit(200)
        setScanRecords(scans || [])

        // 3. ประวัติเบิกออก (withdraw_records)
        const { data: wds } = await supabase
          .from('withdraw_records').select('*').eq('product_id', id)
          .order('withdrawn_at', { ascending: false }).limit(200)
        setWithdrawRecs(wds || [])

        // 4. scan_logs ของทุก scan_records ของสินค้านี้
        const { data: logs } = await supabase
          .from('scan_logs').select('*').eq('product_id', id)
          .order('scanned_at', { ascending: false }).limit(200)
        setScanLogs(logs || [])

      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // ── คำนวณ chart data: 14 วันย้อนหลัง ──────────────────────
  const buildDailyData = (records, dateField, valueField = 'quantity') => {
    const days = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const next = new Date(d); next.setDate(d.getDate() + 1)
      const total = records
        .filter(r => { const t = new Date(r[dateField]); return t >= d && t < next })
        .reduce((s, r) => s + (r[valueField] || 0), 0)
      days.push({ label: formatDay(d), value: total })
    }
    return days
  }

  const scanInData    = buildDailyData(scanRecords,  'scanned_at')
  const withdrawData  = buildDailyData(withdrawRecs, 'withdrawn_at')

  // Stock timeline: stock_quantity over time (from scan_logs)
  const stockTimeline = (() => {
    const sorted = [...scanLogs].sort((a, b) => new Date(a.scanned_at) - new Date(b.scanned_at))
    return sorted.slice(-14).map(l => ({ label: formatDay(l.scanned_at), value: l.qty_after }))
  })()

  // Stats
  const totalIn      = scanRecords.reduce((s, r) => s + (r.quantity || 0), 0)
  const totalOut     = withdrawRecs.reduce((s, r) => s + (r.quantity || 0), 0)
  const currentStock = product?.stock_quantity ?? 0
  const unit         = product?.unit || 'ชิ้น'

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayIn    = scanRecords.filter(r => new Date(r.scanned_at) >= todayStart).reduce((s, r) => s + (r.quantity || 0), 0)
  const todayOut   = withdrawRecs.filter(r => new Date(r.withdrawn_at) >= todayStart).reduce((s, r) => s + (r.quantity || 0), 0)

  const sectionCls = sectionColor[product?.section] || 'bg-slate-500/15 text-slate-400 border-slate-500/25'

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen bg-slate-950"><Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  // ── Not found ──
  if (!product) return (
    <div className="min-h-screen bg-slate-950 text-white"><Navbar />
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="text-4xl">🔍</div>
        <p className="text-slate-400">ไม่พบสินค้า <span className="font-mono text-white">{id}</span></p>
        <Link to="/" className="text-blue-400 text-sm hover:text-blue-300">← กลับหน้าหลัก</Link>
      </div>
    </div>
  )

  const tabs = [
    { key: 'dashboard', label: '📊 ภาพรวม' },
    { key: 'scan',      label: `📥 รับเข้า (${scanRecords.length})` },
    { key: 'withdraw',  label: `📤 เบิกออก (${withdrawRecs.length})` },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6 fade-in">

        {/* Back */}
        <Link to="/" className="text-xs text-slate-500 hover:text-white flex items-center gap-1 mb-5 transition">
          ← ภาพรวมสินค้า
        </Link>

        {/* ── Product Header ── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              {product.section && (
                <span className={`text-xs px-2 py-0.5 rounded-full border mb-2 inline-block ${sectionCls}`}>
                  {product.section}
                </span>
              )}
              <h2 className="text-2xl font-bold">{product.name}</h2>
              <p className="text-slate-400 font-mono text-sm mt-0.5">{product.barcode}</p>
              {product.division && <p className="text-xs text-slate-500 mt-1">ฝ่าย: {product.division}</p>}
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold font-mono ${
                currentStock <= 0 ? 'text-red-400' : currentStock <= 5 ? 'text-amber-400' : 'text-white'
              }`}>{currentStock.toLocaleString()}</div>
              <div className="text-slate-400 text-sm">{unit} คงเหลือ</div>
              {currentStock <= 5 && currentStock > 0 && (
                <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full mt-1 inline-block">⚠️ ใกล้หมด</span>
              )}
              {currentStock <= 0 && (
                <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full mt-1 inline-block">🚫 หมดสต็อก</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Image Gallery ── */}
        <ImageGallery productId={product.barcode} canUpload={can('scan')} uploaderName={user?.fullname} />

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 mb-4">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 text-xs py-2 rounded-lg font-medium transition ${
                activeTab === t.key
                  ? 'bg-white text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ TAB: DASHBOARD ══════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon="📥" label="รับเข้าวันนี้"  value={todayIn}  color="text-green-400" unit={unit} />
              <StatCard icon="📤" label="เบิกออกวันนี้"  value={todayOut} color="text-red-400" />
              <StatCard icon="↑"  label="รับเข้าทั้งหมด" value={totalIn.toLocaleString()} color="text-blue-400"
                sub={`${scanRecords.length} ครั้ง`} />
              <StatCard icon="↓"  label="เบิกออกทั้งหมด" value={totalOut.toLocaleString()} color="text-orange-400"
                sub={`${withdrawRecs.length} ครั้ง`} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* รับเข้า 14 วัน */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-3">
                  📥 รับเข้า 14 วัน
                </p>
                <BarChart data={scanInData} color="#60a5fa" />
              </div>

              {/* เบิกออก 14 วัน */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-3">
                  📤 เบิกออก 14 วัน
                </p>
                <BarChart data={withdrawData} color="#f87171" />
              </div>
            </div>

            {/* Stock timeline */}
            {stockTimeline.length >= 2 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-3">
                  📈 แนวโน้มสต็อก (ล่าสุด)
                </p>
                <LineChart data={stockTimeline} color="#34d399" />
              </div>
            )}

            {/* Top withdrawers */}
            {withdrawRecs.length > 0 && (() => {
              const byPerson = {}
              withdrawRecs.forEach(r => {
                const k = r.requester || r.withdrawn_by || '-'
                byPerson[k] = (byPerson[k] || 0) + (r.quantity || 0)
              })
              const sorted = Object.entries(byPerson).sort((a, b) => b[1] - a[1]).slice(0, 5)
              const maxVal = sorted[0]?.[1] || 1
              return (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-3">
                    🏆 ผู้เบิกสูงสุด
                  </p>
                  <div className="space-y-2">
                    {sorted.map(([name, qty], i) => (
                      <div key={name} className="flex items-center gap-3">
                        <span className="text-xs text-slate-600 w-4 shrink-0">#{i + 1}</span>
                        <span className="text-xs text-white w-28 truncate">{name}</span>
                        <div className="flex-1 bg-white/5 rounded-full h-1.5">
                          <div className="bg-orange-400 h-1.5 rounded-full transition-all"
                            style={{ width: `${(qty / maxVal) * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono text-orange-400 w-14 text-right">
                          {qty.toLocaleString()} {unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Info */}
            <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-1">
              {[
                { label: 'Barcode / ID', value: product.barcode },
                { label: 'แผนก',         value: product.section },
                { label: 'ฝ่าย',         value: product.division },
                { label: 'หน่วย',        value: product.unit },
                { label: 'สร้างเมื่อ',   value: formatDate(product.created_at) },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex items-start justify-between py-3 border-b border-white/5 last:border-0">
                  <span className="text-xs text-slate-500 uppercase tracking-wider w-28 shrink-0">{label}</span>
                  <span className="text-sm text-white text-right flex-1 font-medium font-mono">{value}</span>
                </div>
              ) : null)}
            </div>
          </div>
        )}

        {/* ══ TAB: SCAN IN ════════════════════════════════════════ */}
        {activeTab === 'scan' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {scanRecords.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-slate-500 text-sm">ยังไม่มีประวัติการรับเข้า</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      {['จำนวน', 'แผนก', 'ฝ่าย', 'ผู้รับ', 'ผู้สแกน', 'เวลา'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-slate-500 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scanRecords.map(r => (
                      <tr key={r.id} className="border-t border-white/5 hover:bg-white/3 transition">
                        <td className="px-4 py-3 font-mono font-bold text-green-400">+{r.quantity}</td>
                        <td className="px-4 py-3 text-slate-300">{r.section || '-'}</td>
                        <td className="px-4 py-3 text-slate-300">{r.division || '-'}</td>
                        <td className="px-4 py-3 text-slate-300">{r.receiver || '-'}</td>
                        <td className="px-4 py-3 text-slate-400">{r.scanned_by || '-'}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatShort(r.scanned_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: WITHDRAW ═══════════════════════════════════════ */}
        {activeTab === 'withdraw' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {withdrawRecs.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-slate-500 text-sm">ยังไม่มีประวัติการเบิก</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      {['จำนวน', 'แผนก', 'ฝ่าย', 'ผู้เบิก', 'วัตถุประสงค์', 'ผู้ดำเนินการ', 'เวลา'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-slate-500 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawRecs.map(r => (
                      <tr key={r.id} className="border-t border-white/5 hover:bg-white/3 transition">
                        <td className="px-4 py-3 font-mono font-bold text-red-400">−{r.quantity}</td>
                        <td className="px-4 py-3 text-slate-300">{r.section || '-'}</td>
                        <td className="px-4 py-3 text-slate-300">{r.division || '-'}</td>
                        <td className="px-4 py-3 text-slate-300">{r.requester || '-'}</td>
                        <td className="px-4 py-3 text-slate-400 max-w-32 truncate">{r.purpose || '-'}</td>
                        <td className="px-4 py-3 text-slate-400">{r.withdrawn_by || '-'}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatShort(r.withdrawn_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mt-6">
          <Link to="/scan" className="flex-1 text-center bg-white text-slate-900 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-100 active:scale-95 transition">
            📥 สแกนรับเข้า
          </Link>
          <Link to="/withdraw" className="flex-1 text-center bg-red-500/20 border border-red-500/30 text-red-300 font-semibold text-sm py-2.5 rounded-xl hover:bg-red-500/30 active:scale-95 transition">
            📤 เบิกสินค้า
          </Link>
        </div>

      </div>
    </div>
  )
}
