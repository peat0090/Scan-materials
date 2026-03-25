import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Navbar from '../components/Navbar'

const SECTIONS  = ['Hydraulic', 'Mechatronic', 'Mechanic', 'IT', 'Admin', 'Logistics', 'QC', 'Production']
const DIVISIONS = ['ฝ่ายซ่อมบำรุง', 'ฝ่ายผลิต', 'ฝ่ายคลังสินค้า', 'ฝ่ายจัดซื้อ', 'ฝ่าย IT', 'ฝ่ายบริหาร']
const UNITS     = ['ชิ้น', 'อัน', 'ตัว', 'เส้น', 'ม้วน', 'กล่อง', 'ถุง', 'แพ็ค', 'โหล', 'กิโลกรัม', 'กรัม', 'ลิตร', 'มิลลิลิตร', 'เมตร', 'ฟุต']

// ── QR Scanner (ใช้โค้ดเดิมจาก ScanPage) ──────────────────────
function QRScanner({ onScan }) {
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const intervalRef = useRef(null)
  const jsQRRef     = useRef(null)
  const [active,   setActive]   = useState(false)
  const [error,    setError]    = useState('')
  const [scanning, setScanning] = useState(false)
  const [loaded,   setLoaded]   = useState(false)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
    script.onload = () => { jsQRRef.current = window.jsQR; setLoaded(true) }
    document.head.appendChild(script)
    return () => { try { document.head.removeChild(script) } catch { /* cleanup */ } }
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
      setActive(true); setScanning(true)
      intervalRef.current = setInterval(() => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || video.readyState < 2 || !canvas) return
        canvas.width = video.videoWidth; canvas.height = video.videoHeight
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
                <div key={i} className={`absolute w-7 h-7 border-2 border-red-400 ${pos}`} />
              ))}
              {scanning && <div className="absolute inset-x-0 h-0.5 bg-red-400/80 scan-line" />}
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
          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse inline-block" />
          กำลังสแกน... (รองรับ iOS Safari)
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────
const EMPTY_FORM = {
  product_id: '', product_name: '', quantity: 1,
  section: '', division: '', requester: '', purpose: '', note: '', unit: 'ชิ้น',
}

