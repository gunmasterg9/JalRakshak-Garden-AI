import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Sprout,
  Stethoscope,
  Droplets,
  BookOpen,
  Compass,
  Settings,
  ShieldCheck,
  Flame,
  Sun,
  X,
  Cpu,
  BrainCircuit,
  Activity,
  BellRing,
} from 'lucide-react';
import { useGarden } from '../context/GardenContext';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const { t, isGujaratMode } = useGarden();

  const navLinks = [
    { to: '/', label: t.dashboard, icon: LayoutDashboard },
    { to: '/plants', label: t.myGarden, icon: Sprout },
    { to: '/iot', label: 'Live Sensors & Pump', icon: Cpu, badge: 'ESP32' },
    { to: '/ai', label: 'Garden AI Assistant', icon: BrainCircuit },
    { to: '/analytics', label: 'Analytics & Savings', icon: Activity },
    { to: '/alerts', label: 'Alerts Center', icon: BellRing },
    { to: '/doctor', label: t.plantDoctor, icon: Stethoscope },
    { to: '/water', label: t.waterPlanner, icon: Droplets },
    { to: '/journal', label: t.gardenJournal, icon: BookOpen },
    { to: '/missions', label: t.missions, icon: Compass, badge: 'Touch Grass' },
    { to: '/settings', label: t.settings, icon: Settings },
  ];


  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-stone-900/40 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-white border-r border-sage flex flex-col z-50 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-sage">
          <div className="flex items-center gap-2">
            <span className="font-heading font-extrabold text-lg text-nature-800 tracking-tight">
              🌱 JalRakshak
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-stone-500 hover:bg-stone-100"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navLinks.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-nature-100 text-nature-800 shadow-sm'
                    : 'text-stone-600 hover:bg-cream-100 hover:text-stone-900'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-nature-600" />
                <span>{label}</span>
              </div>
              {badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar footer: Touch Grass outdoor teaser */}
        <div className="p-4 border-t border-sage space-y-3">
          <div className="bg-nature-50 border border-nature-200 rounded-xl p-3 text-xs text-nature-900">
            <div className="flex items-center gap-1.5 font-bold text-nature-800 mb-1">
              <Compass className="w-3.5 h-3.5 text-nature-600" />
              <span>Touch Grass Challenge</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-snug">
              Spend less time looking at screens and more time tending your plants outside.
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-nature-600" /> 100% Private
            </span>
            <span>v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
};
