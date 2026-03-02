export default function Register() {
  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded-2xl shadow-sm border border-stone-200">
      <h2 className="text-2xl font-bold text-stone-900 mb-6 text-center">Zarejestruj się</h2>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Nazwa użytkownika</label>
          <input type="text" className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Hasło</label>
          <input type="password" className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
        </div>
        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
          Utwórz konto
        </button>
      </form>
    </div>
  );
}
