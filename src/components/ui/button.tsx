import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

type HapticIntensity = 'light' | 'medium' | 'heavy' | false;

const vibrationPatterns: Record<Exclude<HapticIntensity, false>, number | number[]> = {
  light: 10,           // Quick tap for normal actions
  medium: 25,          // Moderate pulse for destructive actions
  heavy: [50, 30, 50], // Strong double pulse for success/important actions
};

// Inline haptic trigger for performance
const triggerHaptic = (intensity: Exclude<HapticIntensity, false> = 'light') => {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(vibrationPatterns[intensity]);
    } catch {
      // Silently fail
    }
  }
};

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-emerald-600 text-white hover:bg-emerald-700",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// Map variants to haptic intensity
const variantHapticMap: Partial<Record<string, Exclude<HapticIntensity, false>>> = {
  destructive: 'medium',
  success: 'heavy',
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  haptic?: HapticIntensity | true;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, haptic = true, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (haptic !== false) {
          // Determine intensity: explicit prop > variant mapping > default light
          const intensity: Exclude<HapticIntensity, false> = 
            typeof haptic === 'string' ? haptic : 
            (variant && variantHapticMap[variant]) || 'light';
          triggerHaptic(intensity);
        }
        onClick?.(e);
      },
      [haptic, variant, onClick]
    );
    
    return (
      <Comp 
        className={cn(buttonVariants({ variant, size, className }))} 
        ref={ref} 
        onClick={handleClick}
        {...props} 
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants, triggerHaptic };
