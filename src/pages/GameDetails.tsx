import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Play, Info, List, Calendar } from "lucide-react";

interface Point {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  order_index: number;
}

interface Game {
  id: number;
  title: string;
  description: string;
  created_at: string;
  points?: Point[];
}

export default function GameDetails() {
  const { id } = useParams();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const response = await fetch(`/api/games/${id}`);
        const data = await response.json();
        setGame(data);
      } catch (error) {
        console.error("Failed to fetch game details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGame();
  }, [id]);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-12 bg-stone-200 rounded-xl w-1/2"></div>
      <div className="h-32 bg-stone-200 rounded-2xl"></div>
    </div>;
  }

  if (!game) {
    return <div className="text-center py-12">Gra nie została znaleziona.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">{game.title}</h1>
          <div className="flex items-center gap-2 text-sm text-stone-500 mt-2">
            <Calendar className="w-4 h-4" />
            <span>Dodano: {new Date(game.created_at).toLocaleDateString("pl-PL")}</span>
          </div>
        </div>
        <Link
          to={`/play/${game.id}`}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg transition-all"
        >
          <Play className="w-5 h-5 fill-current" />
          Rozpocznij grę
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-stone-900 font-bold">
            <Info className="w-5 h-5 text-emerald-600" />
            <h2>O grze</h2>
          </div>
          <p className="text-stone-600 leading-relaxed">{game.description || "Brak opisu."}</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-stone-900 font-bold">
            <List className="w-5 h-5 text-emerald-600" />
            <h2>Punkty do odwiedzenia ({game.points?.length || 0})</h2>
          </div>
          <div className="space-y-3">
            {game.points?.map((point, index) => (
              <div key={point.id} className="flex items-start gap-4 p-4 bg-stone-50 rounded-xl border border-stone-100">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-bold text-stone-900">{point.name}</h3>
                  <p className="text-sm text-stone-500">Lokalizacja ukryta do momentu dotarcia do poprzedniego punktu.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
