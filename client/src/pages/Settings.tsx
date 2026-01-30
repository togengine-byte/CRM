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
  Database,
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
  GmailSettings,
  BackupSettings,
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
        <TabsList className="grid w-full grid-cols-9 lg:w-[1100px]">
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
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            גיבוי
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

        {/* General Tab - Gmail Settings */}
        <TabsContent value="general" className="space-y-6">
          <GmailSettings />
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

        {/* Backup Tab */}
        <TabsContent value="backup" className="space-y-6">
          {isAdmin ? (
            <BackupSettings />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>רק מנהל מערכת יכול לגשת להגדרות גיבוי</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
