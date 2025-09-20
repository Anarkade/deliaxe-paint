import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-center leading-tight outline-none focus:outline-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        highlighted: "bg-retro-primary text-retro-primary-foreground hover:bg-retro-primary-hover border border-retro-primary hover:border-retro-primary-hover transition-colors duration-200 min-h-[2.5rem] px-3 py-1 whitespace-pre-wrap",
        blocked: "bg-slate-700 text-slate-400 cursor-not-allowed opacity-60 border border-slate-600 min-h-[2.5rem] px-3 py-1",
        plum: "bg-retro-primary text-retro-primary-foreground hover:bg-retro-primary-hover border border-retro-primary hover:border-retro-primary-hover transition-colors duration-200 min-h-[2.5rem] px-3 py-1 whitespace-pre-wrap",
        modern3d: "bg-retro-primary text-retro-primary-foreground hover:bg-retro-primary-hover border border-retro-primary hover:border-retro-primary-hover transition-colors duration-200 min-h-[2.5rem] px-3 py-1 whitespace-pre-wrap",
        glass: "bg-retro-primary text-retro-primary-foreground hover:bg-retro-primary-hover border border-retro-primary hover:border-retro-primary-hover transition-colors duration-200 min-h-[2.5rem] px-3 py-1 whitespace-pre-wrap",
      },
      size: {
        default: "min-h-[2.5rem] px-4 py-2",
        sm: "min-h-[2.25rem] rounded-md px-3 py-1",
        lg: "min-h-[2.75rem] rounded-md px-8 py-2",
        icon: "h-10 w-10 min-h-[2.5rem]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
