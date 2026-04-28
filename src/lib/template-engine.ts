import type { Employee, CompanyAssets } from "./types";

export const KNOWN_FIELDS: Array<{ key: string; label: string; type?: string }> = [
  { key: "name", label: "Name" },
  { key: "designation", label: "Designation" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone" },
  { key: "mobile", label: "Mobile" },
  { key: "address", label: "Address" },
  { key: "website", label: "Website" },
  { key: "logo", label: "Logo (URL / data)" },
  { key: "divisionLabel", label: "Division label" },
  { key: "companyName", label: "Company name" },
];

export function extractPlaceholders(html: string): string[] {
  const set = new Set<string>();
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) set.add(m[1]);
  return Array.from(set);
}

export interface ImageSlot {
  key: string;
  label: string;
  src: string;
}

export function extractImageSlots(html: string): ImageSlot[] {
  const slots: ImageSlot[] = [];
  const imgRe = /<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = imgRe.exec(html)) !== null) {
    const tag = match[0];
    const src = tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2] ?? "";
    const placeholder = src.match(/\{\{\s*(logo(?:_\d+)?)\s*\}\}/i)?.[1].toLowerCase();
    const key = placeholder && placeholder !== "logo" ? placeholder : `logo_${slots.length + 1}`;

    slots.push({
      key,
      label: `Logo ${slots.length + 1}`,
      src,
    });
  }

  return slots;
}

export function buildDataMap(
  employee: Partial<Employee>,
  assets: CompanyAssets = {},
): Record<string, string> {
  const extra = employee.extra ?? {};
  const uploadedLogo = extra.logo_1 ?? extra.logo ?? employee.logoDataUrl ?? "";
  const primaryLogo = uploadedLogo || assets.logoDataUrl || "";

  return {
    name: employee.name ?? "",
    designation: employee.designation ?? "",
    phone: (employee.phones ?? []).filter(Boolean).join(" · "),
    mobile: employee.mobile ?? "",
    email: employee.email ?? "",
    address: employee.address ?? "",
    website: employee.website ?? assets.website ?? "",
    logo: primaryLogo,
    logo_1: uploadedLogo,
    divisionLabel: extra.divisionLabel ?? "A Division of",
    companyName: assets.companyName ?? "",
    ...extra,
  };
}

export function renderTemplate(
  html: string,
  employee: Partial<Employee>,
  assets: CompanyAssets = {},
): string {
  const data = buildDataMap(employee, assets);

  const hasPlaceholders = /\{\{\s*[a-zA-Z0-9_]+\s*\}\}/.test(html);

  let out = html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    return data[key] ?? "";
  });

  out = out.replace(
    /<([a-zA-Z0-9]+)([^>]*?)data-optional="([a-zA-Z0-9_]+)"([^>]*)>([\s\S]*?)<\/\1>/g,
    (match, _tag, _a, key: string) => {
      return data[key] ? match : "";
    },
  );

  if (!hasPlaceholders) {
    out = smartReplace(out, data);
  }

  out = replaceImageSources(out, data);
  if (data.divisionLabel) {
    out = replaceDivisionLabel(out, data.divisionLabel);
  }

  return out;
}

