import { Metadata } from "next";
import Link from "next/link";
import { getModels } from "@/lib/api";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { notFound } from "next/navigation";

interface Props {
    params: Promise<{
        maker: string;
    }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { maker } = await params;
    const decodedMaker = decodeURIComponent(maker);
    return {
        title: `${decodedMaker} Boiler Models | Boiler Fault Finder`,
        description: `Browse all ${decodedMaker} boiler models and find fault codes.`,
    };
}

export default async function MakerPage({ params }: Props) {
    const { maker } = await params;
    const decodedMaker = decodeURIComponent(maker);
    const models = await getModels(decodedMaker);

    if (!models.length) {
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
                    {decodedMaker} <span className="text-[#D3D800]">Models</span>
                </h1>

                <Breadcrumbs
                    items={[
                        { label: decodedMaker, href: `/${maker}` }
                    ]}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                    {models.map((model) => (
                        <Link
                            key={model}
                            href={`/${maker}/${encodeURIComponent(model)}`}
                            className="block bg-white/10 backdrop-blur-sm border border-white/10 p-6 rounded-xl shadow-lg hover:bg-white/20 hover:border-[#D3D800]/50 transition-all group"
                        >
                            <h2 className="text-lg font-semibold text-slate-200 group-hover:text-white transition-colors">
                                {model}
                            </h2>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
