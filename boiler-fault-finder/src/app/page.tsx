"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { HeroSearch } from "@/components/HeroSearch";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSearch = async (make: string, model: string, code: string) => {
    setLoading(true);
    // Navigate to the dynamic route
    router.push(`/${encodeURIComponent(make)}/${encodeURIComponent(model)}/fault/${encodeURIComponent(code)}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <motion.div
        key="search"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
      >
        {/* Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(19,34,87,1)_0%,_rgba(10,18,46,1)_100%)]" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D3D800]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">
              Boiler<span className="text-[#D3D800]">Fault</span>Finder
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto px-4">
              Instant diagnostics and troubleshooting for your heating system.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 text-[#D3D800] animate-spin" />
            </div>
          ) : (
            <HeroSearch onSearch={handleSearch} />
          )}
        </div>

        <footer className="absolute bottom-6 text-slate-500 text-sm">
          © 2025 Boiler Fault Finder. Unofficial Tool.
        </footer>
      </motion.div>
    </div>
  );
}
