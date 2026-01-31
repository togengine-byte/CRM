/**
 * Login Modal Component
 * Handles user authentication in a modal dialog
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [, setLocation] = useLocation();
  const { refresh } = useAuthContext();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (response.ok) {
        await refresh();
        onClose();
        setLocation("/dashboard");
      } else {
        toast.error("שם משתמש או סיסמה שגויים");
      }
    } catch (error) {
      toast.error("שגיאה בהתחברות");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" 
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900 mb-4 text-center">התחברות</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="email"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pr-10"
              dir="ltr"
              required
            />
          </div>
          <Input
            type="password"
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button 
            type="submit" 
            className="w-full"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "התחבר"}
          </Button>
        </form>
        <button 
          onClick={onClose}
          className="mt-4 text-sm text-slate-500 hover:text-slate-700 w-full text-center"
        >
          ביטול
        </button>
      </div>
    </div>
  );
}
