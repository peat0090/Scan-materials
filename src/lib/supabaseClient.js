// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// ✅ ใช้ ANON key เท่านั้น (public key — ปลอดภัยใน client)
// ❌ ห้ามใช้ service_role key ใน frontend เด็ดขาด
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
