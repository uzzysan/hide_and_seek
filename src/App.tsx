import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Catalog from "./pages/Catalog";
import CreateGame from "./pages/CreateGame";
import GameDetails from "./pages/GameDetails";
import PlayGame from "./pages/PlayGame";
import Profile from "./pages/Profile";
import EditGame from "./pages/EditGame";
import { AppProvider } from "./contexts/AppContext";

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="create" element={<CreateGame />} />
            <Route path="edit/:id" element={<EditGame />} />
            <Route path="game/:id" element={<GameDetails />} />
            <Route path="play/:id" element={<PlayGame />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </Router>
    </AppProvider>
  );
}
