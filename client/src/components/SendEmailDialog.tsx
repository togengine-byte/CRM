/**
 * Send Email Dialog Component
 * Modal for sending manual emails to customers
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Send, Loader2, AlertCircle, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerEmail: string;
  customerName: string;
}

export function SendEmailDialog({
  open,
  onOpenChange,
  customerEmail,
  customerName,
}: SendEmailDialogProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Check if Gmail is configured
  const { data: gmailSettings } = trpc.settings.gmail.get.useQuery();
  
  const sendMutation = trpc.settings.sendEmail.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        setMessage({ type: 'success', text: 'המייל נשלח בהצלחה!' });
        setTimeout(() => {
          onOpenChange(false);
          setSubject("");
          setBody("");
          setMessage(null);
        }, 1500);
      } else {
        setMessage({ type: 'error', text: result.error || 'שגיאה בשליחת המייל' });
      }
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error.message || 'שגיאה בשליחת המייל' });
    },
  });
  
  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSubject("");
      setBody("");
      setMessage(null);
    }
  }, [open]);
  
  const handleSend = () => {
    if (!subject.trim()) {
      setMessage({ type: 'error', text: 'יש להזין נושא' });
      return;
    }
    if (!body.trim()) {
      setMessage({ type: 'error', text: 'יש להזין תוכן' });
      return;
    }
    
    sendMutation.mutate({
      to: customerEmail,
      subject: subject.trim(),
      body: body.trim(),
    });
  };
  
  const isGmailConfigured = gmailSettings?.isConfigured;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            שליחת מייל
          </DialogTitle>
          <DialogDescription>
            שלח מייל ל-{customerName} ({customerEmail})
          </DialogDescription>
        </DialogHeader>
        
        {!isGmailConfigured ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              הגדרות Gmail לא הוגדרו. יש להגדיר מייל וסיסמת אפליקציה בהגדרות כלליות.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription className="flex items-center gap-2">
                  {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {message.text}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email-to">אל</Label>
                <Input
                  id="email-to"
                  value={customerEmail}
                  disabled
                  dir="ltr"
                  className="bg-gray-50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email-subject">נושא</Label>
                <Input
                  id="email-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="הזן נושא המייל..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email-body">תוכן</Label>
                <Textarea
                  id="email-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="הזן את תוכן המייל..."
                  rows={6}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                ביטול
              </Button>
              <Button onClick={handleSend} disabled={sendMutation.isPending}>
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Send className="h-4 w-4 ml-2" />
                )}
                שלח מייל
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
