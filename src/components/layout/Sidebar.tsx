"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  Activity,
  BarChart2,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Image from "next/image";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/diary", label: "Diary", icon: BookOpen },
  { href: "/training", label: "Training", icon: Activity },
  { href: "/metrics", label: "Metrics", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-surface-50 border-r border-surface-200 py-6 px-3">
      {/* Logo */}
      <div className="px-3 mb-8">
        <h1 className="text-lg font-bold text-white tracking-tight">
          Life <span className="text-brand-400">OS</span>
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">Personal Operating System</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-brand-600/20 text-brand-300 font-medium"
                  : "text-gray-400 hover:text-white hover:bg-surface-100"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {session?.user && (
        <div className="border-t border-surface-200 pt-4 mt-4">
          <div className="flex items-center gap-3 px-3 py-2">
            {session.user.image && (
              <Image
                src={session.user.image}
                alt="avatar"
                width={28}
                height={28}
                className="rounded-full"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{session.user.name}</p>
              <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-surface-100 transition-colors mt-1"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
