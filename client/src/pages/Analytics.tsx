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
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [expandedSection, setExpandedSection] = useState<string | null>('products');
  
  // Applied filters (only update when "הצג" is clicked)
  const [appliedDateFilter, setAppliedDateFilter] = useState<DateFilter>('month');
  const [appliedSupplierFilter, setAppliedSupplierFilter] = useState<string>('all');
  const [appliedCustomerFilter, setAppliedCustomerFilter] = useState<string>('all');
  
  const applyFilters = () => {
    console.log('Apply filters clicked:', { dateFilter, supplierFilter, customerFilter });
    setAppliedDateFilter(dateFilter);
    setAppliedSupplierFilter(supplierFilter);
    setAppliedCustomerFilter(customerFilter);
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
    if (!revenueReport?.byMonth) return [];
    const months = revenueReport.byMonth;
    switch (appliedDateFilter) {
      case 'week': return months.slice(0, 1);
      case 'month': return months.slice(0, 1);
      case 'quarter': return months.slice(0, 3);
      case 'year': return months.slice(0, 12);
      default: return months;
    }
  }, [revenueReport, appliedDateFilter]);

  // Filter suppliers data based on APPLIED filter
  const filteredSupplierData = useMemo(() => {
    if (!supplierPerformance) return [];
    if (appliedSupplierFilter === 'all') return supplierPerformance;
    return supplierPerformance.filter((s: any) => s.supplierId?.toString() === appliedSupplierFilter);
  }, [supplierPerformance, appliedSupplierFilter]);

  // Filter customers data based on APPLIED filter
  const filteredCustomerData = useMemo(() => {
    if (!customerAnalytics) return [];
    if (appliedCustomerFilter === 'all') return customerAnalytics;
    return customerAnalytics.filter((c: any) => c.customerId?.toString() === appliedCustomerFilter);
  }, [customerAnalytics, appliedCustomerFilter]);

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

      {/* Revenue Chart - Google Analytics Style */}
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
            <div className="space-y-4">
              {/* Chart visualization with bars */}
              <div className="flex items-end justify-between gap-2 h-[200px] px-2">
                {filteredRevenueData.slice().reverse().map((item: any, index: number) => {
                  const maxRevenue = Math.max(...filteredRevenueData.map((d: any) => d.revenue || 0));
                  const revenueHeight = maxRevenue > 0 ? ((item.revenue || 0) / maxRevenue) * 160 : 0;
                  const profitHeight = maxRevenue > 0 ? ((item.profit || 0) / maxRevenue) * 160 : 0;
                  const monthNames = ['', 'ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
                  const monthNum = item.month ? parseInt(item.month.split('-')[1]) : 0;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[10px] text-gray-500 font-medium">
                        {formatShortCurrency(item.revenue || 0)}
                      </div>
                      <div className="flex gap-1 items-end">
                        <div 
                          className="w-4 bg-blue-500 rounded-t transition-all"
                          style={{ height: `${Math.max(revenueHeight, 4)}px` }}
                        />
                        <div 
                          className="w-4 bg-emerald-500 rounded-t transition-all"
                          style={{ height: `${Math.max(profitHeight, 4)}px` }}
                        />
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        {monthNames[monthNum] || ''}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Summary row */}
              <div className="flex justify-center gap-8 pt-2 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-xs text-gray-400">סה"כ הכנסות</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(filteredRevenueData.reduce((sum: number, m: any) => sum + (m.revenue || 0), 0))}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400">סה"כ רווח</div>
                  <div className="text-lg font-semibold text-emerald-600">
                    {formatCurrency(filteredRevenueData.reduce((sum: number, m: any) => sum + (m.profit || 0), 0))}
                  </div>
                </div>
              </div>
            </div>
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
              <div className="grid lg:grid-cols-2 gap-6 pt-4">
                {/* Products Table */}
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs">
                        <th className="text-right pb-3 font-medium">מוצר</th>
                        <th className="text-center pb-3 font-medium">הזמנות</th>
                        <th className="text-left pb-3 font-medium">הכנסות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productPerformance?.slice(0, 10).map((product: any, index: number) => (
                        <tr key={index} className="border-t border-gray-50">
                          <td className="py-2.5 text-gray-900">{product.productName}</td>
                          <td className="py-2.5 text-center text-gray-500">{product.totalQuotes || 0}</td>
                          <td className="py-2.5 text-left text-gray-900 font-medium">
                            {formatCurrency(Number(product.totalRevenue || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Products Chart */}
                <div>
                  {productPerformance && productPerformance.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={productPerformance.slice(0, 6)} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis 
                          dataKey="productName"
                          tick={{ fontSize: 9, fill: '#9ca3af' }} 
                          tickFormatter={(value) => value && value.length > 8 ? value.slice(0, 8) + '..' : value}
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis 
                          tick={{ fontSize: 9, fill: '#9ca3af' }} 
                          tickFormatter={(value) => formatShortCurrency(value)}
                          axisLine={false}
                          tickLine={false}
                          width={50}
                        />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => label}
                          contentStyle={{ 
                            borderRadius: '6px', 
                            border: '1px solid #e5e7eb',
                            fontSize: '11px'
                          }}
                        />
                        <Bar dataKey="totalRevenue" fill="#6b7280" radius={[3, 3, 0, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                      אין נתונים
                    </div>
                  )}
                </div>
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
              <div className="grid lg:grid-cols-2 gap-6 pt-4">
                {/* Suppliers Table */}
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs">
                        <th className="text-right pb-3 font-medium">ספק</th>
                        <th className="text-center pb-3 font-medium">עבודות</th>
                        <th className="text-center pb-3 font-medium">ימי אספקה</th>
                        <th className="text-left pb-3 font-medium">סה"כ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSupplierData?.slice(0, 10).map((supplier: any, index: number) => (
                        <tr key={index} className="border-t border-gray-50">
                          <td className="py-2.5 text-gray-900">
                            {supplier.supplierName || supplier.supplierCompany || 'לא ידוע'}
                          </td>
                          <td className="py-2.5 text-center text-gray-500">{supplier.totalJobs || 0}</td>
                          <td className="py-2.5 text-center text-gray-500">
                            {Number(supplier.avgDeliveryDays || 0).toFixed(1)}
                          </td>
                          <td className="py-2.5 text-left text-gray-900 font-medium">
                            {formatCurrency(Number(supplier.totalRevenue || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Suppliers Chart */}
                <div>
                  {filteredSupplierData && filteredSupplierData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={filteredSupplierData.slice(0, 6)} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis 
                          dataKey="supplierName"
                          tick={{ fontSize: 9, fill: '#9ca3af' }} 
                          tickFormatter={(value) => {
                            const name = value || 'לא ידוע';
                            return name.length > 8 ? name.slice(0, 8) + '..' : name;
                          }}
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis 
                          tick={{ fontSize: 9, fill: '#9ca3af' }} 
                          tickFormatter={(value) => formatShortCurrency(value)}
                          axisLine={false}
                          tickLine={false}
                          width={50}
                        />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => label}
                          contentStyle={{ 
                            borderRadius: '6px', 
                            border: '1px solid #e5e7eb',
                            fontSize: '11px'
                          }}
                        />
                        <Bar dataKey="totalRevenue" fill="#6b7280" radius={[3, 3, 0, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                      אין נתונים
                    </div>
                  )}
                </div>
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
              <div className="grid lg:grid-cols-2 gap-6 pt-4">
                {/* Customers Table */}
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs">
                        <th className="text-right pb-3 font-medium">לקוח</th>
                        <th className="text-center pb-3 font-medium">הזמנות</th>
                        <th className="text-center pb-3 font-medium">המרה</th>
                        <th className="text-left pb-3 font-medium">הכנסות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomerData && filteredCustomerData.length > 0 ? (
                        filteredCustomerData.slice(0, 10).map((customer: any, index: number) => (
                          <tr key={index} className="border-t border-gray-50">
                            <td className="py-2.5 text-gray-900">{customer.customerName || 'לא ידוע'}</td>
                            <td className="py-2.5 text-center text-gray-500">{customer.totalQuotes || 0}</td>
                            <td className="py-2.5 text-center text-gray-500">
                              {Number(customer.conversionRate || 0).toFixed(0)}%
                            </td>
                            <td className="py-2.5 text-left text-gray-900 font-medium">
                              {formatCurrency(Number(customer.totalRevenue || 0))}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-400">
                            אין נתוני לקוחות
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Customers Chart */}
                <div>
                  {filteredCustomerData && filteredCustomerData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={filteredCustomerData.slice(0, 6)} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis 
                          dataKey="customerName"
                          tick={{ fontSize: 9, fill: '#9ca3af' }} 
                          tickFormatter={(value) => {
                            const name = value || 'לא ידוע';
                            return name.length > 8 ? name.slice(0, 8) + '..' : name;
                          }}
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis 
                          tick={{ fontSize: 9, fill: '#9ca3af' }} 
                          tickFormatter={(value) => formatShortCurrency(value)}
                          axisLine={false}
                          tickLine={false}
                          width={50}
                        />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => label}
                          contentStyle={{ 
                            borderRadius: '6px', 
                            border: '1px solid #e5e7eb',
                            fontSize: '11px'
                          }}
                        />
                        <Bar dataKey="totalRevenue" fill="#9ca3af" radius={[3, 3, 0, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                      אין נתונים
                    </div>
                  )}
                </div>
              </div>
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
