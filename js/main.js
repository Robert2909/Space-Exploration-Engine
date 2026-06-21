import { ErrorManager } from './ui/ErrorManager.js';
import { WindowManager } from './ui/WindowManager.js';
import { Engine } from './core/Engine.js';

window.addEventListener('load', () => {
    ErrorManager.init();
    WindowManager.init();
    new Engine();
});
