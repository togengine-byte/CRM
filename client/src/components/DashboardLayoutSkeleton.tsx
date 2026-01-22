import { Skeleton } from './ui/skeleton';

const SIDEBAR_WIDTH = 256;

export function DashboardLayoutSkeleton() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Fixed Sidebar skeleton - matches DashboardLayout exactly */}
      <aside
        className="fixed top-0 right-0 h-screen bg-sidebar border-l border-border z-40 flex flex-col"
        style={{ width: SIDEBAR_WIDTH }}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2">
          <div className="space-y-1">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2 w-32" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content skeleton - matches DashboardLayout margin */}
      <main
        className="min-h-screen"
        style={{ marginRight: SIDEBAR_WIDTH }}
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>

          {/* Stats cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>

          {/* Main content area */}
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </main>
    </div>
  );
}
