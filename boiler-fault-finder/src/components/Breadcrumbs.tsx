import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
    label: string;
    href: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    theme?: 'light' | 'dark';
}

export function Breadcrumbs({ items, theme = 'dark' }: BreadcrumbsProps) {
    // Generate JSON-LD for Breadcrumbs
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
            },
            ...items.map((item, index) => ({
                "@type": "ListItem",
                "position": index + 2,
                "name": item.label,
                "item": `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}${item.href}`
            }))
        ]
    };

    const textColor = theme === 'dark' ? 'text-white' : 'text-slate-500';
    const hoverColor = theme === 'dark' ? 'hover:text-slate-200' : 'hover:text-[#132257]';
    const activeColor = theme === 'dark' ? 'text-[#D3D800]' : 'text-[#132257]';
    const separatorColor = theme === 'dark' ? 'text-slate-600' : 'text-slate-300';

    return (
        <nav aria-label="Breadcrumb" className="mb-6 overflow-hidden">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />
            <ol className={`flex flex-wrap items-center gap-2 text-sm ${textColor}`}>
                <li>
                    <Link href="/" className={`flex items-center ${hoverColor} transition-colors`}>
                        <Home className="h-4 w-4" />
                        <span className="sr-only">Home</span>
                    </Link>
                </li>
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;

                    return (
                        <li key={index} className="flex items-center gap-2 whitespace-nowrap">
                            <ChevronRight className={`h-4 w-4 ${separatorColor}`} />
                            {isLast ? (
                                <span className={`font-medium ${activeColor} truncate max-w-[200px]`} aria-current="page">
                                    {item.label}
                                </span>
                            ) : (
                                <Link
                                    href={item.href}
                                    className={`${hoverColor} transition-colors truncate max-w-[150px] hidden sm:block`}
                                >
                                    {item.label}
                                </Link>
                            )}
                            {!isLast && (
                                <span className={`sm:hidden ${separatorColor}`}>...</span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
