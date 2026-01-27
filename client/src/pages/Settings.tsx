import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings as SettingsIcon, 
  FileCheck, 
  Shield,
  Truck,
  Users,
  Key,
  ExternalLink,
  ShoppingBag,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

// Import extracted settings components
import {
  DeveloperLogsSettings,
  EmailNotificationSettings,
  SupplierWeightsSettings,
  PricelistSettings,
  StaffManagementSettings,
  ValidationProfilesSettings,
  PortalsSettings,
} from "@/components/settings";

export default function Settings() {
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">הגדרות</h1>
          <p className="text-gray-600 mt-1">ניהול הגדרות המערכת, עובדים ופרופילי וולידציה</p>
        </div>
      </div>

      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8 lg:w-[1000px]">
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            עובדים
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            ספקים
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            וולידציה
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            כללי
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            אבטחה
          </TabsTrigger>
          <TabsTrigger value="developers" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            מפתחים
          </TabsTrigger>
          <TabsTrigger value="portals" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            פורטלים
          </TabsTrigger>
          <TabsTrigger value="pricelists" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            מחירונים
          </TabsTrigger>
        </TabsList>

        {/* Staff Tab */}
        <TabsContent value="staff" className="space-y-6">
          {isAdmin ? (
            <StaffManagementSettings />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>רק מנהל מערכת יכול לגשת להגדרות עובדים</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-6">
          <SupplierWeightsSettings />
          <EmailNotificationSettings />
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation" className="space-y-6">
          <ValidationProfilesSettings />
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות כלליות</CardTitle>
              <CardDescription>הגדרות בסיסיות של המערכת</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <label htmlFor="googleApiKey" className="text-sm font-medium">Google API Key</label>
                <p className="text-sm text-gray-600">מפתח API של Google לשליחת מיילים</p>
                <Input
                  id="googleApiKey"
                  type="password"
                  placeholder="הזן את ה-API Key שלך"
                  defaultValue=""
                  className="font-mono text-xs"
                />
                <p className="text-xs text-gray-500">המפתח מאוחסן בצורה מאובטחת</p>
                <Button className="w-full">שמור מפתח</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות אבטחה</CardTitle>
              <CardDescription>ניהול הרשאות ואבטחה</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>הגדרות אבטחה יתווספו בקרוב</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Developers Tab */}
        <TabsContent value="developers">
          <DeveloperLogsSettings />
        </TabsContent>

        {/* Portals Tab */}
        <TabsContent value="portals">
          <PortalsSettings />
        </TabsContent>

        {/* Pricelists Tab */}
        <TabsContent value="pricelists" className="space-y-6">
          {isAdmin ? (
            <PricelistSettings />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>רק מנהל מערכת יכול לגשת להגדרות מחירונים</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
