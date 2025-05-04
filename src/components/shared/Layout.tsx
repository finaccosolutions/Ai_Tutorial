import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap as Graduation, User, Settings, LogOut, Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  // Get user's email and create a display name
  const userEmail = user?.email || '';
  const displayName = userEmail.split('@')[0];

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 py-3">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <Graduation className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-primary-800">AI Tutor</span>
          </Link>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden text-neutral-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
          
          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/dashboard" 
              className={`font-medium ${location.pathname === '/dashboard' 
                ? 'text-primary-700' 
                : 'text-neutral-600 hover:text-primary-600'}`}
            >
              Dashboard
            </Link>
            <Link 
              to="/settings" 
              className={`font-medium ${location.pathname === '/settings' 
                ? 'text-primary-700' 
                : 'text-neutral-600 hover:text-primary-600'}`}
            >
              Settings
            </Link>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 focus:outline-none"
              >
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-700" />
                </div>
                <span className="text-sm font-medium text-neutral-700">{displayName}</span>
                <ChevronDown className={`h-4 w-4 text-neutral-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 border border-neutral-200"
                  >
                    <div className="px-4 py-2 border-b border-neutral-200">
                      <p className="text-sm font-medium text-neutral-900">{displayName}</p>
                      <p className="text-xs text-neutral-500">{userEmail}</p>
                    </div>
                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Account Settings
                    </Link>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="block w-full px-4 py-2 text-sm text-error-600 hover:bg-neutral-50 flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
        </div>
      </header>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <motion.div 
          className="md:hidden bg-white border-b border-neutral-200 shadow-sm"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <nav className="container mx-auto p-4 flex flex-col">
            <Link 
              to="/dashboard" 
              className={`py-2 font-medium ${location.pathname === '/dashboard' 
                ? 'text-primary-700' 
                : 'text-neutral-600'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              to="/settings" 
              className={`py-2 font-medium ${location.pathname === '/settings' 
                ? 'text-primary-700' 
                : 'text-neutral-600'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Settings
            </Link>
            <div className="mt-3 pt-3 border-t border-neutral-200">
              <div className="flex items-center space-x-2 mb-3">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-900">{displayName}</p>
                  <p className="text-xs text-neutral-500">{userEmail}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center text-error-600 hover:text-error-700 py-2"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Sign Out
              </button>
            </div>
          </nav>
        </motion.div>
      )}
      
      {/* Main content */}
      <main className="flex-grow">
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-neutral-500">
          <p>© {new Date().getFullYear()} AI Tutor. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;