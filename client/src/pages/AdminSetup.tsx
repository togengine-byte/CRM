import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function AdminSetup() {
  const [email, setEmail] = useState("idicrmai@gmail.com");
  const [name, setName] = useState("איתמר");
  const [secretKey, setSecretKey] = useState("");
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const seedAdminMutation = trpc.auth.seedAdmin.useMutation({
    onSuccess: (data) => {
      setResult({ success: true, message: data.message });
    },
    onError: (error) => {
      setResult({ success: false, message: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    seedAdminMutation.mutate({ email, name, secretKey });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>הגדרת מנהל מערכת</CardTitle>
          <CardDescription>
            יצירת משתמש מנהל ראשוני במערכת
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">אימייל</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">שם</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">מפתח סודי</label>
              <Input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="הזן מפתח סודי"
                required
              />
            </div>
            
            {result && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {result.success ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span>{result.message}</span>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={seedAdminMutation.isPending}
            >
              {seedAdminMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  יוצר מנהל...
                </>
              ) : (
                'צור מנהל מערכת'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
