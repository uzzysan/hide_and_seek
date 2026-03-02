import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search, Navigation, Calendar } from "lucide-react";

interface Game {
  id: number;
  title: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export default function Catalog() {
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
          alert("Nie udało się pobrać Twojej lokalizacji.");
        }
      );
    } else {
      alert("Twoja przeglądarka nie wspiera geolokalizacji.");
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-stone-900">Katalog Gier</h1>
        <div className="flex gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Szukaj gier..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={getUserLocation}
            className="flex items-center gap-2 bg-white border border-stone-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            <Navigation className="w-4 h-4 text-emerald-600" />
            <span>W pobliżu</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-stone-200 animate-pulse rounded-2xl"></div>
          ))}
        </div>
      ) : filteredGames.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game) => (
            <Link
              key={game.id}
              to={`/game/${game.id}`}
              className="group bg-white border border-stone-200 rounded-2xl p-6 hover:shadow-md hover:border-emerald-200 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <MapPin className="w-5 h-5" />
                </div>
                {userLocation && game.latitude && game.longitude && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    {calculateDistance(userLocation.lat, userLocation.lng, game.latitude, game.longitude).toFixed(1)} km
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2 group-hover:text-emerald-700 transition-colors">
                {game.title}
              </h3>
              <p className="text-stone-600 text-sm line-clamp-2 mb-4">{game.description}</p>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <Calendar className="w-3 h-3" />
                <span>Dodano: {new Date(game.created_at).toLocaleDateString("pl-PL")}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white border border-dashed border-stone-300 rounded-2xl">
          <p className="text-stone-500">Nie znaleziono żadnych gier.</p>
        </div>
      )}
    </div>
  );
}
