"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function Modal({ children, onClose }: { children: React.ReactNode, onClose?: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Optional: block body scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6"
      onClick={onClose}
    >
      {children}
    </div>,
    document.body
  );
}
