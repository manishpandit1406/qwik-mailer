"use client";
import Link from "next/link";
import { Mail, ArrowLeft, User } from "lucide-react";
import { useState, useEffect, use } from "react";
import { blogPosts } from "../../../data/blog";
import { notFound } from "next/navigation";
import { Footer } from "../../../components/Footer";

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{name: string}>({ name: "User" });

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("mf_access_token"));
    const userStr = localStorage.getItem("mf_user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {}
    }
  }, []);

  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen font-sans selection:bg-black selection:text-white bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-2.5 font-bold">
            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-black shadow-sm">
              <Mail size={16} className="text-white" />
            </div>
            <span className="text-black tracking-tight font-bold hidden sm:block">Qwik Mailer</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {["Home", "Features", "Pricing", "Docs", "Blog"].map((item) => (
              <Link
                key={item}
                href={item === "Home" ? "/" : item === "Docs" ? "/docs" : item === "Blog" ? "/blog" : `/#${item.toLowerCase()}`}
                className={`text-sm font-medium transition-colors duration-150 border-b-2 pb-1 hover:text-black ${
                  item === "Blog" ? "text-black border-black" : "text-gray-500 border-transparent"
                }`}
              >
                {item}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center transition-transform hover:scale-105 font-bold uppercase text-sm shadow-sm"
                  title="Go to Dashboard"
                >
                  {user.name?.[0] || 'U'}
                </Link>
            ) : (
              <>
                <Link href="/login" className="px-3 py-1.5 rounded-md font-medium text-sm text-gray-500 hover:bg-gray-100 hover:text-black transition-colors hidden sm:block">
                  Sign In
                </Link>
                <Link href="/register" className="px-4 py-2 rounded-md font-semibold text-sm bg-black text-white hover:bg-gray-900 transition-all shadow-sm">
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Article Header */}
      <header className="max-w-3xl mx-auto px-6 pt-20 pb-12">
        <Link 
          href="/blog" 
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Back to Blog
        </Link>
        <div className="flex items-center gap-3 text-sm font-medium text-gray-500 mb-6">
          <span>{post.date}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span>{post.readTime}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-black mb-8 leading-[1.1] tracking-tight">
          {post.title}
        </h1>
        <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-700">
            {post.author.avatar}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{post.author.name}</p>
            <p className="text-sm text-gray-500">{post.author.role}</p>
          </div>
        </div>
      </header>

      {/* Cover Image */}
      <div className="max-w-3xl mx-auto px-6 mb-16">
        <div className="aspect-[21/9] w-full rounded-2xl overflow-hidden bg-gray-100">
          <img 
            src={post.coverImage} 
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-3xl mx-auto px-6 pb-32">
        <div 
          className="max-w-none 
            [&>h2]:font-bold [&>h2]:tracking-tight [&>h2]:text-black [&>h2]:text-3xl [&>h2]:mt-12 [&>h2]:mb-6
            [&>h3]:font-bold [&>h3]:tracking-tight [&>h3]:text-black [&>h3]:text-2xl [&>h3]:mt-8 [&>h3]:mb-4
            [&>p]:text-gray-600 [&>p]:leading-relaxed [&>p]:mb-6 [&>p]:text-lg
            [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-6
            [&>ul>li]:text-gray-600 [&>ul>li]:leading-relaxed [&>ul>li]:text-lg
            [&_strong]:text-black [&_strong]:font-bold
            [&_code]:text-black [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-sm"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
      <Footer />
    </div>
  );
}
