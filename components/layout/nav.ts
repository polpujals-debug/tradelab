import {
  BookOpenText, Calculator, ChartCandlestick, GraduationCap, LayoutDashboard, Newspaper, Settings, Target, TrendingUp,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "unreadReports";
  mobile?: boolean;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/diari", label: "Diari", icon: BookOpenText, mobile: true },
  { href: "/calculadora", label: "Calculadora", icon: Calculator, mobile: true },
  { href: "/estrategia", label: "Estratègia", icon: Target },
  { href: "/analisis", label: "Anàlisis", icon: ChartCandlestick, mobile: true },
  { href: "/aprenentatge", label: "Aprenentatge", icon: GraduationCap },
  { href: "/informes", label: "Informes de mercat", icon: Newspaper, badge: "unreadReports" },
  { href: "/rendiment", label: "Rendiment", icon: TrendingUp },
  { href: "/configuracio", label: "Configuració", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
