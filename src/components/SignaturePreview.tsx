import { useMemo } from "react";
import { renderTemplate } from "@/lib/template-engine";
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
      className={className}
      style={{
        padding: "24px",
        background: "white",
        borderRadius: "12px",
        minHeight: "120px",
        overflow: "auto",
      }}
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
