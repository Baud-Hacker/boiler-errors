"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share, PlusSquare, X, MoreVertical, Download } from "lucide-react";
import { SpursButton } from "./ui/SpursButton";

export function InstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [os, setOs] = useState<"ios" | "android" | "desktop" | null>(null);

    useEffect(() => {
        // Check if already in standalone mode
        const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
        if (isStandalone) return;

        // Detect OS
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setOs("ios");
        } else if (/android/.test(userAgent)) {
            setOs("android");
        } else {
            setOs("desktop");
        }

        // Show prompt after a delay, if not dismissed recently
        const dismissedAt = localStorage.getItem("installPromptDismissedAt");
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        if (!dismissedAt || now - parseInt(dismissedAt) > oneDay) {
            const timer = setTimeout(() => {
                setShowPrompt(true);
            }, 3000); // Show after 3 seconds
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem("installPromptDismissedAt", Date.now().toString());
    };

    if (!showPrompt || os === "desktop") return null;

    return (
        <AnimatePresence>
            {showPrompt && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md"
                >
                    <div className="bg-[#132257]/95 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl text-white relative overflow-hidden">
                        {/* Close Button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute top-2 right-2 p-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="flex items-start gap-4">
                            <div className="bg-[#D3D800] p-3 rounded-xl flex-shrink-0">
                                <Download className="h-6 w-6 text-[#132257]" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg mb-1">Install App</h3>
                                <p className="text-slate-300 text-sm mb-3">
                                    Add to your home screen for the best experience.
                                </p>

                                {os === "ios" && (
                                    <div className="space-y-2 text-sm text-slate-200">
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center justify-center w-6 h-6 bg-slate-700 rounded-full text-xs font-bold">1</span>
                                            <span>Tap the <Share className="inline h-4 w-4 mx-1" /> Share button</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center justify-center w-6 h-6 bg-slate-700 rounded-full text-xs font-bold">2</span>
                                            <span>Select <PlusSquare className="inline h-4 w-4 mx-1" /> Add to Home Screen</span>
                                        </div>
                                    </div>
                                )}

                                {os === "android" && (
                                    <div className="space-y-2 text-sm text-slate-200">
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center justify-center w-6 h-6 bg-slate-700 rounded-full text-xs font-bold">1</span>
                                            <span>Tap <MoreVertical className="inline h-4 w-4 mx-1" /> Menu</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center justify-center w-6 h-6 bg-slate-700 rounded-full text-xs font-bold">2</span>
                                            <span>Select "Install App" or "Add to Home screen"</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
