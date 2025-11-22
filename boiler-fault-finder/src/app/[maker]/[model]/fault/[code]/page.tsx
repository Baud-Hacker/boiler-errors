import { Metadata } from "next";
import { getFaultDetails } from "@/lib/api";
import { FaultDashboard } from "@/components/Dashboard/FaultDashboard";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";

interface Props {
    params: Promise<{
        maker: string;
        model: string;
        code: string;
    }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { maker, model, code } = await params;
    const decodedMaker = decodeURIComponent(maker);
    const decodedModel = decodeURIComponent(model);
    const decodedCode = decodeURIComponent(code);

    const fault = await getFaultDetails(decodedMaker, decodedModel, decodedCode);

    if (!fault) {
        return {
            title: "Fault Not Found",
        };
    }

    const title = `${decodedMaker} ${decodedModel} Fault Code ${decodedCode}`;
    const description = fault.ai_overview.substring(0, 160) + "...";

    return {
        title: title,
        description: description,
        openGraph: {
            title: title,
            description: description,
            type: "article",
        },
    };
}

export default async function FaultPage({ params }: Props) {
    const { maker, model, code } = await params;
    const decodedMaker = decodeURIComponent(maker);
    const decodedModel = decodeURIComponent(model);
    const decodedCode = decodeURIComponent(code);

    const fault = await getFaultDetails(decodedMaker, decodedModel, decodedCode);

    if (!fault) {
        notFound();
    }

    // JSON-LD Structured Data
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": `${decodedMaker} ${decodedModel} Fault Code ${decodedCode}`,
        "description": fault.ai_overview,
        "articleBody": fault.troubleshooting,
        "author": {
            "@type": "Organization",
            "name": "Boiler Fault Finder"
        }
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />
            <FaultDashboard
                fault={fault}
                breadcrumbs={
                    <Breadcrumbs
                        theme="dark"
                        items={[
                            { label: decodedMaker, href: `/${maker}` },
                            { label: decodedModel, href: `/${maker}/${model}` },
                            { label: `Fault ${decodedCode}`, href: `/${maker}/${model}/fault/${code}` }
                        ]}
                    />
                }
            />
        </>
    );
}
