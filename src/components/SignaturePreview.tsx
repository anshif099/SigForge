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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [frameSize, setFrameSize] = useState({ width: 750, height: 220 });

  const html = useMemo(
    () => renderTemplate(template, employee, assets),
    [template, employee, assets],
  );

  const previewDocument = useMemo(() => buildPreviewDocument(html), [html]);

  useEffect(() => {
    setFrameSize({ width: 750, height: 220 });
  }, [previewDocument]);

  function updateFrameSize() {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    const body = doc.body;
    const root = doc.documentElement;
    const width = Math.ceil(Math.max(body.scrollWidth, body.offsetWidth, root.scrollWidth));
    const height = Math.ceil(Math.max(body.scrollHeight, body.offsetHeight, root.scrollHeight));

    setFrameSize({
      width: Math.max(width, 1),
      height: Math.max(height, 1),
    });
  }

  function handleLoad() {
    updateFrameSize();
    window.setTimeout(updateFrameSize, 100);
    window.setTimeout(updateFrameSize, 500);
  }

  return (
    <div
      className={cn("w-full", className)}
      style={{
        background: "white",
        borderRadius: "8px",
        overflow: "auto",
      }}
    >
      <iframe
        ref={iframeRef}
        title="Signature preview"
        srcDoc={previewDocument}
        sandbox="allow-same-origin"
        onLoad={handleLoad}
        style={{
          border: 0,
          display: "block",
          height: `${frameSize.height}px`,
          width: `${frameSize.width}px`,
        }}
      />
    </div>
  );
}

function buildPreviewDocument(html: string): string {
  const previewFitStyle = `<style id="signforge-preview-fit">
html {
  background: #fff;
}
body {
  background: #fff;
  color: #001028;
  display: inline-block;
  min-width: max-content;
  overflow: hidden;
}
</style>`;

  if (/<html[\s>]/i.test(html)) {
    if (/<\/head>/i.test(html)) {
      return html.replace(/<\/head>/i, `${previewFitStyle}</head>`);
    }

    return html.replace(/<html([^>]*)>/i, `<html$1><head>${previewFitStyle}</head>`);
  }

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
${previewFitStyle}
</head>
<body>${html}</body>
</html>`;
}
