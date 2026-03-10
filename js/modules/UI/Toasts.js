/*
© 2026 Misael Erik. Todos los derechos reservados.
El uso, modificación, distribución o copia no autorizada de este código o esta herramienta se encuentra terminantemente prohibido sin el previo y explícito consentimiento del autor original.
*/
export const Toasts = {
    showToast(message, type = 'success', isImportant = false) {
        const isMobile = window.innerWidth <= 768;
        
        const toast = document.createElement('div');
        
        // Estilo base: Glassmorphism y bordes suaves
        const baseClasses = "fixed z-[200] flex items-center gap-2 font-medium shadow-2xl transition-all duration-500 backdrop-blur-md border";
        
        // Diferenciación Móvil vs Desktop
        // En móvil usamos una cápsula flotante arriba (tipo Dynamic Island)
        const deviceClasses = isMobile 
            ? "top-6 left-1/2 -translate-x-1/2 w-auto min-w-[200px] max-w-[90vw] px-4 py-2.5 rounded-full text-sm -translate-y-12 opacity-0" 
            : "bottom-8 right-8 px-6 py-3.5 rounded-2xl text-base translate-y-10 opacity-0";

        // Colores y bordes (Sutiles y premium con transparencia)
        let typeClasses = "";
        if (type === 'success') {
            typeClasses = "bg-emerald-500/90 dark:bg-emerald-600/90 text-white border-emerald-400/30";
        } else if (type === 'info') {
            typeClasses = "bg-indigo-600/90 dark:bg-indigo-500/90 text-white border-indigo-400/30";
        } else {
            typeClasses = "bg-red-500/90 dark:bg-red-600/90 text-white border-red-400/30";
        }

        toast.className = `${baseClasses} ${deviceClasses} ${typeClasses}`;
        
        // Contenido con icono sutil representado por un carácter
        const iconSymbol = type === 'success' ? '✓' : type === 'info' ? 'ℹ' : '⚠';
        toast.innerHTML = `<span class="opacity-80 font-black">${iconSymbol}</span> <span class="tracking-tight">${message}</span>`;
        
        document.body.appendChild(toast);

        // Activación de la animación de entrada
        requestAnimationFrame(() => {
            if (isMobile) {
                toast.classList.remove('-translate-y-12', 'opacity-0');
                toast.classList.add('translate-y-0');
            } else {
                toast.classList.remove('translate-y-10', 'opacity-0');
                toast.classList.add('translate-y-0');
            }
        });

        const duration = isImportant ? 4500 : 3000;

        // Limpieza automática
        setTimeout(() => {
            if (isMobile) {
                toast.classList.add('-translate-y-12', 'opacity-0');
            } else {
                toast.classList.add('translate-y-10', 'opacity-0');
            }
            setTimeout(() => toast.remove(), 500);
        }, duration);
    }
};
