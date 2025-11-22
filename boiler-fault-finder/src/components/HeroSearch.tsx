"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Combobox,
    ComboboxInput,
    ComboboxButton,
    ComboboxOptions,
    ComboboxOption
} from "@headlessui/react";
import { Check, ChevronDown, Search, Loader2 } from "lucide-react";
import { SpursButton } from "./ui/SpursButton";
import { getMakers, getModels, getFaultCodes } from "@/lib/api";
import { cn } from "@/lib/utils";

interface HeroSearchProps {
    onSearch: (make: string, model: string, code: string) => void;
}

export function HeroSearch({ onSearch }: HeroSearchProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Data State
    const [makes, setMakes] = useState<string[]>([]);
    const [models, setModels] = useState<string[]>([]);
    const [codes, setCodes] = useState<string[]>([]);

    // Loading State
    const [loadingMakes, setLoadingMakes] = useState(false);
    const [loadingModels, setLoadingModels] = useState(false);
    const [loadingCodes, setLoadingCodes] = useState(false);

    // Selection State
    const [selectedMake, setSelectedMake] = useState("");
    const [selectedModel, setSelectedModel] = useState("");
    const [selectedCode, setSelectedCode] = useState("");

    // Query State
    const [queryMake, setQueryMake] = useState("");
    const [queryModel, setQueryModel] = useState("");
    const [queryCode, setQueryCode] = useState("");

    // Fetch Makers on Mount
    useEffect(() => {
        async function fetchMakers() {
            setLoadingMakes(true);
            const data = await getMakers();
            setMakes(data);
            setLoadingMakes(false);
        }
        fetchMakers();
    }, []);

    // Fetch Models when Make changes
    useEffect(() => {
        if (selectedMake) {
            async function fetchModels() {
                setLoadingModels(true);
                const data = await getModels(selectedMake);
                setModels(data);
                setLoadingModels(false);
            }
            fetchModels();
        } else {
            setModels([]);
        }
    }, [selectedMake]);

    // Fetch Codes when Model changes
    useEffect(() => {
        if (selectedMake && selectedModel) {
            async function fetchCodes() {
                setLoadingCodes(true);
                const data = await getFaultCodes(selectedMake, selectedModel);
                setCodes(data);
                setLoadingCodes(false);
            }
            fetchCodes();
        } else {
            setCodes([]);
        }
    }, [selectedMake, selectedModel]);

    const filteredMakes =
        queryMake === ""
            ? makes
            : makes.filter((make) =>
                make.toLowerCase().includes(queryMake.toLowerCase())
            );

    const filteredModels =
        queryModel === ""
            ? models
            : models.filter((model) =>
                model.toLowerCase().includes(queryModel.toLowerCase())
            );

    const filteredCodes =
        queryCode === ""
            ? codes
            : codes.filter((code) =>
                code.toLowerCase().includes(queryCode.toLowerCase())
            );

    const handleMakeSelect = (make: string | null) => {
        if (make) {
            setSelectedMake(make);
            setSelectedModel("");
            setSelectedCode("");
            setStep(2);
            setQueryMake("");
        }
    };

    const handleModelSelect = (model: string | null) => {
        if (model) {
            setSelectedModel(model);
            setSelectedCode("");
            setStep(3);
            setQueryModel("");
        }
    };

    const handleCodeSelect = (code: string | null) => {
        if (code) {
            setSelectedCode(code);
            setQueryCode("");
        }
    };

    const handleSearch = () => {
        if (selectedMake && selectedModel && selectedCode) {
            onSearch(selectedMake, selectedModel, selectedCode);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl"
            >
                <h2 className="text-2xl font-bold text-white mb-6 text-center font-heading">
                    Find Your Fault
                </h2>

                <div className="space-y-4">
                    {/* MAKE SELECTION */}
                    <div className="relative z-30">
                        <Combobox value={selectedMake} onChange={handleMakeSelect}>
                            <div className="relative">
                                <ComboboxInput
                                    className="w-full bg-white/90 border-0 rounded-lg py-4 pl-4 pr-10 text-slate-900 focus:ring-2 focus:ring-[#D3D800] text-lg"
                                    placeholder="Select Boiler Make..."
                                    onChange={(event) => setQueryMake(event.target.value)}
                                    displayValue={(make: string) => make}
                                />
                                <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                                    {loadingMakes ? (
                                        <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5 text-slate-500" aria-hidden="true" />
                                    )}
                                </ComboboxButton>
                            </div>
                            <ComboboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                {filteredMakes.length === 0 && queryMake !== "" ? (
                                    <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                        Nothing found.
                                    </div>
                                ) : (
                                    filteredMakes.map((make) => (
                                        <ComboboxOption
                                            key={make}
                                            className={({ focus }) =>
                                                `relative cursor-default select-none py-2 pl-10 pr-4 ${focus ? "bg-[#132257] text-white" : "text-gray-900"
                                                }`
                                            }
                                            value={make}
                                        >
                                            {({ selected, focus }) => (
                                                <>
                                                    <span
                                                        className={`block truncate ${selected ? "font-medium" : "font-normal"
                                                            }`}
                                                    >
                                                        {make}
                                                    </span>
                                                    {selected ? (
                                                        <span
                                                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${focus ? "text-white" : "text-[#132257]"
                                                                }`}
                                                        >
                                                            <Check className="h-5 w-5" aria-hidden="true" />
                                                        </span>
                                                    ) : null}
                                                </>
                                            )}
                                        </ComboboxOption>
                                    ))
                                )}
                            </ComboboxOptions>
                        </Combobox>
                    </div>

                    {/* MODEL SELECTION */}
                    <AnimatePresence>
                        {step >= 2 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="relative z-20"
                            >
                                <Combobox value={selectedModel} onChange={handleModelSelect}>
                                    <div className="relative">
                                        <ComboboxInput
                                            className="w-full bg-white/90 border-0 rounded-lg py-4 pl-4 pr-10 text-slate-900 focus:ring-2 focus:ring-[#D3D800] text-lg"
                                            placeholder="Select Model..."
                                            onChange={(event) => setQueryModel(event.target.value)}
                                            displayValue={(model: string) => model}
                                        />
                                        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                                            {loadingModels ? (
                                                <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 text-slate-500" aria-hidden="true" />
                                            )}
                                        </ComboboxButton>
                                    </div>
                                    <ComboboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                        {filteredModels.length === 0 && queryModel !== "" ? (
                                            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                                Nothing found.
                                            </div>
                                        ) : (
                                            filteredModels.map((model) => (
                                                <ComboboxOption
                                                    key={model}
                                                    className={({ focus }) =>
                                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${focus ? "bg-[#132257] text-white" : "text-gray-900"
                                                        }`
                                                    }
                                                    value={model}
                                                >
                                                    {({ selected, focus }) => (
                                                        <>
                                                            <span
                                                                className={`block truncate ${selected ? "font-medium" : "font-normal"
                                                                    }`}
                                                            >
                                                                {model}
                                                            </span>
                                                            {selected ? (
                                                                <span
                                                                    className={`absolute inset-y-0 left-0 flex items-center pl-3 ${focus ? "text-white" : "text-[#132257]"
                                                                        }`}
                                                                >
                                                                    <Check className="h-5 w-5" aria-hidden="true" />
                                                                </span>
                                                            ) : null}
                                                        </>
                                                    )}
                                                </ComboboxOption>
                                            ))
                                        )}
                                    </ComboboxOptions>
                                </Combobox>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* CODE SELECTION */}
                    <AnimatePresence>
                        {step >= 3 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="relative z-10"
                            >
                                <Combobox value={selectedCode} onChange={handleCodeSelect}>
                                    <div className="relative">
                                        <ComboboxInput
                                            className="w-full bg-white/90 border-0 rounded-lg py-4 pl-4 pr-10 text-slate-900 focus:ring-2 focus:ring-[#D3D800] text-lg"
                                            placeholder="Select Fault Code..."
                                            onChange={(event) => setQueryCode(event.target.value)}
                                            displayValue={(code: string) => code}
                                        />
                                        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                                            {loadingCodes ? (
                                                <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 text-slate-500" aria-hidden="true" />
                                            )}
                                        </ComboboxButton>
                                    </div>
                                    <ComboboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                        {filteredCodes.length === 0 && queryCode !== "" ? (
                                            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                                Nothing found.
                                            </div>
                                        ) : (
                                            filteredCodes.map((code) => (
                                                <ComboboxOption
                                                    key={code}
                                                    className={({ focus }) =>
                                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${focus ? "bg-[#132257] text-white" : "text-gray-900"
                                                        }`
                                                    }
                                                    value={code}
                                                >
                                                    {({ selected, focus }) => (
                                                        <>
                                                            <span
                                                                className={`block truncate ${selected ? "font-medium" : "font-normal"
                                                                    }`}
                                                            >
                                                                {code}
                                                            </span>
                                                            {selected ? (
                                                                <span
                                                                    className={`absolute inset-y-0 left-0 flex items-center pl-3 ${focus ? "text-white" : "text-[#132257]"
                                                                        }`}
                                                                >
                                                                    <Check className="h-5 w-5" aria-hidden="true" />
                                                                </span>
                                                            ) : null}
                                                        </>
                                                    )}
                                                </ComboboxOption>
                                            ))
                                        )}
                                    </ComboboxOptions>
                                </Combobox>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* SEARCH BUTTON */}
                    <AnimatePresence>
                        {selectedCode && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="pt-4"
                            >
                                <SpursButton
                                    onClick={handleSearch}
                                    className="w-full text-lg font-bold shadow-lg shadow-[#D3D800]/20"
                                    size="lg"
                                >
                                    <Search className="mr-2 h-5 w-5" />
                                    Diagnose Fault
                                </SpursButton>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
