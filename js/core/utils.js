/* Core helpers, notifications, icons and audio. */

function refreshIcons() {
    if (!window.lucide || typeof window.lucide.createIcons !== 'function') return;
    try {
        window.lucide.createIcons();
    } catch (error) {
        console.warn('Lucide-Icons konnten nicht aktualisiert werden:', error);
    }
}

function showToast(message, type = 'info') {
    const region = document.getElementById('gx-toast-region');
    if (!region) return;
    const toast = document.createElement('div');
    toast.className = `gx-toast${type === 'error' ? ' is-error' : type === 'success' ? ' is-success' : ''}`;
    toast.textContent = String(message || '');
    region.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(() => {
        toast.classList.remove('is-visible');
        setTimeout(() => toast.remove(), 220);
    }, 3200);
}

refreshIcons();

// ------------------------------------------------------------------
// ЗВУКОВОЙ ДВИЖОК (Web Audio API - Синтезированный "техно-клик")
// Если вы дадите ссылку на MP3, мы заменим эту функцию.
// ------------------------------------------------------------------
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function playClickSound() {
    if (!AudioContext) return;
    // Инициализируем контекст по первому клику (политика браузеров)
    if (!audioCtx) {
        try {
            audioCtx = new AudioContext();
        } catch (error) {
            console.warn('AudioContext ist nicht verfügbar:', error);
            return;
        }
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }

    // Создаем короткий "beep" или "click"
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine'; // 'sine', 'square', 'sawtooth', 'triangle'
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // Высота звука
    oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05); // Спад частоты

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Громкость (0.1 - тихо, приятно)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05); // Затухание

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.05);
    oscillator.addEventListener('ended', () => {
        oscillator.disconnect();
        gainNode.disconnect();
    }, { once: true });
}
