import data from '@/data/boiler_data.json';

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
}

export const getAllFaults = (): BoilerFault[] => {
    return data.boiler_faults as BoilerFault[];
};

export const getMakes = (): string[] => {
    const faults = getAllFaults();
    const makes = new Set(faults.map((f) => f.maker));
    return Array.from(makes).sort();
};

export const getModels = (make: string): string[] => {
    const faults = getAllFaults();
    const models = new Set(
        faults.filter((f) => f.maker === make).map((f) => f.model)
    );
    return Array.from(models).sort();
};

export const getFaultCodes = (make: string, model: string): string[] => {
    const faults = getAllFaults();
    const codes = new Set(
        faults
            .filter((f) => f.maker === make && f.model === model)
            .map((f) => f.error_code)
    );
    return Array.from(codes).sort();
};

export const getFaultDetails = (
    make: string,
    model: string,
    code: string
): BoilerFault | undefined => {
    return getAllFaults().find(
        (f) => f.maker === make && f.model === model && f.error_code === code
    );
};
