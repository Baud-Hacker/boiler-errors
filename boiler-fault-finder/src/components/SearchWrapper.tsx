"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { HeroSearch } from "@/components/HeroSearch";
import { useRouter } from "next/navigation";

export function SearchWrapper() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleSearch = async (make: string, model: string, code: string) => {
        setLoading(true);
        router.push(`/${encodeURIComponent(make)}/${encodeURIComponent(model)}/fault/${encodeURIComponent(code)}`);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 text-[#D3D800] animate-spin" />
            </div>
        );
    }

    return <HeroSearch onSearch={handleSearch} />;
}
