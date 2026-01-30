/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Anotacoes from './pages/Anotacoes';
import Biblioteca from './pages/Biblioteca';
import ChatIA from './pages/ChatIA';
import Dashboard from './pages/Dashboard';
import Dicas from './pages/Dicas';
import Editais from './pages/Editais';
import EstudarTopico from './pages/EstudarTopico';
import Flashcards from './pages/Flashcards';
import Home from './pages/Home';
import Materias from './pages/Materias';
import PlanejamentoEstudo from './pages/PlanejamentoEstudo';
import Pomodoro from './pages/Pomodoro';
import Questoes from './pages/Questoes';
import Redacoes from './pages/Redacoes';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Anotacoes": Anotacoes,
    "Biblioteca": Biblioteca,
    "ChatIA": ChatIA,
    "Dashboard": Dashboard,
    "Dicas": Dicas,
    "Editais": Editais,
    "EstudarTopico": EstudarTopico,
    "Flashcards": Flashcards,
    "Home": Home,
    "Materias": Materias,
    "PlanejamentoEstudo": PlanejamentoEstudo,
    "Pomodoro": Pomodoro,
    "Questoes": Questoes,
    "Redacoes": Redacoes,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
