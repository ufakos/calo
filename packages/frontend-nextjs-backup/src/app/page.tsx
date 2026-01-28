import Link from 'next/link';
import { Shield, ArrowRight, CheckCircle2, Lock, FileSearch, BarChart3 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-500" />
            <span className="text-xl font-bold text-white">SecureScope</span>
          </div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-white mb-6">
            Black-Box Security
            <span className="text-blue-500"> Posture Assessment</span>
          </h1>
          <p className="text-xl text-slate-400 mb-8">
            Comprehensive public surface security assessments. Map attack surfaces,
            identify risks, and generate audit-ready reports—all without credentials.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Start Assessment
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium"
            >
              View Demo
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
              <FileSearch className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Attack Surface Mapping</h3>
            <p className="text-slate-400">
              Discover subdomains, exposed services, and public assets using safe,
              passive reconnaissance techniques.
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Safe & Non-Intrusive</h3>
            <p className="text-slate-400">
              No brute force, no fuzzing, no credential stuffing. Rate-limited requests
              with strict scope validation.
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Audit-Ready Reports</h3>
            <p className="text-slate-400">
              Generate comprehensive reports with top risks, action plans, and
              automated audit controls with evidence.
            </p>
          </div>
        </div>

        {/* Report Contents */}
        <div className="mt-24 bg-slate-800/30 rounded-2xl p-8 border border-slate-700">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            What&apos;s in Your Report
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              'Attack surface map (public footprint)',
              'Hands-on observations with redacted evidence',
              'Top 5 risks ranked by severity',
              'Action plan for pre-onboarding + first 2 weeks',
              '3+ automated audit controls with evidence',
              'TLS/SSL configuration analysis',
              'Security header assessment',
              'CORS configuration review',
              'DNS and subdomain enumeration',
              'Technology fingerprinting',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 border-t border-slate-800 mt-20">
        <div className="flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span>SecureScope</span>
          </div>
          <p>© 2024 Security Assessment Platform</p>
        </div>
      </footer>
    </div>
  );
}
