(function() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) return;

    let deferredPrompt;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // Design tokens to match the app
    const colors = {
        primary: '#1a365d',
        accent: '#f59e0b',
        background: '#ffffff',
        text: '#1a202c',
        muted: '#718096'
    };

    function createInstallUI() {
        const btn = document.getElementById('pwa-install-btn');
        if (!btn) return;

        // Ensure button is visible but styled
        btn.classList.remove('hidden');
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '0.5rem';
        
        btn.addEventListener('click', async () => {
            if (isIOS) {
                showIOSModal();
            } else if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    btn.classList.add('hidden');
                    btn.style.display = 'none';
                }
                deferredPrompt = null;
            } else {
                alert('כדי להתקין: לחץ על 3 הנקודות בדפדפן ובחר "התקן אפליקציה" או "הוסף למסך הבית"');
            }
        });
    }

    function showIOSModal() {
        // Create modal element
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.zIndex = '10000';
        modal.style.backgroundColor = 'rgba(0,0,0,0.6)';
        modal.style.backdropFilter = 'blur(4px)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'flex-end';
        modal.style.justifyContent = 'center';
        modal.style.padding = '1rem';
        modal.style.animation = 'fadeIn 0.3s ease-out';

        modal.innerHTML = `
            <div style="background: white; width: 100%; max-width: 400px; border-radius: 24px; padding: 24px; position: relative; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); direction: rtl; font-family: 'Heebo', sans-serif;">
                <button id="close-pwa-modal" style="position: absolute; top: 16px; left: 16px; background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">✕</button>
                
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="background: #eff6ff; width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #1e40af;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                    </div>
                    <h3 style="margin: 0 0 8px; font-weight: 900; color: #1a365d;">התקנה ב-iPhone</h3>
                    <p style="margin: 0; color: #64748b; font-size: 14px;">בצע את השלבים הבאים כדי להוסיף את האפליקציה למסך הבית:</p>
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
                    <div style="background: #f8fafc; padding: 12px; border-radius: 16px; display: flex; align-items: center; gap: 12px;">
                        <div style="background: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); color: #3b82f6;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                        </div>
                        <p style="margin: 0; font-weight: 700; font-size: 14px;">1. לחץ על כפתור ה-'שתף' בדפדפן ספארי</p>
                    </div>
                    <div style="background: #f8fafc; padding: 12px; border-radius: 16px; display: flex; align-items: center; gap: 12px;">
                        <div style="background: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        </div>
                        <p style="margin: 0; font-weight: 700; font-size: 14px;">2. בחר ב-'הוסף למסך הבית'</p>
                    </div>
                </div>

                <button id="close-modal-btn" style="width: 100%; padding: 16px; background: #1a365d; color: white; border: none; border-radius: 16px; font-weight: 900; cursor: pointer; font-family: inherit;">הבנתי, תודה!</button>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => {
            modal.style.animation = 'fadeOut 0.2s ease-in forwards';
            setTimeout(() => modal.remove(), 200);
        };

        modal.querySelector('#close-pwa-modal').onclick = closeModal;
        modal.querySelector('#close-modal-btn').onclick = closeModal;
    }

    // Styles for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        #pwa-install-btn:not(.hidden) { animation: slideUp 0.5s ease-out; }
    `;
    document.head.appendChild(style);

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        createInstallUI();
    });

    // Also show after 3 seconds if not installed (persistent option)
    setTimeout(() => {
        if (!isStandalone) {
            createInstallUI();
        }
    }, 3000);

})();
