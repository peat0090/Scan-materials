import { useState, useEffect } from 'react'
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

const Row = ({ label, value }) => (
  <div className="flex items-start justify-between py-3 border-b border-white/5">
    <span className="text-xs text-slate-500 uppercase tracking-wider w-28 shrink-0">{label}</span>
    <span className="text-sm text-white text-right flex-1 font-medium">{value || '-'}</span>
  </div>
)

export default function ItemDetailPage() {
  const { id }    = useParams()
  const { can }   = useAuth()
  const navigate  = useNavigate()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('scan_records')
        .select('*')
        .eq('id', id)
        .single()
      setRecord(data)
      setLoading(false)
    }
    fetch()
  }, [id])

  const handleDelete = async () => {
    if (!window.confirm('ยืนยันการลบรายการนี้?')) return
    setDeleting(true)
    await supabase.from('scan_records').delete().eq('id', id)
    navigate('/history')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-12 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <div className="text-3xl mb-3">🔍</div>
          <p className="text-slate-400">ไม่พบรายการนี้</p>
          <Link to="/" className="text-blue-400 text-sm mt-3 inline-block hover:text-blue-300">
            ← กลับหน้าหลัก
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-6 fade-in">
        {/* Back */}
        <Link to="/history" className="text-xs text-slate-500 hover:text-white flex items-center gap-1 mb-5 transition">
          ← ประวัติการสแกน
        </Link>

        {/* Header card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">สินค้า</p>
              <h2 className="text-xl font-bold">{record.product_name || record.product_id}</h2>
              {record.product_name && (
                <p className="text-slate-400 font-mono text-sm mt-0.5">{record.product_id}</p>
              )}
            </div>
            <div className="bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-bold font-mono">×{record.quantity}</p>
              <p className="text-xs text-slate-500">จำนวน</p>
            </div>
          </div>
        </div>

        {/* Detail rows */}
        <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-1 mb-4">
          <Row label="แผนก"     value={record.section} />
          <Row label="ฝ่าย"     value={record.division} />
          <Row label="ผู้รับ"    value={record.receiver} />
          <Row label="ผู้สแกน"  value={record.scanned_by} />
          <Row label="เวลาสแกน" value={formatDate(record.scanned_at)} />
          {record.note && <Row label="หมายเหตุ" value={record.note} />}
        </div>

        {/* Record ID */}
        <div className="bg-white/3 border border-white/5 rounded-xl px-4 py-3 mb-6">
          <p className="text-xs text-slate-600 mb-0.5">Record ID</p>
          <p className="text-xs text-slate-400 font-mono">{record.id}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            to="/scan"
            className="flex-1 text-center bg-white text-slate-900 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-100 active:scale-95 transition"
          >
            + สแกนใหม่
          </Link>
          {can('delete') && (
            <button
              onClick={handleDelete}
              disabled={deleting}
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
