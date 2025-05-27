import React from 'react';
import { Card, CardContent } from './card';
import { Button } from './button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
  details?: string;
  onRetry?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  message,
  details,
  onRetry
}) => {
  return (
    <Card className="mb-6 bg-destructive/10 border-destructive/20">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-destructive h-5 w-5 mt-0.5" />
            <div>
              <h3 className="font-medium text-destructive text-base">{message}</h3>
              {details && (
                <p className="text-muted-foreground text-sm mt-1">{details}</p>
              )}
            </div>
          </div>
          
          {onRetry && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 