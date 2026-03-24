import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Navbar from '../components/Navbar'

const SECTIONS  = ['Hydraulic', 'Mechatronic', 'Mechanic', 'IT', 'Admin', 'Logistics', 'QC', 'Production']
const DIVISIONS = ['ฝ่ายซ่อมบำรุง', 'ฝ่ายผลิต', 'ฝ่ายคลังสินค้า', 'ฝ่ายจัดซื้อ', 'ฝ่าย IT', 'ฝ่ายบริหาร']

function QRScanner({ onScan }) {
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const intervalRef = useRef(null)
  const jsQRRef     = useRef(null)
  const [active, setActive]     = useState(false)
  const [error, setError]       = useState('')
  const [scanning, setScanning] = useState(false)
  const [loaded, setLoaded]     = useState(false)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
    script.onload = () => { jsQRRef.current = window.jsQR; setLoaded(true) }
    document.head.appendChild(script)
    return () => { try { document.head.removeChild(script) } catch { /* cleanup */ } }  // ✅ Ln 26 fixed
  }, [])

  const startCamera = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setActive(true)
      setScanning(true)

      intervalRef.current = setInterval(() => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || video.readyState < 2 || !canvas) return
        canvas.width  = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        if (jsQRRef.current) {
          const code = jsQRRef.current(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
          if (code) { clearInterval(intervalRef.current); setScanning(false); onScan(code.data); return }
        }
        if ('BarcodeDetector' in window) {
          new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13', 'ean_8'] })
            .detect(video).then(codes => {
              if (codes.length > 0) { clearInterval(intervalRef.current); setScanning(false); onScan(codes[0].rawValue) }
            }).catch(() => {})
        }
      }, 250)
    } catch (err) { setError('ไม่สามารถเปิดกล้องได้: ' + err.message) }
  }

  const stopCamera = () => {
    clearInterval(intervalRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    setActive(false); setScanning(false)
  }

  useEffect(() => () => stopCamera(), [])

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="relative aspect-video bg-black flex items-center justify-center">
        <video ref={videoRef} className={`w-full h-full object-cover ${active ? '' : 'hidden'}`} muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {!active && (
          <div className="text-center p-8">
            <div className="text-4xl mb-4">📷</div>
            <p className="text-slate-400 text-sm mb-4">{loaded ? 'กดปุ่มด้านล่างเพื่อเปิดกล้องสแกน' : 'กำลังโหลด scanner...'}</p>
            <button onClick={startCamera} disabled={!loaded}
              className="bg-white text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-slate-100 active:scale-95 transition disabled:opacity-50">
              {loaded ? 'เปิดกล้อง' : 'กำลังโหลด...'}
            </button>
          </div>
        )}
        {active && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-52 h-52">
              {['top-0 left-0 border-r-0 border-b-0','top-0 right-0 border-l-0 border-b-0',
                'bottom-0 left-0 border-r-0 border-t-0','bottom-0 right-0 border-l-0 border-t-0'].map((pos, i) => (
                <div key={i} className={`absolute w-7 h-7 border-2 border-white ${pos}`} />
              ))}
              {scanning && <div className="absolute inset-x-0 h-0.5 bg-white/80 scan-line" />}
            </div>
          </div>
        )}
        {active && (
          <button onClick={stopCamera}
            className="absolute top-3 right-3 bg-black/50 text-white text-xs px-3 py-1.5 rounded-lg border border-white/20 hover:bg-black/70 transition">
            ปิดกล้อง
          </button>
        )}
      </div>
      {error && <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs">{error}</div>}
      {scanning && (
        <div className="px-4 py-3 border-t border-white/10 text-slate-400 text-xs flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block" />
          กำลังสแกน... (รองรับ iOS Safari)
        </div>
      )}
    </div>
  )
}

const EMPTY_FORM = { product_id: '', product_name: '', quantity: 1, section: '', division: '', receiver: '', note: '', unit: 'ชิ้น' }

