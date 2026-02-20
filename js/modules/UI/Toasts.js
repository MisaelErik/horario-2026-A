export const Toasts = {
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-xl text-white font-bold shadow-xl transform translate-y-20 opacity-0 transition-all duration-300 z-50 flex items-center gap-2 ${type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-red-500'}`;
        toast.innerHTML = `
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-20', 'opacity-0');
        });

        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};
