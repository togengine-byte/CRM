// Settings Types

export interface Permission {
  key: string;
  label: string;
  description: string;
}

export interface StaffFormData {
  name: string;
  email: string;
  password: string;
  phone: string;
  companyName: string;
  role: "employee" | "courier";
  permissions: Record<string, boolean>;
}

export interface ValidationProfileFormData {
  name: string;
  description: string;
  minDpi: number;
  maxDpi: number | undefined;
  allowedColorspaces: string[];
  requiredBleedMm: number;
  maxFileSizeMb: number;
  allowedFormats: string[];
  isDefault: boolean;
}

export interface PricelistFormData {
  name: string;
  description: string;
  markupPercentage: number;
  isDefault: boolean;
  displayOrder: number;
}
