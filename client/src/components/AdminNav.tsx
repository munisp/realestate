import { useLocation } from 'wouter';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Shield, 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  FileText,
  DollarSign,
  ChevronDown,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminPages = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Overview and moderation',
  },
  {
    title: 'User Management',
    href: '/admin/users',
    icon: Users,
    description: 'Manage user accounts',
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    description: 'Platform metrics',
  },
  {
    title: 'Audit Log',
    href: '/admin/audit-log',
    icon: FileText,
    description: 'Activity tracking',
  },
  {
    title: 'Role Management',
    href: '/admin/roles',
    icon: Shield,
    description: 'Manage permissions',
  },
  {
    title: 'Escrow Management',
    href: '/escrow',
    icon: DollarSign,
    description: 'Transaction oversight',
  },
  {
    title: 'Verification Dashboard',
    href: '/admin/verification',
    icon: CheckCircle,
    description: 'Review host & builder applications',
  },
];

export function AdminNav() {
  const [location] = useLocation();

  // Mock stats - replace with actual data
  const stats = {
    pendingApprovals: 5,
    unreadReports: 3,
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return location === '/admin';
    }
    return location.startsWith(href);
  };

  const currentPage = adminPages.find(page => isActive(page.href));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <Shield className="h-5 w-5" />
          <span className="hidden md:inline">Admin</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Admin Tools</span>
          <Badge variant="secondary" className="text-xs">
            Admin
          </Badge>
        </DropdownMenuLabel>
        
        {/* Quick Stats */}
        <div className="px-2 py-3 border-b">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted rounded-md p-2">
              <div className="text-xs text-muted-foreground">Pending</div>
              <div className="text-lg font-bold">{stats.pendingApprovals}</div>
            </div>
            <div className="bg-muted rounded-md p-2">
              <div className="text-xs text-muted-foreground">Reports</div>
              <div className="text-lg font-bold">{stats.unreadReports}</div>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Admin Pages */}
        {adminPages.map((page) => {
          const Icon = page.icon;
          const active = isActive(page.href);

          return (
            <DropdownMenuItem key={page.href} asChild>
              <Link href={page.href}>
                <div
                  className={cn(
                    'flex items-start gap-3 w-full cursor-pointer p-2 rounded-md transition-colors',
                    active && 'bg-accent'
                  )}
                >
                  <Icon className={cn('h-5 w-5 mt-0.5', active ? 'text-primary' : 'text-muted-foreground')} />
                  <div className="flex-1 min-w-0">
                    <div className={cn('font-medium text-sm', active && 'text-primary')}>
                      {page.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {page.description}
                    </div>
                  </div>
                  {active && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  )}
                </div>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
