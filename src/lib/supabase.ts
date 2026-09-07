import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true, // supaya login tetap tersimpan setelah refresh
    autoRefreshToken: true, // token auth diperbarui otomatis sebelum kedaluwarsa
    detectSessionInUrl: true, // WAJIB — ini yang membaca token dari link reset password
  },
});
