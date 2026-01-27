import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

export function EmailNotificationSettings() {
  const { user } = useAuthContext();
  const utils = trpc.useUtils();
  
  const { data: emailSetting, isLoading } = trpc.settings.emailOnStatusChange.get.useQuery();
  
  const updateSetting = trpc.settings.emailOnStatusChange.update.useMutation({
    onSuccess: () => {
      toast.success("הגדרת התראות מייל עודכנה בהצלחה");
      utils.settings.emailOnStatusChange.get.invalidate();
    },
    onError: (error) => {
      toast.error("שגיאה: " + error.message);
    },
  });

  const isAdmin = user?.role === 'admin';

  const options = [
    { 
      value: 'ask', 
      label: 'לשאול כל פעם', 
      description: 'חלון קופץ ישאל האם לשלוח מייל ללקוח',
      icon: <Mail className="h-5 w-5 text-blue-500" />
    },
    { 
      value: 'auto', 
      label: 'שליחה אוטומטית', 
      description: 'שליחת מייל אוטומטית בכל שינוי סטטוס',
      icon: <CheckCircle className="h-5 w-5 text-green-500" />
    },
    { 
      value: 'never', 
      label: 'לא לשלוח', 
      description: 'לא לשלוח מיילים בשינוי סטטוס',
      icon: <XCircle className="h-5 w-5 text-red-500" />
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="mr-2 text-gray-500">טוען...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-600" />
          התראות מייל ללקוחות
        </CardTitle>
        <CardDescription>
          הגדר את התנהגות שליחת מייל ללקוחות כאשר משנים סטטוס עבודה
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => isAdmin && updateSetting.mutate({ value: option.value as 'ask' | 'auto' | 'never' })}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                emailSetting === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              } ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3">
                {option.icon}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.label}</span>
                    {emailSetting === option.value && (
                      <Badge variant="outline" className="text-xs">פעיל</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  emailSetting === option.value ? 'border-primary bg-primary' : 'border-gray-300'
                }`}>
                  {emailSetting === option.value && (
                    <CheckCircle className="h-3 w-3 text-white" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {!isAdmin && (
          <p className="text-sm text-muted-foreground text-center pt-2">
            רק מנהל יכול לשנות הגדרה זו
          </p>
        )}
      </CardContent>
    </Card>
  );
}
