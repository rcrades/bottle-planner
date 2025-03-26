import { useState } from 'react';
import { AlertTriangle, Copy, X, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useToast } from '@/hooks/use-toast';

interface ErrorNotificationProps {
  title: string;
  description?: string;
  command?: string;
  additionalInstructions?: string;
  onClose?: () => void;
}

/**
 * A notification component for displaying errors with copy functionality
 * This component stays visible until explicitly closed by the user
 */
export function ErrorNotification({
  title,
  description,
  command,
  additionalInstructions,
  onClose
}: ErrorNotificationProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Copy command to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
          title: "Command Copied",
          description: "The command has been copied to your clipboard."
        });
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: "Could not copy to clipboard. Please select and copy manually."
        });
      }
    );
  };

  return (
    <Alert variant="destructive" className="mb-6 relative">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      {/* Close button */}
      {onClose && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose} 
          className="absolute top-2 right-2 h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      )}
      <AlertDescription className="space-y-4">
        {description && <p>{description}</p>}
        
        {/* Display command with copy button if provided */}
        {command && (
          <>
            <div className="bg-slate-900 text-slate-50 p-3 rounded-md flex justify-between items-center">
              <code className="text-sm font-mono select-all whitespace-pre-wrap break-all">
                {command}
              </code>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => copyToClipboard(command)}
                className="ml-2 flex-shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">Copy to clipboard</span>
              </Button>
            </div>
          </>
        )}
        
        {/* Additional instructions */}
        {additionalInstructions && (
          <p className="text-sm">{additionalInstructions}</p>
        )}
      </AlertDescription>
    </Alert>
  );
} 