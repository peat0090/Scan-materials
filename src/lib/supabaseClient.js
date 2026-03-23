// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://agvqbdqyfixfwrbkijlx.supabase.co'
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFndnFiZHF5Zml4ZndyYmtpamx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNDE2MzIsImV4cCI6MjA4OTgxNzYzMn0.WtIr2yys6y1tjmGGwvmL9Wd6A4ALgPg2IWOTuDYFN1k'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
