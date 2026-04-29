import { useEffect, useMemo, useRef, useState } from "react";
import { renderTemplate } from "@/lib/template-engine";
import { cn } from "@/lib/utils";
import type { Employee, CompanyAssets } from "@/lib/types";

interface Props {
  template: string;
  employee: Partial<Employee>;
  assets: CompanyAssets;
  className?: string;
}

export function SignaturePreview({ template, employee, assets, className }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, height: 0 });
  const html = useMemo(
    () => renderTemplate(template, employee, assets),
    [template, employee, assets],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    let frame = 0;
    const updateFit = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const availableWidth = viewport.clientWidth;
        const contentWidth = content.scrollWidth;
        const contentHeight = content.scrollHeight;

        if (!availableWidth || !contentWidth || !contentHeight) {
          setFit({ scale: 1, height: 0 });
          return;
        }

        const scale = Math.min(1, availableWidth / contentWidth);
        const height = Math.ceil(contentHeight * scale);

        setFit((current) =>
          Math.abs(current.scale - scale) > 0.001 || current.height !== height
            ? { scale, height }
            : current,
        );
      });
    };

    updateFit();

    const images = Array.from(content.querySelectorAll("img"));
    images.forEach((image) => image.addEventListener("load", updateFit));

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateFit);
      return () => {
        window.cancelAnimationFrame(frame);
        window.removeEventListener("resize", updateFit);
        images.forEach((image) => image.removeEventListener("load", updateFit));
      };
    }

    const observer = new ResizeObserver(updateFit);
    observer.observe(viewport);
    observer.observe(content);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      images.forEach((image) => image.removeEventListener("load", updateFit));
    };
  }, [html]);

  return (
    <div
      className={cn("w-full", className)}
      style={{
        padding: "clamp(12px, 3vw, 24px)",
        background: "white",
        borderRadius: "8px",
        minHeight: "120px",
        overflow: "hidden",
      }}
    >
      <div
        ref={viewportRef}
        style={{
          height: fit.height ? `${fit.height}px` : undefined,
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div
          ref={contentRef}
          style={{
            color: "#001028",
            display: "inline-block",
            maxWidth: "none",
            transform: `scale(${fit.scale})`,
            transformOrigin: "top left",
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