// Replace common literal sample values inside text nodes / href / mailto
// with live form values. Only touches text content, not tag names/attrs (except href/mailto).
function smartReplace(html: string, data: Record<string, string>): string {
  const literalMap: Array<{ pattern: RegExp; value: string }> = [];

  // Known literal sample strings people leave in templates
  const nameLiterals = ["Person Name", "Full Name", "Your Name", "John Doe", "Jane Doe", "Alex Morgan"];
  const titleLiterals = ["Designtaion", "Designation", "Job Title", "Your Title", "Head of Product", "Marketing Director"];
  const addressLiterals = [
    "Your Address",
    "Company Address",
    "Street Address",
    "123 Main St",
    "1 Market St, San Francisco, CA",
    "1 Market St",
    "San Francisco, CA",
    "New York, NY",
  ];

  if (data.name) {
    for (const l of nameLiterals) literalMap.push({ pattern: new RegExp(escapeReg(l), "g"), value: data.name });
  }
  if (data.designation) {
    for (const l of titleLiterals) literalMap.push({ pattern: new RegExp(escapeReg(l), "g"), value: data.designation });
  }
  if (data.address) {
    for (const l of addressLiterals) literalMap.push({ pattern: new RegExp(escapeReg(l), "g"), value: data.address });
  }

  let out = html;
  let addressReplaced = false;

  // Replace in visible text only (between > and <)
  out = out.replace(/>([^<]+)</g, (_m, text: string) => {
    let t = text;
    for (const { pattern, value } of literalMap) {
      const before = t;
      t = t.replace(pattern, value);
      if (data.address && before !== t) addressReplaced = true;
    }

    if (data.email) {
      t = t.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, data.email);
    }
    if (data.phone || data.mobile) {
      const phoneVal = data.mobile || data.phone;
      t = t.replace(/\+?[\d][\d\s\-().]{6,}\d/g, phoneVal);
    }
    if (data.website) {
      t = t.replace(
        /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:com|net|org|io|ae|co|dev|app)(?:\/[^\s<]*)?\b/gi,
        (match, offset: number) => (offset > 0 && t[offset - 1] === "@" ? match : data.website),
      );
    }
    return ">" + t + "<";
  });

  // Heuristic fallback: find an address-like text node and swap to user's address.
  if (data.address && !addressReplaced) {
    const addressKeywordRe = /\b(Street|St\.?|Road|Rd\.?|Avenue|Ave\.?|Blvd|Lane|Drive|Suite|Floor|Tower|Building|Abu Dhabi|Dubai|New York|London|San Francisco|California|UAE|United Arab Emirates|USA|United States)\b/i;
    out = out.replace(/>([^<]+)</g, (m, text: string) => {
      if (addressReplaced) return m;
      const trimmed = text.trim();
      if (
        !trimmed ||
        trimmed.length < 6 ||
        trimmed === data.address ||
        trimmed === data.name ||
        trimmed === data.designation ||
        /@/.test(trimmed) ||
        /^https?:/i.test(trimmed) ||
        /^[\d+\-().\s]+$/.test(trimmed)
      ) {
        return m;
      }
      const looksLikeAddress =
        addressKeywordRe.test(trimmed) ||
        (/,/.test(trimmed) && trimmed.split(/\s+/).length >= 2 && !/^(https?:|www\.)/i.test(trimmed));
      if (looksLikeAddress) {
        addressReplaced = true;
        return ">" + text.replace(trimmed, data.address) + "<";
      }
      return m;
    });
  }

  // Update mailto: and tel: hrefs
  if (data.email) {
    out = out.replace(/mailto:[^"'\s>]+/g, `mailto:${data.email}`);
  }
  if (data.phone || data.mobile) {
    const phoneVal = (data.mobile || data.phone).replace(/\s/g, "");
    out = out.replace(/tel:[^"'\s>]+/g, `tel:${phoneVal}`);
  }
  return out;
}

function replaceDivisionLabel(html: string, label: string): string {
  const wrappedLabel = `<span style="white-space:nowrap;">${escapeHtml(label)}</span>`;

  return html
    .replace(/A(?:\s|&nbsp;|<br\s*\/?>)+Division(?:\s|&nbsp;|<br\s*\/?>)+of/gi, wrappedLabel)
    .replace(/A\s*<\/([^>\s]+)>\s*<\1[^>]*>\s*Division\s*<\/\1>\s*<\1[^>]*>\s*of/gi, wrappedLabel);
}

function replaceImageSources(html: string, data: Record<string, string>): string {
  const replacements = new Map<number, string>();

  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    const match = key.match(/^logo_(\d+)$/);
    if (match) {
      replacements.set(Number(match[1]) - 1, value);
    }
  }

  if (replacements.size === 0) {
    return html;
  }

  let index = 0;
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const replacement = replacements.get(index);
    index += 1;

    if (!replacement) {
      return tag;
    }

    const srcAttr = `src="${escapeAttr(replacement)}"`;
    if (/\bsrc\s*=\s*(["']).*?\1/i.test(tag)) {
      return tag.replace(/\bsrc\s*=\s*(["']).*?\1/i, srcAttr);
    }

    return tag.replace(/<img\b/i, `<img ${srcAttr}`);
  });
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function imageToHtmlTemplate(imageDataUrl: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; color:#001028; font-size:14px;">
  <tr>
    <td style="padding-right:18px; border-right:2px solid #0040E8;">
      <img src="${imageDataUrl}" alt="logo" style="width:90px;height:auto;display:block;" />
    </td>
    <td style="padding-left:18px; vertical-align:top;">
      <div style="font-size:18px;font-weight:700;color:#001028;">{{name}}</div>
      <div style="font-size:13px;color:#0040E8;margin-top:2px;">{{designation}}</div>
      <div style="margin-top:10px;line-height:1.5;font-size:12px;color:#33445C;">
        <div data-optional="phone">📞 {{phone}}</div>
        <div data-optional="email">✉️ <a href="mailto:{{email}}" style="color:#33445C;text-decoration:none;">{{email}}</a></div>
        <div data-optional="address">📍 {{address}}</div>
      </div>
    </td>
  </tr>
</table>`;
}

export const DEFAULT_TEMPLATE = `<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; color:#001028; font-size:14px;">
  <tr>
    <td style="padding-right:18px; border-right:2px solid #0040E8; vertical-align:top;">
      <div style="font-size:22px;font-weight:800;color:#0040E8;letter-spacing:-0.5px;">{{companyName}}</div>
    </td>
    <td style="padding-left:18px; vertical-align:top;">
      <div style="font-size:18px;font-weight:700;color:#001028;">{{name}}</div>
      <div style="font-size:13px;color:#0040E8;margin-top:2px;">{{designation}}</div>
      <div style="margin-top:10px;line-height:1.6;font-size:12px;color:#33445C;">
        <div data-optional="phone"><strong style="color:#001028;">P</strong> &nbsp;{{phone}}</div>
        <div data-optional="email"><strong style="color:#001028;">E</strong> &nbsp;<a href="mailto:{{email}}" style="color:#33445C;text-decoration:none;">{{email}}</a></div>
        <div data-optional="address"><strong style="color:#001028;">A</strong> &nbsp;{{address}}</div>
        <div data-optional="website"><strong style="color:#001028;">W</strong> &nbsp;<a href="{{website}}" style="color:#0040E8;text-decoration:none;">{{website}}</a></div>
      </div>
    </td>
  </tr>
</table>`;

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "signature"
  );
}
