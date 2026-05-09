import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  BookOpen,
  Upload,
  LogOut,
  Clock,
  FileText,
  ClipboardList,
} from 'lucide-react';

const Sidebar = () => {
  const { userProfile, signOut } = useAuth();
  const location = useLocation();
  const role = userProfile?.role;

  const mentorLinks = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'Activity',
      items: [
        { name: 'Mark Attendance', path: '/attendance', icon: CheckSquare },
        { name: 'Student History', path: '/history', icon: Clock },
        { name: 'Materials', path: '/materials', icon: FileText },
        { name: 'Assignments', path: '/assignments', icon: ClipboardList },
      ],
    },
    {
      label: 'Data',
      items: [
        { name: 'Upload CSV', path: '/upload', icon: Upload },
      ],
    },
  ];

  const studentLinks = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard', path: '/me/dashboard', icon: LayoutDashboard },
        { name: 'My Attendance', path: '/me/attendance', icon: CheckSquare },
        { name: 'Upcoming Sessions', path: '/me/upcoming', icon: Clock },
        { name: 'Class Materials', path: '/me/materials', icon: FileText },
      ],
    },
  ];

  const links = role === 'mentor' ? mentorLinks : studentLinks;

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-[220px] flex-shrink-0 border-r border-white/5 bg-[#08080C] hidden md:flex flex-col h-screen sticky top-0">
      {/* Logo + Welcome */}
      <div className="px-5 pt-6 pb-5 border-b border-white/5">
        <Link to="/" className="flex items-center gap-3 group mb-4">
          <div className="w-8 h-8 bg-accent-glow rounded-lg flex items-center justify-center shadow-[0_0_16px_rgba(99,102,241,0.4)] group-hover:scale-105 transition-transform">
            <span className="text-white font-black text-sm">F</span>
          </div>
          <span className="text-[18px] font-black text-fg-primary tracking-tighter group-hover:text-accent-glow transition-colors">
            ForgeTrack
          </span>
        </Link>

        <div>
          <p className="text-[11px] text-fg-tertiary leading-none mb-0.5">Welcome Back,</p>
          <p className="text-[14px] font-bold text-fg-primary leading-tight truncate">
            {userProfile?.display_name || 'Mentor'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
        {links.map((section, idx) => (
          <div key={idx}>
            <p className="text-[10px] font-bold text-fg-tertiary mb-2 px-3 uppercase tracking-[0.2em] opacity-60">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-3 h-[40px] px-3 rounded-xl transition-all group ${
                      active
                        ? 'bg-white/[0.06] text-white border border-white/[0.08]'
                        : 'text-fg-tertiary hover:text-fg-secondary hover:bg-white/[0.03]'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        active ? 'text-accent-glow' : 'group-hover:text-fg-primary'
                      }`}
                    />
                    <span
                      className={`text-[13px] font-semibold tracking-tight transition-colors truncate ${
                        active ? 'text-white' : 'group-hover:text-fg-primary'
                      }`}
                    >
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Account + Logout */}
      <div className="px-3 pb-5 border-t border-white/5 pt-4">
        <p className="text-[10px] font-bold text-fg-tertiary mb-2 px-3 uppercase tracking-[0.2em] opacity-60">
          Account
        </p>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 h-[40px] px-3 rounded-xl text-fg-tertiary hover:bg-danger/10 hover:text-danger border border-transparent transition-all duration-200 group"
        >
          <LogOut className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
          <span className="text-[13px] font-semibold tracking-tight">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
