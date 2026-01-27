import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Send,
  CheckCircle,
  XCircle,
  Copy,
  Factory,
  Package,
} from "lucide-react";

/**
 * Returns a styled badge component for the given quote status
 */
export function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="ml-1 h-3 w-3" />
          ממתין לשליחה
        </Badge>
      );
    case "sent":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Send className="ml-1 h-3 w-3" />
          נשלח ללקוח
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="ml-1 h-3 w-3" />
          אושר - ממתין לספק
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="ml-1 h-3 w-3" />
          נדחה
        </Badge>
      );
    case "superseded":
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <Copy className="ml-1 h-3 w-3" />
          הוחלף
        </Badge>
      );
    case "in_production":
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          <Factory className="ml-1 h-3 w-3" />
          עבר ליצור
        </Badge>
      );
    case "ready":
      return (
        <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
          <Package className="ml-1 h-3 w-3" />
          מוכן
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

/**
 * Returns the Hebrew label for a quote status
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "ממתין לשליחה",
    sent: "נשלח ללקוח",
    approved: "אושר - ממתין לספק",
    rejected: "נדחה",
    superseded: "הוחלף",
    in_production: "עבר ליצור",
    ready: "מוכן",
  };
  return labels[status] || status;
}

/**
 * Returns the color scheme for a quote status
 */
export function getStatusColor(status: string): { bg: string; text: string; border: string } {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    draft: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
    sent: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    approved: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    rejected: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    superseded: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    in_production: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    ready: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  };
  return colors[status] || { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };
}
