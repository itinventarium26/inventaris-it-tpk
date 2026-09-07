"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";

export default function Home() {
  // State untuk modal kelola akun
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({
    emailBaru: "",
    passwordLama: "",
    passwordBaru: "",
    konfirmasiPassword: "",
  });
  const [isAccountSubmitting, setIsAccountSubmitting] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<"input" | "reset">("input");
  const [forgotAdminData, setForgotAdminData] = useState<any>(null);
  const [newPasswordReset, setNewPasswordReset] = useState("");

  // --- STATE AKUN (Default: Viewer) ---
  const [currentUser, setCurrentUser] = useState({
    username: "Tamu",
    role: "viewer",
  });

  // State Modal Login & Register
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authData, setAuthData] = useState({ username: "", password: "" });
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // State Inventaris Utama
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState("Dashboard");

  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nama_barang: "",
    tahun_masuk: new Date().getFullYear(),
    stok: 1,
    kondisi: "Aman",
    status_pemanfaatan: "Tersimpan",
    lokasi: "",
    gambar: "",
  });
  const [imgError, setImgError] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [isOutModalOpen, setIsOutModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [outFormData, setOutFormData] = useState({
    jumlah: 1,
    kondisiBaru: "Aman",
    status_pemanfaatan: "Digunakan",
    lokasi: "",
    keterangan: "",
  });

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // --- State Fitur QR dan Cetak Label ---
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [printQuantities, setPrintQuantities] = useState<
    Record<number, number>
  >({});
  const [editQtyItem, setEditQtyItem] = useState<any>(null);
  const [scanBarcode, setScanBarcode] = useState<string | null>(null);
  const [scannedItem, setScannedItem] = useState<any>(null);
  const [loadingScan, setLoadingScan] = useState(false);

  const [scanLogs, setScanLogs] = useState<any[]>([]);
  const [loadingScanLogs, setLoadingScanLogs] = useState(false);

  // Muat sesi admin yang tersimpan, jika ada
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();
        setCurrentUser({
          username: session.user.email || "Admin",
          role: profile?.role || "viewer",
        });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .maybeSingle();
          setCurrentUser({
            username: session.user.email || "Admin",
            role: profile?.role || "viewer",
          });
        } else {
          setCurrentUser({ username: "Tamu", role: "viewer" });
        }
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchItems();
  }, []);

  // Deteksi apakah URL sedang dibuka lewat scan QR (?scan=BARCODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scan = params.get("scan");
    if (scan) setScanBarcode(scan);
  }, []);

  const [scannedVariants, setScannedVariants] = useState<any[]>([]);
  // ganti semua pemakaian `scannedItem` (untuk state hasil scan) jadi scannedVariants

  useEffect(() => {
    if (!scanBarcode) return;
    async function fetchScannedItem() {
      setLoadingScan(true);
      try {
        const { data, error } = await supabase
          .from("items")
          .select("*")
          .eq("barcode", scanBarcode)
          .order("id", { ascending: true });
        if (error) throw error;
        setScannedVariants(data || []);
      } catch (error: any) {
        console.error(error.message);
      } finally {
        setLoadingScan(false);
      }
    }
    fetchScannedItem();
  }, [scanBarcode]);

  // Ambil riwayat transaksi & perawatan untuk barang yang di-scan
  useEffect(() => {
    if (scannedVariants.length === 0) return;
    async function fetchScanLogs() {
      setLoadingScanLogs(true);
      try {
        const ids = scannedVariants.map((v) => v.id);
        const { data: logs } = await supabase
          .from("log_transaksi")
          .select("*")
          .in("item_id", ids)
          .order("id", { ascending: false });
        setScanLogs(logs || []);
      } finally {
        setLoadingScanLogs(false);
      }
    }
    fetchScanLogs();
  }, [scannedVariants]);

  async function fetchItems() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("id", { ascending: false });
      if (error) throw error;
      if (data) setItems(data);
    } catch (error: any) {
      showToast("Gagal memuat data: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string, type: "success" | "error" = "success") {
    setNotification({ show: true, message, type });
    setTimeout(
      () => setNotification({ show: false, message: "", type: "success" }),
      3000,
    );
  }

  // --- LOGIKA LOGIN & TAMBAH AKUN ---
  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      const emailBersih = authData.username.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithPassword({
        email: emailBersih,
        password: authData.password,
      });
      if (error) throw error;

      showToast("Selamat datang!", "success");
      setIsLoginModalOpen(false);
      setAuthData({ username: "", password: "" });

      if (scanBarcode) {
        window.history.replaceState({}, "", window.location.pathname);
        setScanBarcode(null);
        setScannedItem(null);
      }
    } catch (error: any) {
      showToast("Email atau password salah!", "error");
    } finally {
      setIsAuthLoading(false);
    }
  }
  async function handleLogout() {
    await supabase.auth.signOut();
    setCurrentUser({ username: "Tamu", role: "viewer" });
    showToast("Anda telah keluar.", "success");
    setActiveMenu("Dashboard");
  }
  // Fungsi ubah email
  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setIsAccountSubmitting(true);
    try {
      const emailBaru = accountForm.emailBaru.trim().toLowerCase();
      const { error } = await supabase.auth.updateUser({ email: emailBaru });
      if (error) throw error;
      showToast(
        "Cek email lama & baru Anda untuk konfirmasi perubahan!",
        "success",
      );
      setAccountForm({
        emailBaru: "",
        passwordLama: "",
        passwordBaru: "",
        konfirmasiPassword: "",
      });
      setIsAccountModalOpen(false);
    } catch (error: any) {
      showToast("Gagal ubah email: " + error.message, "error");
    } finally {
      setIsAccountSubmitting(false);
    }
  }

  // Fungsi ubah password
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setIsAccountSubmitting(true);
    try {
      if (accountForm.passwordBaru !== accountForm.konfirmasiPassword) {
        showToast("Konfirmasi password tidak cocok!", "error");
        return;
      }
      if (accountForm.passwordBaru.length < 6) {
        showToast("Password baru minimal 6 karakter!", "error");
        return;
      }
      const { error } = await supabase.auth.updateUser({
        password: accountForm.passwordBaru,
      });
      if (error) throw error;
      showToast("Password berhasil diperbarui!", "success");
      setAccountForm({
        emailBaru: "",
        passwordLama: "",
        passwordBaru: "",
        konfirmasiPassword: "",
      });
      setIsAccountModalOpen(false);
    } catch (error: any) {
      showToast("Gagal ubah password: " + error.message, "error");
    } finally {
      setIsAccountSubmitting(false);
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsAccountSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        forgotEmail.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/reset-password` },
      );
      if (error) throw error;
      showToast("Link reset password sudah dikirim ke email!", "success");
      setIsForgotMode(false);
      setForgotEmail("");
    } catch (error: any) {
      showToast("Gagal: " + error.message, "error");
    } finally {
      setIsAccountSubmitting(false);
    }
  }

  // --- PERHITUNGAN STATISTIK ---
  const totalBarang = items.reduce((sum, item) => sum + (item.stok || 0), 0);
  const totalAman = items
    .filter((i) => i.kondisi === "Aman")
    .reduce((sum, i) => sum + (i.stok || 0), 0);
  const totalMaintenance = items
    .filter((i) => i.kondisi === "Maintenance")
    .reduce((sum, i) => sum + (i.stok || 0), 0);
  const totalRusak = items
    .filter((i) => i.kondisi === "Rusak")
    .reduce((sum, i) => sum + (i.stok || 0), 0);

  const uniqueLocations = Array.from(
    new Set(items.map((item) => item.lokasi).filter(Boolean)),
  );
  const uniqueItemNames = Array.from(
    new Set(items.map((item) => item.nama_barang).filter(Boolean)),
  );
  const allSearchableValues = Array.from(
    new Set(
      items.flatMap((item) => [
        item.nama_barang,
        String(item.tahun_masuk),
        item.kondisi,
        item.status_pemanfaatan,
        item.lokasi,
        item.barcode,
      ]),
    ),
  );

  const dropdownSuggestions = allSearchableValues
    .filter((val) => val.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 5);

  const filteredItems = items.filter((item) => {
    const matchTab = activeMenu === "Semua" || item.kondisi === activeMenu;
    const searchLower = searchQuery.toLowerCase();
    const matchSearch =
      item.nama_barang.toLowerCase().includes(searchLower) ||
      String(item.tahun_masuk).toLowerCase().includes(searchLower) ||
      item.kondisi.toLowerCase().includes(searchLower) ||
      item.status_pemanfaatan.toLowerCase().includes(searchLower) ||
      item.lokasi.toLowerCase().includes(searchLower) ||
      item.barcode.toLowerCase().includes(searchLower);
    return matchTab && matchSearch;
  });

  // --- Helper untuk "Pilih Semua" ---
  const allSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIds.includes(item.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((item) => item.id));
    }
  }

  // --- FUNGSI DATABASE INVENTARIS ---
  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const namaBersih = formData.nama_barang.trim();
      const lokasiBersih = formData.lokasi.trim();

      // Cek apakah Nama Barang + Tahun Masuk sudah pernah didaftarkan
      const { data: existingRows, error: errCheck } = await supabase
        .from("items")
        .select("id")
        .ilike("nama_barang", namaBersih)
        .eq("tahun_masuk", Number(formData.tahun_masuk));
      if (errCheck) throw errCheck;

      if (existingRows && existingRows.length > 0) {
        showToast(
          `Barang "${namaBersih}" tahun ${formData.tahun_masuk} sudah terdaftar. Gunakan menu Mutasi atau Edit.`,
          "error",
        );
        setIsSubmitting(false);
        return;
      }

      const finalBarcode = `TPK-IT-${formData.tahun_masuk}-${Math.floor(Math.random() * 9000) + 1000}`;
      const { data: newData, error: errInsert } = await supabase
        .from("items")
        .insert([
          {
            nama_barang: namaBersih,
            tahun_masuk: Number(formData.tahun_masuk),
            stok: Number(formData.stok),
            kondisi: formData.kondisi,
            status_pemanfaatan: formData.status_pemanfaatan,
            lokasi: lokasiBersih,
            barcode: finalBarcode,
            gambar: formData.gambar || null,
          },
        ])
        .select()
        .single();
      if (errInsert) throw errInsert;

      await supabase.from("log_transaksi").insert([
        {
          item_id: newData.id,
          jenis_transaksi: "Masuk",
          jumlah: Number(formData.stok),
          keterangan: "Penambahan stok baru",
        },
      ]);

      showToast(
        `Berhasil! Barang diproses (Barcode: ${finalBarcode})`,
        "success",
      );
      setFormData({
        nama_barang: "",
        tahun_masuk: new Date().getFullYear(),
        stok: 1,
        kondisi: "Aman",
        status_pemanfaatan: "Tersimpan",
        lokasi: "",
        gambar: "",
      });
      setImgError("");
      setIsAddModalOpen(false);
      fetchItems();
    } catch (error: any) {
      showToast("Gagal: " + error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (outFormData.jumlah > selectedItem.stok) {
      showToast("Gagal! Jumlah melebihi stok yang tersedia.", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const lokasiBaru = outFormData.lokasi.trim();
      const sama =
        outFormData.kondisiBaru === selectedItem.kondisi &&
        outFormData.status_pemanfaatan === selectedItem.status_pemanfaatan &&
        lokasiBaru === selectedItem.lokasi;

      let targetItemId = selectedItem.id;

      if (!sama) {
        const sisaStok = selectedItem.stok - outFormData.jumlah;

        // Cari baris tujuan yang sudah persis sama (selain baris asal)
        const { data: tujuan, error: errCari } = await supabase
          .from("items")
          .select("*")
          .eq("barcode", selectedItem.barcode)
          .eq("kondisi", outFormData.kondisiBaru)
          .eq("status_pemanfaatan", outFormData.status_pemanfaatan)
          .eq("lokasi", lokasiBaru)
          .neq("id", selectedItem.id)
          .maybeSingle();
        if (errCari) throw errCari;

        if (tujuan) {
          // Gabung ke baris tujuan yang sudah ada
          const { error: e1 } = await supabase
            .from("items")
            .update({ stok: tujuan.stok + outFormData.jumlah })
            .eq("id", tujuan.id);
          if (e1) throw e1;
          targetItemId = tujuan.id;

          if (sisaStok > 0) {
            const { error: e2 } = await supabase
              .from("items")
              .update({ stok: sisaStok })
              .eq("id", selectedItem.id);
            if (e2) throw e2;
          } else {
            // Pindahkan riwayat log dari baris asal ke baris tujuan sebelum baris asal dihapus,
            // supaya tidak melanggar foreign key constraint
            const { error: eLogMove } = await supabase
              .from("log_transaksi")
              .update({ item_id: tujuan.id })
              .eq("item_id", selectedItem.id);
            if (eLogMove) throw eLogMove;

            const { error: e3 } = await supabase
              .from("items")
              .delete()
              .eq("id", selectedItem.id);
            if (e3) throw e3;
          }
        } else if (sisaStok > 0) {
          // Baris tujuan belum ada, sebagian pindah -> buat baris baru
          const { data: baru, error: e4 } = await supabase
            .from("items")
            .insert([
              {
                nama_barang: selectedItem.nama_barang,
                tahun_masuk: selectedItem.tahun_masuk,
                stok: outFormData.jumlah,
                kondisi: outFormData.kondisiBaru,
                status_pemanfaatan: outFormData.status_pemanfaatan,
                lokasi: lokasiBaru,
                barcode: selectedItem.barcode,
                gambar: selectedItem.gambar,
              },
            ])
            .select()
            .single();
          if (e4) throw e4;
          targetItemId = baru.id;
          const { error: e5 } = await supabase
            .from("items")
            .update({ stok: sisaStok })
            .eq("id", selectedItem.id);
          if (e5) throw e5;
        } else {
          // Semua pindah, tujuan belum ada -> rename baris asal
          const { error: e6 } = await supabase
            .from("items")
            .update({
              kondisi: outFormData.kondisiBaru,
              status_pemanfaatan: outFormData.status_pemanfaatan,
              lokasi: lokasiBaru,
            })
            .eq("id", selectedItem.id);
          if (e6) throw e6;
        }
      }

      const { error: errLog } = await supabase.from("log_transaksi").insert([
        {
          item_id: targetItemId,
          jenis_transaksi: sama ? "Catatan" : "Mutasi/Perubahan Kondisi",
          jumlah: outFormData.jumlah,
          keterangan: outFormData.keterangan,
        },
      ]);
      if (errLog) throw errLog;

      showToast(`Sukses! ${outFormData.jumlah} unit diproses.`, "success");
      setIsOutModalOpen(false);
      fetchItems();
    } catch (error: any) {
      showToast("Error: " + error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setImgError("Ukuran gambar maksimal 500KB.");
      e.target.value = "";
      return;
    }
    setImgError("");
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((f) => ({ ...f, gambar: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  function handleEditImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setImgError("Ukuran gambar maksimal 500KB.");
      e.target.value = "";
      return;
    }
    setImgError("");
    const reader = new FileReader();
    reader.onload = () => {
      setEditFormData((f: any) => ({
        ...f,
        gambar: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  }

  function openEditModal(item: any) {
    setEditFormData({ ...item });
    setIsEditModalOpen(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const {
        id,
        nama_barang,
        tahun_masuk,
        stok,
        kondisi,
        status_pemanfaatan,
        lokasi,
        gambar,
        barcode,
      } = editFormData;
      const namaBersih = nama_barang.trim();

      // Cek bentrok dengan kelompok barang LAIN (barcode berbeda)
      const { data: bentrok, error: errCheck } = await supabase
        .from("items")
        .select("id")
        .ilike("nama_barang", namaBersih)
        .eq("tahun_masuk", Number(tahun_masuk))
        .neq("barcode", barcode);
      if (errCheck) throw errCheck;

      if (bentrok && bentrok.length > 0) {
        showToast(
          `Nama "${namaBersih}" tahun ${tahun_masuk} sudah dipakai barang lain. Tidak bisa disimpan.`,
          "error",
        );
        setIsSubmitting(false);
        return;
      }
      const { data: dataLama } = await supabase
        .from("items")
        .select("stok")
        .eq("id", id)
        .single();

      // Update data utama (kondisi, stok, lokasi, dll) hanya untuk baris ini
      await supabase
        .from("items")
        .update({
          nama_barang: namaBersih,
          tahun_masuk: Number(tahun_masuk),
          stok: Number(stok),
          kondisi,
          status_pemanfaatan,
          lokasi,
        })
        .eq("id", id);

      // Jika ada gambar baru, update ke SEMUA baris dengan barcode yang sama
      if (gambar) {
        await supabase
          .from("items")
          .update({ gambar: gambar })
          .eq("barcode", barcode);
      }

      if (dataLama && Number(stok) !== dataLama.stok) {
        const selisih = Number(stok) - dataLama.stok;
        await supabase.from("log_transaksi").insert([
          {
            item_id: id,
            jenis_transaksi: "Edit Stok",
            jumlah: Math.abs(selisih),
            keterangan: `Stok diedit dari ${dataLama.stok} ke ${stok} (${selisih > 0 ? "+" : ""}${selisih}).`,
          },
        ]);
      }

      showToast("Data barang berhasil diperbarui.", "success");
      setIsEditModalOpen(false);
      fetchItems();
    } catch (error: any) {
      showToast("Gagal update: " + error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  function requestDelete(item: any) {
    setDeleteTarget(item);
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      // 1. Cari apakah ada barang/varian lain dengan kode QR (barcode) yang sama
      const { data: siblingItems, error: errSibling } = await supabase
        .from("items")
        .select("id")
        .eq("barcode", deleteTarget.barcode)
        .neq("id", deleteTarget.id);

      if (errSibling) throw errSibling;

      if (siblingItems && siblingItems.length > 0) {
        // --- KASUS A: Masih ada barang lain dengan kode QR yang sama ---
        const survivingId = siblingItems[0].id;

        // Pindahkan log transaksi lama ke ID barang yang masih tersisa
        const { error: errMoveLog } = await supabase
          .from("log_transaksi")
          .update({ item_id: survivingId })
          .eq("item_id", deleteTarget.id);
        if (errMoveLog) throw errMoveLog;

        // Catat di log bahwa sebagian barang (kondisi tertentu) telah dihapus
        const { error: errInsertLog } = await supabase
          .from("log_transaksi")
          .insert([
            {
              item_id: survivingId,
              jenis_transaksi: "Keluar / Penghapusan",
              jumlah: deleteTarget.stok,
              keterangan: `Barang kondisi "${deleteTarget.kondisi}" di lokasi "${deleteTarget.lokasi}" sejumlah ${deleteTarget.stok} unit telah dihapus.`,
            },
          ]);
        if (errInsertLog) throw errInsertLog;

        // Hapus varian barang tersebut dari database
        const { error: errDelete } = await supabase
          .from("items")
          .delete()
          .eq("id", deleteTarget.id);
        if (errDelete) throw errDelete;

        showToast(
          `Barang (${deleteTarget.kondisi}) berhasil dihapus dari database dan dicatat ke log.`,
          "success",
        );
      } else {
        // --- KASUS B: Semua barang dengan kode QR tersebut dihapus ---
        // Hapus log transaksi dan data barang secara permanen
        const { error: errDeleteLog } = await supabase
          .from("log_transaksi")
          .delete()
          .eq("item_id", deleteTarget.id);
        if (errDeleteLog) throw errDeleteLog;

        const { error: errDelete } = await supabase
          .from("items")
          .delete()
          .eq("id", deleteTarget.id);
        if (errDelete) throw errDelete;

        showToast(
          "Seluruh data barang beserta log berhasil dihapus permanen.",
          "success",
        );
      }

      setDeleteTarget(null);
      fetchItems();
    } catch (error: any) {
      showToast("Gagal hapus: " + error.message, "error");
    }
  }

  function openOutModal(item: any) {
    setSelectedItem(item);
    setOutFormData({
      jumlah: 1,
      kondisiBaru: item.kondisi,
      status_pemanfaatan: item.status_pemanfaatan,
      lokasi: item.lokasi,
      keterangan: "",
    });
    setIsOutModalOpen(true);
  }

  async function openHistoryModal(item: any) {
    setSelectedItem(item);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    setHistoryLogs([]);
    try {
      const { data: relatedItems } = await supabase
        .from("items")
        .select("id")
        .eq("barcode", item.barcode);
      const ids = relatedItems?.map((r) => r.id) || [];
      if (ids.length > 0) {
        const { data: logs } = await supabase
          .from("log_transaksi")
          .select("*")
          .in("item_id", ids)
          .order("id", { ascending: false });
        setHistoryLogs(logs || []);
      }
    } catch (error: any) {
      showToast("Gagal menarik riwayat: " + error.message, "error");
    } finally {
      setLoadingHistory(false);
    }
  }

  function formatTime(timestamp: string) {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Jika halaman ini dibuka dari hasil scan QR, tampilkan info barang saja
  if (scanBarcode) {
    const kondisiStyle: Record<string, string> = {
      Aman: "bg-green-400 text-green-950",
      Maintenance: "bg-yellow-300 text-yellow-950",
      Rusak: "bg-red-400 text-red-950",
    };
    const kondisiAggregat = scannedVariants.reduce(
      (acc: Record<string, number>, v) => {
        acc[v.kondisi] = (acc[v.kondisi] || 0) + (v.stok || 0);
        return acc;
      },
      {},
    );
    const totalStok = scannedVariants.reduce((s, v) => s + (v.stok || 0), 0);

    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-blue-600 via-blue-50 to-slate-100 flex flex-col justify-between">
        <div>
          {/* Top bar */}
          <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo-inventarium.jpg"
                alt="Logo"
                className="w-10 h-10 rounded-xl object-cover border-2 border-white/80 shadow-md"
              />
              <div>
                <h1 className="text-base font-bold text-white leading-tight drop-shadow-sm">
                  Inventarium IT
                </h1>
                <p className="text-[11px] font-medium text-blue-100">
                  TPK Bitung
                </p>
              </div>
            </div>
            {currentUser.role === "viewer" ? (
              <button
                onClick={() => {
                  setAuthData({ username: "", password: "" });
                  setIsLoginModalOpen(true);
                }}
                className="px-4 py-2 bg-white rounded-xl text-xs font-bold text-blue-700 shadow-md hover:bg-blue-50 transition-all active:scale-95"
              >
                Masuk
              </button>
            ) : (
              <span className="px-4 py-2 bg-white/20 text-white rounded-xl text-xs font-bold backdrop-blur-md border border-white/30 shadow-sm">
                👤 {currentUser.username}
              </span>
            )}
          </header>

          {/* Content Container */}
          <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
            {loadingScan ? (
              <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white p-6 sm:p-10 space-y-4 animate-pulse max-w-3xl mx-auto">
                <div className="h-40 bg-slate-200/60 rounded-2xl" />
                <div className="h-5 bg-slate-200/60 rounded w-2/3 mx-auto" />
                <div className="h-4 bg-slate-200/60 rounded w-1/3 mx-auto" />
              </div>
            ) : scannedVariants.length > 0 ? (
              <div className="space-y-6">
                {/* HERO SECTION */}
                <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-650 to-indigo-700 shadow-xl border border-white/20">
                  {/* Decorative Background */}
                  <div
                    className="absolute inset-0 opacity-[0.10] pointer-events-none"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle, white 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  />

                  {/* Decorative Blobs */}
                  <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-32 -left-24 w-80 h-80 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />

                  {/* Content */}
                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-7 lg:gap-10 p-5 sm:p-7 lg:p-9">
                    {/* ===================================================== */}
                    {/* IMAGE AREA - LEFT */}
                    {/* ===================================================== */}

                    <div className="flex items-center justify-center">
                      {scannedVariants[0].gambar ? (
                        <div className="relative inline-flex max-w-full">
                          {/* Outer Glow - opsional */}
                          <div className="absolute -inset-3 rounded-2xl bg-white/10 blur-xl" />

                          {/* FOTO + BORDER SAJA */}
                          <div className="relative inline-flex max-w-full rounded-2xl border-10 border-white/90 overflow-hidden shadow-2xl">
                            <img
                              src={scannedVariants[0].gambar}
                              alt={scannedVariants[0].nama_barang}
                              className="
                              block
                              w-auto
                              h-auto
                              max-w-[500px]
                              max-h-[430px]
                              object-contain
                              rounded-xl
                              transition-transform
                              duration-500
                              hover:scale-[1.025]
                            "
                            />
                          </div>

                          {/* Bottom Decorative Accent */}
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-white/30 blur-sm" />
                        </div>
                      ) : (
                        /* No Image */
                        <div className="relative w-full max-w-[520px]">
                          <div className="relative flex flex-col items-center justify-center aspect-[4/3] rounded-[2rem] bg-white/10 border border-white/20 backdrop-blur-sm shadow-inner">
                            <div className="absolute w-32 h-32 rounded-full bg-white/5 blur-xl" />

                            <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 border border-white/20 mb-4">
                              <span className="text-4xl sm:text-5xl">📦</span>
                            </div>

                            <p className="relative text-sm sm:text-base font-semibold text-white">
                              Foto Tidak Tersedia
                            </p>

                            <p className="relative text-xs text-blue-100/70 mt-1">
                              Belum ada gambar untuk barang ini
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ===================================================== */}
                    {/* INFORMATION AREA - RIGHT */}
                    {/* ===================================================== */}

                    <div className="flex flex-col justify-center">
                      {/* Section Label */}
                      <div className="mb-4">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3.5 py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-blue-50 backdrop-blur-sm">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/15">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z"
                              />
                            </svg>
                          </span>
                          Informasi Barang
                        </span>
                      </div>

                      {/* Title */}
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.08] drop-shadow-sm">
                        {scannedVariants[0].nama_barang}
                      </h1>

                      {/* Small Divider */}
                      <div className="flex items-center gap-3 mt-5 mb-6">
                        <div className="h-1 w-12 rounded-full bg-white/70" />

                        <div className="h-px flex-1 max-w-[160px] bg-white/20" />
                      </div>

                      {/* Status Heading */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-bold text-white">
                            Kondisi Barang
                          </p>
                        </div>
                      </div>

                      {/* ===================================================== */}
                      {/* CONDITION CARDS */}
                      {/* ===================================================== */}

                      <div
                        className={`
          grid gap-3
          ${
            Object.entries(kondisiAggregat).length === 1
              ? "grid-cols-1 max-w-[220px]"
              : Object.entries(kondisiAggregat).length === 2
                ? "grid-cols-2"
                : "grid-cols-2 xl:grid-cols-3"
          }
        `}
                      >
                        {Object.entries(kondisiAggregat).map(
                          ([kondisi, total]) => (
                            <div
                              key={kondisi}
                              className={`
                group relative overflow-hidden
                rounded-2xl
                px-4 py-4
                shadow-lg
                backdrop-blur-md
                transition-all duration-300
                hover:-translate-y-1
                hover:shadow-2xl
                ${kondisiStyle[kondisi] || "bg-slate-300 text-slate-900"}
              `}
                            >
                              {/* Card Decorative Circle */}
                              <div className="absolute -right-5 -top-5 w-16 h-16 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500" />

                              <div className="relative">
                                {/* Condition Name */}
                                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-70">
                                  {kondisi}
                                </p>

                                {/* Number */}
                                <div className="flex items-end gap-1.5 mt-1">
                                  <p className="text-2xl sm:text-3xl font-black leading-none">
                                    {total}
                                  </p>

                                  <p className="text-[10px] sm:text-xs font-semibold opacity-70 mb-0.5">
                                    unit
                                  </p>
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="grid grid-cols-2 gap-3 sm:gap-5">
                  <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 shadow-lg text-white">
                    <span className="pointer-events-none absolute -right-3 -bottom-4 text-8xl opacity-15 rotate-[-12deg] select-none">
                      📅
                    </span>
                    <div className="relative">
                      <span className="text-3xl">📅</span>
                      <p className="text-indigo-100 text-xs font-semibold mt-2">
                        Tahun Masuk
                      </p>
                      <p className="text-3xl font-black mt-0.5">
                        {scannedVariants[0].tahun_masuk}
                      </p>
                    </div>
                  </div>
                  <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 shadow-lg text-white">
                    <span className="pointer-events-none absolute -right-3 -bottom-4 text-8xl opacity-15 rotate-[-12deg] select-none">
                      📦
                    </span>
                    <div className="relative">
                      <span className="text-3xl">📦</span>
                      <p className="text-emerald-100 text-xs font-semibold mt-2">
                        Total Stok
                      </p>
                      <p className="text-3xl font-black mt-0.5">
                        {totalStok}{" "}
                        <span className="text-base font-medium">Unit</span>
                      </p>
                    </div>
                  </div>
                </section>
                {/* STATISTIK GRID */}
                {scannedVariants.length > 0 && (
                  <section className="grid gap-3 sm:gap-5 md:grid-cols-2">
                    {scannedVariants.map((v) => (
                      <div
                        key={v.id}
                        className={`bg-white rounded-2xl p-5 shadow-lg border-y border-r border-slate-100 border-l-4 ${
                          v.kondisi === "Aman"
                            ? "border-l-green-500"
                            : v.kondisi === "Maintenance"
                              ? "border-l-yellow-500"
                              : "border-l-red-500"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-2xl font-bold text-slate-800">
                              {v.stok}{" "}
                              <span className="text-sm font-medium text-slate-400">
                                unit
                              </span>
                            </p>
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                <span className="text-slate-400">📍</span>{" "}
                                {v.lokasi}
                              </p>
                              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                <span className="text-slate-400">🔧</span>{" "}
                                {v.status_pemanfaatan}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`shrink-0 inline-block px-3 py-1 text-xs rounded-full font-bold ${kondisiStyle[v.kondisi]}`}
                          >
                            {v.kondisi}
                          </span>
                        </div>
                      </div>
                    ))}
                  </section>
                )}
                {/* TIMELINE RIWAYAT */}
                <section className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border border-white p-5 sm:p-8">
                  <h2 className="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2 pb-4 mb-6 border-b border-slate-100">
                    <span>🕒</span> Riwayat Aktivitas & Perawatan
                  </h2>

                  {loadingScanLogs ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-16 bg-slate-100 rounded-xl w-full" />
                      <div className="h-16 bg-slate-100 rounded-xl w-full" />
                    </div>
                  ) : scanLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-3xl mb-2">📭</p>
                      <p className="text-slate-400 text-xs sm:text-sm">
                        Belum ada catatan riwayat transaksi untuk barang ini.
                      </p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-slate-200 ml-3 sm:ml-4 pl-4 sm:pl-6 space-y-6">
                      {scanLogs.map((log) => (
                        <div key={log.id} className="relative group">
                          {/* Dot penanda timeline */}
                          <div
                            className={`absolute -left-[25px] sm:-left-[33px] top-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-white shadow-sm ${
                              log.jenis_transaksi === "Keluar"
                                ? "bg-amber-500"
                                : log.jenis_transaksi === "Masuk"
                                  ? "bg-green-500"
                                  : "bg-blue-500"
                            }`}
                          />

                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-all shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                              <span
                                className={`px-2.5 py-0.5 text-[11px] font-bold rounded-lg ${
                                  log.jenis_transaksi === "Keluar"
                                    ? "bg-amber-100 text-amber-800"
                                    : log.jenis_transaksi === "Masuk"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {log.jenis_transaksi} ({log.jumlah} Unit)
                              </span>
                              <span className="text-[11px] font-medium text-slate-400">
                                {formatTime(log.waktu)}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                              "{log.keterangan}"
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <div className="max-w-md mx-auto bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border border-white text-center py-16 px-6">
                <p className="text-5xl mb-4">🔍</p>
                <h3 className="text-slate-800 font-bold text-lg mb-1">
                  Barang Tidak Ditemukan
                </h3>
                <p className="text-slate-500 text-xs">
                  QR Code tidak valid atau data barang sudah dihapus dari
                  sistem.
                </p>
              </div>
            )}
          </main>
          <p className="text-center text-[10px] text-slate-500 mt-8">
            Inventarium IT · TPK Bitung
          </p>
        </div>

        {/* Modal Login - sama persis, JANGAN dihapus */}
        {isLoginModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-fade-in-down border border-slate-100 p-8 relative">
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 text-2xl font-bold"
              >
                ×
              </button>
              <div className="text-center mb-6">
                <h3 className="font-bold text-2xl text-slate-800">
                  Login Admin
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Masukkan kredensial Anda
                </p>
              </div>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={authData.username}
                    onChange={(e) =>
                      setAuthData({ ...authData, username: e.target.value })
                    }
                    placeholder="contoh@gmail.com"
                    className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-blue-600 bg-slate-50 focus:bg-white text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={authData.password}
                    onChange={(e) =>
                      setAuthData({ ...authData, password: e.target.value })
                    }
                    className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-blue-600 bg-slate-50 focus:bg-white text-slate-800 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg mt-2 disabled:opacity-50"
                >
                  {isAuthLoading ? "Memproses..." : "Masuk"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mode cetak label massal
  if (isPrintMode) {
    const itemsToPrint = items.filter((i) => selectedIds.includes(i.id));
    const expandedLabels = itemsToPrint.flatMap((item) => {
      const qty = Math.max(0, printQuantities[item.id] ?? item.stok);
      return Array.from({ length: qty }, (_, idx) => ({
        ...item,
        _copy: idx,
      }));
    });
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const tanggalCetak = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-slate-100 print:bg-white">
        {/* Toolbar sticky full width - hilang saat print */}
        <div className="no-print sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="w-full px-4 sm:px-8 lg:px-12 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                🖨️ Preview Cetak Label QR
              </h2>
              <p className="text-sm text-slate-500">
                {expandedLabels.length} label dari {itemsToPrint.length} jenis
                barang
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsPrintMode(false)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-white border-2 border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-700 transition-colors"
              >
                Kembali
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-colors"
              >
                🖨️ Cetak
              </button>
            </div>
          </div>
        </div>

        <div className="w-full px-4 sm:px-8 lg:px-12 py-6">
          {/* Kop surat - full lebar */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6 mb-6 flex items-center gap-4">
            <img
              src="/logo-inventarium.jpg"
              alt="Logo"
              className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-tight truncate">
                Inventarium IT
              </h1>
              <p className="text-xs font-semibold text-slate-500 tracking-wide truncate">
                PT Pelindo Terminal Petikemas TPK Bitung
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Dicetak: {tanggalCetak}
              </p>
            </div>
            <div className="ml-auto text-right hidden sm:block">
              <p className="text-2xl font-bold text-blue-600">
                {expandedLabels.length}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Label
              </p>
            </div>
          </div>

          {itemsToPrint.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <p className="text-4xl mb-3">🏷️</p>
              <p className="text-slate-500 font-medium">
                Belum ada barang yang dipilih.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 print:grid-cols-4 print:gap-3">
              {expandedLabels.map((item) => (
                <div
                  key={`${item.id}-${item._copy}`}
                  onClick={() => setEditQtyItem(item)}
                  className="group relative flex flex-col items-center text-center bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer print:shadow-none print:hover:translate-y-0 print:rounded-lg print:cursor-default"
                >
                  <span className="no-print absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-800/80 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    ✎
                  </span>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 group-hover:bg-blue-50/60 transition-colors print:bg-transparent print:border-0 print:p-0 w-[2.4cm] h-[2.4cm] print:w-[1.3cm] print:h-[1.3cm]">
                    <QRCodeSVG
                      value={`${baseUrl}/?scan=${item.barcode}`}
                      size={256}
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>
                  <p className="text-xs font-bold mt-3 leading-tight text-slate-800 line-clamp-2 print:text-[7px] print:mt-1.5">
                    {item.nama_barang}
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5 print:text-[6px]">
                    {item.barcode}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-1 print:text-[5px] print:mt-0.5">
                    Inventarium IT · TPK Bitung
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* POPUP EDIT JUMLAH QR */}
        {editQtyItem && (
          <div
            className="no-print fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setEditQtyItem(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-bold text-slate-800 truncate">
                {editQtyItem.nama_barang}
              </p>
              <p className="text-[11px] text-slate-400 font-mono mb-4">
                {editQtyItem.barcode}
              </p>

              <div className="flex items-center justify-center gap-3 mb-5">
                <button
                  onClick={() =>
                    setPrintQuantities({
                      ...printQuantities,
                      [editQtyItem.id]: Math.max(
                        0,
                        (printQuantities[editQtyItem.id] ?? editQtyItem.stok) -
                          1,
                      ),
                    })
                  }
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xl text-slate-700"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  value={printQuantities[editQtyItem.id] ?? editQtyItem.stok}
                  onChange={(e) =>
                    setPrintQuantities({
                      ...printQuantities,
                      [editQtyItem.id]: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-16 text-center border-2 border-amber-200 bg-amber-50 rounded-xl p-2 font-bold text-lg text-amber-700 outline-none"
                />
                <button
                  onClick={() =>
                    setPrintQuantities({
                      ...printQuantities,
                      [editQtyItem.id]:
                        (printQuantities[editQtyItem.id] ?? editQtyItem.stok) +
                        1,
                    })
                  }
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xl text-slate-700"
                >
                  +
                </button>
              </div>

              <button
                onClick={() => setEditQtyItem(null)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
              >
                Selesai
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Hanya admin yang boleh membuka dashboard — mode Tamu dihilangkan
  if (currentUser.role !== "admin") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center relative p-4">
        <div className="absolute inset-0 z-[-2] bg-[url('/bg-pelindo.jpg')] bg-cover bg-center"></div>
        <div className="absolute inset-0 z-[-1] bg-white/70 backdrop-blur-md"></div>

        {notification.show && (
          <div
            className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-xl font-bold flex items-center gap-3 border ${
              notification.type === "success"
                ? "bg-green-50 text-green-800 border-green-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            <span className="text-xl">
              {notification.type === "success" ? "✅" : "⚠️"}
            </span>{" "}
            {notification.message}
          </div>
        )}

        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl max-w-sm w-full p-8 border border-white">
          <div className="text-center mb-6">
            <img
              src="/logo-inventarium.jpg"
              alt="Logo"
              className="w-14 h-14 rounded-xl object-cover border border-slate-200 mx-auto mb-3 shadow-sm"
            />
            <h1 className="text-xl font-bold text-blue-700">Inventarium IT</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              TPK Bitung
            </p>
            <p className="text-sm text-slate-500 mt-3">
              Selamat datang, silakan masuk ke akun Anda.
            </p>
          </div>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={authData.username}
                onChange={(e) =>
                  setAuthData({ ...authData, username: e.target.value })
                }
                placeholder="contoh@gmail.com"
                className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-blue-600 bg-slate-50 focus:bg-white text-slate-800 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={authData.password}
                onChange={(e) =>
                  setAuthData({ ...authData, password: e.target.value })
                }
                className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-blue-600 bg-slate-50 focus:bg-white text-slate-800 transition-all"
              />
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginModalOpen(false); // tutup modal jika ada
                    setIsForgotMode(true);
                    setForgotStep("input");
                  }}
                  className="text-xs text-blue-600 hover:underline font-bold"
                >
                  Lupa password?
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg mt-2 disabled:opacity-50"
            >
              {isAuthLoading ? "Memproses..." : "Masuk"}
            </button>
          </form>
        </div>
        {/* --- MODAL LUPA PASSWORD --- */}
        {isForgotMode && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100">
              <h3 className="font-bold text-lg text-slate-800 mb-1">
                Lupa Password
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Masukkan email admin, link reset akan dikirim ke email tersebut.
              </p>
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="contoh@gmail.com"
                  className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-blue-600 bg-slate-50 text-slate-800"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsForgotMode(false)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isAccountSubmitting}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isAccountSubmitting ? "Mengirim..." : "Kirim Link Reset"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // TAMPILAN HALAMAN DASHBOARD & TABEL
  // =========================================================================
  return (
    <div className="flex h-screen overflow-hidden relative font-sans text-slate-800">
      {/* 1. BACKGROUND GAMBAR & EFEK KACA BURAM */}
      <div className="absolute inset-0 z-[-2] bg-[url('/bg-pelindo.jpg')] bg-cover bg-center"></div>
      <div className="absolute inset-0 z-[-1] bg-white/70 backdrop-blur-md"></div>

      {/* --- TOAST NOTIFICATION --- */}
      {notification.show && (
        <div
          className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-xl font-bold flex items-center gap-3 animate-fade-in-down border ${
            notification.type === "success"
              ? "bg-green-50 text-green-800 border-green-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <span className="text-xl">
            {notification.type === "success" ? "✅" : "⚠️"}
          </span>{" "}
          {notification.message}
        </div>
      )}

      {/* 2. SIDEBAR */}
      <aside
        className={`${isSidebarOpen ? "w-64" : "w-0 -ml-4"} transition-all duration-300 ease-in-out bg-white/90 backdrop-blur-lg shadow-2xl border-r border-white/50 flex flex-col z-20 shrink-0 overflow-hidden`}
      >
        {/* LOGO DI POJOK KIRI ATAS SIDEBAR */}
        <div className="p-5 pb-3 flex items-center gap-3 border-b border-slate-100">
          <img
            src="/logo-inventarium.jpg"
            alt="Logo"
            className="w-11 h-11 rounded-lg shadow-sm border border-slate-200 object-cover"
          />
          <div>
            <h2 className="text-xl font-bold text-blue-700 tracking-tight whitespace-nowrap">
              Inventarium IT
            </h2>
            <p className="text-[10px] font-bold text-slate-500 mt-0.5 whitespace-nowrap uppercase tracking-wider">
              TPK BITUNG
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto w-64 flex flex-col">
          <div className="text-xs font-bold text-slate-400 mb-3 ml-2 mt-2 uppercase tracking-wider">
            Menu Utama
          </div>
          <button
            onClick={() => setActiveMenu("Dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeMenu === "Dashboard" ? "bg-blue-600 text-white shadow-md" : "hover:bg-slate-100 text-slate-600"}`}
          >
            <span className="font-bold">Dashboard</span>
          </button>

          <div className="text-xs font-bold text-slate-400 mb-3 ml-2 mt-6 uppercase tracking-wider">
            Data Inventaris
          </div>
          <button
            onClick={() => setActiveMenu("Semua")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeMenu === "Semua" ? "bg-blue-600 text-white shadow-md" : "hover:bg-slate-100 text-slate-600"}`}
          >
            <span className="font-bold">Semua Barang</span>
          </button>
          <button
            onClick={() => setActiveMenu("Aman")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeMenu === "Aman" ? "bg-green-500 text-white shadow-md" : "hover:bg-slate-100 text-slate-600"}`}
          >
            <span className="font-bold">Kondisi Aman</span>
          </button>
          <button
            onClick={() => setActiveMenu("Maintenance")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeMenu === "Maintenance" ? "bg-yellow-500 text-white shadow-md" : "hover:bg-slate-100 text-slate-600"}`}
          >
            <span className="font-bold">Maintenance</span>
          </button>
          <button
            onClick={() => setActiveMenu("Rusak")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeMenu === "Rusak" ? "bg-red-500 text-white shadow-md" : "hover:bg-slate-100 text-slate-600"}`}
          >
            <span className="font-bold">Barang Rusak</span>
          </button>
        </nav>
      </aside>

      {/* 3. AREA KONTEN UTAMA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* HEADER */}
        <header className="h-20 flex items-center justify-between px-6 bg-white/40 backdrop-blur-sm border-b border-white/20 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 bg-white/80 rounded-lg hover:bg-white text-slate-600 shadow-sm transition-all"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                ></path>
              </svg>
            </button>
            <h1 className="text-xl font-bold text-slate-800">
              {activeMenu === "Dashboard"
                ? "Ringkasan Sistem"
                : `Data Inventaris - ${activeMenu}`}
            </h1>
          </div>

          {/* AREA KANAN ATAS (Tombol Login / Info User) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 bg-white/60 px-4 py-2 rounded-xl backdrop-blur-md shadow-sm border border-white/50">
              <button
                onClick={() => {
                  setAccountForm({
                    emailBaru: "",
                    passwordLama: "",
                    passwordBaru: "",
                    konfirmasiPassword: "",
                  });
                  setIsAccountModalOpen(true);
                }}
                className="text-sm font-bold text-blue-700 hover:text-blue-900 hover:underline transition-colors"
                title="Klik untuk kelola akun"
              >
                {currentUser.username}
              </button>
              <div className="w-px h-5 bg-slate-300"></div>
              <button
                onClick={handleLogout}
                className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* ISI KONTEN */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col">
          <div className="max-w-6xl mx-auto w-full flex-1">
            {activeMenu === "Dashboard" && (
              <div className="space-y-6 animate-fade-in-down">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Kartu Statistik */}
                  <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-xl border border-white flex flex-col justify-between">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl"></div>
                      <h3 className="font-semibold text-slate-600">
                        Total Aset Fisik
                      </h3>
                    </div>
                    <p className="text-4xl font-bold text-slate-800">
                      {totalBarang}{" "}
                      <span className="text-lg text-slate-500 font-medium">
                        Unit
                      </span>
                    </p>
                  </div>
                  <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-xl border border-white flex flex-col justify-between">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl"></div>
                      <h3 className="font-semibold text-slate-600">
                        Kondisi Aman
                      </h3>
                    </div>
                    <p className="text-4xl font-bold text-slate-800">
                      {totalAman}{" "}
                      <span className="text-lg text-slate-500 font-medium">
                        Unit
                      </span>
                    </p>
                  </div>
                  <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-xl border border-white flex flex-col justify-between">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-2xl"></div>
                      <h3 className="font-semibold text-slate-600">
                        Maintenance
                      </h3>
                    </div>
                    <p className="text-4xl font-bold text-slate-800">
                      {totalMaintenance}{" "}
                      <span className="text-lg text-slate-500 font-medium">
                        Unit
                      </span>
                    </p>
                  </div>
                  <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-xl border border-white flex flex-col justify-between">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl"></div>
                      <h3 className="font-semibold text-slate-600">
                        Rusak / Afkir
                      </h3>
                    </div>
                    <p className="text-4xl font-bold text-slate-800">
                      {totalRusak}{" "}
                      <span className="text-lg text-slate-500 font-medium">
                        Unit
                      </span>
                    </p>
                  </div>
                </div>

                <div className="bg-white/90 backdrop-blur rounded-2xl p-8 shadow-xl border border-white text-center mt-8">
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">
                    Selamat Datang di Inventarium Gudang IT
                  </h2>
                  <p className="text-slate-600 max-w-lg mx-auto">
                    Sistem Manajemen Aset IT Terintegrasi. Anda memiliki akses
                    penuh untuk mengelola data.
                  </p>
                </div>
              </div>
            )}

            {activeMenu !== "Dashboard" && (
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white p-6 animate-fade-in-down">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                    >
                      <span>+</span> Tambah Barang Masuk
                    </button>
                    {selectedIds.length > 0 && (
                      <button
                        onClick={() => {
                          const q: Record<number, number> = {};
                          selectedIds.forEach((id) => {
                            const it = items.find((i) => i.id === id);
                            q[id] = it ? it.stok : 1;
                          });
                          setPrintQuantities(q);
                          setIsPrintMode(true);
                        }}
                        className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"
                      >
                        🖨️ Cetak ({selectedIds.length})
                      </button>
                    )}
                  </div>

                  <div className="relative w-full md:w-80">
                    <input
                      type="text"
                      placeholder="Cari barang..."
                      className="w-full border-2 border-slate-200 bg-slate-50 text-slate-800 rounded-xl p-2.5 pl-4 outline-none focus:border-blue-500 focus:bg-white transition-colors font-medium"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() =>
                        setTimeout(() => setShowSuggestions(false), 200)
                      }
                    />
                    {showSuggestions &&
                      searchQuery &&
                      dropdownSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                          {dropdownSuggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              onClick={() => {
                                setSearchQuery(suggestion);
                                setShowSuggestions(false);
                              }}
                              className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-sm font-medium text-slate-700 border-b border-slate-100 last:border-0"
                            >
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse bg-white">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                        <th className="p-4 w-14">
                          <div
                            className="flex flex-col items-center gap-1"
                            title="Pilih barang untuk dicetak QR-nya"
                          >
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 accent-blue-600 cursor-pointer"
                            />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight leading-none">
                              QR
                            </span>
                          </div>
                        </th>
                        <th className="p-4 font-bold">Nama Barang</th>
                        <th className="p-4 font-bold">Tahun</th>
                        <th className="p-4 font-bold text-center">Stok</th>
                        <th className="p-4 font-bold">Kondisi</th>
                        <th className="p-4 font-bold">Status</th>
                        <th className="p-4 font-bold">Lokasi</th>
                        <th className="p-4 font-bold text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="text-center p-8 text-slate-400 font-medium"
                          >
                            Memuat data dari server...
                          </td>
                        </tr>
                      ) : filteredItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="text-center p-8 text-slate-400 font-medium"
                          >
                            Data tidak ditemukan.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-slate-100 hover:bg-blue-50/50 transition-colors"
                          >
                            {currentUser.role === "admin" && (
                              <td className="p-4">
                                <input
                                  type="checkbox"
                                  title="Centang untuk cetak QR barang ini"
                                  checked={selectedIds.includes(item.id)}
                                  onChange={() =>
                                    setSelectedIds((prev) =>
                                      prev.includes(item.id)
                                        ? prev.filter((id) => id !== item.id)
                                        : [...prev, item.id],
                                    )
                                  }
                                />
                              </td>
                            )}
                            <td className="p-4 font-bold text-slate-800">
                              {item.nama_barang}
                            </td>
                            <td className="p-4 text-slate-500 font-medium">
                              {item.tahun_masuk}
                            </td>
                            <td className="p-4 text-slate-800 font-bold text-center text-lg">
                              {item.stok}
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-3 py-1 text-xs rounded-full font-bold shadow-sm ${item.kondisi === "Aman" ? "bg-green-100 text-green-700" : item.kondisi === "Maintenance" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}
                              >
                                {item.kondisi}
                              </span>
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-1 text-xs rounded font-bold border ${item.status_pemanfaatan === "Digunakan" ? "border-blue-200 bg-blue-50 text-blue-700" : item.status_pemanfaatan === "Tersimpan" ? "border-slate-200 bg-slate-50 text-slate-700" : "border-red-200 bg-red-50 text-red-700"}`}
                              >
                                {item.status_pemanfaatan}
                              </span>
                            </td>
                            <td className="p-4 text-slate-600 font-medium">
                              {item.lokasi}
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2 justify-center flex-wrap">
                                <button
                                  onClick={() => openOutModal(item)}
                                  className="text-xs font-bold border-2 border-blue-600 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                >
                                  Mutasi
                                </button>
                                <button
                                  onClick={() => openEditModal(item)}
                                  className="text-xs font-bold border-2 border-slate-500 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-600 hover:text-white transition-all shadow-sm"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => requestDelete(item)}
                                  className="text-xs font-bold border-2 border-red-500 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                >
                                  Hapus
                                </button>
                                <button
                                  onClick={() => openHistoryModal(item)}
                                  className="text-xs font-bold border-2 border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-600 hover:text-white transition-all shadow-sm"
                                >
                                  Log
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <footer className="mt-12 mb-4 text-center text-sm font-bold text-slate-700/80 bg-white/60 backdrop-blur-sm py-4 rounded-xl border border-white/50 w-full max-w-6xl mx-auto shadow-sm">
            &copy; {new Date().getFullYear()} J.Ruben & M.Kabalu
          </footer>
        </div>
      </main>

      {/* --- MODAL TAMBAH BARANG MASUK --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in-down border border-slate-100">
            <div className="bg-blue-600 p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Form Barang Masuk</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/70 hover:text-white text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Nama Barang
                </label>
                <input
                  list="daftar-nama-barang"
                  type="text"
                  required
                  value={formData.nama_barang}
                  onChange={(e) => {
                    const kapital = e.target.value.replace(/\b\w/g, (c) =>
                      c.toUpperCase(),
                    );
                    setFormData({ ...formData, nama_barang: kapital });
                  }}
                  className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800"
                  placeholder="Pilih atau ketik nama barang..."
                />
                <datalist id="daftar-nama-barang">
                  {uniqueItemNames.map((nama, idx) => (
                    <option key={idx} value={nama} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-5 mb-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Tahun Masuk
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.tahun_masuk}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tahun_masuk: Number(e.target.value),
                      })
                    }
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Jumlah Stok
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.stok}
                    onChange={(e) =>
                      setFormData({ ...formData, stok: Number(e.target.value) })
                    }
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5 mb-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Kondisi Awal
                  </label>
                  <select
                    value={formData.kondisi}
                    onChange={(e) =>
                      setFormData({ ...formData, kondisi: e.target.value })
                    }
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800"
                  >
                    <option value="Aman">Aman</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Rusak">Rusak</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Status Pemanfaatan
                  </label>
                  <select
                    value={formData.status_pemanfaatan}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status_pemanfaatan: e.target.value,
                      })
                    }
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800"
                  >
                    <option value="Tersimpan">Tersimpan</option>
                    <option value="Digunakan">Digunakan</option>
                  </select>
                </div>
              </div>
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Lokasi
                </label>
                <input
                  list="daftar-lokasi"
                  type="text"
                  required
                  value={formData.lokasi}
                  onChange={(e) => {
                    const kapital = e.target.value.replace(/\b\w/g, (c) =>
                      c.toUpperCase(),
                    );
                    setFormData({ ...formData, lokasi: kapital });
                  }}
                  className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800"
                  placeholder="Ketik lokasi..."
                />
                <datalist id="daftar-lokasi">
                  {uniqueLocations.map((lok, idx) => (
                    <option key={idx} value={lok} />
                  ))}
                </datalist>
              </div>
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Gambar Barang (maks. 500KB)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700 file:font-bold"
                />
                {imgError && (
                  <p className="text-xs text-red-500 font-bold mt-1">
                    {imgError}
                  </p>
                )}
                {formData.gambar && (
                  <img
                    src={formData.gambar}
                    alt="Preview"
                    className="mt-2 w-20 h-20 object-cover rounded-lg border border-slate-200"
                  />
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL KELUAR / MUTASI BARANG --- */}
      {isOutModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in-down border border-slate-100">
            <div className="bg-amber-500 p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Form Mutasi Barang</h3>
              <button
                onClick={() => setIsOutModalOpen(false)}
                className="text-white/70 hover:text-white text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleOutSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Nama Barang (Stok Tersedia: {selectedItem.stok})
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedItem.nama_barang}
                  className="w-full border-2 border-slate-100 bg-slate-50 text-slate-500 font-medium rounded-xl p-2.5 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-5 mb-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Jumlah Mutasi
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedItem.stok}
                    value={outFormData.jumlah}
                    onChange={(e) =>
                      setOutFormData({
                        ...outFormData,
                        jumlah: Number(e.target.value),
                      })
                    }
                    className="w-full border-2 border-amber-200 rounded-xl p-2.5 outline-none focus:border-amber-500 font-bold text-amber-700 bg-amber-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Ubah Kondisi Fisik
                  </label>
                  <select
                    value={outFormData.kondisiBaru}
                    onChange={(e) =>
                      setOutFormData({
                        ...outFormData,
                        kondisiBaru: e.target.value,
                      })
                    }
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-amber-500 font-medium text-slate-800"
                  >
                    <option value="Aman">Aman</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Rusak">Rusak</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 mb-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Status Pemanfaatan
                  </label>
                  <select
                    value={outFormData.status_pemanfaatan}
                    onChange={(e) =>
                      setOutFormData({
                        ...outFormData,
                        status_pemanfaatan: e.target.value,
                      })
                    }
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-amber-500 font-medium text-slate-800"
                  >
                    <option value="Digunakan">Digunakan</option>
                    <option value="Tersimpan">Tersimpan</option>
                    
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Lokasi Tujuan
                  </label>
                  <input
                    list="daftar-lokasi-mutasi"
                    type="text"
                    required
                    value={outFormData.lokasi}
                    onChange={(e) => {
                      const kapital = e.target.value.replace(/\b\w/g, (c) =>
                        c.toUpperCase(),
                      );
                      setOutFormData({ ...outFormData, lokasi: kapital });
                    }}
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-amber-500 font-medium text-slate-800"
                    placeholder="Tujuan baru..."
                  />
                  <datalist id="daftar-lokasi-mutasi">
                    {uniqueLocations.map((lok, idx) => (
                      <option key={idx} value={lok} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Catatan Perawatan / Mutasi
                </label>
                <textarea
                  required
                  rows={2}
                  value={outFormData.keterangan}
                  onChange={(e) =>
                    setOutFormData({
                      ...outFormData,
                      keterangan: e.target.value,
                    })
                  }
                  className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-amber-500 font-medium text-slate-800"
                  placeholder="Wajib diisi..."
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOutModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200 disabled:opacity-50"
                >
                  {isSubmitting ? "Memproses..." : "Simpan Mutasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL EDIT BARANG --- */}
      {isEditModalOpen && editFormData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in-down border border-slate-100">
            <div className="bg-slate-800 p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Edit Data Barang</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-white/70 hover:text-white text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Nama Barang
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.nama_barang}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      nama_barang: e.target.value,
                    })
                  }
                  className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-5 mb-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Tahun Masuk
                  </label>
                  <input
                    type="number"
                    required
                    value={editFormData.tahun_masuk}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        tahun_masuk: Number(e.target.value),
                      })
                    }
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Stok
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editFormData.stok}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        stok: Number(e.target.value),
                      })
                    }
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5 mb-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Kondisi
                  </label>
                  <select
                    value={editFormData.kondisi}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        kondisi: e.target.value,
                      })
                    }
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800"
                  >
                    <option value="Aman">Aman</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Rusak">Rusak</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Status Pemanfaatan
                  </label>
                  <select
                    value={editFormData.status_pemanfaatan}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        status_pemanfaatan: e.target.value,
                      })
                    }
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800"
                  >
                    <option value="Tersimpan">Tersimpan</option>
                    <option value="Digunakan">Digunakan</option>
              
                  </select>
                </div>
              </div>
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Lokasi
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.lokasi}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, lokasi: e.target.value })
                  }
                  className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-medium text-slate-800"
                />
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Gambar Barang (maks. 500KB)
                </label>
                {editFormData.gambar && (
                  <img
                    src={editFormData.gambar}
                    alt="Gambar saat ini"
                    className="w-20 h-20 object-cover rounded-lg border border-slate-200 mb-2"
                  />
                )}
                {!editFormData.gambar && (
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center mb-2 text-slate-300 text-xs text-center">
                    Belum ada foto
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEditImageChange}
                  className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700 file:font-bold"
                />
                {imgError && (
                  <p className="text-xs text-red-500 font-bold mt-1">
                    {imgError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- MODAL KONFIRMASI HAPUS --- */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 text-center animate-fade-in-down">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="font-bold text-lg text-slate-800 mb-2">
              Hapus Barang?
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              "{deleteTarget.nama_barang}" akan dihapus permanen beserta seluruh
              riwayatnya. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-200"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- MODAL LOG AUDIT --- */}
      {isHistoryModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
            <div className="bg-slate-800 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">
                  Riwayat Transaksi & Perawatan
                </h3>
                <p className="text-xs font-medium text-slate-300 mt-1">
                  SKU: {selectedItem.barcode} - {selectedItem.nama_barang}
                </p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-white text-3xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-50/50">
              {loadingHistory ? (
                <p className="text-center text-slate-500 font-medium py-8 animate-pulse">
                  Menarik data dari server...
                </p>
              ) : historyLogs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-slate-500 font-medium">
                    Belum ada catatan untuk barang ini.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-white border-2 border-slate-100 rounded-xl p-5 shadow-sm hover:border-blue-100 transition-colors"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-lg shadow-sm ${
                            log.jenis_transaksi === "Keluar"
                              ? "bg-amber-100 text-amber-700"
                              : log.jenis_transaksi === "Masuk"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {log.jenis_transaksi} ({log.jumlah} unit)
                        </span>

                        <span className="text-xs text-slate-500 font-bold bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg flex items-center gap-1.5">
                          🕒 {formatTime(log.waktu)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mt-3 font-bold mb-1">
                        Catatan Audit:
                      </p>
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 border border-slate-100 rounded-lg italic font-medium leading-relaxed">
                        "{log.keterangan}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-6 py-2.5 bg-slate-800 text-white hover:bg-slate-700 rounded-xl font-bold transition-colors shadow-lg"
              >
                Tutup Panel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- MODAL KELOLA AKUN --- */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-blue-700 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Kelola Akun Admin</h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  {currentUser.username}
                </p>
              </div>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="text-white/70 hover:text-white text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Ubah Email */}
              <div>
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                  ✉️ Ganti Email
                </h4>
                <form onSubmit={handleChangeEmail} className="space-y-3">
                  <input
                    type="email"
                    required
                    placeholder="Email baru (contoh@gmail.com)"
                    value={accountForm.emailBaru}
                    onChange={(e) =>
                      setAccountForm({
                        ...accountForm,
                        emailBaru: e.target.value,
                      })
                    }
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 text-slate-800 text-sm"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Konfirmasi dengan password saat ini"
                    value={accountForm.passwordLama}
                    onChange={(e) =>
                      setAccountForm({
                        ...accountForm,
                        passwordLama: e.target.value,
                      })
                    }
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 text-slate-800 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={isAccountSubmitting}
                    className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    {isAccountSubmitting ? "Menyimpan..." : "Simpan Email Baru"}
                  </button>
                </form>
              </div>

              <div className="border-t border-slate-100" />

              {/* Ubah Password */}
              <div>
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                  🔒 Ganti Password
                </h4>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <input
                    type="password"
                    required
                    placeholder="Password lama"
                    value={accountForm.passwordLama}
                    onChange={(e) =>
                      setAccountForm({
                        ...accountForm,
                        passwordLama: e.target.value,
                      })
                    }
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 text-slate-800 text-sm"
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Password baru (min. 6 karakter)"
                    value={accountForm.passwordBaru}
                    onChange={(e) =>
                      setAccountForm({
                        ...accountForm,
                        passwordBaru: e.target.value,
                      })
                    }
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 text-slate-800 text-sm"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Ulangi password baru"
                    value={accountForm.konfirmasiPassword}
                    onChange={(e) =>
                      setAccountForm({
                        ...accountForm,
                        konfirmasiPassword: e.target.value,
                      })
                    }
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 text-slate-800 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={isAccountSubmitting}
                    className="w-full py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 disabled:opacity-50 text-sm"
                  >
                    {isAccountSubmitting
                      ? "Menyimpan..."
                      : "Simpan Password Baru"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
