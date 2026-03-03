import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Map, Play, CheckCircle, Trophy, Compass, MapPin } from "lucide-react";
import { useAppContext } from "../contexts/AppContext";

interface Game {
  id: number;
  title: string;
  description: string;
  created_at: string;
  attachment_url?: string;
}

interface Session {
  id: number;
  game_id: number;
  title: string;
  attachment_url?: string;
  started_at: string;
  completed_at: string | null;
  total_points: number;
  points_found: number;
}

export default function Profile() {
  const { t, user, token } = useAppContext();
  const navigate = useNavigate();
  const [createdGames, setCreatedGames] = useState<Game[]>([]);
  const [playedSessions, setPlayedSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'played' | 'created'>('played');

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchProfileData = async () => {
      try {
        const [gamesRes, sessionsRes] = await Promise.all([
          fetch("/api/me/games", { headers: { "Authorization": `Bearer ${token}` } }),
          fetch("/api/me/sessions", { headers: { "Authorization": `Bearer ${token}` } })
        ]);

        if (gamesRes.ok && sessionsRes.ok) {
          const gamesData = await gamesRes.json();
          const sessionsData = await sessionsRes.json();
          setCreatedGames(gamesData);
          setPlayedSessions(sessionsData);
        }
      } catch (error) {
        console.error("Failed to fetch profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [token, navigate]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
        <div className="h-32 bg-stone-200 dark:bg-stone-800 rounded-3xl"></div>
        <div className="h-64 bg-stone-200 dark:bg-stone-800 rounded-3xl"></div>
      </div>
    );
  }

  const completedSessions = playedSessions.filter(s => s.completed_at).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Profile Header */}
      <div className="bg-white dark:bg-stone-800 p-8 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm flex flex-col md:flex-row items-center gap-6 transition-colors duration-300">
        <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-12 h-12" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white mb-2">{user?.username}</h1>
          <p className="text-stone-500 dark:text-stone-400">{t('profile.title')}</p>
        </div>
        
        {/* Stats */}
        <div className="flex gap-4 w-full md:w-auto mt-4 md:mt-0">
          <div className="flex-1 md:flex-none bg-stone-50 dark:bg-stone-900 p-4 rounded-2xl text-center border border-stone-100 dark:border-stone-700">
            <div className="text-2xl font-black text-stone-900 dark:text-white">{playedSessions.length}</div>
            <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mt-1">{t('profile.total_played')}</div>
          </div>
          <div className="flex-1 md:flex-none bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl text-center border border-emerald-100 dark:border-emerald-900/30">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{completedSessions}</div>
            <div className="text-xs font-bold text-emerald-600/70 dark:text-emerald-500/70 uppercase tracking-wider mt-1">{t('profile.total_completed')}</div>
          </div>
          <div className="flex-1 md:flex-none bg-stone-50 dark:bg-stone-900 p-4 rounded-2xl text-center border border-stone-100 dark:border-stone-700">
            <div className="text-2xl font-black text-stone-900 dark:text-white">{createdGames.length}</div>
            <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mt-1">{t('profile.total_created')}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-stone-200/50 dark:bg-stone-800/50 rounded-2xl w-fit mx-auto md:mx-0">
        <button 
          onClick={() => setActiveTab('played')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'played' ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'}`}
        >
          {t('profile.played_games')}
        </button>
        <button 
          onClick={() => setActiveTab('created')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'created' ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'}`}
        >
          {t('profile.created_games')}
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'played' && (
          <>
            {playedSessions.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 border-dashed">
                <Compass className="w-12 h-12 text-stone-300 dark:text-stone-600 mx-auto mb-4" />
                <p className="text-stone-500 dark:text-stone-400">{t('profile.no_played')}</p>
                <Link to="/catalog" className="inline-block mt-4 text-emerald-600 dark:text-emerald-500 font-bold hover:underline">
                  {t('home.catalog_btn')}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playedSessions.map(session => (
                  <Link 
                    key={session.id} 
                    to={`/play/${session.game_id}`}
                    className="bg-white dark:bg-stone-800 p-5 rounded-3xl border border-stone-200 dark:border-stone-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all hover:shadow-lg group flex gap-4"
                  >
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-700 flex-shrink-0">
                      {session.attachment_url ? (
                        <img src={session.attachment_url} alt={session.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300 dark:text-stone-500">
                          <MapPin className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className="font-bold text-stone-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">{session.title}</h3>
                      
                      {session.completed_at ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 w-fit px-2.5 py-1 rounded-lg">
                          <Trophy className="w-3.5 h-3.5" />
                          {t('profile.completed')}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-medium text-stone-500 dark:text-stone-400">
                            <span>{t('profile.progress')}</span>
                            <span>{session.points_found} / {session.total_points}</span>
                          </div>
                          <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full" 
                              style={{ width: `${Math.max(5, (session.points_found / Math.max(1, session.total_points)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'created' && (
          <>
            {createdGames.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 border-dashed">
                <Map className="w-12 h-12 text-stone-300 dark:text-stone-600 mx-auto mb-4" />
                <p className="text-stone-500 dark:text-stone-400">{t('profile.no_created')}</p>
                <Link to="/create" className="inline-block mt-4 text-emerald-600 dark:text-emerald-500 font-bold hover:underline">
                  {t('home.create_btn')}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {createdGames.map(game => (
                  <Link 
                    key={game.id} 
                    to={`/game/${game.id}`}
                    className="bg-white dark:bg-stone-800 p-5 rounded-3xl border border-stone-200 dark:border-stone-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all hover:shadow-lg group flex gap-4"
                  >
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-700 flex-shrink-0">
                      {game.attachment_url ? (
                        <img src={game.attachment_url} alt={game.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300 dark:text-stone-500">
                          <MapPin className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className="font-bold text-stone-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">{game.title}</h3>
                      <p className="text-sm text-stone-500 dark:text-stone-400 line-clamp-2">{game.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
