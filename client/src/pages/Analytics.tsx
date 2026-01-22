import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  TrendingUp, 
  Users, 
  Package, 
  Truck, 
  DollarSign,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Analytics() {
  const { data: summary, isLoading: summaryLoading } = trpc.analytics.summary.useQuery();
  const { data: productPerformance, isLoading: productsLoading } = trpc.analytics.productPerformance.useQuery();
  const { data: supplierPerformance, isLoading: suppliersLoading } = trpc.analytics.supplierPerformance.useQuery();
  const { data: customerAnalytics, isLoading: customersLoading } = trpc.analytics.customerAnalytics.useQuery();
  const { data: revenueReport, isLoading: revenueLoading } = trpc.analytics.revenueReport.useQuery();

  const isLoading = summaryLoading || productsLoading || suppliersLoading || customersLoading || revenueLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">אנליטיקס</h1>
        <p className="text-muted-foreground">
          סקירה מקיפה של ביצועי העסק
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">סה"כ לקוחות</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">
              לקוחות פעילים במערכת
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">סה"כ ספקים</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalSuppliers || 0}</div>
            <p className="text-xs text-muted-foreground">
              ספקים פעילים במערכת
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">סה"כ מוצרים</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground">
              מוצרים פעילים בקטלוג
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">שיעור המרה</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.avgConversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              מהצעות מחיר לעסקאות
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Overview */}
      {revenueReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              סקירת הכנסות
            </CardTitle>
            <CardDescription>
              הכנסות, עלויות ורווח לפי חודש
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">סה"כ הכנסות</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(revenueReport.totalRevenue)}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">סה"כ עלויות</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(revenueReport.totalCost)}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">רווח גולמי</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(revenueReport.profit)}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">מרווח רווח</p>
                <p className="text-2xl font-bold text-purple-600">{formatPercent(revenueReport.margin)}</p>
              </div>
            </div>

            {revenueReport.byMonth && revenueReport.byMonth.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueReport.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `חודש: ${label}`}
                  />
                  <Bar dataKey="revenue" name="הכנסות" fill="#3b82f6" />
                  <Bar dataKey="cost" name="עלויות" fill="#ef4444" />
                  <Bar dataKey="profit" name="רווח" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs for detailed analytics */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="products">ביצועי מוצרים</TabsTrigger>
          <TabsTrigger value="suppliers">ביצועי ספקים</TabsTrigger>
          <TabsTrigger value="customers">ניתוח לקוחות</TabsTrigger>
        </TabsList>

        {/* Products Performance */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ביצועי מוצרים</CardTitle>
              <CardDescription>
                מוצרים מובילים לפי הכנסות ומכירות
              </CardDescription>
            </CardHeader>
            <CardContent>
              {productPerformance && productPerformance.length > 0 ? (
                <div className="space-y-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productPerformance.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="productName" type="category" width={150} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="totalRevenue" name="הכנסות" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-3 text-right font-medium">מוצר</th>
                          <th className="p-3 text-right font-medium">קטגוריה</th>
                          <th className="p-3 text-right font-medium">הצעות</th>
                          <th className="p-3 text-right font-medium">כמות</th>
                          <th className="p-3 text-right font-medium">הכנסות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productPerformance.slice(0, 10).map((product, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-3 font-medium">{product.productName}</td>
                            <td className="p-3 text-muted-foreground">{product.category || '-'}</td>
                            <td className="p-3">{product.totalQuotes}</td>
                            <td className="p-3">{product.totalQuantity}</td>
                            <td className="p-3 font-medium text-green-600">
                              {formatCurrency(Number(product.totalRevenue))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  אין נתונים להצגה
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Performance */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ביצועי ספקים</CardTitle>
              <CardDescription>
                ספקים מובילים לפי עבודות וזמני אספקה
              </CardDescription>
            </CardHeader>
            <CardContent>
              {supplierPerformance && supplierPerformance.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-medium mb-4">התפלגות עבודות לפי ספק</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={supplierPerformance.slice(0, 6)}
                            dataKey="totalJobs"
                            nameKey="supplierName"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {supplierPerformance.slice(0, 6).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-4">ממוצע ימי אספקה</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={supplierPerformance.slice(0, 6)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="supplierName" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="avgDeliveryDays" name="ימי אספקה" fill="#f59e0b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-3 text-right font-medium">ספק</th>
                          <th className="p-3 text-right font-medium">חברה</th>
                          <th className="p-3 text-right font-medium">עבודות</th>
                          <th className="p-3 text-right font-medium">הכנסות</th>
                          <th className="p-3 text-right font-medium">ממוצע אספקה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierPerformance.map((supplier, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-3 font-medium">{supplier.supplierName || 'לא ידוע'}</td>
                            <td className="p-3 text-muted-foreground">{supplier.supplierCompany || '-'}</td>
                            <td className="p-3">{supplier.totalJobs}</td>
                            <td className="p-3 font-medium text-green-600">
                              {formatCurrency(Number(supplier.totalRevenue))}
                            </td>
                            <td className="p-3">{Number(supplier.avgDeliveryDays).toFixed(1)} ימים</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  אין נתונים להצגה
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Analytics */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ניתוח לקוחות</CardTitle>
              <CardDescription>
                לקוחות מובילים לפי הכנסות ושיעור המרה
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customerAnalytics && customerAnalytics.length > 0 ? (
                <div className="space-y-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={customerAnalytics.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="customerName" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="totalRevenue" 
                        name="הכנסות" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="conversionRate" 
                        name="שיעור המרה (%)" 
                        stroke="#10b981" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>

                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-3 text-right font-medium">לקוח</th>
                          <th className="p-3 text-right font-medium">חברה</th>
                          <th className="p-3 text-right font-medium">הצעות</th>
                          <th className="p-3 text-right font-medium">אושרו</th>
                          <th className="p-3 text-right font-medium">הכנסות</th>
                          <th className="p-3 text-right font-medium">המרה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerAnalytics.map((customer, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-3 font-medium">{customer.customerName || 'לא ידוע'}</td>
                            <td className="p-3 text-muted-foreground">{customer.customerCompany || '-'}</td>
                            <td className="p-3">{customer.totalQuotes}</td>
                            <td className="p-3">{customer.approvedQuotes}</td>
                            <td className="p-3 font-medium text-green-600">
                              {formatCurrency(Number(customer.totalRevenue))}
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 ${
                                Number(customer.conversionRate) >= 50 
                                  ? 'text-green-600' 
                                  : Number(customer.conversionRate) >= 25 
                                    ? 'text-yellow-600' 
                                    : 'text-red-600'
                              }`}>
                                {Number(customer.conversionRate) >= 50 ? (
                                  <ArrowUpRight className="h-4 w-4" />
                                ) : (
                                  <ArrowDownRight className="h-4 w-4" />
                                )}
                                {formatPercent(Number(customer.conversionRate))}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  אין נתונים להצגה
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
