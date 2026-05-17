import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import {
  LayoutDashboard, Upload, Calendar, ClipboardList,
  Scale, Mail, FileText, Briefcase, AlertTriangle,
  CheckSquare, BarChart3, Settings, Menu, ChevronRight,
  Building2, Users, Stamp, ClipboardCheck,
} from 'lucide-react';

type NavItem = { path: string; label: string; icon: React.ElementType };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  { label: '', items: [
    { path: '/',           label: 'Dashboard',              icon: LayoutDashboard },
  ]},
  { label: 'ATTENDANCE', items: [
    { path: '/upload',     label: 'Daily Attendance Upload', icon: Upload },
    { path: '/attendance', label: 'Attendance Records',      icon: Calendar },
  ]},
  { label: 'LEAVE & WORK', items: [
    { path: '/leave',      label: 'Leave & Work Arrangements', icon: ClipboardList },
  ]},
  { label: 'DECISIONS', items: [
    { path: '/decisions',  label: 'Management Decisions',    icon: Scale },
  ]},
  { label: 'COMMUNICATIONS', items: [
    { path: '/email-log',         label: 'Email Log',             icon: Mail },
    { path: '/pending-documents', label: 'Pending Documents',      icon: FileText },
    { path: '/official-letters',  label: 'Official Letters',       icon: Stamp },
  ]},
  { label: 'FOLLOW-UP', items: [
    { path: '/cases',         label: 'Follow-up Cases',      icon: Briefcase },
    { path: '/disciplinary',  label: 'Disciplinary Register', icon: AlertTriangle },
  ]},
  { label: 'EMPLOYEES', items: [
    { path: '/employees',  label: 'Employees',               icon: Users },
  ]},
  { label: 'TASKS', items: [
    { path: '/tasks',      label: 'Daily Task Log',           icon: CheckSquare },
  ]},
  { label: 'REPORTS & CONFIG', items: [
    { path: '/reports',        label: 'Reports',              icon: BarChart3 },
    { path: '/monthly-tasks',  label: 'Monthly Tasks Report', icon: ClipboardCheck },
    { path: '/settings',       label: 'Settings',             icon: Settings },
  ]},
];

function NavLink({ path, label, icon: Icon, collapsed }: NavItem & { collapsed: boolean }) {
  const [isActive] = useRoute(path === '/' ? '/' : `${path}*`);
  return (
    <Link href={path}>
      <div className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 mx-2 mb-0.5 ${
        isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}>
        <Icon size={17} className="shrink-0"/>
        {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
      </div>
    </Link>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-slate-800 transition-all duration-200 shrink-0 ${collapsed ? 'w-14' : 'w-56'}`}>
        {/* Logo */}
        <div className={`flex items-center gap-2 px-4 py-4 border-b border-slate-700 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Building2 size={15} className="text-white"/>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-white font-bold text-sm leading-tight truncate">HR Dashboard</div>
              <div className="text-slate-400 text-xs truncate">Attendance & Records</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && !collapsed && (
                <div className="px-5 pt-3 pb-1">
                  <span className="text-xs font-semibold text-slate-500 tracking-wider">{group.label}</span>
                </div>
              )}
              {group.label && collapsed && gi > 0 && (
                <div className="mx-3 my-2 border-t border-slate-700"/>
              )}
              {group.items.map(item => (
                <NavLink key={item.path} {...item} collapsed={collapsed}/>
              ))}
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center justify-center p-3 border-t border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          {collapsed ? <ChevronRight size={16}/> : <Menu size={16}/>}
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
