import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";

interface DebugLog {
  id: string;
  timestamp: string;
  type: "info" | "error" | "success" | "warning" | "api";
  message: string;
  details?: any;
}

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const { user, loading, error, isAuthenticated } = useAuthContext();

  // Add log entry
  const addLog = (
    type: "info" | "error" | "success" | "warning" | "api",
    message: string,
    details?: any
  ) => {
    const newLog: DebugLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString("he-IL"),
      type,
      message,
      details,
    };
    setLogs((prev) => [newLog, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  // Monitor auth changes
  useEffect(() => {
    addLog("info", "Auth state changed", {
      isAuthenticated,
      loading,
      error,
      user: user ? { id: user.id, email: user.email, role: user.role } : null,
    });
  }, [isAuthenticated, loading, error, user]);

  // Monitor session on mount
  useEffect(() => {
    addLog("info", "🔍 Debug Panel initialized");
    
    // Check cookies
    const cookies = document.cookie.split(";").reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      if (key) acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    addLog("info", "📦 Cookies found", cookies);

    // Check localStorage
    const localStorageData = Object.keys(localStorage).reduce((acc, key) => {
      acc[key] = localStorage.getItem(key);
      return acc;
    }, {} as Record<string, string | null>);
    
    if (Object.keys(localStorageData).length > 0) {
      addLog("info", "💾 LocalStorage data", localStorageData);
    }
  }, []);

  // Intercept fetch calls for API debugging
  useEffect(() => {
    const originalFetch = window.fetch;
    (window.fetch as any) = function (this: any, ...args: any[]) {
      const [resource, config] = args as [string | Request, RequestInit?];
      const url = typeof resource === "string" ? resource : (resource as Request).url;
      const method = config?.method || "GET";

      // Only log auth-related requests
      if (url.includes("/api/auth")) {
        addLog("api", `📡 ${method} ${url}`, {
          credentials: config?.credentials,
          headers: config?.headers,
        });
      }

      return (originalFetch as any)
        .apply(this, args)
        .then((response: any) => {
          if (url.includes("/api/auth")) {
            addLog(
              response.ok ? "success" : "error",
              `📡 ${method} ${url} - ${response.status}`,
              {
                status: response.status,
                statusText: response.statusText,
              }
            );
          }
          return response;
        })
        .catch((error: any) => {
          if (url.includes("/api/auth")) {
            addLog("error", `📡 ${method} ${url} - Error`, {
              error: error.message,
            });
          }
          throw error;
        });
    } as any;

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const getLogColor = (type: string) => {
    switch (type) {
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "api":
        return "bg-blue-50 border-blue-200 text-blue-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case "error":
        return "❌";
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "api":
        return "🔌";
      default:
        return "ℹ️";
    }
  };

  const copyToClipboard = () => {
    const text = logs
      .map((log) => `[${log.timestamp}] ${log.message}${log.details ? ": " + JSON.stringify(log.details) : ""}`)
      .join("\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-mono text-xs">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-black text-white px-3 py-2 rounded-lg shadow-lg hover:bg-gray-800 flex items-center gap-2 mb-2"
      >
        🐛 Debug
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="bg-white border border-gray-300 rounded-lg shadow-xl p-3 w-96 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="mb-3 pb-2 border-b border-gray-200">
            <div className="font-bold text-gray-900 mb-2">🔍 Debug Panel</div>
            
            {/* Auth Status */}
            <div className="space-y-1 text-xs mb-2">
              <div className="flex justify-between">
                <span className="font-semibold">Auth Status:</span>
                <span className={isAuthenticated ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                  {isAuthenticated ? "✅ Authenticated" : "❌ Not Authenticated"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Loading:</span>
                <span className={loading ? "text-yellow-600" : "text-green-600"}>
                  {loading ? "🔄 Yes" : "✅ No"}
                </span>
              </div>
              {error && (
                <div className="flex justify-between text-red-600">
                  <span className="font-semibold">Error:</span>
                  <span>{error}</span>
                </div>
              )}
              {user && (
                <div className="text-gray-700 mt-1">
                  <div>👤 {user.name || user.email}</div>
                  <div>🔑 Role: {user.role}</div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLogs([])}
                className="text-xs h-7"
              >
                <Trash2 size={12} className="mr-1" />
                Clear
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={copyToClipboard}
                className="text-xs h-7"
              >
                <Copy size={12} className="mr-1" />
                Copy
              </Button>
            </div>
          </div>

          {/* Logs */}
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-4">No logs yet...</div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded border ${getLogColor(log.type)} break-words`}
                >
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0">{getLogIcon(log.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{log.message}</div>
                      <div className="text-xs opacity-75">{log.timestamp}</div>
                      {log.details && (
                        <div className="text-xs opacity-75 mt-1 bg-black bg-opacity-5 p-1 rounded overflow-x-auto">
                          <pre>{JSON.stringify(log.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
