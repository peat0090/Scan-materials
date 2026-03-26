import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Navbar from '../components/Navbar'

// ── Helpers ─────────────────────────────────────────────────────
function bytesToSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function ImagePreviewCard({ img, onSetPrimary, onDelete, isPrimary }) {
  const [err, setErr] = useState(false)
  return (
    <div className="relative group aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/3">
      {!err
        ? <img src={img.image_url} alt="" className="w-full h-full object-cover" onError={() => setErr(true)} />
        : <div className="w-full h-full flex items-center justify-center text-slate-700 text-xs">โหลดไม่ได้</div>
      }
      {isPrimary && (
        <span className="absolute top-1.5 left-1.5 text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-semibold">
          หลัก
        </span>
      )}
      <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
        {!isPrimary && (
          <button onClick={() => onSetPrimary(img.id)}
            className="w-full text-[11px] bg-blue-500 hover:bg-blue-400 text-white py-1.5 rounded-lg transition font-medium">
            ตั้งเป็นหลัก
          </button>
        )}
        <button onClick={() => onDelete(img)}
          className="w-full text-[11px] bg-red-500/80 hover:bg-red-500 text-white py-1.5 rounded-lg transition font-medium">
          ลบรูป
        </button>
      </div>
    </div>
  )
}

// ── Drop Zone ────────────────────────────────────────────────────
function DropZone({ onFiles, uploading }) {
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    const files = [...(e.dataTransfer?.files || [])]
    if (files.length) onFiles(files)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-3 py-10 px-6 text-center select-none
        ${dragging ? 'border-blue-400 bg-blue-500/10' : 'border-white/15 bg-white/3 hover:border-white/30 hover:bg-white/5'}`}
    >
      <input
        ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { onFiles([...e.target.files]); e.target.value = '' }}
      />
      {uploading ? (
        <>
          <span className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-sm text-slate-400">กำลังอัปโหลด...</p>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl">
            🖼️
          </div>
          <div>
            <p className="text-sm font-medium text-white">ลากรูปมาวางที่นี่</p>
            <p className="text-xs text-slate-500 mt-1">หรือกดเพื่อเลือกไฟล์ · รองรับ JPG, PNG, WEBP</p>
            <p className="text-xs text-slate-600 mt-0.5">Ctrl+V วางจาก clipboard ได้เลย</p>
          </div>
        </>
      )}
    </div>
  )
}

// ── Camera Capture ───────────────────────────────────────────────
function CameraCapture({ onCapture, onClose }) {
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const streamRef  = useRef(null)
  const [ready, setReady] = useState(false)
  const [err,   setErr]   = useState('')

  useEffect(() => {
    const start = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        streamRef.current = s
        videoRef.current.srcObject = s
        await videoRef.current.play()
        setReady(true)
      } catch (e) { setErr('ไม่สามารถเปิดกล้อง: ' + e.message) }
    }
    start()
    return () => streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const shoot = () => {
    const v = videoRef.current, c = canvasRef.current
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0)
    c.toBlob(blob => {
      const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' })
      onCapture(file)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }, 'image/jpeg', 0.92)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 gap-4">
      <div className="w-full max-w-lg rounded-2xl overflow-hidden border border-white/10 bg-black relative">
        <video ref={videoRef} className="w-full" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {err && <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm p-4 text-center">{err}</div>}
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="px-5 py-2.5 bg-white/10 border border-white/15 text-white text-sm rounded-xl hover:bg-white/15 transition">
          ยกเลิก
        </button>
        <button onClick={shoot} disabled={!ready}
          className="px-8 py-2.5 bg-white text-slate-900 font-bold text-sm rounded-xl hover:bg-slate-100 active:scale-95 transition disabled:opacity-40">
          📸 ถ่ายรูป
        </button>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────
export default function ImageManagerPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const isAdmin = user?.role === 'admin'

  // redirect non-admin
  useEffect(() => {
    if (user && !isAdmin) navigate('/')
  }, [user, isAdmin, navigate])

  const [products,    setProducts]    = useState([])
  const [selectedId,  setSelectedId]  = useState('')
  const [images,      setImages]      = useState([])
  const [uploading,   setUploading]   = useState(false)
  const [uploadErr,   setUploadErr]   = useState('')
  const [uploadLog,   setUploadLog]   = useState([]) // [{name, status, url}]
  const [showCamera,  setShowCamera]  = useState(false)
  const [search,      setSearch]      = useState('')
  const [loadingImgs, setLoadingImgs] = useState(false)

  // load products
  useEffect(() => {
    supabase.from('products').select('barcode, name, section, unit')
      .order('name').then(({ data }) => setProducts(data || []))
  }, [])

  // load images for selected product
  const loadImages = useCallback(async () => {
    if (!selectedId) { setImages([]); return }
    setLoadingImgs(true)
    const { data } = await supabase.from('product_images').select('*')
      .eq('product_id', selectedId)
      .order('is_primary', { ascending: false })
      .order('created_at',  { ascending: false })
    setImages(data || [])
    setLoadingImgs(false)
  }, [selectedId])

  useEffect(() => { loadImages() }, [loadImages])

  // Ctrl+V paste
  useEffect(() => {
    if (!selectedId) return
    const fn = (e) => {
      for (const item of e.clipboardData?.items || []) {
        if (item.type.startsWith('image/')) { handleFiles([item.getAsFile()]); break }
      }
    }
    window.addEventListener('paste', fn)
    return () => window.removeEventListener('paste', fn)
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFiles = async (files) => {
    if (!selectedId) { setUploadErr('กรุณาเลือกสินค้าก่อน'); return }
    setUploading(true); setUploadErr(''); setUploadLog([])
    const log = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        log.push({ name: file.name, status: 'error', msg: 'ไม่ใช่รูปภาพ' }); continue
      }
      try {
        const ext = file.name?.split('.').pop()?.toLowerCase() || 'png'
        const fileName = `${selectedId}/${Date.now()}_${Math.random().toString(36).slice(2,7)}.${ext}`
        const { error: sErr } = await supabase.storage
          .from('product-images').upload(fileName, file, { upsert: false })
        if (sErr) throw sErr
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName)
        const isPrimary = images.length === 0 && log.filter(l => l.status === 'ok').length === 0
        const { error: dErr } = await supabase.from('product_images').insert({
          product_id:  selectedId,
          image_url:   publicUrl,
          is_primary:  isPrimary,
          uploaded_by: user?.fullname,
        })
        if (dErr) throw dErr
        log.push({ name: file.name, status: 'ok', url: publicUrl, size: file.size })
      } catch (err) {
        log.push({ name: file.name, status: 'error', msg: err.message })
      }
    }
    setUploadLog(log)
    setUploading(false)
    await loadImages()
  }

  const setPrimary = async (imgId) => {
    await supabase.from('product_images').update({ is_primary: false }).eq('product_id', selectedId)
    await supabase.from('product_images').update({ is_primary: true  }).eq('id', imgId)
    await loadImages()
  }

  const deleteImage = async (img) => {
    if (!window.confirm(`ลบรูปนี้?`)) return
    const path = img.image_url.split('/product-images/')[1]
    if (path) await supabase.storage.from('product-images').remove([decodeURIComponent(path)])
    await supabase.from('product_images').delete().eq('id', img.id)
    await loadImages()
  }

  const filteredProducts = products.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(search.toLowerCase())
  )

  const selectedProduct = products.find(p => p.barcode === selectedId)

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      {showCamera && (
        <CameraCapture
          onCapture={(file) => { setShowCamera(false); handleFiles([file]) }}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 font-medium">Admin Only</span>
          </div>
          <h2 className="text-xl font-bold text-white">จัดการรูปภาพสินค้า</h2>
          <p className="text-slate-500 text-sm mt-0.5">อัปโหลด แก้ไข และจัดการรูปภาพของสินค้าทั้งหมด</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* ── Left: Product Selector ── */}
          <div className="lg:col-span-2 space-y-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">เลือกสินค้า</p>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ค้นหาสินค้า..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
              <div className="max-h-105 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="py-8 text-center text-slate-600 text-xs">ไม่พบสินค้า</div>
                ) : filteredProducts.map(p => (
                  <button
                    key={p.barcode}
                    onClick={() => { setSelectedId(p.barcode); setUploadErr(''); setUploadLog([]) }}
                    className={`w-full text-left px-4 py-3 border-b border-white/5 last:border-0 transition hover:bg-white/5 ${
                      selectedId === p.barcode ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : ''
                    }`}
                  >
                    <p className="text-xs font-medium text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5 truncate">{p.barcode}</p>
                    {p.section && <p className="text-[10px] text-slate-700 mt-0.5">{p.section}</p>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Upload + Gallery ── */}
          <div className="lg:col-span-3 space-y-4">

            {!selectedId ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl py-16 flex flex-col items-center justify-center gap-3">
                <div className="text-4xl">👈</div>
                <p className="text-slate-500 text-sm">เลือกสินค้าจากรายการทางซ้าย</p>
              </div>
            ) : (
              <>
                {/* Selected product header */}
                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{selectedProduct?.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{selectedId}</p>
                  </div>
                  <span className="text-xs text-slate-500">{images.length} รูป</span>
                </div>

                {/* Upload area */}
                <div className="space-y-2">
                  <DropZone onFiles={handleFiles} uploading={uploading} />

                  {/* Camera button */}
                  <button
                    onClick={() => setShowCamera(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 hover:bg-white/8 hover:text-white transition"
                  >
                    📷 ถ่ายรูปจากกล้อง
                  </button>
                </div>

                {/* Upload error */}
                {uploadErr && (
                  <div className="px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs">
                    ⚠️ {uploadErr}
                  </div>
                )}

                {/* Upload log */}
                {uploadLog.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 space-y-1.5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">ผลการอัปโหลด</p>
                    {uploadLog.map((l, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span>{l.status === 'ok' ? '✅' : '❌'}</span>
                        <span className="text-slate-300 truncate flex-1">{l.name}</span>
                        {l.status === 'ok'
                          ? <span className="text-slate-600">{bytesToSize(l.size)}</span>
                          : <span className="text-red-400">{l.msg}</span>
                        }
                      </div>
                    ))}
                  </div>
                )}

                {/* Image gallery */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    รูปภาพที่มีอยู่
                    {images.length > 0 && <span className="text-slate-600 ml-1 normal-case font-normal">· รูปแรก = แสดงใน Dashboard card</span>}
                  </p>
                  {loadingImgs ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse" />
                      ))}
                    </div>
                  ) : images.length === 0 ? (
                    <div className="py-8 text-center text-slate-600 text-xs">ยังไม่มีรูปภาพสำหรับสินค้านี้</div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {images.map(img => (
                        <ImagePreviewCard
                          key={img.id}
                          img={img}
                          isPrimary={img.is_primary}
                          onSetPrimary={setPrimary}
                          onDelete={deleteImage}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Tip: image size */}
                <div className="px-4 py-3 bg-blue-500/5 border border-blue-500/15 rounded-xl text-xs text-slate-500 space-y-1">
                  <p className="text-blue-400 font-medium">💡 ขนาดรูปที่แนะนำ</p>
                  <p>• ขนาดขั้นต่ำ: <span className="text-white">400×400 px</span> (แสดงใน card ได้)</p>
                  <p>• แนะนำ: <span className="text-white">800×800 px</span> ขึ้นไป สัดส่วน 1:1</p>
                  <p>• รูปแรกที่มี <span className="text-blue-300">badge "หลัก"</span> คือรูปที่แสดงใน Dashboard</p>
                  <p>• ขนาดไฟล์ไม่เกิน <span className="text-white">5 MB</span> ต่อรูป</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
