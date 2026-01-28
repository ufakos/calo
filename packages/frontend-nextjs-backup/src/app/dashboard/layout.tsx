'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Building2,
  FileSearch,
  Plus,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { api } from '@/lib/api';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    api
      .me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('accessToken');
        router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [mounted, router]);

  // Don't render anything until mounted (avoids hydration mismatch)
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white dark:bg-slate-800">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-4 border-b">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold">SecureScope</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </Link>
            <Link
              href="/dashboard/organizations"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Building2 className="h-5 w-5" />
              Organizations
            </Link>
            <Link
              href="/dashboard/assessments"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <FileSearch className="h-5 w-5" />
              Assessments
            </Link>
            <Link
              href="/dashboard/assessments/new"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <Plus className="h-5 w-5" />
              New Assessment
            </Link>
          </nav>

          {/* User */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p className="font-medium">{user?.name || 'User'}</p>
                <p className="text-muted-foreground">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('accessToken');
                  router.push('/login');
                }}
                className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
