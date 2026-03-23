import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Navbar from '../components/Navbar'

const SECTIONS = ['Hydraulic', 'Mechatronic', 'Mechanic', 'IT', 'Admin', 'Logistics', 'QC', 'Production']
const DIVISIONS = ['ฝ่ายซ่อมบำรุง', 'ฝ่ายผลิต', 'ฝ่ายคลังสินค้า', 'ฝ่ายจัดซื้อ', 'ฝ่าย IT', 'ฝ่ายบริหาร']

function QRScanner({ onScan }) {
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const intervalRef = useRef(null)
  const [active, setActive]   = useState(false)
  const [error, setError]     = useState('')
  const [scanning, setScanning] = useState(false)

  const startCamera = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      videoRef.current.play()
      setActive(true)
      setScanning(true)

      // Poll for QR using BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13', 'code_39'] })
        intervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes.length > 0) {
              clearInterval(intervalRef.current)
              setScanning(false)
              onScan(codes[0].rawValue)
            }
          } catch (_) {}
        }, 300)
      } else {
        setError('BarcodeDetector ไม่รองรับบนเบราว์เซอร์นี้ กรุณากรอกข้อมูลด้วยตนเอง')
        setScanning(false)
      }
    } catch (err) {
      setError('ไม่สามารถเปิดกล้องได้: ' + err.message)
    }
  }

  const stopCamera = () => {
    clearInterval(intervalRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    setActive(false)
    setScanning(false)
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
            <p className="text-slate-400 text-sm mb-4">กดปุ่มด้านล่างเพื่อเปิดกล้องสแกน QR Code</p>
            <button
              onClick={startCamera}
              className="bg-white text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-slate-100 active:scale-95 transition"
            >
              เปิดกล้อง
            </button>
          </div>
        )}

        {/* Scan overlay */}
        {active && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-48 h-48 corner-pulse">
              {/* Corners */}
              {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                <div key={i} className={`absolute w-6 h-6 border-2 border-white ${pos} ${
                  i === 0 ? 'border-r-0 border-b-0' :
                  i === 1 ? 'border-l-0 border-b-0' :
                  i === 2 ? 'border-r-0 border-t-0' :
                            'border-l-0 border-t-0'
                }`} />
              ))}
              {/* Scan line */}
              {scanning && (
                <div className="absolute inset-x-0 h-0.5 bg-white/70 scan-line shadow-[0_0_8px_white]" />
              )}
            </div>
          </div>
        )}

        {active && (
          <button
            onClick={stopCamera}
            className="absolute top-3 right-3 bg-black/50 text-white text-xs px-3 py-1.5 rounded-lg border border-white/20 hover:bg-black/70 transition"
          >
            ปิดกล้อง
          </button>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs">{error}</div>
      )}
      {scanning && (
        <div className="px-4 py-3 border-t border-white/10 text-slate-400 text-xs flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block" />
          กำลังสแกน...
        </div>
      )}
    </div>
  )
}

export default function ScanPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [form, setForm] = useState({
    product_id:   '',
    product_name: '',
    quantity:     1,
    section:      '',
    division:     '',
    receiver:     '',
    note:         '',
  })

  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  // Parse a QR value into the form
  const handleQRScan = (raw) => {
    // Try JSON first: { id, name, quantity, ... }
    try {
      const obj = JSON.parse(raw)
      setForm(prev => ({
        ...prev,
        product_id:   obj.id   || obj.product_id   || prev.product_id,
        product_name: obj.name || obj.product_name || prev.product_name,
        quantity:     obj.qty  || obj.quantity      || prev.quantity,
      }))
      return
    } catch (_) {}

    // Fallback: treat raw as product_id
    setForm(prev => ({ ...prev, product_id: raw }))
  }

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.product_id.trim()) { setError('กรุณากรอก ID สินค้า'); return }
    setSaving(true)
    setError('')

    const payload = {
      product_id:   form.product_id.trim(),
      product_name: form.product_name.trim(),
      quantity:     Number(form.quantity) || 1,
      section:      form.section,
      division:     form.division,
      receiver:     form.receiver.trim() || user?.fullname,
      scanned_by:   user?.fullname,
      scanned_by_id: user?.id,
      note:         form.note.trim(),
      scanned_at:   new Date().toISOString(),
    }

    const { data, error: err } = await supabase
      .from('scan_records')
      .insert([payload])
      .select()
      .single()

    if (err) {
      setError('บันทึกไม่สำเร็จ: ' + err.message)
      setSaving(false)
      return
    }

    setSaved(true)
    setSaving(false)

    setTimeout(() => {
      navigate(`/items/${data.id}`)
    }, 1200)
  }

  if (saved) {
    return (
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
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold">สแกน QR Code สินค้า</h2>
          <p className="text-slate-500 text-sm mt-0.5">สแกนหรือกรอกข้อมูลสินค้าด้วยตนเอง</p>
        </div>

        {/* QR Camera */}
        <div className="mb-6">
          <QRScanner onScan={handleQRScan} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 fade-in">
          <h3 className="text-sm font-semibold text-slate-300 border-b border-white/10 pb-3">
            ข้อมูลสินค้า
          </h3>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              ⚠️ {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Product ID */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">
                ID สินค้า <span className="text-red-400">*</span>
              </label>
              <input
                value={form.product_id}
                onChange={e => set('product_id', e.target.value)}
                placeholder="เช่น SKU-0001 หรือจากการสแกน"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20 font-mono"
              />
            </div>

            {/* Product Name */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">ชื่อสินค้า</label>
              <input
                value={form.product_name}
                onChange={e => set('product_name', e.target.value)}
                placeholder="ชื่อสินค้า / รุ่น"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">จำนวน</label>
              <input
                type="number" min={1}
                value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 font-mono"
              />
            </div>

            {/* Section / Department */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">แผนก</label>
              <select
                value={form.section}
                onChange={e => set('section', e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
              >
                <option value="">-- เลือกแผนก --</option>
                {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Division */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">ฝ่าย</label>
              <select
                value={form.division}
                onChange={e => set('division', e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
              >
                <option value="">-- เลือกฝ่าย --</option>
                {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Receiver */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">ผู้รับสินค้า</label>
              <input
                value={form.receiver}
                onChange={e => set('receiver', e.target.value)}
                placeholder={`ค่าเริ่มต้น: ${user?.fullname}`}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">หมายเหตุ</label>
            <textarea
              rows={2}
              value={form.note}
              onChange={e => set('note', e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
            />
          </div>

          {/* Scanned by (read-only) */}
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
                  hour: '2-digit', minute: '2-digit',
                  timeZone: 'Asia/Bangkok'
                })}
              </p>
            </div>
          </div>

          <button
            type="submit" disabled={saving}
            className="w-full bg-white text-slate-900 font-semibold rounded-xl py-3 text-sm hover:bg-slate-100 active:scale-95 transition disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : '💾 บันทึกข้อมูล'}
          </button>
        </form>
      </div>
    </div>
  )
}
