import { Outlet, Link } from "react-router-dom";
import { MapPin, Compass, PlusCircle, LogIn, User } from "lucide-react";

export default function Layout() {
  return (
    <div className="min-h-screen bg-stone-100 font-sans text-stone-900 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-emerald-700">
            <Compass className="w-6 h-6" />
            <span>Wirtualne Podchody</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/catalog" className="flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-emerald-600 transition-colors">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Katalog</span>
            </Link>
            <Link to="/create" className="flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-emerald-600 transition-colors">
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Utwórz</span>
            </Link>
            <div className="w-px h-6 bg-stone-200 mx-2"></div>
            <Link to="/login" className="flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-emerald-600 transition-colors">
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Zaloguj</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
