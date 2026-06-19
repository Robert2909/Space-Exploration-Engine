import { ErrorManager } from './ui/ErrorManager.js';
import { Engine } from './core/Engine.js';

window.addEventListener('load', () => {
    ErrorManager.init();
    new Engine();
});
