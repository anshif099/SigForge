export interface Employee {
  id: string;
  name: string;
  designation: string;
  phones: string[];
  mobile?: string;
  email: string;
  address: string;
  website?: string;
  logoDataUrl?: string;
  extra?: Record<string, string>;
}

export interface Template {
  id: string;
  name: string;
  html: string;
  createdAt: number;
}

export interface CompanyAssets {
  logoDataUrl?: string;
  companyName?: string;
  website?: string;
  brandPalette?: {
    primary: string;
    secondary: string;
  };
}

export interface GenerationRecord {
  date: string;
  count: number;
}
