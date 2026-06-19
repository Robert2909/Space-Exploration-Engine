export class ErrorManager {
    static init() {
        if (this.initialized) return;

        this.initialized = true;

        // Register global error handlers
        window.onerror = (message, source, lineno, colno, error) => {
            const errStr = `Error: ${message}\nAt: ${source}:${lineno}:${colno}\nTrace: ${error ? error.stack : 'N/A'}`;
            this.showErrorWindow(errStr);
        };

        window.addEventListener('unhandledrejection', (event) => {
            const errStr = `Promise Error: ${event.reason}\nTrace: ${event.reason && event.reason.stack ? event.reason.stack : 'N/A'}`;
            this.showErrorWindow(errStr);
        });
    }

    static showErrorWindow(msg) {
        if (!document.body) {
            window.addEventListener('DOMContentLoaded', () => this.showErrorWindow(msg));
            return;
        }

        let errBox = document.getElementById('fatal-error-box');
        if (!errBox) {
            errBox = document.createElement('div');
            errBox.id = 'fatal-error-box';
            
            const title = document.createElement('h3');
            title.innerText = '⚠️ CRITICAL ERROR DETECTED';
            
            const msgBox = document.createElement('div');
            msgBox.id = 'fatal-error-msg';
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'error-btn error-btn-primary';
            copyBtn.innerText = '📋 Copiar Errores';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(msgBox.innerText);
                copyBtn.innerText = '✔️ Copiado!';
                setTimeout(() => copyBtn.innerText = '📋 Copiar Errores', 2000);
            };

            const closeBtn = document.createElement('button');
            closeBtn.className = 'error-btn error-btn-secondary';
            closeBtn.innerText = 'Cerrar';
            closeBtn.onclick = () => errBox.style.display = 'none';

            errBox.appendChild(title);
            errBox.appendChild(msgBox);
            errBox.appendChild(copyBtn);
            errBox.appendChild(closeBtn);
            document.body.appendChild(errBox);
        }
        
        errBox.style.display = 'block';
        const msgEl = document.getElementById('fatal-error-msg');
        msgEl.innerText += msg + "\n\n";
    }
}
