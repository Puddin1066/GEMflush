'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Building2, TrendingUp, Database, Settings, Activity, Menu, Sparkles } from 'lucide-react';
import { GemBadge } from '@/components/ui/gem-icon';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { data: team } = useSWR('/api/team', fetcher);

  // Determine user's plan tier
  const planTier = team?.planId || 'free';
  const isPro = planTier === 'pro' || planTier === 'agency';

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { href: '/dashboard/businesses', icon: Building2, label: 'Businesses' },
    { href: '/dashboard/activity', icon: Activity, label: 'Activity' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="flex flex-col min-h-[calc(100dvh-68px)] max-w-7xl mx-auto w-full">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4">
        <div className="flex items-center">
          <span className="font-medium">Dashboard</span>
        </div>
        <Button
          className="-mr-3"
          variant="ghost"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden h-full">
        {/* Sidebar */}
        <aside
          className={`w-64 bg-white lg:bg-gray-50 border-r border-gray-200 lg:block ${
            isSidebarOpen ? 'block' : 'hidden'
          } lg:relative absolute inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="h-full overflow-y-auto p-4 flex flex-col">
            {/* Plan Badge */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              {planTier === 'free' && (
                <div className="space-y-2">
                  <GemBadge variant="outline" className="w-full text-center">
                    Free Plan
                  </GemBadge>
                  <Link href="/pricing" className="block">
                    <Button 
                      size="sm" 
                      className="w-full gem-gradient text-white hover:opacity-90"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Upgrade to Pro
                    </Button>
                  </Link>
                </div>
              )}
              {planTier === 'pro' && (
                <GemBadge className="w-full text-center">
                  Pro Plan
                </GemBadge>
              )}
              {planTier === 'agency' && (
                <GemBadge className="w-full text-center gem-faceted">
                  Agency Plan
                </GemBadge>
              )}
            </div>

            {/* Navigation Items */}
            <div className="space-y-1 flex-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className={`shadow-none w-full justify-start ${
                        isActive ? 'bg-gray-100 font-medium' : ''
                      }`}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* Bottom CTA for Free Users */}
            {!isPro && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="gem-card p-3 text-center space-y-2">
                  <p className="text-xs font-medium">Unlock Wikidata Publishing</p>
                  <Link href="/pricing">
                    <Button size="sm" className="w-full gem-gradient text-white text-xs">
                      View Plans
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-0 lg:p-4">{children}</main>
      </div>
    </div>
  );
}
