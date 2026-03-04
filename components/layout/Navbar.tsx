"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard,
  Trophy,
  Timer,
  BookMarked,
  LogOut,
  Zap,
  User,
  Github,
} from "lucide-react";
import Avatar from "@/components/Avatar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/timer", label: "Pomodoro", icon: Timer },
  { href: "/leaderboard", label: "Classifica", icon: Trophy },
  { href: "/market", label: "Mercato", icon: BookMarked },
  { href: "/profile", label: "Profilo", icon: User },
];

export default function Navbar() {
  const pathname = usePathname();
  const { userData, logout } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10 md:top-0 md:bottom-auto md:left-0 md:w-20 md:h-screen md:flex md:flex-col md:border-t-0 md:border-r">
      {/* Logo - Desktop only */}
      <div className="hidden md:flex items-center justify-center py-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-pink-500 flex items-center justify-center">
          <Zap className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Nav items */}
      <div className="flex flex-row md:flex-col justify-around md:justify-start md:gap-2 md:px-2 md:flex-1 py-1 md:py-2 gap-0">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-center p-2 md:p-3 md:flex-row rounded-lg md:rounded-xl transition-all duration-200 group ${
                active
                  ? "bg-blue-600/30 text-blue-400 neon-border"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="md:sr-only">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* User + Links - Desktop */}
      <div className="hidden md:flex flex-col items-center gap-3 py-4 px-2">
        <Avatar
          src={userData?.photoURL || undefined}
          name={userData?.nome}
          size={36}
          className="border-2 border-blue-500"
        />
        <a
          href="https://github.com/melissa-massarenti02/fanta-lezioni"
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-xl text-slate-400 hover:text-white hover:bg-gray-700 transition-all duration-200"
          title="Repository GitHub"
        >
          <Github className="w-5 h-5" />
        </a>
        <button
          onClick={logout}
          className="p-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
          title="Esci"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
