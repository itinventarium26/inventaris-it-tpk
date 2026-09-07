import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tambahkan baris ini untuk mengizinkan akses dari jaringan lokal
  allowedDevOrigins: [
    "169.254.33.216",
    "10.73.126.129",
    "192.168.1.86",
    "10.232.49.129",
  ], // Sesuaikan jika ada IP lain
};

export default nextConfig;
