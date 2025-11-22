import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface SpursButtonProps extends HTMLMotionProps<"button"> {
    variant?: "primary" | "secondary" | "outline";
    size?: "sm" | "md" | "lg";
}

const SpursButton = React.forwardRef<HTMLButtonElement, SpursButtonProps>(
    ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
        const variants = {
            primary: "bg-[#D3D800] text-[#132257] hover:bg-[#E5EA00] border-transparent",
            secondary: "bg-[#132257] text-white hover:bg-[#1A2D6E] border-transparent",
            outline: "bg-transparent border-2 border-[#D3D800] text-[#D3D800] hover:bg-[#D3D800]/10",
        };

        const sizes = {
            sm: "px-3 py-1.5 text-sm",
            md: "px-6 py-3 text-base",
            lg: "px-8 py-4 text-lg font-semibold",
        };

        return (
            <motion.button
                ref={ref}
                whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(211, 216, 0, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                    "inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#D3D800] focus:ring-offset-2 focus:ring-offset-[#132257]",
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {children}
            </motion.button>
        );
    }
);
SpursButton.displayName = "SpursButton";

export { SpursButton };
