"use client";
import React, { useRef, useState, useEffect } from "react";
export default function PdfMapper({
  pdfUrl,
  fields,
  activeIndex,
  onFieldChange,
  onSelectField,
}: {
  pdfUrl: string;
  fields: any[];
  activeIndex: number;
  onFieldChange: (index: number, x: number, y: number) => void;
  onSelectField: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfPages, setPdfPages] = useState<any[]>([]);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleNativeWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
        setScale((prev) => Math.min(Math.max(0.2, prev * zoomFactor), 5));
      }
    };
    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleNativeWheel);
  }, []);
  useEffect(() => {
    setLoading(true); // Remove any existing pdf.js scripts to avoid duplicates
    const existingScript = document.getElementById("pdfjs-script");
    if (existingScript) existingScript.remove();
    const script = document.createElement("script");
    script.id = "pdfjs-script";
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      // @ts-ignore
      const pdfjsLib = window["pdfjs-dist/build/pdf"];
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      pdfjsLib
        .getDocument(pdfUrl)
        .promise.then(async (pdf: any) => {
          try {
            const pagesData = [];
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const viewport = page.getViewport({ scale: 1 });
              pagesData.push({ page, viewport });
            }
            setPdfPages(pagesData);
          } catch (err) {
            console.error("[PdfMapper] Failed to parse pages:", err);
            setLoading(false);
          }
        })
        .catch((err: any) => {
          console.error("[PdfMapper] Failed to load PDF:", err);
          setLoading(false);
        });
    };
    document.body.appendChild(script);
    return () => {
      const s = document.getElementById("pdfjs-script");
      if (s) s.remove();
    };
  }, [pdfUrl]);

  useEffect(() => {
    let activeTasks: any[] = [];
    let isCancelled = false;

    if (pdfPages.length > 0 && containerRef.current) {
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight || 500;
      const firstViewport = pdfPages[0].viewport;
      const scaleW = Math.abs(cw / firstViewport.width);
      const scaleH = Math.abs(ch / firstViewport.height);
      const viewScale = Math.min(scaleW, scaleH) * 0.92;
      setScale(viewScale);

      Promise.all(
        pdfPages.map((data, idx) => {
          const canvas = document.getElementById(`pdf-canvas-${idx}`) as HTMLCanvasElement;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                // Setting height/width clears the canvas automatically
                canvas.height = data.viewport.height;
                canvas.width = data.viewport.width;
                const renderTask = data.page.render({ canvasContext: ctx, viewport: data.viewport });
                activeTasks.push(renderTask);
                return renderTask.promise.catch((err: any) => {
                  if (err.name !== "RenderingCancelledException") {
                    console.error("PDF render error", err);
                  }
                });
            }
          }
          return Promise.resolve();
        })
      ).then(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });
    }

    return () => {
      isCancelled = true;
      activeTasks.forEach(task => {
        try {
          task.cancel();
        } catch (e) {
          // ignore
        }
      });
    };
  }, [pdfPages]);
  function handlePointerDown(e: React.PointerEvent, index: number) {
    setDraggingIdx(index);
    onSelectField(index); // @ts-ignore
    e.target.setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (draggingIdx === null) return;
    const field = fields[draggingIdx];
    const deltaX = e.movementX / scale;
    const deltaY = e.movementY / scale;
    onFieldChange(draggingIdx, field.x + deltaX, field.y + deltaY);
  }
  function handlePointerUp(e: React.PointerEvent) {
    setDraggingIdx(null); // @ts-ignore
    e.target.releasePointerCapture(e.pointerId);
  }
  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-auto bg-gray-100 p-8"
    >
      {" "}
      {loading && (
        <div className="absolute z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-400 text-sm bg-white p-3 rounded-lg shadow-sm border">
          {" "}
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            {" "}
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />{" "}
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4l3-3-3-3V4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
            />{" "}
          </svg>{" "}
          Loading PDF preview...{" "}
        </div>
      )}{" "}
      
      <div 
        style={{
          width: pdfPages.length > 0 ? pdfPages[0].viewport.width * scale : "auto",
          height: pdfPages.length > 0 ? pdfPages.reduce((acc, p) => acc + p.viewport.height, 0) * scale : "auto",
          margin: "0 auto",
          position: "relative"
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            opacity: loading ? 0 : 1,
            transition: "opacity 0.3s",
            display: "flex",
            flexDirection: "column",
            gap: 0,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {" "}
          {pdfPages.map((data, idx) => (
            <canvas key={idx} id={`pdf-canvas-${idx}`} style={{ display: "block", background: "white" }} />
          ))}{" "}
        {fields.map((field, idx) => {
          const isActive = idx === activeIndex;
          const isDragging = draggingIdx === idx;
          const isQR = field.type === "qr";
          const qrSize = Number(field.size || 100);
          return (
            <div
              key={idx}
              onPointerDown={(e) => handlePointerDown(e, idx)}
              style={{
                position: "absolute",
                left: field.x,
                top: field.y,
                cursor: isDragging ? "grabbing" : "grab",
                userSelect: "none",
                touchAction: "none",
                zIndex: isActive ? 10 : 1,
                transform: !isQR
                  ? field.align === "center"
                    ? "translateX(-50%)"
                    : field.align === "right"
                      ? "translateX(-100%)"
                      : "none"
                  : "none",
              }}
            >
              {" "}
              {isQR ? (
                <div
                  style={{
                    width: qrSize,
                    height: qrSize,
                    border: isActive
                      ? "2px solid #111827"
                      : "2px dashed #9ca3af",
                    background: isActive
                      ? "rgba(17,24,39,0.08)"
                      : "rgba(0,0,0,0.04)",
                    borderRadius: 4,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  {" "}
                  {/* QR grid icon */}{" "}
                  <svg
                    width={qrSize * 0.4}
                    height={qrSize * 0.4}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isActive ? "#111827" : "#9ca3af"}
                    strokeWidth="1.5"
                  >
                    {" "}
                    <rect x="2" y="2" width="8" height="8" rx="1" />{" "}
                    <rect x="14" y="2" width="8" height="8" rx="1" />{" "}
                    <rect x="2" y="14" width="8" height="8" rx="1" />{" "}
                    <rect
                      x="4"
                      y="4"
                      width="4"
                      height="4"
                      fill={isActive ? "#111827" : "#9ca3af"}
                    />{" "}
                    <rect
                      x="16"
                      y="4"
                      width="4"
                      height="4"
                      fill={isActive ? "#111827" : "#9ca3af"}
                    />{" "}
                    <rect
                      x="4"
                      y="16"
                      width="4"
                      height="4"
                      fill={isActive ? "#111827" : "#9ca3af"}
                    />{" "}
                    <path
                      d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17h3v3h-3z"
                      fill={isActive ? "#111827" : "#9ca3af"}
                    />{" "}
                  </svg>{" "}
                  <span
                    style={{
                      fontSize: 9,
                      color: isActive ? "#111827" : "#9ca3af",
                      fontFamily: "monospace",
                    }}
                  >
                    {" "}
                    {`{{${field.name}}}`}{" "}
                  </span>{" "}
                </div>
              ) : (
                <div
                  className={`border transition-colors px-1 ${isActive ? "border-indigo-500 bg-indigo-500/20" : "border-gray-400/50 hover:border-indigo-400/50 hover:bg-indigo-500/10"}`}
                  style={{
                    fontSize: `${field.fontSize || 24}px`,
                    color: field.color || "#000000",
                    fontWeight:
                      field.font === "HelveticaBold" ? "bold" : "normal",
                    fontFamily: "Helvetica, Arial, sans-serif",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {" "}
                  {`{{${field.name}}}`}{" "}
                </div>
              )}{" "}
            </div>
          );
        })}{" "}
      </div>{" "}
    </div>
    </div>
  );
}
