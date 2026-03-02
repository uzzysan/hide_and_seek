import { Link } from "react-router-dom";
import { MapPin, PlusCircle, Compass } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-8">
      <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
        <Compass className="w-12 h-12" />
      </div>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-stone-900">
        Odkrywaj świat przez <span className="text-emerald-600">Wirtualne Podchody</span>
      </h1>
      <p className="text-lg text-stone-600 max-w-2xl">
        Twórz własne gry terenowe, ukrywaj punkty na mapie i rzucaj wyzwania innym. 
        Lub dołącz do istniejących gier w Twojej okolicy i rozpocznij przygodę!
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 pt-8">
        <Link 
          to="/catalog" 
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-semibold transition-colors shadow-sm"
        >
          <MapPin className="w-5 h-5" />
          Szukaj gier w okolicy
        </Link>
        <Link 
          to="/create" 
          className="flex items-center justify-center gap-2 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 px-8 py-4 rounded-xl font-semibold transition-colors shadow-sm"
        >
          <PlusCircle className="w-5 h-5" />
          Utwórz nową grę
        </Link>
      </div>
    </div>
  );
}
