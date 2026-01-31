/**
 * Customer Form Component
 * Handles customer information input
 */

import { Input } from "@/components/ui/input";
import { User, Mail, Phone, Building2 } from "lucide-react";
import type { CustomerFormData } from "./types";

interface CustomerFormProps {
  data: CustomerFormData;
  onChange: (data: CustomerFormData) => void;
}

export function CustomerForm({ data, onChange }: CustomerFormProps) {
  const handleChange = (field: keyof CustomerFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
      <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <User className="h-4 w-4 text-blue-600" />
        פרטי לקוח
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <User className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="שם מלא *"
            value={data.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="pr-9 h-9 text-sm bg-slate-50 border-slate-200"
          />
        </div>
        <div className="relative">
          <Mail className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="אימייל *"
            type="email"
            value={data.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="pr-9 h-9 text-sm bg-slate-50 border-slate-200"
            dir="ltr"
          />
        </div>
        <div className="relative">
          <Phone className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="טלפון *"
            value={data.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="pr-9 h-9 text-sm bg-slate-50 border-slate-200"
            dir="ltr"
          />
        </div>
        <div className="relative">
          <Building2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="שם החברה"
            value={data.company}
            onChange={(e) => handleChange('company', e.target.value)}
            className="pr-9 h-9 text-sm bg-slate-50 border-slate-200"
          />
        </div>
      </div>
    </div>
  );
}
