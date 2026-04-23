"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/displayMap", label: "Map" },
  { href: "/calendar", label: "Calendar" },
  { href: "/friends", label: "Friends" },
  { href: "/profile", label: "Profile" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1">
      {links.map(({ href, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              isActive
                ? "bg-white text-purple-900"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
