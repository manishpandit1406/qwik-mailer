import Link from "next/link";
import { ArrowRight, Inbox, Mail, Shield, Zap } from "lucide-react";

export default function InboxLandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans selection:bg-indigo-500/30">
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-200 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-black flex items-center justify-center shadow-sm">
            <Inbox className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-black">Qwik Inbox</span>
        </div>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="#features" className="text-gray-500 hover:text-black transition-colors">Features</Link>
          <Link href="/inbox-login" className="text-gray-600 hover:text-black transition-colors">Sign In</Link>
          <Link href="/inbox-register" className="bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-colors">
            Get Started
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-gray-50 to-gray-50 -z-10" />
          
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium border border-indigo-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Now in Early Access
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight text-black">
              One Inbox for <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                All Your Accounts
              </span>
            </h1>
            
            <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Connect your Gmail, Outlook, and custom domains. Manage, read, and reply to all your emails from a single, beautifully designed interface.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/inbox-register" className="w-full sm:w-auto px-8 py-4 bg-black text-white rounded-full font-semibold hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                Start Connecting <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="#features" className="w-full sm:w-auto px-8 py-4 bg-white text-black rounded-full font-semibold hover:bg-gray-50 transition-all border border-gray-200">
                Learn More
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Mail, title: "Universal Access", desc: "Sync emails from any provider using IMAP/SMTP or direct APIs." },
                { icon: Zap, title: "Lightning Fast", desc: "Built on a modern stack to ensure your inbox loads instantly." },
                { icon: Shield, title: "Secure & Private", desc: "Your credentials are encrypted. We prioritize your privacy above all." }
              ].map((f, i) => (
                <div key={i} className="p-6 rounded-2xl bg-gray-50 border border-gray-200 hover:border-indigo-300 transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center mb-6 group-hover:bg-indigo-50 transition-colors">
                    <f.icon className="w-6 h-6 text-gray-500 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-black">{f.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-gray-500 text-sm border-t border-gray-200 bg-white">
        <p>© {new Date().getFullYear()} Qwik Mailer. All rights reserved.</p>
      </footer>
    </div>
  );
}
