import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Package, 
  Truck, 
  DollarSign,
  Loader2,
  Calendar,
  Clock,
  CheckCircle,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

type DateFilter = 'week' | 'month' | 'quarter' | 'year' | 'all';

export default function Analytics() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  
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
    if (value >= 1000000) {
      return `₪${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `₪${(value / 1000).toFixed(1)}K`;
    }
    return `₪${value.toFixed(0)}`;
  };

  const formatFullCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Calculate change percentages (mock data for now)
  const revenueChange = 12.5;
  const customersChange = 8.2;
  const ordersChange = -3.1;

  return (
    <div className="space-y-4 p-1">
      {/* Header with Date Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">אנליטיקס</h1>
          <p className="text-sm text-muted-foreground">סקירה מקיפה של ביצועי העסק</p>
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {[
            { value: 'week', label: 'שבוע' },
            { value: 'month', label: 'חודש' },
            { value: 'quarter', label: 'רבעון' },
            { value: 'year', label: 'שנה' },
            { value: 'all', label: 'הכל' },
          ].map((filter) => (
            <Button
              key={filter.value}
              variant={dateFilter === filter.value ? "default" : "ghost"}
              size="sm"
              className="text-xs px-3"
              onClick={() => setDateFilter(filter.value as DateFilter)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Stats Cards - Compact Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {/* Revenue Card */}
        <Card className="col-span-2 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">הכנסות</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {formatFullCurrency(revenueReport?.totalRevenue || 0)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {revenueChange >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${revenueChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {revenueChange >= 0 ? '+' : ''}{revenueChange}%
                  </span>
                  <span className="text-xs text-muted-foreground">מהחודש הקודם</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profit Card */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">רווח</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-300">
              {formatCurrency(revenueReport?.profit || 0)}
            </p>
            <p className="text-xs text-green-600/70 mt-1">
              {revenueReport?.margin?.toFixed(1) || 0}% מרווח
            </p>
          </CardContent>
        </Card>

        {/* Costs Card */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">עלויות</p>
            <p className="text-xl font-bold text-red-700 dark:text-red-300">
              {formatCurrency(revenueReport?.totalCost || 0)}
            </p>
            <p className="text-xs text-red-600/70 mt-1">
              עלויות ספקים
            </p>
          </CardContent>
        </Card>

        {/* Customers Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">לקוחות</p>
                <p className="text-xl font-bold">{summary?.totalCustomers || 0}</p>
              </div>
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-xs text-green-500">+{customersChange}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Suppliers Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">ספקים</p>
                <p className="text-xl font-bold">{summary?.totalSuppliers || 0}</p>
              </div>
              <Truck className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">פעילים</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue Trend - Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                מגמת הכנסות
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {revenueReport?.byMonth && revenueReport.byMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={revenueReport.byMonth.slice().reverse()}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10 }} 
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(2)}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => formatCurrency(value)} width={60} />
                  <Tooltip 
                    formatter={(value: number) => formatFullCurrency(value)}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return `${date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}`;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    name="הכנסות"
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    name="רווח"
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                אין נתונים להצגה
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              סטטיסטיקות מהירות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                <span className="text-sm">מוצרים</span>
              </div>
              <span className="font-bold">{summary?.totalProducts || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm">שיעור המרה</span>
              </div>
              <span className="font-bold">{summary?.avgConversionRate || 0}%</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm">ממוצע אספקה</span>
              </div>
              <span className="font-bold">3.2 ימים</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                <span className="text-sm">הזמנות החודש</span>
              </div>
              <span className="font-bold">{revenueReport?.byMonth?.[0]?.count || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Top Lists */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              מוצרים מובילים
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productPerformance && productPerformance.length > 0 ? (
              <div className="space-y-2">
                {productPerformance.slice(0, 5).map((product, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.productName}</p>
                      <p className="text-xs text-muted-foreground">{product.totalQuotes} הזמנות</p>
                    </div>
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(Number(product.totalRevenue))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                אין נתונים
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Suppliers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" />
              ספקים מובילים
            </CardTitle>
          </CardHeader>
          <CardContent>
            {supplierPerformance && supplierPerformance.length > 0 ? (
              <div className="space-y-2">
                {supplierPerformance.slice(0, 5).map((supplier, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{supplier.supplierName || 'לא ידוע'}</p>
                      <p className="text-xs text-muted-foreground">{supplier.totalJobs} עבודות</p>
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-bold text-green-600">
                        {formatCurrency(Number(supplier.totalRevenue))}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {Number(supplier.avgDeliveryDays).toFixed(1)} ימים
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                אין נתונים
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              לקוחות מובילים
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customerAnalytics && customerAnalytics.length > 0 ? (
              <div className="space-y-2">
                {customerAnalytics.slice(0, 5).map((customer, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{customer.customerName || 'לא ידוע'}</p>
                      <p className="text-xs text-muted-foreground">{customer.totalQuotes} הזמנות</p>
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-bold text-green-600">
                        {formatCurrency(Number(customer.totalRevenue))}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {Number(customer.conversionRate).toFixed(0)}% המרה
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                אין נתונים
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Suppliers Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              התפלגות עבודות לפי ספק
            </CardTitle>
          </CardHeader>
          <CardContent>
            {supplierPerformance && supplierPerformance.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={150}>
                  <PieChart>
                    <Pie
                      data={supplierPerformance.slice(0, 6)}
                      dataKey="totalJobs"
                      nameKey="supplierName"
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                    >
                      {supplierPerformance.slice(0, 6).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1">
                  {supplierPerformance.slice(0, 6).map((supplier, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="truncate flex-1">{supplier.supplierName || 'לא ידוע'}</span>
                      <span className="font-medium">{supplier.totalJobs}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-muted-foreground text-sm">
                אין נתונים
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products by Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              הכנסות לפי מוצר
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productPerformance && productPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={productPerformance.slice(0, 6)} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(value) => formatCurrency(value)} />
                  <YAxis 
                    dataKey="productName" 
                    type="category" 
                    width={80} 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => value.length > 10 ? value.slice(0, 10) + '...' : value}
                  />
                  <Tooltip formatter={(value: number) => formatFullCurrency(value)} />
                  <Bar dataKey="totalRevenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-muted-foreground text-sm">
                אין נתונים
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
