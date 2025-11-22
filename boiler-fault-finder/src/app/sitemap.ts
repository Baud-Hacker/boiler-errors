import { MetadataRoute } from 'next';
import { getAllFaults } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Static routes
    const routes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
    ];

    // Dynamic routes for each fault
    const faults = await getAllFaults();

    const faultRoutes: MetadataRoute.Sitemap = faults.map((fault) => ({
        url: `${baseUrl}/${encodeURIComponent(fault.maker)}/${encodeURIComponent(fault.model)}/fault/${encodeURIComponent(fault.error_code)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
    }));

    return [...routes, ...faultRoutes];
}
