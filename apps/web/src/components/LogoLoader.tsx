import { Mail } from "lucide-react";

interface LogoLoaderProps {
  fullPage?: boolean;
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function LogoLoader({ fullPage = false, size = "md", text = "Loading..." }: LogoLoaderProps) {
  const dimensions = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };
  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32
  };
  const rounded = {
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl"
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        <div className={`absolute inset-0 bg-indigo-500/40 blur-lg animate-pulse ${rounded[size]} ${dimensions[size]}`} />
        <div className={`relative flex items-center justify-center bg-black shadow-lg ${rounded[size]} ${dimensions[size]}`}>
          <Mail size={iconSizes[size]} className="text-white animate-pulse" />
        </div>
      </div>
      {text && (
        <span className="text-sm font-medium text-gray-500 animate-pulse tracking-wide">
          {text}
        </span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="w-full flex-1 min-h-[400px] flex items-center justify-center p-12">
        {content}
      </div>
    );
  }

  return content;
}
