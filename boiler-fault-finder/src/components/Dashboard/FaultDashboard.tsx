"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    CheckCircle2,
    Circle,
    Download,
    ExternalLink,
    PlayCircle,
    Wrench
} from "lucide-react";
import Link from "next/link";
import { BoilerFault } from "@/lib/api";
import { SpursButton } from "../ui/SpursButton";

interface FaultDashboardProps {
    fault: BoilerFault;
    breadcrumbs?: React.ReactNode;
}

export function FaultDashboard({ fault, breadcrumbs }: FaultDashboardProps) {
    // Parse troubleshooting steps into an array if it's a string
    // The data has plain text with newlines. We'll try to split by newlines or numbers.
    // For this MVP, let's just split by newlines and filter empty ones.
    const troubleshootingSteps = (fault.troubleshooting || "")
        .split('\n')
        .filter(line => line.trim().length > 0);

    const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

    const toggleStep = (index: number) => {
        const newChecked = new Set(checkedSteps);
        if (newChecked.has(index)) {
            newChecked.delete(index);
        } else {
            newChecked.add(index);
        }
        setCheckedSteps(newChecked);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* STICKY HEADER */}
            <motion.div
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className="sticky top-0 z-40 bg-[#132257] text-white shadow-md"
            >
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <p className="text-sm text-slate-300 uppercase tracking-wider font-semibold">
                                {fault.maker} {fault.model}
                            </p>
                            <h1 className="text-2xl font-bold text-[#D3D800]">
                                Error {fault.error_code}
                            </h1>
                        </div>
                        <Link href="/">
                            <SpursButton variant="outline" size="sm">
                                New Search
                            </SpursButton>
                        </Link>
                    </div>
                    {breadcrumbs && (
                        <div className="mt-2">
                            {breadcrumbs}
                        </div>
                    )}
                </div>
            </motion.div>

            <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN - MAIN CONTENT */}
                <div className="lg:col-span-2 space-y-8">

                    {/* AI OVERVIEW CARD */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-[#132257]/5 rounded-lg">
                                <AlertTriangle className="h-6 w-6 text-[#132257]" />
                            </div>
                            <h2 className="text-xl font-bold text-[#132257]">Overview</h2>
                        </div>
                        <p className="text-slate-600 leading-relaxed text-lg break-words">
                            {fault.ai_overview}
                        </p>
                        {fault.possible_cause && (
                            <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                <p className="font-semibold text-amber-900">
                                    Possible Cause: <span className="font-normal">{fault.possible_cause}</span>
                                </p>
                            </div>
                        )}
                    </motion.div>

                    {/* TROUBLESHOOTING CHECKLIST */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-[#132257]/5 rounded-lg">
                                <Wrench className="h-6 w-6 text-[#132257]" />
                            </div>
                            <h2 className="text-xl font-bold text-[#132257]">Troubleshooting Steps</h2>
                        </div>

                        <div className="space-y-4">
                            {troubleshootingSteps.map((step, index) => (
                                <motion.div
                                    key={index}
                                    layout
                                    onClick={() => toggleStep(index)}
                                    className={`
                    group flex gap-4 p-4 rounded-xl border cursor-pointer transition-all
                    ${checkedSteps.has(index)
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-white border-slate-100 hover:border-[#D3D800] hover:shadow-md'
                                        }
                  `}
                                >
                                    <div className={`
                    mt-1 flex-shrink-0 transition-colors
                    ${checkedSteps.has(index) ? 'text-green-600' : 'text-slate-300 group-hover:text-[#D3D800]'}
                  `}>
                                        {checkedSteps.has(index) ? (
                                            <CheckCircle2 className="h-6 w-6" />
                                        ) : (
                                            <Circle className="h-6 w-6" />
                                        )}
                                    </div>
                                    <p className={`
                    text-base leading-relaxed transition-colors flex-1 min-w-0 break-words
                    ${checkedSteps.has(index) ? 'text-green-800 line-through decoration-green-800/30' : 'text-slate-700'}
                  `}>
                                        {step}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                </div>

                {/* RIGHT COLUMN - SIDEBAR */}
                <div className="space-y-8">

                    {/* RESOURCES CARD */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
                    >
                        <h3 className="text-lg font-bold text-[#132257] mb-4">Helpful Resources</h3>
                        <div className="space-y-4">
                            {fault.helpful_resources && fault.helpful_resources.length > 0 ? (
                                fault.helpful_resources.map((resource, idx) => (
                                    <a
                                        key={idx}
                                        href={resource.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block group"
                                    >
                                        <div className="relative overflow-hidden rounded-xl bg-slate-100 aspect-video mb-2">
                                            {/* Placeholder for thumbnail - in real app would fetch from YouTube API if video */}
                                            <div className="absolute inset-0 flex items-center justify-center bg-[#132257]/5 group-hover:bg-[#132257]/10 transition-colors">
                                                {resource.type === 'video' ? (
                                                    <PlayCircle className="h-12 w-12 text-[#132257] opacity-80 group-hover:scale-110 transition-transform" />
                                                ) : (
                                                    <ExternalLink className="h-8 w-8 text-[#132257] opacity-50" />
                                                )}
                                            </div>
                                        </div>
                                        <p className="font-semibold text-slate-800 group-hover:text-[#132257] line-clamp-2">
                                            {resource.title}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1 capitalize">{resource.type}</p>
                                    </a>
                                ))
                            ) : (
                                <p className="text-slate-500 italic">No specific resources found.</p>
                            )}
                        </div>
                    </motion.div>

                    {/* MANUALS CARD */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-[#132257] rounded-2xl p-6 shadow-lg text-white"
                    >
                        <h3 className="text-lg font-bold text-[#D3D800] mb-4">Boiler Manual</h3>
                        <p className="text-sm text-slate-300 mb-6">
                            Download the official PDF manual for the {fault.maker} {fault.model}.
                        </p>
                        <SpursButton variant="primary" className="w-full font-bold">
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                        </SpursButton>
                    </motion.div>

                </div>
            </main>
        </div>
    );
}
