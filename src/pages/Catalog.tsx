import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search, Navigation, Calendar, Star } from "lucide-react";
import { useAppContext } from "../contexts/AppContext";

interface Game {
  id: number;
  title: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  attachment_url?: string;
  created_at: string;
  average_rating: number;
  reviews_count: number;
}

export default function Catalog() {
  const { t, language } = useAppContext();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await fetch("/api/games");
      const data = await response.json();
      setGames(data);
    } catch (error) {
      console.error("Failed to fetch games:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          alert(language === 'pl' ? "Nie udało się pobrać Twojej lokalizacji." : "Failed to get your location.");
        }
      );
    } else {
      alert(language === 'pl' ? "Twoja przeglądarka nie wspiera geolokalizacji." : "Your browser does not support geolocation.");
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg: number) => deg * (Math.PI / 180);

  const filteredGames = games
    .filter((game) => game.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (userLocation && a.latitude && a.longitude && b.latitude && b.longitude) {
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
        return distA - distB;
      }
      return 0;
    });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">{t('catalog.title')}</h1>
          <p className="text-stone-600 dark:text-stone-400 mt-1">{t('catalog.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
            <input
              type="text"
              placeholder={t('catalog.search_placeholder')}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={getUserLocation}
            className="flex items-center gap-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 transition-colors shadow-sm"
            title="Sort by distance"
          >
            <Navigation className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            <span className="hidden sm:inline">{t('catalog.nearby')}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-stone-200 dark:bg-stone-800 animate-pulse rounded-2xl"></div>
          ))}
        </div>
      ) : filteredGames.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredGames.map((game) => (
            <Link
              key={game.id}
              to={`/game/${game.id}`}
              className="group bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-3xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
            >
              <div className="h-48 bg-stone-100 dark:bg-stone-900 relative overflow-hidden">
                {game.attachment_url ? (
                  <img 
                    src={game.attachment_url} 
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300 dark:text-stone-700">
                    <MapPin className="w-12 h-12 opacity-20" />
                  </div>
                )}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {userLocation && game.latitude && game.longitude && (
                    <span className="bg-white/90 dark:bg-stone-800/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 shadow-sm flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      {calculateDistance(userLocation.lat, userLocation.lng, game.latitude, game.longitude).toFixed(1)} km
                    </span>
                  )}
                  {game.reviews_count > 0 && (
                    <span className="bg-white/90 dark:bg-stone-800/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-amber-500 shadow-sm flex items-center gap-1 w-fit">
                      <Star className="w-3 h-3 fill-current" />
                      {game.average_rating.toFixed(1)} ({game.reviews_count})
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {game.title}
                </h3>
                <p className="text-stone-600 dark:text-stone-400 text-sm line-clamp-2 mb-6 flex-1">
                  {game.description || (language === 'pl' ? "Brak opisu." : "No description.")}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-700">
                  <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(game.created_at).toLocaleDateString(language === 'pl' ? "pl-PL" : "en-US")}</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-500 group-hover:translate-x-1 transition-transform">
                    {t('catalog.play_btn')} &rarr;
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-stone-800 border border-dashed border-stone-300 dark:border-stone-700 rounded-3xl">
          <p className="text-stone-500 dark:text-stone-400">{t('catalog.no_games')}</p>
        </div>
      )}
    </div>
  );
}
