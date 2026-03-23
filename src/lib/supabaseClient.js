// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://agvqbdqyfixfwrbkijlx.supabase.co'
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFndnFiZHF5Zml4ZndyYmtpamx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI0MTYzMiwiZXhwIjoyMDg5ODE3NjMyfQ.u-OYcA7Z46XUKz-uNfmzaPxXWbcYfyP2v0juExpUwSw'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
