/**
 * Automated CFP Status Component
 * 
 * Shows real-time processing status without manual intervention
 * Delivers GEMflush value proposition through automated AI analysis
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Brain, Globe, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

interface AutomatedCFPStatusProps {
  status: string;
  businessName: string;
  className?: string;
  isPro?: boolean;
}

export function AutomatedCFPStatus({ status, businessName, className, isPro = false }: AutomatedCFPStatusProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Sparkles className="w-4 h-4 animate-pulse" />,
          label: 'Initializing AI Analysis',
          description: `Starting comprehensive visibility analysis for ${businessName}`,
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          dotColor: 'bg-blue-500'
        };
      case 'crawling':
        return {
          icon: <Globe className="w-4 h-4 animate-spin" />,
          label: 'Crawling Website',
          description: `Extracting business data and content from your website`,
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          dotColor: 'bg-purple-500'
        };
      case 'analyzing':
      case 'fingerprinting':
        return {
          icon: <Brain className="w-4 h-4 animate-pulse" />,
          label: 'AI Visibility Analysis',
          description: `Analyzing your presence across major AI models and search engines`,
          color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          dotColor: 'bg-indigo-500'
        };
      case 'generating':
      case 'publishing':
        return {
          icon: <TrendingUp className="w-4 h-4 animate-bounce" />,
          label: 'Publishing Insights',
          description: `Generating your visibility score and competitive intelligence`,
          color: 'bg-green-100 text-green-800 border-green-200',
          dotColor: 'bg-green-500'
        };
      case 'published':
      case 'crawled':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          label: 'Analysis Complete',
          description: `Your AI visibility insights are ready! Explore your competitive edge below.`,
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          dotColor: 'bg-emerald-500'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          label: 'Retrying Analysis',
          description: `Our AI encountered an issue but is automatically retrying. Results coming soon.`,
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          dotColor: 'bg-amber-500'
        };
      default:
        return {
          icon: <Sparkles className="w-4 h-4" />,
          label: 'Ready for Analysis',
          description: `${businessName} is ready for AI visibility analysis`,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          dotColor: 'bg-gray-500'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Card className={`${config.color} ${className}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={`w-2 h-2 ${config.dotColor} rounded-full mt-2 animate-pulse`}></div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {config.icon}
              <Badge variant="secondary" className="text-xs font-medium">
                {config.label}
              </Badge>
            </div>
            <p className="text-sm leading-relaxed">
              {config.description}
            </p>
            {status === 'published' || status === 'crawled' ? (
              <div className="mt-2 text-xs opacity-75">
                ✨ <strong>GEMflush delivered:</strong> Automated AI visibility analysis without any manual work required
              </div>
            ) : (
              <div className="mt-2 text-xs opacity-75">
                🤖 <strong>Automated processing:</strong> {isPro 
                  ? 'Full CFP automation (crawl + fingerprint + publish)' 
                  : 'Crawl + fingerprint automation (upgrade for publishing)'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
