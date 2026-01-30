import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Package, 
  Truck, 
  Loader2,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

type DateFilter = 'week' | 'month' | 'quarter' | 'year' | 'all';

export default function Analytics() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('year');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [expandedSection, setExpandedSection] = useState<string | null>('products');
  
  // Custom date range
  const [startDateStr, setStartDateStr] = useState<string>('');
  const [endDateStr, setEndDateStr] = useState<string>('');
  
  // Applied filters (only update when "הצג" is clicked)
  const [appliedDateFilter, setAppliedDateFilter] = useState<DateFilter>('year');
  const [appliedSupplierFilter, setAppliedSupplierFilter] = useState<string>('all');
  const [appliedCustomerFilter, setAppliedCustomerFilter] = useState<string>('all');
  const [appliedStartDate, setAppliedStartDate] = useState<string>('');
  const [appliedEndDate, setAppliedEndDate] = useState<string>('');
  
  // Section-specific date filters
  const [productsDateFilter, setProductsDateFilter] = useState<DateFilter>('year');
  const [suppliersDateFilter, setSuppliersDateFilter] = useState<DateFilter>('year');
  const [customersDateFilter, setCustomersDateFilter] = useState<DateFilter>('year');
  
  const applyFilters = () => {
    console.log('Apply filters clicked:', { dateFilter, supplierFilter, customerFilter, startDateStr, endDateStr });
    setAppliedDateFilter(dateFilter);
    setAppliedSupplierFilter(supplierFilter);
    setAppliedCustomerFilter(customerFilter);
    setAppliedStartDate(startDateStr);
    setAppliedEndDate(endDateStr);
  };
  
  // Calculate date range for queries - always fetch full year for chart
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    return { startDate: start, endDate: end };
  }, []);

  const { data: summary, isLoading: summaryLoading } = trpc.analytics.summary.useQuery();
  const { data: productPerformance, isLoading: productsLoading } = trpc.analytics.productPerformance.useQuery(dateRange);
  const { data: supplierPerformance, isLoading: suppliersLoading } = trpc.analytics.supplierPerformance.useQuery(dateRange);
  const { data: customerAnalytics, isLoading: customersLoading } = trpc.analytics.customerAnalytics.useQuery(dateRange);
  const { data: revenueReport, isLoading: revenueLoading } = trpc.analytics.revenueReport.useQuery(dateRange);
  const { data: suppliers } = trpc.suppliers.list.useQuery();
  const { data: customers } = trpc.customers.list.useQuery();

  const isLoading = summaryLoading || productsLoading || suppliersLoading || customersLoading || revenueLoading;

  // Filter data based on APPLIED filters (only changes when "הצג" is clicked)
  const filteredRevenueData = useMemo(() => {
    if (!revenueReport?.byMonth || revenueReport.byMonth.length === 0) return [];
    let months = revenueReport.byMonth;
    
    // If custom date range is set, filter by date
    if (appliedStartDate || appliedEndDate) {
      months = months.filter((m: any) => {
        const monthDate = m.month; // Format: "2026-01"
        if (appliedStartDate && monthDate < appliedStartDate.substring(0, 7)) return false;
        if (appliedEndDate && monthDate > appliedEndDate.substring(0, 7)) return false;
        return true;
      });
      return months;
    }
    
    // Take from the END of the array (most recent months)
    switch (appliedDateFilter) {
      case 'week': return months.slice(-1); // Last month
      case 'month': return months.slice(-1); // Last month
      case 'quarter': return months.slice(-3); // Last 3 months
      case 'year': return months.slice(-12); // Last 12 months
      default: return months; // All data
    }
  }, [revenueReport, appliedDateFilter, appliedStartDate, appliedEndDate]);

  // Helper function to filter data by date
  const filterByDateRange = (data: any[], dateFilter: DateFilter, dateField: string = 'createdAt') => {
    if (!data) return [];
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (dateFilter) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return data; // 'all' - return all data
    }
    
    return data; // For now return all - server already filters by dateRange
  };

  // Filter products data based on section filter
  const filteredProductData = useMemo(() => {
    if (!productPerformance) return [];
    return productPerformance;
  }, [productPerformance, productsDateFilter]);

  // Filter suppliers data based on APPLIED filter and section filter
  const filteredSupplierData = useMemo(() => {
    if (!supplierPerformance) return [];
    let data = supplierPerformance;
    if (appliedSupplierFilter !== 'all') {
      data = data.filter((s: any) => s.supplierId?.toString() === appliedSupplierFilter);
    }
    return data;
  }, [supplierPerformance, appliedSupplierFilter, suppliersDateFilter]);

  // Filter customers data based on APPLIED filter and section filter
  const filteredCustomerData = useMemo(() => {
    if (!customerAnalytics) return [];
    let data = customerAnalytics;
    if (appliedCustomerFilter !== 'all') {
      data = data.filter((c: any) => c.customerId?.toString() === appliedCustomerFilter);
    }
    return data;
  }, [customerAnalytics, appliedCustomerFilter, customersDateFilter]);

  // Calculate totals based on APPLIED filters
  const filteredTotals = useMemo(() => {
    let revenue = revenueReport?.totalRevenue || 0;
    let cost = revenueReport?.totalCost || 0;
    let profit = revenueReport?.profit || 0;

    if (filteredRevenueData.length > 0 && appliedDateFilter !== 'all') {
      revenue = filteredRevenueData.reduce((sum, m) => sum + (m.revenue || 0), 0);
      cost = filteredRevenueData.reduce((sum, m) => sum + (m.cost || 0), 0);
      profit = filteredRevenueData.reduce((sum, m) => sum + (m.profit || 0), 0);
    }

    return { revenue, cost, profit, margin: revenue > 0 ? (profit / revenue) * 100 : 0 };
  }, [revenueReport, filteredRevenueData, appliedDateFilter]);

  // Calculate period comparison
  const periodComparison = useMemo(() => {
    if (!revenueReport?.byMonth || revenueReport.byMonth.length < 2) return { revenue: 0, profit: 0 };
    const current = revenueReport.byMonth[0]?.revenue || 0;
    const previous = revenueReport.byMonth[1]?.revenue || 0;
    const currentProfit = revenueReport.byMonth[0]?.profit || 0;
    const previousProfit = revenueReport.byMonth[1]?.profit || 0;
    
    return {
      revenue: previous > 0 ? ((current - previous) / previous) * 100 : 0,
      profit: previousProfit > 0 ? ((currentProfit - previousProfit) / previousProfit) * 100 : 0,
    };
  }, [revenueReport]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatShortCurrency = (value: number) => {
    if (value >= 1000000) return `₪${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `₪${(value / 1000).toFixed(0)}K`;
    return `₪${value.toFixed(0)}`;
  };

  const handleExportCSV = () => {
    let csv = 'קטגוריה,שם,כמות,הכנסות\n';
    
    productPerformance?.slice(0, 20).forEach((p: any) => {
      csv += `מוצר,"${p.productName}",${p.totalQuotes},${p.totalRevenue}\n`;
    });
    
    filteredSupplierData?.slice(0, 20).forEach((s: any) => {
      csv += `ספק,"${s.supplierName || s.supplierCompany}",${s.totalJobs},${s.totalRevenue}\n`;
    });

    filteredCustomerData?.slice(0, 20).forEach((c: any) => {
      csv += `לקוח,"${c.customerName}",${c.totalQuotes},${c.totalRevenue}\n`;
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const dateLabels: Record<DateFilter, string> = {
    week: 'שבוע אחרון',
    month: 'חודש אחרון',
    quarter: 'רבעון אחרון',
    year: 'שנה אחרונה',
    all: 'כל הזמן',
  };

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">אנליטיקס</h1>
          <p className="text-sm text-gray-500">{dateLabels[dateFilter]}</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-[120px] h-9 text-sm bg-white border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">שבוע</SelectItem>
              <SelectItem value="month">חודש</SelectItem>
              <SelectItem value="quarter">רבעון</SelectItem>
              <SelectItem value="year">שנה</SelectItem>
              <SelectItem value="all">הכל</SelectItem>
            </SelectContent>
          </Select>

          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[140px] h-9 text-sm bg-white border-gray-200">
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

          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-[140px] h-9 text-sm bg-white border-gray-200">
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

          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">מ:</span>
            <Input
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="w-[130px] h-9 text-sm bg-white border-gray-200"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">עד:</span>
            <Input
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="w-[130px] h-9 text-sm bg-white border-gray-200"
            />
          </div>

          <Button 
            type="button"
            size="sm" 
            className="h-9 text-sm bg-gray-800 hover:bg-gray-700 text-white cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              applyFilters();
            }}
          >
            הצג
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 text-sm bg-white border-gray-200"
            onClick={handleExportCSV}
          >
            <Download className="h-4 w-4 ml-1" />
            ייצוא
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500 mb-1">הכנסות</p>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(filteredTotals.revenue)}</p>
            {periodComparison.revenue !== 0 && (
              <div className="flex items-center gap-1 mt-2">
                {periodComparison.revenue >= 0 ? (
                  <span className="text-xs text-green-600 flex items-center">
                    <TrendingUp className="h-3 w-3 ml-0.5" />
                    +{periodComparison.revenue.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-xs text-red-600 flex items-center">
                    <TrendingDown className="h-3 w-3 ml-0.5" />
                    {periodComparison.revenue.toFixed(1)}%
                  </span>
                )}
                <span className="text-xs text-gray-400">מהתקופה הקודמת</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500 mb-1">רווח</p>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(filteredTotals.profit)}</p>
            <p className="text-xs text-gray-400 mt-2">מרווח {filteredTotals.margin.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500 mb-1">עלויות</p>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(filteredTotals.cost)}</p>
            <p className="text-xs text-gray-400 mt-2">
              {filteredRevenueData[0]?.quoteCount || 0} הזמנות
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500 mb-1">שיעור המרה</p>
            <p className="text-2xl font-semibold text-gray-900">{summary?.avgConversionRate || 0}%</p>
            <p className="text-xs text-gray-400 mt-2">
              {summary?.totalCustomers || 0} לקוחות • {summary?.totalSuppliers || 0} ספקים
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart - Line Chart with dots */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader className="pb-0 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-700">מגמת הכנסות ורווח</CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
              <span className="text-gray-500">הכנסות</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <span className="text-gray-500">רווח</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {filteredRevenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart 
                data={filteredRevenueData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11, fill: '#9ca3af' }} 
                  tickFormatter={(value) => {
                    if (!value) return '';
                    const parts = value.split('-');
                    const monthNames = ['', 'ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
                    return monthNames[parseInt(parts[1])] || parts[1];
                  }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#9ca3af' }} 
                  tickFormatter={(value) => formatShortCurrency(value)} 
                  width={60}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    formatCurrency(value), 
                    name === 'revenue' ? 'הכנסות' : 'רווח'
                  ]}
                  labelFormatter={(label) => {
                    if (!label) return '';
                    const parts = label.split('-');
                    const monthNames = ['', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
                    return `${monthNames[parseInt(parts[1])] || parts[1]} ${parts[0]}`;
                  }}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    padding: '8px 12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  name="revenue"
                  stroke="#3b82f6" 
                  strokeWidth={1.5}
                  dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  name="profit"
                  stroke="#10b981" 
                  strokeWidth={1.5}
                  dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
              אין נתונים לתקופה זו
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expandable Sections */}
      <div className="space-y-3">
        {/* Products Section */}
        <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
          <button 
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('products')}
          >
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">מוצרים</span>
              <span className="text-xs text-gray-400">({productPerformance?.length || 0})</span>
            </div>
            {expandedSection === 'products' ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          
          {expandedSection === 'products' && (
            <div className="px-5 pb-5 border-t border-gray-100">
              {/* Date Filter for Products */}
              <div className="flex items-center gap-2 pt-3 pb-2">
                <span className="text-xs text-gray-500">תקופה:</span>
                <Select value={productsDateFilter} onValueChange={(v: DateFilter) => setProductsDateFilter(v)}>
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">שבוע</SelectItem>
                    <SelectItem value="month">חודש</SelectItem>
                    <SelectItem value="quarter">רבעון</SelectItem>
                    <SelectItem value="year">שנה</SelectItem>
                    <SelectItem value="all">הכל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Top Products Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 mb-6">
                {productPerformance?.slice(0, 4).map((product: any, index: number) => {
                  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500'];
                  const maxRevenue = Math.max(...(productPerformance?.map((p: any) => Number(p.totalRevenue || 0)) || [1]));
                  const percentage = Math.round((Number(product.totalRevenue || 0) / maxRevenue) * 100);
                  return (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${colors[index]}`}></div>
                        <span className="text-xs text-gray-500 truncate">{product.productName}</span>
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(Number(product.totalRevenue || 0))}
                      </div>
                      <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${colors[index]} rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">{product.totalQuotes || 0} הזמנות</div>
                    </div>
                  );
                })}
              </div>
              
              {/* Products List */}
              <div className="space-y-2">
                {productPerformance?.slice(0, 8).map((product: any, index: number) => {
                  const maxRevenue = Math.max(...(productPerformance?.map((p: any) => Number(p.totalRevenue || 0)) || [1]));
                  const percentage = Math.round((Number(product.totalRevenue || 0) / maxRevenue) * 100);
                  return (
                    <div key={index} className="flex items-center gap-4 py-2">
                      <div className="w-6 text-center text-xs text-gray-400 font-medium">#{index + 1}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">{product.productName}</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(Number(product.totalRevenue || 0))}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 w-16 text-left">{product.totalQuotes || 0} הזמנות</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Suppliers Section */}
        <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
          <button 
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('suppliers')}
          >
            <div className="flex items-center gap-3">
              <Truck className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">ספקים</span>
              <span className="text-xs text-gray-400">({filteredSupplierData?.length || 0})</span>
            </div>
            {expandedSection === 'suppliers' ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          
          {expandedSection === 'suppliers' && (
            <div className="px-5 pb-5 border-t border-gray-100">
              {/* Date Filter for Suppliers */}
              <div className="flex items-center gap-2 pt-3 pb-2">
                <span className="text-xs text-gray-500">תקופה:</span>
                <Select value={suppliersDateFilter} onValueChange={(v: DateFilter) => setSuppliersDateFilter(v)}>
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">שבוע</SelectItem>
                    <SelectItem value="month">חודש</SelectItem>
                    <SelectItem value="quarter">רבעון</SelectItem>
                    <SelectItem value="year">שנה</SelectItem>
                    <SelectItem value="all">הכל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Top Suppliers Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 mb-6">
                {filteredSupplierData?.slice(0, 4).map((supplier: any, index: number) => {
                  const colors = ['bg-indigo-500', 'bg-cyan-500', 'bg-rose-500', 'bg-orange-500'];
                  const maxRevenue = Math.max(...(filteredSupplierData?.map((s: any) => Number(s.totalRevenue || 0)) || [1]));
                  const percentage = Math.round((Number(supplier.totalRevenue || 0) / maxRevenue) * 100);
                  return (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${colors[index]}`}></div>
                        <span className="text-xs text-gray-500 truncate">
                          {supplier.supplierName || supplier.supplierCompany || 'לא ידוע'}
                        </span>
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(Number(supplier.totalRevenue || 0))}
                      </div>
                      <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${colors[index]} rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                        <span>{supplier.totalJobs || 0} עבודות</span>
                        <span>{Number(supplier.avgDeliveryDays || 0).toFixed(0)} ימים</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Suppliers List */}
              <div className="space-y-2">
                {filteredSupplierData?.slice(0, 8).map((supplier: any, index: number) => {
                  const maxRevenue = Math.max(...(filteredSupplierData?.map((s: any) => Number(s.totalRevenue || 0)) || [1]));
                  const percentage = Math.round((Number(supplier.totalRevenue || 0) / maxRevenue) * 100);
                  return (
                    <div key={index} className="flex items-center gap-4 py-2">
                      <div className="w-6 text-center text-xs text-gray-400 font-medium">#{index + 1}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">
                            {supplier.supplierName || supplier.supplierCompany || 'לא ידוע'}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(Number(supplier.totalRevenue || 0))}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 w-20 text-left">
                        {supplier.totalJobs || 0} עבודות · {Number(supplier.avgDeliveryDays || 0).toFixed(0)}י'
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Customers Section */}
        <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
          <button 
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('customers')}
          >
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">לקוחות</span>
              <span className="text-xs text-gray-400">({filteredCustomerData?.length || 0})</span>
            </div>
            {expandedSection === 'customers' ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          
          {expandedSection === 'customers' && (
            <div className="px-5 pb-5 border-t border-gray-100">
              {/* Date Filter for Customers */}
              <div className="flex items-center gap-2 pt-3 pb-2">
                <span className="text-xs text-gray-500">תקופה:</span>
                <Select value={customersDateFilter} onValueChange={(v: DateFilter) => setCustomersDateFilter(v)}>
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">שבוע</SelectItem>
                    <SelectItem value="month">חודש</SelectItem>
                    <SelectItem value="quarter">רבעון</SelectItem>
                    <SelectItem value="year">שנה</SelectItem>
                    <SelectItem value="all">הכל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filteredCustomerData && filteredCustomerData.length > 0 ? (
                <>
                  {/* Top Customers Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 mb-6">
                    {filteredCustomerData.slice(0, 4).map((customer: any, index: number) => {
                      const colors = ['bg-teal-500', 'bg-purple-500', 'bg-pink-500', 'bg-lime-500'];
                      const maxRevenue = Math.max(...(filteredCustomerData?.map((c: any) => Number(c.totalRevenue || 0)) || [1]));
                      const percentage = Math.round((Number(customer.totalRevenue || 0) / maxRevenue) * 100);
                      return (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-2 h-2 rounded-full ${colors[index]}`}></div>
                            <span className="text-xs text-gray-500 truncate">
                              {customer.customerName || 'לא ידוע'}
                            </span>
                          </div>
                          <div className="text-lg font-semibold text-gray-900">
                            {formatCurrency(Number(customer.totalRevenue || 0))}
                          </div>
                          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${colors[index]} rounded-full transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                            <span>{customer.totalQuotes || 0} הזמנות</span>
                            <span>{Number(customer.conversionRate || 0).toFixed(0)}% המרה</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Customers List */}
                  <div className="space-y-2">
                    {filteredCustomerData.slice(0, 8).map((customer: any, index: number) => {
                      const maxRevenue = Math.max(...(filteredCustomerData?.map((c: any) => Number(c.totalRevenue || 0)) || [1]));
                      const percentage = Math.round((Number(customer.totalRevenue || 0) / maxRevenue) * 100);
                      return (
                        <div key={index} className="flex items-center gap-4 py-2">
                          <div className="w-6 text-center text-xs text-gray-400 font-medium">#{index + 1}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-700">
                                {customer.customerName || 'לא ידוע'}
                              </span>
                              <span className="text-sm font-semibold text-gray-900">
                                {formatCurrency(Number(customer.totalRevenue || 0))}
                              </span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-teal-500 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 w-24 text-left">
                            {customer.totalQuotes || 0} הזמנות · {Number(customer.conversionRate || 0).toFixed(0)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-gray-400">
                  אין נתוני לקוחות
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Summary Footer */}
      <div className="text-center text-xs text-gray-400 py-4">
        נתונים מעודכנים • {summary?.totalProducts || 0} מוצרים • {summary?.totalSuppliers || 0} ספקים • {summary?.totalCustomers || 0} לקוחות
      </div>
    </div>
  );
}
