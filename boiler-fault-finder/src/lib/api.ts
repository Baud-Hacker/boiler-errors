const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://lm0kvq8v3k.execute-api.eu-west-2.amazonaws.com/api";

export interface HelpfulResource {
    type: string;
    title: string;
    url: string;
    description: string;
}

export interface BoilerFault {
    maker: string;
    model: string;
    error_code: string;
    error_type: string;
    possible_cause: string;
    troubleshooting: string;
    ai_overview: string;
    helpful_resources: HelpfulResource[];
    enrichment_metadata?: any;
}

export interface FaultSummary {
    code: string;
    description: string;
}

export async function getMakers(): Promise<string[]> {
    try {
        const res = await fetch(`${API_URL}/makers`);
        if (!res.ok) throw new Error("Failed to fetch makers");
        const data = await res.json();
        return data.makers || [];
    } catch (error) {
        console.error("Error fetching makers:", error);
        return [];
    }
}

export async function getModels(maker: string): Promise<string[]> {
    try {
        const res = await fetch(`${API_URL}/models/${encodeURIComponent(maker)}`);
        if (!res.ok) throw new Error("Failed to fetch models");
        const data = await res.json();
        return data.models || [];
    } catch (error) {
        console.error(`Error fetching models for ${maker}:`, error);
        return [];
    }
}

export async function getFaultCodes(maker: string, model: string): Promise<string[]> {
    try {
        const res = await fetch(
            `${API_URL}/faults/${encodeURIComponent(maker)}/${encodeURIComponent(model)}/`
        );
        if (!res.ok) throw new Error("Failed to fetch fault codes");
        const data = await res.json();
        // The API returns an array of objects { code, description }
        // We just want the codes for the dropdown
        return data.faults.map((f: FaultSummary) => f.code) || [];
    } catch (error) {
        console.error(`Error fetching codes for ${maker} ${model}:`, error);
        return [];
    }
}

export async function getFaultDetails(
    maker: string,
    model: string,
    code: string
): Promise<BoilerFault | null> {
    try {
        const res = await fetch(
            `${API_URL}/fault/${encodeURIComponent(maker)}/${encodeURIComponent(model)}/${encodeURIComponent(code)}`
        );
        if (!res.ok) throw new Error("Failed to fetch fault details");
        const data = await res.json();
        return data as BoilerFault;
    } catch (error) {
        console.error(`Error fetching details for ${code}:`, error);
        return null;
    }
}

export async function getAllFaults(): Promise<{ maker: string; model: string; error_code: string }[]> {
    try {
        const res = await fetch(`${API_URL}/all-faults`);
        if (!res.ok) throw new Error("Failed to fetch all faults");
        const data = await res.json();
        return data.faults || [];
    } catch (error) {
        console.error("Error fetching all faults:", error);
        return [];
    }
}
