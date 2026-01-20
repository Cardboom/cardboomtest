import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Calendar } from "lucide-react";
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
  Bot,
  Target,
  Store,
  Trash2,
  Image,
  Database,
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
      { id: "analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    id: "orders",
    label: "Orders & Finance",
    icon: ShoppingCart,
    items: [
      { id: "orders", label: "Order Management", icon: ShoppingCart },
      { id: "wire-transfers", label: "Wire Transfers", icon: Banknote },
      { id: "payouts", label: "Withdrawals", icon: CreditCard },
      { id: "disputes", label: "Disputes", icon: AlertTriangle },
    ],
  },
  {
    id: "users",
    label: "Users & Trust",
    icon: Users,
    items: [
      { id: "users", label: "User Management", icon: Users },
      { id: "creators", label: "Creator Management", icon: Crown },
      { id: "verification", label: "Seller KYC", icon: Shield },
      { id: "coach-verification", label: "Coach Verification", icon: Crown },
      { id: "whale", label: "Whale Program", icon: Crown },
      { id: "system-accounts", label: "System Accounts", icon: Bot },
      { id: "admin-storefronts", label: "Admin Storefronts", icon: Store },
    ],
  },
  {
    id: "marketplace",
    label: "Marketplace",
    icon: Package,
    items: [
      { id: "moderation", label: "Moderation", icon: ListChecks },
      { id: "featured", label: "Featured", icon: Star },
      { id: "items-manager", label: "Items Manager", icon: Package },
      { id: "listings-manager", label: "Listings (Delete)", icon: Trash2 },
      { id: "catalog-ops", label: "Catalog Ops", icon: RefreshCw },
      { id: "tcg-drops", label: "TCG Drops", icon: Calendar },
      { id: "controls", label: "Market Controls", icon: Settings },
    ],
  },
  {
    id: "engagement",
    label: "Engagement",
    icon: Sword,
    items: [
      { id: "cardwars", label: "Card Wars $", icon: Sword },
      { id: "communityvotes", label: "Community Votes", icon: Vote },
      { id: "fanaccounts", label: "Boom Reels", icon: Video },
      { id: "auctions", label: "Auctions", icon: Gavel },
    ],
  },
  {
    id: "rewards",
    label: "Rewards & Points",
    icon: Coins,
    items: [
      { id: "points", label: "Points Manager", icon: Coins },
      { id: "coins-pricing", label: "Coins Pricing", icon: Coins },
      { id: "bounties", label: "Boom Challenges", icon: Coins },
      { id: "promos", label: "Promos", icon: Tag },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    icon: MessageSquare,
    items: [
      { id: "support", label: "Support Tickets", icon: HelpCircle },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "email", label: "Email", icon: Mail },
    ],
  },
  {
    id: "gaming",
    label: "Gaming & Digital",
    icon: Coins,
    items: [
      { id: "digital-products", label: "Digital Products", icon: Package },
      { id: "boom-packs", label: "Boom Packs", icon: Package },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: Settings,
    items: [
      { id: "launch-check", label: "Launch Check", icon: Shield },
      { id: "system-status", label: "System Status", icon: Activity },
      { id: "api", label: "API", icon: Globe },
      { id: "diagnostics", label: "Diagnostics", icon: Activity },
      { id: "currency", label: "Currency", icon: Wallet },
      { id: "vault", label: "Vault", icon: Vault },
      { id: "grading", label: "Grading", icon: Shield },
      { id: "grading-pricing", label: "Grading Pricing", icon: DollarSign },
      { id: "grading-calibration", label: "AI Calibration", icon: Target },
      { id: "image-normalization", label: "Image AI", icon: Image },
      { id: "autobuy", label: "Deal Scooper", icon: Timer },
    ],
  },
];

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onSearch?: () => void;
}

export function AdminSidebar({
  activeSection,
  onSectionChange,
  onSearch,
}: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
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
      <div className="flex items-center justify-between p-4 border-b border-border gap-2">
        {!collapsed && (
          <h2 className="font-semibold text-lg text-foreground flex-1">Admin Panel</h2>
        )}
        {!collapsed && onSearch && (
          <Button
            variant="outline"
            size="icon"
            onClick={onSearch}
            className="h-8 w-8"
            title="Search (Ctrl+K)"
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
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
                      setCollapsed(false);
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
