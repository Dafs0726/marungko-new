// Navigation functions for landing page

const GLOBAL_BGM_ENABLED_KEY = 'marungko_bgm_enabled';
const GLOBAL_BGM_TIME_KEY = 'marungko_bgm_time';
const GLOBAL_BGM_AUDIO_ID = 'marungko-global-bgm';
const GLOBAL_BGM_TOGGLE_ID = 'marungko-bgm-toggle';
const GLOBAL_BGM_CONTROLS_ID = 'marungko-bgm-controls';
const GLOBAL_BGM_VOLUME_ID = 'marungko-bgm-volume';
const GLOBAL_BGM_VOLUME_KEY = 'marungko_bgm_volume';
const GLOBAL_BGM_VOLUME = 0.22;
const GLOBAL_BGM_FILES = [
    'Kids Happy Background Music For Videos.mp3',
    'kids happy music bg.mp3',
    'kids happy music bg.m4a',
    'Kids happy music bg.mp3',
    'Kids happy music bg.m4a',
    'kids_happy_music_bg.mp3',
    'kids-happy-music-bg.mp3',
    'AKO KAYA.m4a'
];

function navigateToM1() {
    // Add a small animation before navigation
    document.body.style.opacity = '0.8';
    setTimeout(() => {
        window.location.href = './M1/main.html';
    }, 200);
}

function navigateToM3() {
    // Add a small animation before navigation
    document.body.style.opacity = '0.8';
    setTimeout(() => {
        window.location.href = './M3/dafs.html';
    }, 200);
}

// Add keyboard navigation
document.addEventListener('DOMContentLoaded', function() {
    setupGlobalBackgroundMusic('./audio/');

    document.addEventListener('keydown', function(e) {
        if (e.key === '1') {
            navigateToM1();
        } else if (e.key === '3') {
            navigateToM3();
        }
    });

    // Add hover sound effects if desired (optional)
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            // Optional: add subtle visual feedback
            this.style.filter = 'brightness(1.1)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.filter = 'brightness(1)';
        });
    });
});

