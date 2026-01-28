import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileSearch, Lock, ClipboardList } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            SecureScope
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm uppercase tracking-wide text-blue-600 font-semibold">Security Posture Assessment</p>
            <h1 className="mt-4 text-4xl font-bold text-slate-900 leading-tight">
              Security Posture Assessment (Black‑Box, Public Surface)
            </h1>
            <p className="mt-4 text-slate-600 text-lg">
              Map the attack surface, capture defensible evidence, and produce interview‑ready reports
              without touching authenticated or paid features.
            </p>
            <div className="mt-6">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
              >
                Go to Sign In
              </Link>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <FileSearch className="w-5 h-5 text-blue-600" />
                <h3 className="mt-3 font-semibold text-slate-900">Attack Surface Map</h3>
                <p className="mt-2 text-sm text-slate-600">Enumerate domains, endpoints, and public entry points.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <Lock className="w-5 h-5 text-blue-600" />
                <h3 className="mt-3 font-semibold text-slate-900">Safe by Design</h3>
                <p className="mt-2 text-sm text-slate-600">Low‑volume, non‑disruptive checks only.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <h3 className="mt-3 font-semibold text-slate-900">Evidence‑Ready</h3>
                <p className="mt-2 text-sm text-slate-600">Attach screenshots, headers, and command outputs.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="mt-3 font-semibold text-slate-900">Executive Reporting</h3>
                <p className="mt-2 text-sm text-slate-600">Three‑page summary for leadership and interviews.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
