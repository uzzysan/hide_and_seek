import { Outlet, Link } from "react-router-dom";
import { MapPin, Compass, PlusCircle, LogIn, LogOut, Sun, Moon, Globe, User } from "lucide-react";
import { useAppContext } from "../contexts/AppContext";

export default function Layout() {
  const { theme, toggleTheme, language, toggleLanguage, t, user, logout } = useAppContext();

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-900 font-sans text-stone-900 dark:text-stone-100 flex flex-col transition-colors duration-300">
      <header className="bg-white dark:bg-stone-800 shadow-sm sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-emerald-700 dark:text-emerald-500">
            <Compass className="w-6 h-6" />
            <span className="hidden sm:inline">{t('nav.title')}</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/catalog" className="flex items-center gap-1 text-sm font-medium text-stone-600 dark:text-stone-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">{t('nav.catalog')}</span>
            </Link>
            <Link to="/create" className="flex items-center gap-1 text-sm font-medium text-stone-600 dark:text-stone-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{t('nav.create')}</span>
            </Link>
            <div className="w-px h-6 bg-stone-200 dark:bg-stone-700 mx-2"></div>
            
            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/profile" className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{user.username}</span>
                </Link>
                <button 
                  onClick={logout}
                  className="flex items-center gap-1 text-sm font-medium text-stone-600 dark:text-stone-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('nav.logout')}</span>
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-1 text-sm font-medium text-stone-600 dark:text-stone-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">{t('nav.login')}</span>
              </Link>
            )}
            
            <div className="flex items-center gap-2 ml-2">
              <button 
                onClick={toggleLanguage}
                className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors flex items-center gap-1 text-xs font-bold uppercase"
                title="Toggle Language"
              >
                <Globe className="w-4 h-4" />
                {language}
              </button>
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
                title="Toggle Theme"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>
      <footer className="bg-white dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700 py-6 mt-auto transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {t('footer.designed_with')}
          </p>
          <a 
            href="https://buycoffee.to/uzzy" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-medium text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors flex items-center gap-2"
          >
            ☕ {t('footer.support')}
          </a>
        </div>
      </footer>
    </div>
  );
}
