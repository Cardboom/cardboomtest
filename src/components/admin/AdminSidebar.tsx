import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  MessageSquare,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  BarChart3,
  Shield,
  Gavel,
  CreditCard,
  Banknote,
  ListChecks,
  Star,
  Tag,
  Sword,
  Vote,
  Video,
  Timer,
  Bell,
  Mail,
  Globe,
  RefreshCw,
  Activity,
  Coins,
  Vault,
  Wallet,
  Crown,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { id: "revenue", label: "Revenue", icon: DollarSign },
      { id: "analytics", label: "API Analytics", icon: BarChart3 },
      { id: "diagnostics", label: "Diagnostics", icon: Activity },
    ],
  },
  {
    id: "orders",
    label: "Orders & Finance",
    icon: ShoppingCart,
    items: [
      { id: "orders", label: "Order Management", icon: ShoppingCart },
      { id: "wire-transfers", label: "Wire Transfers", icon: Banknote },
      { id: "payouts", label: "Payout Queue", icon: CreditCard },
      { id: "disputes", label: "Disputes", icon: AlertTriangle },
    ],
  },
  {
    id: "users",
    label: "Users & Trust",
    icon: Users,
    items: [
      { id: "users", label: "User Management", icon: Users },
      { id: "seller-kyc", label: "Seller KYC", icon: Shield },
      { id: "whale-program", label: "Whale Program", icon: Crown },
      { id: "fan-accounts", label: "Fan Accounts", icon: Star },
    ],
  },
  {
    id: "marketplace",
    label: "Marketplace",
    icon: Package,
    items: [
      { id: "listings", label: "Listing Moderation", icon: ListChecks },
      { id: "featured", label: "Featured Items", icon: Star },
      { id: "prices", label: "Price Management", icon: Tag },
      { id: "market-controls", label: "Market Controls", icon: Settings },
      { id: "vault", label: "Vault Management", icon: Vault },
    ],
  },
  {
    id: "engagement",
    label: "Engagement",
    icon: Sword,
    items: [
      { id: "card-wars", label: "Card Wars", icon: Sword },
      { id: "community-votes", label: "Community Votes", icon: Vote },
      { id: "auctions", label: "Auctions", icon: Gavel },
      { id: "reels", label: "Reels", icon: Video },
    ],
  },
  {
    id: "rewards",
    label: "Rewards & Points",
    icon: Coins,
    items: [
      { id: "points", label: "Cardboom Points", icon: Coins },
      { id: "promos", label: "Promo Codes", icon: Tag },
      { id: "grading", label: "Grading Credits", icon: Shield },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    icon: MessageSquare,
    items: [
      { id: "support", label: "Support Tickets", icon: HelpCircle },
      { id: "notifications", label: "Push Notifications", icon: Bell },
      { id: "email", label: "Email Management", icon: Mail },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: Settings,
    items: [
      { id: "currency", label: "Currency Rates", icon: Wallet },
      { id: "data-sync", label: "Data Sync", icon: RefreshCw },
      { id: "api", label: "API Settings", icon: Globe },
    ],
  },
];

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function AdminSidebar({
  activeSection,
  onSectionChange,
  collapsed,
  onCollapsedChange,
}: AdminSidebarProps) {
  const [openGroups, setOpenGroups] = useState<string[]>(
    navGroups.map((g) => g.id)
  );

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const findActiveGroup = () => {
    for (const group of navGroups) {
      if (group.items.some((item) => item.id === activeSection)) {
        return group.id;
      }
    }
    return null;
  };

  const activeGroup = findActiveGroup();

  return (
    <div
      className={cn(
        "flex flex-col border-r border-border bg-card/50 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <h2 className="font-semibold text-lg text-foreground">Admin Panel</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCollapsedChange(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 p-2">
        <nav className="space-y-1">
          {navGroups.map((group) => (
            <Collapsible
              key={group.id}
              open={!collapsed && openGroups.includes(group.id)}
              onOpenChange={() => !collapsed && toggleGroup(group.id)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2 px-3 py-2 h-auto",
                    collapsed && "justify-center px-2",
                    activeGroup === group.id && "bg-muted"
                  )}
                  onClick={() => {
                    if (collapsed) {
                      onCollapsedChange(false);
                      setOpenGroups((prev) =>
                        prev.includes(group.id) ? prev : [...prev, group.id]
                      );
                    }
                  }}
                >
                  <group.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left text-sm font-medium">
                        {group.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          openGroups.includes(group.id) && "rotate-180"
                        )}
                      />
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              {!collapsed && (
                <CollapsibleContent className="pl-4 space-y-0.5 mt-0.5">
                  {group.items.map((item) => (
                    <Button
                      key={item.id}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-start gap-2 h-9 text-muted-foreground hover:text-foreground",
                        activeSection === item.id &&
                          "bg-primary/10 text-primary font-medium"
                      )}
                      onClick={() => onSectionChange(item.id)}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      <span className="text-sm">{item.label}</span>
                    </Button>
                  ))}
                </CollapsibleContent>
              )}
            </Collapsible>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            CardBoom Admin v2.0
          </p>
        </div>
      )}
    </div>
  );
}
