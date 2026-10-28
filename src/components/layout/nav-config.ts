import {
  LayoutDashboard,
  Compass,
  CalendarCheck,
  Boxes,
  CheckSquare,
  History,
  UserCog,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "neutral" | "navy" | "teal" | "warning" | "info";
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Overview",
    href: "/",
    icon: LayoutDashboard,
    description: "System overview, active metrics, and quick workflows",
  },
  {
    title: "Discover Resources",
    href: "/resources",
    icon: Compass,
    description: "Browse scientific equipment, maker tools, and shared spaces",
  },
  {
    title: "My Bookings",
    href: "/bookings",
    icon: CalendarCheck,
    description: "Track your reserved apparatus, checkouts, and returns",
  },
  {
    title: "My Resources",
    href: "/my-resources",
    icon: Boxes,
    description: "Manage laboratory equipment and facilities you host",
  },
  {
    title: "Approval Requests",
    href: "/approvals",
    icon: CheckSquare,
    badge: "0",
    badgeVariant: "neutral",
    description: "Review incoming borrower clearance and booking requests",
  },
  {
    title: "Activity History",
    href: "/activity",
    icon: History,
    description: "Auditable custody transfers, condition reports, and logs",
  },
  {
    title: "Profile & Settings",
    href: "/profile",
    icon: UserCog,
    description: "Institutional affiliation, credentials, and notifications",
  },
];