export default function WithdrawPage() {
  const { user } = useAuth()

  const [form,    setForm]    = useState(EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')
  const [lookup,  setLookup]  = useState(null)   // { stock, product }
  const [looking, setLooking] = useState(false)

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  // ── ค้นหาสต็อกสินค้า ──
  const lookupBarcode = useCallback(async (barcode) => {
    if (!barcode) return
    setLooking(true)
    setLookup(null)

    try {
      // รวม qty ทั้งหมดจาก scan_records
      const { data: recs } = await supabase
        .from('scan_records')
        .select('quantity, unit, product_name, section, division')
        .eq('product_id', barcode)

      // รวม qty ที่เบิกไปแล้ว (ถ้าตารางยังไม่มีให้ถือว่า 0)
      const { data: withdraws } = await supabase
        .from('withdraw_records')
        .select('quantity')
        .eq('product_id', barcode)

      const totalIn  = (recs || []).reduce((s, r) => s + (r.quantity || 0), 0)
      const totalOut = (withdraws || []).reduce((s, r) => s + (r.quantity || 0), 0)
      const stock    = totalIn - totalOut
      const lastRec  = (recs || [])[0]

      // ดึงข้อมูลจาก products table (maybeSingle = ไม่ error ถ้าไม่พบ)
      const { data: product } = await supabase
        .from('products').select('*').eq('barcode', barcode).maybeSingle()

      setForm(prev => ({
        ...prev,
        product_id:   barcode,
        product_name: product?.name     || lastRec?.product_name || prev.product_name,
        section:      product?.section  || lastRec?.section      || prev.section,
        division:     product?.division || lastRec?.division     || prev.division,
        unit:         product?.unit     || lastRec?.unit         || 'ชิ้น',
        quantity:     1,
        requester:    user?.fullname || '',
      }))

      // found = มีใน scan_records แม้ไม่มีใน products table
      setLookup({ stock, product, found: totalIn > 0 })
    } catch (err) {
      console.error('lookupBarcode error:', err)
      setLookup({ stock: 0, product: null, found: false })
    } finally {
      setLooking(false)
    }
  }, [user])

  const handleQRScan = (value) => {
    set('product_id', value)
    lookupBarcode(value)
  }

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.product_id) return setError('กรุณากรอก Barcode / ID สินค้า')

    const qty = Number(form.quantity)
    if (qty <= 0) return setError('จำนวนต้องมากกว่า 0')

    // ตรวจสต็อก
    if (lookup && qty > lookup.stock) {
      return setError(`สต็อกไม่พอ — มีอยู่ ${lookup.stock} ${form.unit} แต่ขอเบิก ${qty} ${form.unit}`)
    }

    setSaving(true); setError('')
    try {
      const { error: dbErr } = await supabase
        .from('withdraw_records')
        .insert({
          product_id:   form.product_id,
          product_name: form.product_name,
          quantity:     qty,
          unit:         form.unit,
          section:      form.section,
          division:     form.division,
          requester:    form.requester || user?.fullname,
          purpose:      form.purpose,
          note:         form.note,
          withdrawn_by: user?.fullname,
        })
      if (dbErr) throw dbErr

      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setForm(EMPTY_FORM)
        setLookup(null)
      }, 2500)
    } catch (err) {
      setError('บันทึกไม่สำเร็จ: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Saved overlay ──
  if (saved) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-3xl animate-bounce">
            📤
          </div>
          <h2 className="text-xl font-bold text-white">เบิกสำเร็จ!</h2>
          <p className="text-slate-400 text-sm">
            เบิก <span className="text-white font-mono font-bold">{form.quantity} {form.unit}</span>
            <br />{form.product_name || form.product_id}
          </p>
          {lookup && (
            <p className="text-xs text-slate-600">
              สต็อกคงเหลือ: {lookup.stock - Number(form.quantity)} {form.unit}
            </p>
          )}
          <button
            onClick={() => { setSaved(false); setForm(EMPTY_FORM); setLookup(null) }}
            className="mt-2 text-xs text-slate-500 hover:text-white transition"
          >
            เบิกรายการต่อไป →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-bold">เบิกใช้สินค้า</h2>
          <p className="text-slate-500 text-sm mt-0.5">สแกน QR / Barcode เพื่อเบิกสินค้าออกจากสต็อก</p>
        </div>

        {/* Scanner */}
        <div className="mb-4">
          <QRScanner onScan={handleQRScan} />
        </div>

        {/* Status badge */}
        {looking && (
          <div className="mb-4 flex items-center gap-2 text-slate-400 text-sm px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse inline-block" />
            กำลังตรวจสอบสต็อก...
          </div>
        )}

        {lookup && !looking && (
          <div className={`mb-4 px-4 py-3 rounded-xl border text-sm flex items-start gap-3 ${
            !lookup.found
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : lookup.stock <= 0
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : lookup.stock <= 5
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-green-500/10 border-green-500/30 text-green-300'
          }`}>
            <span className="text-lg mt-0.5">
              {!lookup.found ? '❌' : lookup.stock <= 0 ? '🚫' : lookup.stock <= 5 ? '⚠️' : '✅'}
            </span>
            <div>
              {!lookup.found ? (
                <p className="font-medium">ไม่พบสินค้านี้ในระบบ</p>
              ) : lookup.stock <= 0 ? (
                <p className="font-medium">สต็อกหมดแล้ว — ไม่สามารถเบิกได้</p>
              ) : (
                <>
                  <p className="font-medium">
                    สต็อกคงเหลือ: <span className="font-mono font-bold">{lookup.stock}</span> {form.unit}
                  </p>
                  {lookup.stock <= 5 && (
                    <p className="text-xs mt-0.5 opacity-75">⚠️ สต็อกใกล้หมด</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 fade-in">
          <h3 className="text-sm font-semibold text-slate-300 border-b border-white/10 pb-3">ข้อมูลการเบิก</h3>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              ⚠️ {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Barcode */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">
                Barcode / ID <span className="text-red-400">*</span>
              </label>
              <input
                value={form.product_id}
                onChange={e => { set('product_id', e.target.value); setLookup(null) }}
                onBlur={e => e.target.value && lookupBarcode(e.target.value)}
                placeholder="สแกนหรือพิมพ์ barcode"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20 font-mono"
              />
            </div>

            {/* ชื่อสินค้า */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">ชื่อสินค้า</label>
              <input
                value={form.product_name}
                onChange={e => set('product_name', e.target.value)}
                placeholder="ดึงจากระบบอัตโนมัติ"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>

            {/* จำนวน + หน่วย */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">
                จำนวนที่เบิก <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden flex-1">
                  <button type="button" onClick={() => set('quantity', Math.max(1, form.quantity - 1))}
                    className="px-3 py-2.5 text-white hover:bg-white/10 transition font-mono text-lg leading-none">−</button>
                  <input
                    type="number" min={1}
                    value={form.quantity}
                    onChange={e => set('quantity', Math.max(1, Number(e.target.value)))}
                    className="flex-1 bg-transparent text-center text-sm text-white focus:outline-none font-mono"
                  />
                  <button type="button" onClick={() => set('quantity', form.quantity + 1)}
                    className="px-3 py-2.5 text-white hover:bg-white/10 transition font-mono text-lg leading-none">+</button>
                </div>
                <select
                  value={form.unit}
                  onChange={e => set('unit', e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-2 py-2.5 text-xs text-white focus:outline-none min-w-20"
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              {lookup?.found && lookup.stock > 0 && (
                <p className={`text-xs mt-1.5 ${Number(form.quantity) > lookup.stock ? 'text-red-400' : 'text-slate-500'}`}>
                  คงเหลือหลังเบิก: {lookup.stock - Number(form.quantity)} {form.unit}
                  {Number(form.quantity) > lookup.stock && ' ⚠️ เกินสต็อก'}
                </p>
              )}
            </div>

            {/* แผนก */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">แผนก</label>
              <select
                value={form.section}
                onChange={e => set('section', e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
              >
                <option value="">-- เลือกแผนก --</option>
                {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* ฝ่าย */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">ฝ่าย</label>
              <select
                value={form.division}
                onChange={e => set('division', e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
              >
                <option value="">-- เลือกฝ่าย --</option>
                {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* ผู้เบิก */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">ผู้เบิก</label>
              <input
                value={form.requester}
                onChange={e => set('requester', e.target.value)}
                placeholder={`ค่าเริ่มต้น: ${user?.fullname}`}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
          </div>

          {/* วัตถุประสงค์ */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">วัตถุประสงค์การเบิก</label>
            <input
              value={form.purpose}
              onChange={e => set('purpose', e.target.value)}
              placeholder="เช่น ซ่อมบำรุงเครื่องจักร, ใช้งานในการผลิต..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>

          {/* หมายเหตุ */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">หมายเหตุ</label>
            <textarea
              rows={2} value={form.note}
              onChange={e => set('note', e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
            />
          </div>

          {/* ผู้ดำเนินการ + เวลา */}
          <div className="bg-white/3 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">ผู้ดำเนินการ</p>
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

          <button
            type="submit"
            disabled={saving || (lookup && (!lookup.found || lookup.stock <= 0))}
            className="w-full bg-red-500 text-white font-semibold rounded-xl py-3 text-sm hover:bg-red-400 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving
              ? 'กำลังบันทึก...'
              : lookup && lookup.stock <= 0 && lookup.found
              ? '🚫 สต็อกหมด'
              : `📤 ยืนยันเบิก ${form.quantity} ${form.unit}`
            }
          </button>
        </form>
      </div>
    </div>
  )
}
