"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  label: string;
  href: string;
  isActive: boolean;
  onClick?: () => void;
};

export function NavItem({ icon, label, href, isActive, onClick }: Props) {
  const baseClasses =
    "relative flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-all duration-200 md:flex-row md:justify-start md:gap-3";

  const activeClasses = isActive
    ? "text-blue-600"
    : "text-foreground/70 hover:text-foreground";

  const indicatorClasses =
    "after:absolute after:content-[''] after:rounded-full " +
    (isActive ? "after:bg-blue-600" : "after:bg-transparent") +
    " after:bottom-0 after:left-1/2 after:h-0.5 after:w-6 after:-translate-x-1/2 md:after:bottom-auto md:after:left-0 md:after:top-1/2 md:after:h-6 md:after:w-0.5 md:after:-translate-y-1/2 md:after:translate-x-0";

  const content = (
    <>
      <span aria-hidden className="text-xl leading-none md:text-lg">
        {icon}
      </span>
      <span className="text-[11px] font-medium leading-none md:text-sm">
        {label}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} ${activeClasses} ${indicatorClasses}`}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`${baseClasses} ${activeClasses} ${indicatorClasses}`}
    >
      {content}
    </Link>
  );
}
