import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MapPin, Play, Info, List, Calendar, Trash2, Edit, Star, MessageSquare, Trophy, Clock } from "lucide-react";
import { useAppContext } from "../contexts/AppContext";

interface Point {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  order_index: number;
  attachment_url?: string;
}

interface Review {
  id: number;
  user_id: number;
  username: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface Game {
  id: number;
  title: string;
  description: string;
  created_at: string;
  creator_id: number;
  attachment_url?: string;
  points?: Point[];
  reviews?: Review[];
  average_rating?: number;
  reviews_count?: number;
  time_limit_minutes?: number;
}

interface LeaderboardEntry {
  username: string;
  duration_seconds: number;
  started_at: string;
  completed_at: string;
}

export default function GameDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language, user, token } = useAppContext();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

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

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/games/${id}/leaderboard`);
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    }
  };

  useEffect(() => {
    fetchGame();
    fetchLeaderboard();
  }, [id]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmittingReview(true);
    try {
      const response = await fetch(`/api/games/${id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ rating, comment })
      });

      if (response.ok) {
        setComment("");
        fetchGame(); // Refresh game data to show new review
      } else {
        const data = await response.json();
        alert(data.error || t('reviews.error'));
      }
    } catch (error) {
      console.error("Review submit error:", error);
      alert(t('reviews.error'));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('details.delete_confirm'))) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/games/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        navigate("/catalog");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete game");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("An error occurred while deleting the game.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-64 bg-stone-200 dark:bg-stone-800 rounded-3xl"></div>
      <div className="h-12 bg-stone-200 dark:bg-stone-800 rounded-xl w-1/2"></div>
      <div className="h-32 bg-stone-200 dark:bg-stone-800 rounded-2xl"></div>
    </div>;
  }

  if (!game) {
    return <div className="text-center py-12 dark:text-stone-300">{t('details.not_found')}</div>;
  }

  const isCreator = user && game.creator_id === user.id;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Hero Section with Image */}
      <div className="relative h-64 md:h-80 rounded-3xl overflow-hidden shadow-xl">
        {game.attachment_url ? (
          <img 
            src={game.attachment_url} 
            alt={game.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-emerald-600 flex items-center justify-center">
            <MapPin className="w-20 h-20 text-white opacity-20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-8">
          <div className="w-full flex justify-between items-end">
            <div className="text-white">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{game.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{t('details.added')} {new Date(game.created_at).toLocaleDateString(language === 'pl' ? "pl-PL" : "en-US")}</span>
                </div>
                {game.time_limit_minutes && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{game.time_limit_minutes} min</span>
                  </div>
                )}
              </div>
            </div>
            {isCreator && (
              <div className="flex gap-2">
                <Link
                  to={`/edit/${game.id}`}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold backdrop-blur transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  {t('details.edit_game') || 'Edytuj'}
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-red-500/90 hover:bg-red-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold backdrop-blur transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('details.delete_game')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
          <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-4 transition-colors duration-300 shadow-sm">
            <div className="flex items-center gap-2 text-stone-900 dark:text-white font-bold transition-colors duration-300">
              <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
              <h2>{t('details.about')}</h2>
            </div>
            <p className="text-stone-600 dark:text-stone-300 leading-relaxed transition-colors duration-300">{game.description || t('details.no_desc')}</p>
          </div>
        </div>
        <Link
          to={`/play/${game.id}`}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-2xl font-bold shadow-lg transition-all hover:-translate-y-1 hover:shadow-emerald-500/20"
        >
          <Play className="w-6 h-6 fill-current" />
          {t('details.start_btn')}
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-stone-900 dark:text-white font-bold transition-colors duration-300">
          <List className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
          <h2>{t('details.points_to_visit')} ({game.points?.length || 0})</h2>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {game.points?.map((point, index) => (
            <div key={point.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 transition-colors duration-300 shadow-sm">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold flex-shrink-0 transition-colors duration-300">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-white transition-colors duration-300">{point.name}</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 transition-colors duration-300">{t('details.location_hidden')}</p>
                </div>
              </div>
              {point.attachment_url && (
                <div className="w-full md:w-24 h-16 rounded-xl overflow-hidden border border-stone-100 dark:border-stone-700">
                  <img 
                    src={point.attachment_url} 
                    alt={point.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="space-y-6 pt-8 border-t border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2 text-stone-900 dark:text-white font-bold">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h2>{t('leaderboard.title') || 'Tablica wyników'}</h2>
        </div>
        
        <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden shadow-sm">
          {leaderboard.length > 0 ? (
            <div className="divide-y divide-stone-100 dark:divide-stone-700/50">
              {leaderboard.map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-4 hover:bg-stone-50 dark:hover:bg-stone-700/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500' :
                      index === 1 ? 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300' :
                      index === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-500' :
                      'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-bold text-stone-900 dark:text-white">{entry.username}</span>
                  </div>
                  <div className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                    {formatDuration(entry.duration_seconds)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-stone-500 dark:text-stone-400">
              {t('leaderboard.no_records') || 'Brak wyników. Zagraj jako pierwszy!'}
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="space-y-6 pt-8 border-t border-stone-200 dark:border-stone-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-stone-900 dark:text-white font-bold">
            <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
            <h2>{t('reviews.title') || 'Opinie i oceny'}</h2>
          </div>
          {game.reviews_count ? (
            <div className="flex items-center gap-1 text-amber-500 font-bold">
              <Star className="w-5 h-5 fill-current" />
              <span>{game.average_rating?.toFixed(1)}</span>
              <span className="text-stone-500 dark:text-stone-400 font-normal text-sm ml-1">
                ({game.reviews_count})
              </span>
            </div>
          ) : null}
        </div>

        {user ? (
          <form onSubmit={handleReviewSubmit} className="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-4 shadow-sm">
            <h3 className="font-bold text-stone-900 dark:text-white">{t('reviews.add_review') || 'Dodaj opinię'}</h3>
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                {t('reviews.rating') || 'Ocena'}
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-1 transition-colors ${rating >= star ? 'text-amber-500' : 'text-stone-300 dark:text-stone-600'}`}
                  >
                    <Star className={`w-8 h-8 ${rating >= star ? 'fill-current' : ''}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                {t('reviews.comment') || 'Komentarz (opcjonalnie)'}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition-colors min-h-[100px]"
                placeholder={t('reviews.comment') || 'Komentarz'}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmittingReview}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-400 text-white px-6 py-2 rounded-xl font-bold transition-colors"
            >
              {t('reviews.submit') || 'Opublikuj'}
            </button>
          </form>
        ) : (
          <div className="bg-stone-100 dark:bg-stone-800/50 p-6 rounded-2xl text-center text-stone-600 dark:text-stone-400">
            <Link to="/login" className="text-emerald-600 dark:text-emerald-500 font-bold hover:underline">
              {t('reviews.login_to_review') || 'Zaloguj się, aby dodać opinię.'}
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {game.reviews && game.reviews.length > 0 ? (
            game.reviews.map((review) => (
              <div key={review.id} className="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-stone-900 dark:text-white">{review.username}</div>
                  <div className="flex items-center gap-3">
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-stone-300 dark:text-stone-600'}`} />
                      ))}
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">
                      {new Date(review.created_at).toLocaleDateString(language === 'pl' ? "pl-PL" : "en-US")}
                    </div>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-stone-600 dark:text-stone-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {review.comment}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-stone-500 dark:text-stone-400">
              {t('reviews.no_reviews') || 'Brak opinii. Bądź pierwszy!'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
