import Link from "next/link";
import React from "react";

interface BrandLogoProps {
  href?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  textClassName?: string;
}

export function BrandLogo({
  href = "/",
  size = "md",
  showText = true,
  className = "",
  textClassName = "",
}: BrandLogoProps) {
  const iconSizes = {
    xs: "w-6 h-6",
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
    xl: "w-12 h-12",
  };

  const textSizes = {
    xs: "text-sm",
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-2xl",
  };

  const content = (
    <div className={`inline-flex items-center gap-2.5 font-bold ${className}`}>
      <img
        src="/qwikmailer-icon.png"
        alt="Qwik Mailer"
        className={`${iconSizes[size]} rounded-lg object-contain shrink-0 shadow-sm transition-transform group-hover:scale-105`}
      />
      {showText && (
        <span
          className={`text-black tracking-tight font-bold ${textSizes[size]} ${textClassName}`}
        >
          Qwikmailer
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href as any} className="inline-flex items-center group">
        {content}
      </Link>
    );
  }

  return content;
}

