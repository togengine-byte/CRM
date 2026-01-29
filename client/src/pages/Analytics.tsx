import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ArrowRight,
  AlertTriangle,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  Target,
  Zap,
  Award,
  Activity,
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
  LineChart,
  Line,
  Legend,
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

type DateFilter = 'week' | 'month' | 'quarter' | 'year' | 'all';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  type: 'products' | 'suppliers' | 'customers';
}

function DetailModal({ isOpen, onClose, title, data, type }: DetailModalProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'products' && <Package className="h-5 w-5" />}
            {type === 'suppliers' && <Truck className="h-5 w-5" />}
            {type === 'customers' && <Users className="h-5 w-5" />}
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                  index === 0 ? 'bg-yellow-500' : 
                  index === 1 ? 'bg-gray-400' : 
                  index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium">
                    {type === 'products' ? item.productName : 
                     type === 'suppliers' ? (item.supplierName || item.supplierCompany || 'לא ידוע') :
                     (item.customerName || 'לא ידוע')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {type === 'products' ? `${item.totalQuotes || 0} הזמנות • ${item.totalQuantity || 0} יחידות` :
                     type === 'suppliers' ? `${item.totalJobs || 0} עבודות • ${Number(item.avgDeliveryDays || 0).toFixed(1)} ימי אספקה` :
                     `${item.totalQuotes || 0} הזמנות • ${Number(item.conversionRate || 0).toFixed(0)}% המרה`}
                  </p>
                </div>
              </div>
              <div className="text-left">
                <p className="font-bold text-green-600">{formatCurrency(Number(item.totalRevenue || 0))}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Analytics() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; type: 'products' | 'suppliers' | 'customers'; title: string } | null>(null);
  
  const { data: summary, isLoading: summaryLoading } = trpc.analytics.summary.useQuery();
  const { data: productPerformance, isLoading: productsLoading } = trpc.analytics.productPerformance.useQuery();
  const { data: supplierPerformance, isLoading: suppliersLoading } = trpc.analytics.supplierPerformance.useQuery();
  const { data: customerAnalytics, isLoading: customersLoading } = trpc.analytics.customerAnalytics.useQuery();
  const { data: revenueReport, isLoading: revenueLoading } = trpc.analytics.revenueReport.useQuery();
  const { data: suppliers } = trpc.suppliers.list.useQuery();
  const { data: customers } = trpc.customers.list.useQuery();

  const isLoading = summaryLoading || productsLoading || suppliersLoading || customersLoading || revenueLoading;

  // Calculate filtered data based on date filter
  const filteredRevenueData = useMemo(() => {
    if (!revenueReport?.byMonth) return [];
    const months = revenueReport.byMonth;
    switch (dateFilter) {
      case 'week': return months.slice(0, 1);
      case 'month': return months.slice(0, 1);
      case 'quarter': return months.slice(0, 3);
      case 'year': return months.slice(0, 12);
      default: return months;
    }
  }, [revenueReport, dateFilter]);

  // Calculate comparison percentages
  const revenueChange = useMemo(() => {
    if (!revenueReport?.byMonth || revenueReport.byMonth.length < 2) return 0;
    const current = revenueReport.byMonth[0]?.revenue || 0;
    const previous = revenueReport.byMonth[1]?.revenue || 0;
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }, [revenueReport]);

  const profitChange = useMemo(() => {
    if (!revenueReport?.byMonth || revenueReport.byMonth.length < 2) return 0;
    const current = revenueReport.byMonth[0]?.profit || 0;
    const previous = revenueReport.byMonth[1]?.profit || 0;
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }, [revenueReport]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `₪${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `₪${(value / 1000).toFixed(1)}K`;
    return `₪${value.toFixed(0)}`;
  };

  const formatFullCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const toggleCard = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const handleExportCSV = () => {
    // Create CSV content
    let csv = 'סוג,שם,הזמנות,הכנסות\n';
    productPerformance?.slice(0, 20).forEach(p => {
      csv += `מוצר,${p.productName},${p.totalQuotes},${p.totalRevenue}\n`;
    });
    supplierPerformance?.slice(0, 20).forEach(s => {
      csv += `ספק,${s.supplierName || s.supplierCompany},${s.totalJobs},${s.totalRevenue}\n`;
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4 p-1">
      {/* Header with Filters - Google Style */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border p-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">אנליטיקס</h1>
            <p className="text-sm text-gray-500">סקירה מקיפה של ביצועי העסק</p>
          </div>
          
          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Filter */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
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
                  className={`text-xs px-3 h-7 ${dateFilter === filter.value ? 'shadow-sm' : ''}`}
                  onClick={() => setDateFilter(filter.value as DateFilter)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {/* Supplier Filter */}
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <Truck className="h-3 w-3 ml-1" />
                <SelectValue placeholder="כל הספקים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הספקים</SelectItem>
                {suppliers?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.companyName || s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Customer Filter */}
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <Users className="h-3 w-3 ml-1" />
                <SelectValue placeholder="כל הלקוחות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הלקוחות</SelectItem>
                {customers?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Export Button */}
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExportCSV}>
              <Download className="h-3 w-3 ml-1" />
              ייצוא
            </Button>
          </div>
        </div>
      </div>

      {/* Main KPI Cards - Clean Google Style */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {/* Revenue Card */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500"
          onClick={() => toggleCard('revenue')}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">הכנסות</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatFullCurrency(revenueReport?.totalRevenue || 0)}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {revenueChange >= 0 ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs px-1.5">
                      <TrendingUp className="h-3 w-3 ml-0.5" />
                      +{revenueChange.toFixed(1)}%
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs px-1.5">
                      <TrendingDown className="h-3 w-3 ml-0.5" />
                      {revenueChange.toFixed(1)}%
                    </Badge>
                  )}
                  <span className="text-xs text-gray-400">מהחודש הקודם</span>
                </div>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            {expandedCard === 'revenue' && (
              <div className="mt-4 pt-4 border-t">
                <ResponsiveContainer width="100%" height={80}>
                  <AreaChart data={filteredRevenueData.slice().reverse()}>
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profit Card */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-green-500"
          onClick={() => toggleCard('profit')}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">רווח</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatFullCurrency(revenueReport?.profit || 0)}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs px-1.5">
                    {revenueReport?.margin?.toFixed(1) || 0}% מרווח
                  </Badge>
                </div>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
            {expandedCard === 'profit' && (
              <div className="mt-4 pt-4 border-t">
                <ResponsiveContainer width="100%" height={80}>
                  <AreaChart data={filteredRevenueData.slice().reverse()}>
                    <Area type="monotone" dataKey="profit" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customers Card */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-purple-500"
          onClick={() => toggleCard('customers')}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">לקוחות</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary?.totalCustomers || 0}
                </p>
                <p className="text-xs text-gray-400 mt-2">לקוחות פעילים</p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate Card */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-orange-500"
          onClick={() => toggleCard('conversion')}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">שיעור המרה</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary?.avgConversionRate || 0}%
                </p>
                <p className="text-xs text-gray-400 mt-2">מהצעות לעסקאות</p>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <Target className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                מגמת הכנסות ורווח
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {dateFilter === 'week' ? 'שבוע אחרון' : 
                 dateFilter === 'month' ? 'חודש אחרון' :
                 dateFilter === 'quarter' ? 'רבעון אחרון' :
                 dateFilter === 'year' ? 'שנה אחרונה' : 'כל הזמן'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {filteredRevenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={filteredRevenueData.slice().reverse()}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10 }} 
                    tickFormatter={(value) => value.slice(5)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    tickFormatter={(value) => formatCurrency(value)} 
                    width={50}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [formatFullCurrency(value), name === 'revenue' ? 'הכנסות' : 'רווח']}
                    labelFormatter={(label) => `חודש: ${label}`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    name="revenue"
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    name="profit"
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                אין נתונים להצגה
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              סטטיסטיקות מהירות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div 
              className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              onClick={() => setDetailModal({ isOpen: true, type: 'products', title: 'כל המוצרים' })}
            >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                <span className="text-sm">מוצרים</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{summary?.totalProducts || 0}</span>
                <ChevronDown className="h-3 w-3 text-gray-400" />
              </div>
            </div>
            <div 
              className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              onClick={() => setDetailModal({ isOpen: true, type: 'suppliers', title: 'כל הספקים' })}
            >
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-orange-500" />
                <span className="text-sm">ספקים פעילים</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{summary?.totalSuppliers || 0}</span>
                <ChevronDown className="h-3 w-3 text-gray-400" />
              </div>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <span className="text-sm">ממוצע אספקה</span>
              </div>
              <span className="font-bold">
                {supplierPerformance && supplierPerformance.length > 0 
                  ? (supplierPerformance.reduce((acc: number, s: any) => acc + Number(s.avgDeliveryDays || 0), 0) / supplierPerformance.length).toFixed(1)
                  : '0'} ימים
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-500" />
                <span className="text-sm">הזמנות החודש</span>
              </div>
              <span className="font-bold">{filteredRevenueData[0]?.quoteCount || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-500" />
                <span className="text-sm">עלויות</span>
              </div>
              <span className="font-bold text-red-500">{formatCurrency(revenueReport?.totalCost || 0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Lists Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top Products */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-500" />
                מוצרים מובילים
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7"
                onClick={() => setDetailModal({ isOpen: true, type: 'products', title: 'כל המוצרים' })}
              >
                הצג הכל
                <ArrowRight className="h-3 w-3 mr-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {productPerformance && productPerformance.length > 0 ? (
              <div className="space-y-2">
                {productPerformance.slice(0, 5).map((product: any, index: number) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.productName}</p>
                      <p className="text-xs text-gray-400">{product.totalQuotes || 0} הזמנות</p>
                    </div>
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(Number(product.totalRevenue || 0))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">אין נתונים</div>
            )}
          </CardContent>
        </Card>

        {/* Top Suppliers */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Truck className="h-4 w-4 text-orange-500" />
                ספקים מובילים
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7"
                onClick={() => setDetailModal({ isOpen: true, type: 'suppliers', title: 'כל הספקים' })}
              >
                הצג הכל
                <ArrowRight className="h-3 w-3 mr-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {supplierPerformance && supplierPerformance.length > 0 ? (
              <div className="space-y-2">
                {supplierPerformance.slice(0, 5).map((supplier: any, index: number) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{supplier.supplierName || supplier.supplierCompany || 'לא ידוע'}</p>
                      <p className="text-xs text-gray-400">{supplier.totalJobs || 0} עבודות</p>
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-bold text-green-600">
                        {formatCurrency(Number(supplier.totalRevenue || 0))}
                      </span>
                      <p className="text-xs text-gray-400">
                        {Number(supplier.avgDeliveryDays || 0).toFixed(1)} ימים
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">אין נתונים</div>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                לקוחות מובילים
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7"
                onClick={() => setDetailModal({ isOpen: true, type: 'customers', title: 'כל הלקוחות' })}
              >
                הצג הכל
                <ArrowRight className="h-3 w-3 mr-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {customerAnalytics && customerAnalytics.length > 0 ? (
              <div className="space-y-2">
                {customerAnalytics.slice(0, 5).map((customer: any, index: number) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{customer.customerName || 'לא ידוע'}</p>
                      <p className="text-xs text-gray-400">{customer.totalQuotes || 0} הזמנות</p>
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-bold text-green-600">
                        {formatCurrency(Number(customer.totalRevenue || 0))}
                      </span>
                      <p className="text-xs text-gray-400">
                        {Number(customer.conversionRate || 0).toFixed(0)}% המרה
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">אין נתונים</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Suppliers Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-blue-500" />
              התפלגות עבודות לפי ספק
            </CardTitle>
          </CardHeader>
          <CardContent>
            {supplierPerformance && supplierPerformance.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={160}>
                  <PieChart>
                    <Pie
                      data={supplierPerformance.slice(0, 6)}
                      dataKey="totalJobs"
                      nameKey="supplierName"
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={65}
                    >
                      {supplierPerformance.slice(0, 6).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {supplierPerformance.slice(0, 6).map((supplier: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="truncate flex-1">{supplier.supplierName || supplier.supplierCompany || 'לא ידוע'}</span>
                      <span className="font-medium">{supplier.totalJobs || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-gray-400 text-sm">
                אין נתונים
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products Revenue Bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-500" />
              הכנסות לפי מוצר
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productPerformance && productPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={productPerformance.slice(0, 6)} layout="vertical">
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 10 }} 
                    tickFormatter={(value) => formatCurrency(value)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    dataKey="productName" 
                    type="category" 
                    width={70} 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => value.length > 8 ? value.slice(0, 8) + '..' : value}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={(value: number) => formatFullCurrency(value)} />
                  <Bar dataKey="totalRevenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-gray-400 text-sm">
                אין נתונים
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-500" />
            השוואת הכנסות ועלויות לפי חודש
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRevenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={filteredRevenueData.slice().reverse()}>
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => value.slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  tickFormatter={(value) => formatCurrency(value)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    formatFullCurrency(value), 
                    name === 'revenue' ? 'הכנסות' : name === 'cost' ? 'עלויות' : 'רווח'
                  ]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend 
                  formatter={(value) => value === 'revenue' ? 'הכנסות' : value === 'cost' ? 'עלויות' : 'רווח'}
                />
                <Bar dataKey="revenue" name="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
              אין נתונים להצגה
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {detailModal && (
        <DetailModal
          isOpen={detailModal.isOpen}
          onClose={() => setDetailModal(null)}
          title={detailModal.title}
          data={
            detailModal.type === 'products' ? (productPerformance || []) :
            detailModal.type === 'suppliers' ? (supplierPerformance || []) :
            (customerAnalytics || [])
          }
          type={detailModal.type}
        />
      )}
    </div>
  );
}