export default function ScanPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [saved,  setSaved]    = useState(false)
  const [error,  setError]    = useState('')
  const [lookup, setLookup]   = useState(null)   // { status: 'found'|'new', existingRecord }
  const [looking, setLooking] = useState(false)

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  // ค้นหาสินค้าและ record ล่าสุดจาก barcode
  const lookupBarcode = async (barcode) => {
    if (!barcode) return
    setLooking(true)
    setLookup(null)

    // 1. ดึงชื่อสินค้าจาก products table
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single()

    // 2. ดึง scan_record ล่าสุดของ barcode นี้
    const { data: existing } = await supabase
      .from('scan_records')
      .select('*')
      .eq('product_id', barcode)
      .order('scanned_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setForm(prev => ({
      ...prev,
      product_id:   barcode,
      product_name: product?.name     || prev.product_name,
      section:      product?.section  || prev.section,
      division:     product?.division || prev.division,
      unit:         product?.unit     || 'ชิ้น',
      quantity:     1,
    }))

    setLookup({
      status:   existing ? 'found' : 'new',
      existing,
      product,
    })
    setLooking(false)
  }

  const handleQRScan = async (raw) => {
    // รองรับทั้ง JSON และ plain barcode
    let barcode = raw
    try {
      const obj = JSON.parse(raw)
      barcode = obj.id || obj.barcode || obj.product_id || raw
      setForm(prev => ({
        ...prev,
        product_name: obj.name || prev.product_name,
        quantity:     obj.qty  || 1,
      }))
    } catch { /* not JSON, use raw value */ }  // ✅ Ln 183 fixed
    await lookupBarcode(barcode)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.product_id.trim()) { setError('กรุณากรอก ID สินค้า'); return }
    setSaving(true); setError('')

    // ถ้ามี record เดิม → บวกจำนวนเพิ่ม
    if (lookup?.existing) {
      const newQty = (lookup.existing.quantity || 0) + Number(form.quantity)
      const { error: err } = await supabase
        .from('scan_records')
        .update({
          quantity:   newQty,
          scanned_by: user?.fullname,
          scanned_at: new Date().toISOString(),
          note:       form.note.trim() || lookup.existing.note,
          receiver:   form.receiver.trim() || lookup.existing.receiver || user?.fullname,
        })
        .eq('id', lookup.existing.id)

      if (err) { setError('บันทึกไม่สำเร็จ: ' + err.message); setSaving(false); return }
      setSaved(true); setSaving(false)
      setTimeout(() => navigate(`/items/${lookup.existing.id}`), 1200)
      return
    }

    // ไม่มี record เดิม → สร้างใหม่
    const { data, error: err } = await supabase
      .from('scan_records')
      .insert([{
        product_id:    form.product_id.trim(),
        product_name:  form.product_name.trim(),
        quantity:      Number(form.quantity) || 1,
        section:       form.section,
        division:      form.division,
        receiver:      form.receiver.trim() || user?.fullname,
        scanned_by:    user?.fullname,
        scanned_by_id: user?.id,
        note:          form.note.trim(),
        scanned_at:    new Date().toISOString(),
      }])
      .select().single()

    if (err) { setError('บันทึกไม่สำเร็จ: ' + err.message); setSaving(false); return }
    setSaved(true); setSaving(false)
    setTimeout(() => navigate(`/items/${data.id}`), 1200)
  }

  if (saved) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center slide-up">
        <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-white font-semibold">บันทึกสำเร็จ!</p>
        <p className="text-slate-500 text-sm mt-1">กำลังไปยังหน้ารายละเอียด...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold">สแกน QR / Barcode สินค้า</h2>
          <p className="text-slate-500 text-sm mt-0.5">รองรับ EAN-13, Code128, QR Code</p>
        </div>

        <div className="mb-4">
          <QRScanner onScan={handleQRScan} />
        </div>

        {/* Status badge หลังสแกน */}
        {looking && (
          <div className="mb-4 flex items-center gap-2 text-slate-400 text-sm px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse inline-block" />
            กำลังค้นหาสินค้า...
          </div>
        )}
        {lookup && !looking && (
          <div className={`mb-4 px-4 py-3 rounded-xl border text-sm flex items-start gap-3 ${
            lookup.status === 'found'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-green-500/10 border-green-500/30 text-green-300'
          }`}>
            <span className="text-lg mt-0.5">{lookup.status === 'found' ? '⚡' : '✨'}</span>
            <div>
              {lookup.status === 'found' ? (
                <>
                  <p className="font-medium">พบสินค้าเดิม — จะบวกจำนวนเข้า record ล่าสุด</p>
                  <p className="text-xs mt-0.5 opacity-75">
                    ปัจจุบัน: {lookup.existing.quantity} {form.unit} · สแกนโดย {lookup.existing.scanned_by}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">
                    {lookup.product ? `พบในระบบ: ${lookup.product.name}` : 'สินค้าใหม่ — จะสร้าง record ใหม่'}
                  </p>
                  {!lookup.product && <p className="text-xs mt-0.5 opacity-75">ไม่พบ barcode นี้ในตาราง products</p>}
                </>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 fade-in">
          <h3 className="text-sm font-semibold text-slate-300 border-b border-white/10 pb-3">ข้อมูลสินค้า</h3>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">⚠️ {error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Barcode / ID */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">
                Barcode / ID <span className="text-red-400">*</span>
              </label>
              <input value={form.product_id}
                onChange={e => { set('product_id', e.target.value); setLookup(null) }}
                onBlur={e => e.target.value && lookupBarcode(e.target.value)}
                placeholder="สแกนหรือพิมพ์ barcode"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20 font-mono" />
            </div>

            {/* ชื่อสินค้า */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">ชื่อสินค้า</label>
              <input value={form.product_name} onChange={e => set('product_name', e.target.value)}
                placeholder="ดึงจาก products อัตโนมัติ"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20" />
            </div>

            {/* จำนวน + หน่วย */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">
                จำนวนที่จะ{lookup?.status === 'found' ? 'บวกเพิ่ม' : 'บันทึก'}
              </label>
              <div className="flex gap-2">
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden flex-1">
                  <button type="button" onClick={() => set('quantity', Math.max(1, form.quantity - 1))}
                    className="px-3 py-2.5 text-white hover:bg-white/10 transition font-mono text-lg leading-none">−</button>
                  <input type="number" min={1} value={form.quantity} onChange={e => set('quantity', Math.max(1, Number(e.target.value)))}
                    className="flex-1 bg-transparent text-center text-sm text-white focus:outline-none font-mono" />
                  <button type="button" onClick={() => set('quantity', form.quantity + 1)}
                    className="px-3 py-2.5 text-white hover:bg-white/10 transition font-mono text-lg leading-none">+</button>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl px-3 flex items-center text-xs text-slate-400 min-w-13 justify-center">
                  {form.unit}
                </div>  {/* ✅ Ln 338 fixed: min-w-[52px] → min-w-13 */}
              </div>
              {lookup?.status === 'found' && (
                <p className="text-xs text-amber-400 mt-1.5">
                  รวมหลังบวก: {(lookup.existing.quantity || 0) + Number(form.quantity)} {form.unit}
                </p>
              )}
            </div>

            {/* แผนก */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">แผนก</label>
              <select value={form.section} onChange={e => set('section', e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20">
                <option value="">-- เลือกแผนก --</option>
                {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* ฝ่าย */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">ฝ่าย</label>
              <select value={form.division} onChange={e => set('division', e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20">
                <option value="">-- เลือกฝ่าย --</option>
                {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* ผู้รับ */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">ผู้รับสินค้า</label>
              <input value={form.receiver} onChange={e => set('receiver', e.target.value)}
                placeholder={`ค่าเริ่มต้น: ${user?.fullname}`}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20" />
            </div>
          </div>

          {/* หมายเหตุ */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">หมายเหตุ</label>
            <textarea rows={2} value={form.note} onChange={e => set('note', e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none" />
          </div>

          {/* ผู้สแกน + เวลา */}
          <div className="bg-white/3 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">ผู้สแกน (อัตโนมัติ)</p>
              <p className="text-sm text-white font-medium">{user?.fullname}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">เวลาปัจจุบัน</p>
              <p className="text-xs text-slate-300 font-mono">
                {new Date().toLocaleString('th-TH', {
                  day: '2-digit', month: 'short', year: '2-digit',
                  hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok'
                })}
              </p>
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full bg-white text-slate-900 font-semibold rounded-xl py-3 text-sm hover:bg-slate-100 active:scale-95 transition disabled:opacity-50">
            {saving ? 'กำลังบันทึก...' : lookup?.status === 'found' ? `⚡ บวกเพิ่ม ${form.quantity} ${form.unit}` : '💾 บันทึกสินค้าใหม่'}
          </button>
        </form>
      </div>
    </div>
  )
}
