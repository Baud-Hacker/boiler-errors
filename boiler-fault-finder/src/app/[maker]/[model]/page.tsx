import { Metadata } from "next";
import Link from "next/link";
import { getFaultCodes } from "@/lib/api";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { notFound } from "next/navigation";

interface Props {
    params: Promise<{
        maker: string;
        model: string;
    }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { maker, model } = await params;
    const decodedMaker = decodeURIComponent(maker);
    const decodedModel = decodeURIComponent(model);
    return {
        title: `${decodedMaker} ${decodedModel} Fault Codes | Boiler Fault Finder`,
        description: `Browse all fault codes for ${decodedMaker} ${decodedModel} boilers.`,
    };
}

export default async function ModelPage({ params }: Props) {
    const { maker, model } = await params;
    const decodedMaker = decodeURIComponent(maker);
    const decodedModel = decodeURIComponent(model);
    const faults = await getFaultCodes(decodedMaker, decodedModel);

    if (!faults.length) {
        notFound();
    }

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(19,34,87,1)_0%,_rgba(10,18,46,1)_100%)]" />
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D3D800]/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto w-full px-4 py-12">
                <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
                    {decodedMaker} {decodedModel} <span className="text-[#D3D800]">Fault Codes</span>
                </h1>

                <Breadcrumbs
                    items={[
                        { label: decodedMaker, href: `/${maker}` },
                        { label: decodedModel, href: `/${maker}/${model}` }
                    ]}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {faults.map((code) => (
                        <Link
                            key={code}
                            href={`/${maker}/${model}/fault/${encodeURIComponent(code)}`}
                            className="block bg-white/10 backdrop-blur-sm border border-white/10 p-6 rounded-xl shadow-lg hover:bg-white/20 hover:border-[#D3D800]/50 transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-lg font-bold text-[#D3D800] group-hover:text-[#E5EA00] transition-colors">
                                    {code}
                                </span>
                                <span className="text-sm text-slate-400 group-hover:text-white transition-colors">View Fix →</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
