/**
 * CFP Processing Logs Component
 * Displays real-time processing logs for CFP operations
 * 
 * SOLID: Single Responsibility - only displays processing logs
 * DRY: Reusable component for showing CFP progress
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ProcessingLog {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  step?: string;
}

interface CFPProcessingLogsProps {
  businessId: number;
  /**
   * Whether to show logs (only when processing)
   */
  isProcessing?: boolean;
  /**
   * Current business status
   */
  status?: string;
  className?: string;
}

/**
 * CFP Processing Logs Component
 * Shows real-time processing status and logs
 */
export function CFPProcessingLogs({
  businessId,
  isProcessing = false,
  status,
  className,
}: CFPProcessingLogsProps) {
  const [logs, setLogs] = useState<ProcessingLog[]>([]);

  // Generate status-based logs
  useEffect(() => {
    if (!isProcessing && !status) return;

    const statusLogs: ProcessingLog[] = [];

    switch (status) {
      case 'pending':
        statusLogs.push({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Initializing CFP process...',
          step: 'Initialization',
        });
        break;
      case 'crawling':
        statusLogs.push(
          {
            timestamp: new Date(Date.now() - 5000).toISOString(),
            level: 'success',
            message: 'CFP process started',
            step: 'Initialization',
          },
          {
            timestamp: new Date(Date.now() - 3000).toISOString(),
            level: 'info',
            message: 'Starting website crawl...',
            step: 'Crawl',
          },
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Extracting business data from website...',
            step: 'Crawl',
          }
        );
        break;
      case 'crawled':
        statusLogs.push(
          {
            timestamp: new Date(Date.now() - 10000).toISOString(),
            level: 'success',
            message: 'Crawl completed successfully',
            step: 'Crawl',
          },
          {
            timestamp: new Date(Date.now() - 5000).toISOString(),
            level: 'info',
            message: 'Starting LLM fingerprint analysis...',
            step: 'Fingerprint',
          },
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Querying LLMs for visibility analysis...',
            step: 'Fingerprint',
          }
        );
        break;
      case 'generating':
        statusLogs.push(
          {
            timestamp: new Date(Date.now() - 15000).toISOString(),
            level: 'success',
            message: 'Fingerprint analysis completed',
            step: 'Fingerprint',
          },
          {
            timestamp: new Date(Date.now() - 5000).toISOString(),
            level: 'info',
            message: 'Preparing Wikidata entity...',
            step: 'Publish',
          },
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Publishing to Wikidata...',
            step: 'Publish',
          }
        );
        break;
      case 'published':
        statusLogs.push(
          {
            timestamp: new Date(Date.now() - 20000).toISOString(),
            level: 'success',
            message: 'CFP process completed successfully',
            step: 'Complete',
          }
        );
        break;
    }

    setLogs(statusLogs);
  }, [status, isProcessing]);

  if (!isProcessing && status !== 'crawling' && status !== 'generating') {
    return null;
  }

  const getLogIcon = (level: ProcessingLog['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
    }
  };

  const getLogColor = (level: ProcessingLog['level']) => {
    switch (level) {
      case 'success':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      case 'warning':
        return 'text-amber-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <Card className={cn('gem-card', className)}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">CFP Processing Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 overflow-y-auto space-y-2">
          {logs.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-gray-400" />
              <p>Waiting for processing to start...</p>
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-xs"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getLogIcon(log.level)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {log.step && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {log.step}
                      </Badge>
                    )}
                    <span className={cn('font-medium', getLogColor(log.level))}>
                      {log.message}
                    </span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

