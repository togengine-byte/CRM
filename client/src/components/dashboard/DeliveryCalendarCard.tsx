import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface CalendarItem {
  id: number;
  type: 'job' | 'quote';
  name: string;
  customerName?: string;
  status: string;
  action: string;
  isOverdue: boolean;
  date: Date;
}

export function DeliveryCalendarCard({ isLoading: parentLoading }: { isLoading: boolean }) {
  const { data: jobs, isLoading: jobsLoading } = trpc.jobs.list.useQuery();
  const { data: quotes, isLoading: quotesLoading } = trpc.quotes.list.useQuery();
  const loading = parentLoading || jobsLoading || quotesLoading;
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);

  // חישוב תאריכים לכל פריט (עבודות + הצעות באיחור)
  const calendarItems = React.useMemo(() => {
    const dateMap = new Map<string, CalendarItem[]>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // עבודות פעילות
    if (jobs) {
      jobs
        .filter((j: any) => !['delivered', 'cancelled'].includes(j.status))
        .forEach((job: any) => {
          if (job.createdAt && job.promisedDeliveryDays) {
            const createdDate = new Date(job.createdAt);
            const originalDeliveryDate = new Date(createdDate.getTime() + job.promisedDeliveryDays * 24 * 60 * 60 * 1000);
            const isOverdue = today > originalDeliveryDate;
            
            // אם המשימה באיחור - מציג אותה ביום הנוכחי (לא נאבד משימות)
            const displayDate = isOverdue ? today : originalDeliveryDate;
            const dateKey = displayDate.toISOString().split('T')[0];
            
            // קביעת הפעולה הנדרשת לפי סטטוס
            let action = '';
            if (job.status === 'ready') {
              action = 'לאסוף מהספק';
            } else if (job.status === 'picked_up') {
              action = 'למסור ללקוח';
            } else if (job.status === 'in_progress') {
              action = 'בייצור אצל הספק';
            } else if (job.status === 'pending') {
              action = 'ממתין לספק';
            } else {
              action = 'לאסוף ולמסור';
            }
            
            if (!dateMap.has(dateKey)) {
              dateMap.set(dateKey, []);
            }
            dateMap.get(dateKey)!.push({
              id: job.id,
              type: 'job',
              name: job.productName || 'ללא שם',
              customerName: job.customerName,
              status: job.status,
              action,
              isOverdue,
              date: displayDate
            });
          }
        });
    }
    
    // הצעות מחיר שנשלחו ולא אושרו תוך 24 שעות
    if (quotes) {
      quotes
        .filter((q: any) => q.status === 'sent')
        .forEach((quote: any) => {
          if (quote.sentAt) {
            const sentDate = new Date(quote.sentAt);
            const deadlineDate = new Date(sentDate.getTime() + 24 * 60 * 60 * 1000);
            
            if (today > deadlineDate) {
              // הצעה באיחור - מציג אותה בתאריך של היום
              const dateKey = today.toISOString().split('T')[0];
              
              if (!dateMap.has(dateKey)) {
                dateMap.set(dateKey, []);
              }
              dateMap.get(dateKey)!.push({
                id: quote.id,
                type: 'quote',
                name: quote.customerName || 'לקוח לא מזוהה',
                customerName: quote.customerName,
                status: 'sent',
                action: 'לעקוב אחרי לקוח',
                isOverdue: true,
                date: today
              });
            }
          }
        });
    }
    
    return dateMap;
  }, [jobs, quotes]);

  // ימי החודש
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    // ימים ריקים בתחילת החודש
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // ימי החודש
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDateStatus = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    const itemsOnDate = calendarItems.get(dateKey) || [];
    const count = itemsOnDate.length;
    const hasOverdue = itemsOnDate.some(j => j.isOverdue);
    
    if (count === 0) return { count: 0, color: '', hasOverdue: false };
    if (hasOverdue) return { count, color: 'bg-red-500', hasOverdue: true };
    if (count >= 3) return { count, color: 'bg-amber-500', hasOverdue: false };
    return { count, color: 'bg-emerald-500', hasOverdue: false };
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const selectedDateItems = selectedDate 
    ? calendarItems.get(selectedDate.toISOString().split('T')[0]) || []
    : [];

  const weekDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  return (
    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white col-span-full">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-indigo-600" />
            </div>
            <CardTitle className="text-sm font-medium text-slate-900">לוח משימות ואספקות</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={prevMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium text-slate-600 min-w-[100px] text-center">
              {currentMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={nextMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <Skeleton className="h-[280px] w-full rounded-lg" />
        ) : (
          <div className="flex gap-6">
            {/* לוח שנה - צד ימין */}
            <div className="flex-1 min-w-[300px]">
              {/* כותרות ימים */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* ימי החודש */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="h-10" />;
                  }
                  
                  const status = getDateStatus(date);
                  const isToday = date.getTime() === today.getTime();
                  const isSelected = selectedDate && date.getTime() === selectedDate.getTime();
                  
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(status.count > 0 ? date : null)}
                      className={`h-10 rounded-lg text-sm relative transition-all ${
                        isSelected 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : isToday 
                            ? 'bg-indigo-100 text-indigo-700 font-bold' 
                            : 'hover:bg-slate-100 text-slate-600'
                      } ${status.count > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      {date.getDate()}
                      {status.count > 0 && (
                        <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full ${status.color}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* מקרא */}
              <div className="flex items-center justify-center gap-4 pt-3 mt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-slate-500">1-2 משימות</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs text-slate-500">3+ משימות</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="text-xs text-slate-500">באיחור</span>
                </div>
              </div>
            </div>

            {/* רשימת משימות ליום נבחר - צד שמאל */}
            <div className="flex-1 min-w-[350px] border-r border-slate-200 pr-6">
              {selectedDate ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">
                      {selectedDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                      {selectedDateItems.length} משימות
                    </span>
                  </div>
                  
                  {selectedDateItems.length > 0 ? (
                    <div className="space-y-1">
                      {selectedDateItems.map((item) => (
                        <div 
                          key={`${item.type}-${item.id}`}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                            item.isOverdue 
                              ? 'bg-red-50 border-r-2 border-red-500' 
                              : 'bg-slate-50 border-r-2 border-slate-300'
                          }`}
                        >
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            item.type === 'job' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.type === 'job' ? 'עבודה' : 'הצעה'}
                          </span>
                          <span className="font-medium text-slate-900">{item.id}</span>
                          <span className="font-medium text-slate-700 truncate flex-1">{item.name}</span>
                          {item.customerName && item.type === 'job' && (
                            <span className="text-slate-400 truncate max-w-[80px]">{item.customerName}</span>
                          )}
                          <span className={`font-semibold whitespace-nowrap ${
                            item.isOverdue ? 'text-red-600' : 'text-indigo-600'
                          }`}>
                            {item.action}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">אין משימות ליום זה</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                  <CalendarDays className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">בחר יום מהלוח</p>
                  <p className="text-xs mt-1">לצפייה במשימות ואספקות</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
