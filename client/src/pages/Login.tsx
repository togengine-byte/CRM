import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

export default function Login() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "קוד לא תקין");
        return;
      }

      // Redirect to home
      setLocation("/");
    } catch (err) {
      setError("שגיאה בהתחברות");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" dir="rtl">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <div className="flex flex-col items-center gap-6">
          <h1 className="text-3xl font-bold text-gray-900">QuoteFlow</h1>
          <h2 className="text-xl font-semibold text-gray-700">התחברות</h2>
          <p className="text-sm text-gray-500 text-center">
            הכנס את קוד ההתחברות שלך
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              קוד התחברות
            </label>
            <Input
              type="text"
              placeholder="הכנס קוד"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading}
              className="w-full"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !code}
            className="w-full"
            size="lg"
          >
            {loading ? "מתחבר..." : "התחברות"}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
          <p className="font-semibold mb-2">קוד הדוגמה: 1234</p>
          <p>השתמש בקוד זה כדי להתחבר לאפליקציה</p>
        </div>
      </div>
    </div>
  );
}
