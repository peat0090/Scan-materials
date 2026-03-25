import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

const formatDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
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

const Row = ({ label, value }) => (
  <div className="flex items-start justify-between py-3 border-b border-white/5">
    <span className="text-xs text-slate-500 uppercase tracking-wider w-28 shrink-0">{label}</span>
    <span className="text-sm text-white text-right flex-1 font-medium">{value || '-'}</span>
  </div>
)

// ── Image Gallery ──────────────────────────────────────────────
function ImageGallery({ productId, canUpload, uploaderName }) {
  const fileRef   = useRef(null)
  const dropRef   = useRef(null)

  const [images,    setImages]    = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [lightbox,  setLightbox]  = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [pasteHint,  setPasteHint]  = useState(false) // แสดง hint กะพริบ

  const loadImages = async () => {
    const { data } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })
    setImages(data || [])
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadImages() }, [productId])

  // ── Upload core ──
  const uploadFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setUploadErr('รองรับเฉพาะไฟล์รูปภาพเท่านั้น')
      return
    }
    setUploading(true)
    setUploadErr('')
    try {
      const ext      = file.name?.split('.').pop() || file.type.split('/')[1] || 'png'
      const fileName = `${productId}/${Date.now()}.${ext}`

      const { error: storageErr } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { upsert: false })
      if (storageErr) throw storageErr

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName)

      const isFirst = images.length === 0
      const { error: dbErr } = await supabase
        .from('product_images')
        .insert({
          product_id:  productId,
          image_url:   publicUrl,
          is_primary:  isFirst,
          uploaded_by: uploaderName,
        })
      if (dbErr) throw dbErr
      await loadImages()
    } catch (err) {
      setUploadErr('อัปโหลดไม่สำเร็จ: ' + err.message)
    } finally {
      setUploading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, uploaderName, images.length])

  // ── File input change ──
  const handleFileInput = (e) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  // ── Paste (Ctrl+V / Cmd+V) ──
  useEffect(() => {
    if (!canUpload) return
    const handlePaste = (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) { uploadFile(file); break }
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [canUpload, uploadFile])

  // ── Drag & Drop ──
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = (e) => {
    if (!dropRef.current?.contains(e.relatedTarget)) setIsDragging(false)
  }
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  // ── Primary / Delete ──
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

  // ── Paste hint pulse ──
  useEffect(() => {
    if (!canUpload) return
    setPasteHint(true)
    const t = setTimeout(() => setPasteHint(false), 3000)
    return () => clearTimeout(t)
  }, [canUpload])

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4">

      {/* Header */}
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">รูปภาพสินค้า</p>
          <span className="text-xs text-slate-500">{images.length} รูป</span>
        </div>
        {canUpload && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Paste hint */}
            <span className={`text-xs text-slate-600 transition-opacity duration-700 ${pasteHint ? 'opacity-100' : 'opacity-40'}`}>
              Ctrl+V วางรูปได้เลย
            </span>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs bg-white/10 border border-white/10 text-white px-3 py-1.5 rounded-lg hover:bg-white/15 transition disabled:opacity-50"
            >
              {uploading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังอัปโหลด...
                </span>
              ) : (
                <>📷 เลือกไฟล์</>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
          </div>
        )}
      </div>

      {/* Error */}
      {uploadErr && (
        <div className="mx-5 mt-3 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
          ⚠️ {uploadErr}
        </div>
      )}

      {/* Drop Zone + Gallery */}
      <div
        ref={dropRef}
        onDragOver={canUpload ? handleDragOver : undefined}
        onDragLeave={canUpload ? handleDragLeave : undefined}
        onDrop={canUpload ? handleDrop : undefined}
        className={`relative transition-all duration-200 ${
          isDragging ? 'bg-blue-500/10 ring-2 ring-inset ring-blue-500/40' : ''
        }`}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-4xl mb-2">📥</div>
            <p className="text-blue-300 text-sm font-semibold">วางรูปที่นี่</p>
          </div>
        )}

        {images.length === 0 ? (
          /* Empty state — ทำเป็น drop zone ใหญ่ */
          <div
            onClick={canUpload ? () => fileRef.current?.click() : undefined}
            className={`px-5 py-10 text-center ${canUpload ? 'cursor-pointer' : ''} ${isDragging ? 'opacity-0' : ''}`}
          >
            <div className="text-3xl mb-3">🖼️</div>
            {canUpload ? (
              <>
                <p className="text-sm text-slate-400 font-medium">ลากรูปมาวาง หรือกดเพื่อเลือก</p>
                <p className="text-xs text-slate-600 mt-1">รองรับ JPG, PNG, WEBP · วาง Ctrl+V ได้ทันที</p>
              </>
            ) : (
              <p className="text-xs text-slate-600">ยังไม่มีรูปภาพ</p>
            )}
          </div>
        ) : (
          <div className={`p-4 grid grid-cols-3 gap-2 ${isDragging ? 'opacity-20' : ''}`}>
            {images.map(img => (
              <div
                key={img.id}
                className="relative group aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10"
              >
                <img
                  src={img.image_url}
                  alt=""
                  className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => setLightbox(img.image_url)}
                />

                {img.is_primary && (
                  <span className="absolute top-1.5 left-1.5 text-xs bg-amber-500/80 text-white px-1.5 py-0.5 rounded-md backdrop-blur-sm font-medium">
                    ⭐ หลัก
                  </span>
                )}

                {canUpload && (
                  <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1.5 p-2">
                    {!img.is_primary && (
                      <button
                        onClick={() => setPrimary(img.id)}
                        className="w-full text-xs bg-amber-500/80 text-white px-2 py-1.5 rounded-lg hover:bg-amber-500 transition"
                      >
                        ⭐ ตั้งเป็นรูปหลัก
                      </button>
                    )}
                    <button
                      onClick={() => deleteImage(img)}
                      className="w-full text-xs bg-red-500/70 text-white px-2 py-1.5 rounded-lg hover:bg-red-500 transition"
                    >
                      🗑 ลบรูป
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* ช่อง + เพิ่มรูป */}
            {canUpload && (
              <button
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-white/25 flex flex-col items-center justify-center gap-1 text-slate-600 hover:text-slate-400 transition"
              >
                <span className="text-2xl">+</span>
                <span className="text-xs">เพิ่มรูป</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-5 right-5 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition text-lg"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function ItemDetailPage() {
  const { id }            = useParams()
  const { can, user }     = useAuth()
  const navigate          = useNavigate()

  const [record,      setRecord]      = useState(null)
  const [logs,        setLogs]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [deleting,    setDeleting]    = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: rec, error } = await supabase
          .from('scan_records').select('*').eq('id', id).single()
        if (error) throw error
        setRecord(rec)
        if (rec) {
          const { data: logsData } = await supabase
            .from('scan_logs').select('*').eq('record_id', id)
            .order('scanned_at', { ascending: false })
          setLogs(logsData || [])
        }
      } catch (err) {
        console.error(err)
        setRecord(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleDelete = async () => {
    if (!window.confirm('ยืนยันการลบรายการนี้?')) return
    setDeleting(true); setDeleteError('')
    const { error } = await supabase.from('scan_records').delete().eq('id', id)
    if (error) { setDeleteError('ลบไม่สำเร็จ: ' + error.message); setDeleting(false); return }
    navigate('/history')
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950"><Navbar />
      <div className="max-w-lg mx-auto px-4 py-12 space-y-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  if (!record) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Navbar />
      <div className="text-center">
        <div className="text-3xl mb-3">🔍</div>
        <p className="text-slate-400">ไม่พบรายการนี้</p>
        <Link to="/" className="text-blue-400 text-sm mt-3 inline-block hover:text-blue-300">← กลับหน้าหลัก</Link>
      </div>
    </div>
  )

  const unit = record.unit || 'ชิ้น'

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-6 fade-in">

        <Link to="/history" className="text-xs text-slate-500 hover:text-white flex items-center gap-1 mb-5 transition">
          ← ประวัติการสแกน
        </Link>

        {/* Header card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">สินค้า</p>
              <h2 className="text-xl font-bold">{record.product_name || record.product_id}</h2>
              {record.product_name && <p className="text-slate-400 font-mono text-sm mt-0.5">{record.product_id}</p>}
            </div>
            <div className="bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-center min-w-18">
              <p className="text-2xl font-bold font-mono">{record.quantity}</p>
              <p className="text-xs text-slate-500">{unit}</p>
            </div>
          </div>
        </div>

        {/* Gallery */}
        <ImageGallery
          productId={record.product_id}
          canUpload={can('scan')}
          uploaderName={user?.fullname}
        />

        {/* Detail rows */}
        <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-1 mb-4">
          <Row label="แผนก"          value={record.section} />
          <Row label="ฝ่าย"          value={record.division} />
          <Row label="ผู้รับ"         value={record.receiver} />
          <Row label="ผู้สแกนล่าสุด" value={record.scanned_by} />
          <Row label="อัปเดตล่าสุด"  value={formatDate(record.scanned_at)} />
          {record.note && <Row label="หมายเหตุ" value={record.note} />}
        </div>

        {/* Scan logs */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">ประวัติการเพิ่ม</p>
            <span className="text-xs text-slate-500">{logs.length} ครั้ง</span>
          </div>
          {logs.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-xs text-slate-600">ยังไม่มีประวัติการเพิ่ม</p>
              <p className="text-xs text-slate-700 mt-1">log จะบันทึกเมื่อมีการสแกนซ้ำครั้งต่อไป</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {logs.map((log, i) => (
                <div key={log.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-green-400 text-xs font-mono font-bold">+{log.qty_added}</span>
                    </div>
                    <div>
                      <p className="text-xs text-white font-medium">
                        {log.qty_before}<span className="text-slate-500 mx-1">→</span>
                        <span className="text-green-400">{log.qty_after}</span>
                        <span className="text-slate-500 ml-1">{unit}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{log.scanned_by} · {formatShort(log.scanned_at)}</p>
                      {log.note && <p className="text-xs text-slate-600 mt-0.5 italic">{log.note}</p>}
                    </div>
                  </div>
                  <span className="text-xs text-slate-700 shrink-0">#{logs.length - i}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Record ID */}
        <div className="bg-white/3 border border-white/5 rounded-xl px-4 py-3 mb-6">
          <p className="text-xs text-slate-600 mb-0.5">Record ID</p>
          <p className="text-xs text-slate-400 font-mono break-all">{record.id}</p>
        </div>

        {deleteError && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">
            ⚠️ {deleteError}
          </div>
        )}

        <div className="flex gap-3">
          <Link to="/scan" className="flex-1 text-center bg-white text-slate-900 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-100 active:scale-95 transition">
            + สแกนใหม่
          </Link>
          {can('delete') && (
            <button
              onClick={handleDelete} disabled={deleting}
              className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium rounded-xl hover:bg-red-500/20 active:scale-95 transition disabled:opacity-50"
            >
              {deleting ? '...' : '🗑 ลบ'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
