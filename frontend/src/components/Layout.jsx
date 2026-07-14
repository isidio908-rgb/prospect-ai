import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { 
  LayoutDashboard, 
  Users, 
  LogOut,
  Menu,
  X,
  Key,
  MessageCircle,
  Radar,
  Moon,
  Sun,
  Columns3,
  History,
  HelpCircle,
  User,
  Bot
} from 'lucide-react';
import { useState } from 'react';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Coletar', href: '/collect', icon: Radar },
    { name: 'Histórico', href: '/collections', icon: History },
    { name: 'Leads', href: '/leads', icon: Users },
    { name: 'CRM Kanban', href: '/crm', icon: Columns3 },
    { name: 'Autopilot', href: '/autopilot', icon: Bot },
    { name: 'WhatsApp', href: '/whatsapp', icon: MessageCircle },
    { name: 'Credenciais', href: '/credentials', icon: Key },
    { name: 'Ajuda', href: '/help', icon: HelpCircle },
    { name: 'Perfil', href: '/profile', icon: User },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const ThemeToggle = ({ className = '' }) => (
    <button
      onClick={toggleTheme}
      className={`p-2 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${className}`}
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );

  const navLinkClasses = (isActive) => `
    group flex items-center px-2 py-2 text-sm font-medium rounded-md
    ${isActive
      ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100'
    }
  `;

  const profession = user?.profession || 'Gestor de Tráfego';
  const profileLine = user?.primary_niche ? `${profession} • ${user.primary_niche}` : profession;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center justify-between flex-shrink-0 px-4 mb-5">
              <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">Prospect AI</h1>
              <ThemeToggle />
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.name} to={item.href} className={navLinkClasses(isActive)}>
                    <Icon className="mr-3 flex-shrink-0 h-6 w-6" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{user?.name || user?.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{profileLine}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">Prospect AI</h1>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white dark:bg-gray-800 pt-16">
          <nav className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={navLinkClasses(isActive)}
                >
                  <Icon className="mr-4 h-6 w-6" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700 px-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-medium text-gray-700 dark:text-gray-200 truncate">{user?.name || user?.email}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{profileLine}</p>
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <LogOut className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6 px-4 sm:px-6 lg:px-8 pt-20 md:pt-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
