import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Package, Truck, ShoppingBag, Eye } from "lucide-react";
import { useLocation } from "wouter";

export function PortalsSettings() {
  const [, setLocation] = useLocation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-blue-600" />
          גישה מהירה לפורטלים
        </CardTitle>
        <CardDescription>
          צפה בפורטלים של ספקים, שליחים ולקוחות לצורך בדיקה ופיתוח
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {/* פורטל ספקים */}
          <Card className="border-2 hover:border-purple-300 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">פורטל ספקים</CardTitle>
                  <CardDescription>ניהול מחירים ועבודות</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                ספקים יכולים לנהל מחירים, לראות עבודות שהוקצו להם ולסמן מוכנות.
              </p>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => window.open('/supplier-portal', '_blank')}
              >
                <ExternalLink className="ml-2 h-4 w-4" />
                פתח פורטל ספקים
              </Button>
            </CardContent>
          </Card>

          {/* פורטל שליחים */}
          <Card className="border-2 hover:border-orange-300 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Truck className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">פורטל שליחים</CardTitle>
                  <CardDescription>איסוף ומשלוחים</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                שליחים יכולים לראות עבודות מוכנות לאיסוף, לסמן איסוף ומסירה.
              </p>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => window.open('/courier-portal', '_blank')}
              >
                <ExternalLink className="ml-2 h-4 w-4" />
                פתח פורטל שליחים
              </Button>
            </CardContent>
          </Card>

          {/* פורטל לקוחות */}
          <Card className="border-2 hover:border-green-300 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ShoppingBag className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">פורטל לקוחות</CardTitle>
                  <CardDescription>הצעות מחיר ואישורים</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                לקוחות יכולים לצפות בהצעות מחיר, לאשר או לדחות ולעקוב אחרי הזמנות.
              </p>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => window.open('/customer-portal', '_blank')}
              >
                <ExternalLink className="ml-2 h-4 w-4" />
                פתח פורטל לקוחות
              </Button>
            </CardContent>
          </Card>

          {/* תצוגה מקדימה פורטל לקוחות */}
          <Card className="border-2 hover:border-blue-300 transition-colors border-dashed">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Eye className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">תצוגה מקדימה - לקוחות</CardTitle>
                  <CardDescription>ראה מה הלקוח רואה</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                צפה בפורטל הלקוחות מנקודת המבט של המנהל. בחר לקוח וראה את ההצעות שלו.
              </p>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                onClick={() => setLocation('/customer-portal-preview')}
              >
                <Eye className="ml-2 h-4 w-4" />
                צפה כמנהל
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">הערה</h4>
          <p className="text-sm text-blue-800">
            הפורטלים ייפתחו בחלון חדש. כמנהל מערכת, אתה יכול לצפות בכל הפורטלים לצורך בדיקה ופיתוח.
            משתמשים רגילים (ספקים, שליחים, לקוחות) יראו רק את הפורטל הרלוונטי לתפקידם.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