function setupGlobalBackgroundMusic(baseAudioPath) {
    if (document.getElementById(GLOBAL_BGM_CONTROLS_ID) || document.getElementById(GLOBAL_BGM_TOGGLE_ID)) return;

    const clampVolume = (value) => Math.min(1, Math.max(0, value));
    const readSavedVolume = () => {
        const savedVolume = parseFloat(localStorage.getItem(GLOBAL_BGM_VOLUME_KEY) || '');
        if (Number.isFinite(savedVolume)) {
            return clampVolume(savedVolume);
        }
        return GLOBAL_BGM_VOLUME;
    };

    const bgAudio = document.createElement('audio');
    bgAudio.id = GLOBAL_BGM_AUDIO_ID;
    bgAudio.dataset.bgm = 'true';
    bgAudio.loop = true;
    bgAudio.preload = 'auto';
    bgAudio.volume = readSavedVolume();
    document.body.appendChild(bgAudio);

    const controls = document.createElement('div');
    controls.id = GLOBAL_BGM_CONTROLS_ID;
    controls.className = 'bgm-controls';

    const toggleBtn = document.createElement('button');
    toggleBtn.id = GLOBAL_BGM_TOGGLE_ID;
    toggleBtn.className = 'bgm-toggle-btn';
    toggleBtn.type = 'button';
    toggleBtn.innerHTML = '<span class="bgm-toggle-icon" aria-hidden="true"></span>';
    controls.appendChild(toggleBtn);

    const volumeSlider = document.createElement('input');
    volumeSlider.id = GLOBAL_BGM_VOLUME_ID;
    volumeSlider.className = 'bgm-volume-slider';
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '100';
    volumeSlider.step = '1';
    volumeSlider.value = String(Math.round(bgAudio.volume * 100));
    volumeSlider.setAttribute('aria-label', 'Background music volume');
    volumeSlider.setAttribute('title', 'Background music volume');
    controls.appendChild(volumeSlider);

    document.body.appendChild(controls);

    const candidates = GLOBAL_BGM_FILES.map(file => encodeURI(baseAudioPath + file));
    let sourceIndex = 0;
    let saveTick = 0;
    let unlockWaiting = false;

    const isEnabled = () => localStorage.getItem(GLOBAL_BGM_ENABLED_KEY) !== '0';

    const persistTime = () => {
        if (!Number.isFinite(bgAudio.currentTime)) return;
        localStorage.setItem(GLOBAL_BGM_TIME_KEY, String(bgAudio.currentTime));
    };

    const persistVolume = () => {
        localStorage.setItem(GLOBAL_BGM_VOLUME_KEY, String(bgAudio.volume));
    };

    const refreshToggle = () => {
        const enabled = isEnabled();
        const mutedVisual = !enabled || bgAudio.volume <= 0.001;
        toggleBtn.classList.toggle('is-muted', mutedVisual);
        toggleBtn.setAttribute('aria-label', enabled ? 'Mute background music' : 'Play background music');
        toggleBtn.setAttribute('title', enabled ? 'Mute background music' : 'Play background music');
        volumeSlider.setAttribute('aria-valuetext', `${Math.round(bgAudio.volume * 100)}%`);
    };

    const setVolume = (nextVolume) => {
        const safeVolume = clampVolume(nextVolume);
        bgAudio.volume = safeVolume;
        volumeSlider.value = String(Math.round(safeVolume * 100));
        persistVolume();
        refreshToggle();
    };

    const queueUnlock = () => {
        if (unlockWaiting) return;
        unlockWaiting = true;

        const unlock = () => {
            unlockWaiting = false;
            playBackgroundMusic();
        };

        window.addEventListener('pointerdown', unlock, { once: true });
        window.addEventListener('touchstart', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });
    };

    const playBackgroundMusic = () => {
        if (!isEnabled() || !bgAudio.src) return;

        bgAudio.muted = true;
        const playPromise = bgAudio.play();

        if (playPromise && typeof playPromise.then === 'function') {
            playPromise
                .then(() => {
                    if (!isEnabled()) {
                        bgAudio.pause();
                        return;
                    }
                    bgAudio.muted = false;
                })
                .catch(() => {
                    queueUnlock();
                });
        } else {
            bgAudio.muted = false;
        }
    };

    const trySource = (index) => {
        if (index >= candidates.length) {
            console.warn('Background music file not found.');
            return;
        }

        sourceIndex = index;
        bgAudio.src = candidates[sourceIndex];
        bgAudio.load();
    };

    bgAudio.addEventListener('error', () => {
        if (sourceIndex + 1 < candidates.length) {
            trySource(sourceIndex + 1);
            return;
        }
        console.warn('Unable to load any background music source.');
    });

    bgAudio.addEventListener('loadedmetadata', () => {
        const savedTime = parseFloat(localStorage.getItem(GLOBAL_BGM_TIME_KEY) || '0');
        if (Number.isFinite(savedTime) && savedTime > 0 && savedTime < Math.max(bgAudio.duration - 0.5, 0)) {
            bgAudio.currentTime = savedTime;
        }
    });

    bgAudio.addEventListener('canplay', () => {
        playBackgroundMusic();
    });

    bgAudio.addEventListener('timeupdate', () => {
        const now = Date.now();
        if (now - saveTick >= 4000) {
            saveTick = now;
            persistTime();
        }
    });

    window.addEventListener('pagehide', persistTime);
    window.addEventListener('pagehide', persistVolume);

    toggleBtn.addEventListener('click', () => {
        const nextEnabled = !isEnabled();
        localStorage.setItem(GLOBAL_BGM_ENABLED_KEY, nextEnabled ? '1' : '0');
        refreshToggle();

        if (nextEnabled) {
            playBackgroundMusic();
        } else {
            persistTime();
            bgAudio.pause();
            bgAudio.muted = true;
        }
    });

    volumeSlider.addEventListener('input', () => {
        const sliderValue = parseInt(volumeSlider.value, 10);
        if (!Number.isFinite(sliderValue)) return;
        setVolume(sliderValue / 100);
    });

    refreshToggle();
    trySource(0);
}
