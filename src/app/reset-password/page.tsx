"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return setMessage("Password minimal 6 karakter.");
    if (password !== confirm)
      return setMessage("Konfirmasi password tidak cocok.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setMessage("Gagal: " + error.message);
    setMessage("Password berhasil diubah! Mengarahkan ke halaman login...");
    setTimeout(() => router.push("/"), 2000);
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Memverifikasi link reset password...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 border border-slate-100">
        <h1 className="text-xl font-bold text-slate-800 mb-1">
          Buat Password Baru
        </h1>
        <p className="text-sm text-slate-500 mb-5">
          Masukkan password baru untuk akun Anda.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password baru"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-blue-600 bg-slate-50 text-slate-800"
          />
          <input
            type="password"
            required
            placeholder="Ulangi password baru"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-blue-600 bg-slate-50 text-slate-800"
          />
          {message && (
            <p className="text-xs font-bold text-red-500">{message}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Simpan Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
