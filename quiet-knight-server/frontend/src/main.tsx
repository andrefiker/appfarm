import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css'; import './game.css';
import './modern.css';
import './animal-kingdom.css';
import './studio.css';
import './reference-table.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
