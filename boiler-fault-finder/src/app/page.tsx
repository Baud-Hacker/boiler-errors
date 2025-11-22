import { getMakers } from "@/lib/api";
import Link from "next/link";
import { SearchWrapper } from "@/components/SearchWrapper";

export default async function Home() {
  const makers = await getMakers();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(19,34,87,1)_0%,_rgba(10,18,46,1)_100%)]" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D3D800]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">
              Boiler<span className="text-[#D3D800]">Fault</span>Finder
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto px-4">
              Instant diagnostics and troubleshooting for your heating system.
            </p>
          </div>

          <div className="max-w-2xl mx-auto mb-20 relative z-20">
            <SearchWrapper />
          </div>

          {/* Browse Section */}
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">Browse by Manufacturer</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {makers.map((maker) => (
                <Link
                  key={maker}
                  href={`/${encodeURIComponent(maker)}`}
                  className="bg-white/10 backdrop-blur-sm border border-white/10 p-4 rounded-xl text-center text-slate-200 hover:bg-white/20 hover:text-white transition-all"
                >
                  {maker}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <footer className="absolute bottom-6 text-slate-500 text-sm w-full text-center">
          © 2025 Boiler Fault Finder. Unofficial Tool.
        </footer>
      </div>
    </div>
  );
}
