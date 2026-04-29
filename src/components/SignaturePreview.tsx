import { useMemo } from "react";
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
  const html = useMemo(
    () => renderTemplate(template, employee, assets),
    [template, employee, assets],
  );

  return (
    <div
      className={cn("w-full", className)}
      style={{
        padding: "clamp(12px, 3vw, 24px)",
        background: "white",
        borderRadius: "8px",
        minHeight: "120px",
        overflow: "auto",
      }}
    >
      <div
        style={{
          color: "#001028",
          display: "inline-block",
          maxWidth: "none",
          minWidth: "max-content",
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
