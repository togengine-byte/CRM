import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function DeliveryCalendarCard({ isLoading: parentLoading }: { isLoading: boolean }) {
  const { data: jobs, isLoading } = trpc.jobs.list.useQuery();
  const loading = parentLoading || isLoading;
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);

  // חישוב תאריכי אספקה לכל עבודה
  const deliveryDates = React.useMemo(() => {
    if (!jobs) return new Map<string, any[]>();
    
    const dateMap = new Map<string, any[]>();
    
    jobs
      .filter((j: any) => !['delivered', 'cancelled'].includes(j.status))
      .forEach((job: any) => {
        if (job.createdAt && job.promisedDeliveryDays) {
          const createdDate = new Date(job.createdAt);
          const deliveryDate = new Date(createdDate.getTime() + job.promisedDeliveryDays * 24 * 60 * 60 * 1000);
          const dateKey = deliveryDate.toISOString().split('T')[0];
          
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, []);
          }
          dateMap.get(dateKey)!.push({
            ...job,
            expectedDelivery: deliveryDate,
            isOverdue: new Date() > deliveryDate
          });
        }
      });
    
    return dateMap;
  }, [jobs]);

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
    const jobsOnDate = deliveryDates.get(dateKey) || [];
    const count = jobsOnDate.length;
    const hasOverdue = jobsOnDate.some(j => j.isOverdue);
    
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

  const selectedDateJobs = selectedDate 
    ? deliveryDates.get(selectedDate.toISOString().split('T')[0]) || []
    : [];

  const weekDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  return (
    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-indigo-600" />
            </div>
            <CardTitle className="text-sm font-medium text-slate-900">לוח אספקות</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={prevMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium text-slate-600 min-w-[80px] text-center">
              {currentMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={nextMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {loading ? (
          <Skeleton className="h-[180px] w-full rounded-lg" />
        ) : (
          <div className="space-y-2">
            {/* כותרות ימים */}
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-[10px] font-medium text-slate-400 py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* ימי החודש */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="h-7" />;
                }
                
                const status = getDateStatus(date);
                const isToday = date.getTime() === today.getTime();
                const isSelected = selectedDate && date.getTime() === selectedDate.getTime();
                
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(status.count > 0 ? date : null)}
                    className={`h-7 rounded text-[10px] relative transition-all ${
                      isSelected 
                        ? 'bg-indigo-600 text-white' 
                        : isToday 
                          ? 'bg-indigo-100 text-indigo-700 font-bold' 
                          : 'hover:bg-slate-100 text-slate-600'
                    } ${status.count > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {date.getDate()}
                    {status.count > 0 && (
                      <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full ${status.color}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* מקרא */}
            <div className="flex items-center justify-center gap-3 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[9px] text-slate-500">1-2</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-[9px] text-slate-500">3+</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-[9px] text-slate-500">באיחור</span>
              </div>
            </div>

            {/* רשימת עבודות ליום נבחר */}
            {selectedDate && selectedDateJobs.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <p className="text-[10px] font-medium text-slate-500">
                  {selectedDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'short' })}
                </p>
                <div className="max-h-[80px] overflow-y-auto space-y-1">
                  {selectedDateJobs.map((job: any) => {
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
                    
                    return (
                      <div 
                        key={job.id}
                        className={`p-1.5 rounded text-[10px] ${
                          job.isOverdue ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>
                            <span className="font-medium">עבודה {job.id}</span> - {job.productName || 'ללא שם'}
                          </span>
                        </div>
                        <div className={`font-bold mt-0.5 ${job.isOverdue ? 'text-red-600' : 'text-indigo-600'}`}>
                          ▶ {action}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
