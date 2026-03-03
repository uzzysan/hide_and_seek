import { Link } from "react-router-dom";
import { MapPin, PlusCircle, Compass } from "lucide-react";
import { useAppContext } from "../contexts/AppContext";

export default function Home() {
  const { t } = useAppContext();

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4 shadow-sm">
        <Compass className="w-12 h-12" />
      </div>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-stone-900 dark:text-white">
        {t('home.title')} <span className="text-emerald-600 dark:text-emerald-400">{t('home.title_highlight')}</span>
      </h1>
      <p className="text-lg text-stone-600 dark:text-stone-300 max-w-2xl leading-relaxed">
        {t('home.subtitle')}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 pt-8 w-full sm:w-auto">
        <Link 
          to="/catalog" 
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <MapPin className="w-5 h-5" />
          {t('home.catalog_btn')}
        </Link>
        <Link 
          to="/create" 
          className="flex items-center justify-center gap-2 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 border border-stone-200 dark:border-stone-700 px-8 py-4 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <PlusCircle className="w-5 h-5" />
          {t('home.create_btn')}
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-left w-full max-w-4xl">
        <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-700">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4">
            <PlusCircle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-lg text-stone-900 dark:text-white mb-2">{t('home.features.create.title')}</h3>
          <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed">{t('home.features.create.desc')}</p>
        </div>
        <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-700">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-lg text-stone-900 dark:text-white mb-2">{t('home.features.play.title')}</h3>
          <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed">{t('home.features.play.desc')}</p>
        </div>
        <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-700">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-lg text-stone-900 dark:text-white mb-2">{t('home.features.community.title')}</h3>
          <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed">{t('home.features.community.desc')}</p>
        </div>
      </div>
    </div>
  );
}
