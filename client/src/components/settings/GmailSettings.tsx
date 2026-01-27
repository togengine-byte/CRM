/**
 * Gmail Settings Component
 * Allows admins to configure Gmail SMTP credentials for sending emails
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Mail, 
  Key, 
  Check, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff,
  Send,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuthContext } from "@/contexts/AuthContext";

export function GmailSettings() {
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'admin';
  
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Fetch current settings
  const { data: gmailSettings, isLoading, refetch } = trpc.settings.gmail.get.useQuery();
  
  // Mutations
  const saveMutation = trpc.settings.gmail.save.useMutation({
    onSuccess: () => {
      setMessage({ type: 'success', text: 'הגדרות Gmail נשמרו בהצלחה!' });
      setAppPassword("");
      refetch();
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error.message || 'שגיאה בשמירת ההגדרות' });
    },
  });
  
  const clearMutation = trpc.settings.gmail.clear.useMutation({
    onSuccess: () => {
      setMessage({ type: 'success', text: 'הגדרות Gmail נמחקו' });
      setEmail("");
      setAppPassword("");
      refetch();
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error.message || 'שגיאה במחיקת ההגדרות' });
    },
  });
  
  const testMutation = trpc.settings.gmail.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        setMessage({ type: 'success', text: 'החיבור ל-Gmail תקין!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'החיבור נכשל' });
      }
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error.message || 'שגיאה בבדיקת החיבור' });
    },
  });
  
  const sendTestMutation = trpc.settings.gmail.sendTestEmail.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        setMessage({ type: 'success', text: `מייל בדיקה נשלח בהצלחה ל-${testEmail}` });
        setTestEmail("");
      } else {
        setMessage({ type: 'error', text: result.error || 'שליחת המייל נכשלה' });
      }
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error.message || 'שגיאה בשליחת מייל בדיקה' });
    },
  });
  
  // Update email field when settings load
  useEffect(() => {
    if (gmailSettings?.email) {
      setEmail(gmailSettings.email);
    }
  }, [gmailSettings]);
  
  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);
  
  const handleSave = () => {
    if (!email || !appPassword) {
      setMessage({ type: 'error', text: 'יש למלא את כל השדות' });
      return;
    }
    saveMutation.mutate({ email, appPassword });
  };
  
  const handleClear = () => {
    if (confirm('האם אתה בטוח שברצונך למחוק את הגדרות Gmail?')) {
      clearMutation.mutate();
    }
  };
  
  const handleTest = () => {
    testMutation.mutate();
  };
  
  const handleSendTest = () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'יש להזין כתובת מייל לבדיקה' });
      return;
    }
    sendTestMutation.mutate({ to: testEmail });
  };
  
  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>רק מנהל מערכת יכול לגשת להגדרות Gmail</p>
        </CardContent>
      </Card>
    );
  }
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-blue-500" />
          <p className="mt-2 text-gray-500">טוען הגדרות...</p>
        </CardContent>
      </Card>
    );
  }
  
  const isConfigured = gmailSettings?.isConfigured;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          הגדרות Gmail
        </CardTitle>
        <CardDescription>
          הגדר חשבון Gmail לשליחת מיילים אוטומטיים ללקוחות
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status indicator */}
        <div className={`flex items-center gap-2 p-3 rounded-lg ${isConfigured ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
          {isConfigured ? (
            <>
              <Check className="h-5 w-5" />
              <span>Gmail מוגדר ופעיל</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5" />
              <span>Gmail לא מוגדר - מיילים לא יישלחו</span>
            </>
          )}
        </div>
        
        {/* Message alert */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription className="flex items-center gap-2">
              {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {message.text}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Gmail credentials form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gmail-email">כתובת Gmail</Label>
            <Input
              id="gmail-email"
              type="email"
              placeholder="your-email@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="gmail-password">App Password</Label>
            <div className="relative">
              <Input
                id="gmail-password"
                type={showPassword ? "text" : "password"}
                placeholder={isConfigured ? "●●●●●●●●●●●●●●●●" : "xxxx xxxx xxxx xxxx"}
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                dir="ltr"
                className="pl-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              יש ליצור App Password ב-
              <a 
                href="https://myaccount.google.com/apppasswords" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline mr-1"
              >
                הגדרות Google
              </a>
              (16 תווים ללא רווחים)
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending || !email || !appPassword}
              className="flex-1"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Key className="h-4 w-4 ml-2" />
              )}
              שמור הגדרות
            </Button>
            
            {isConfigured && (
              <Button 
                variant="outline" 
                onClick={handleClear}
                disabled={clearMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Test connection section */}
        {isConfigured && (
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium text-sm">בדיקת חיבור</h4>
            
            <Button 
              variant="outline" 
              onClick={handleTest}
              disabled={testMutation.isPending}
              className="w-full"
            >
              {testMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <RefreshCw className="h-4 w-4 ml-2" />
              )}
              בדוק חיבור ל-Gmail
            </Button>
            
            <div className="space-y-2">
              <Label htmlFor="test-email">שלח מייל בדיקה</Label>
              <div className="flex gap-2">
                <Input
                  id="test-email"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  dir="ltr"
                />
                <Button 
                  onClick={handleSendTest}
                  disabled={sendTestMutation.isPending || !testEmail}
                >
                  {sendTestMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
