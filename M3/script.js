const PAGE_TRANSITION_KEY = 'marungko_page_transition_direction';
const PAGE_SLIDE_DURATION_MS = 420;
const PAGE_SLIDE_DISTANCE_PX = 96;
const SCREEN_SLIDE_DURATION_MS = 420;
const SCREEN_SLIDE_DISTANCE_PX = 140;
const TRANSITION_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const prefersReducedMotion = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

let isScreenTransitionRunning = false;

function animateElement(element, keyframes, options) {
    if (!element || typeof element.animate !== 'function' || prefersReducedMotion) {
        return null;
    }

    try {
        return element.animate(keyframes, options);
    } catch (error) {
        console.warn('Animation skipped:', error);
        return null;
    }
}

function getPageEnterOffset(direction) {
    return direction === 'back' ? -PAGE_SLIDE_DISTANCE_PX : PAGE_SLIDE_DISTANCE_PX;
}

function getPageExitOffset(direction) {
    return direction === 'back' ? PAGE_SLIDE_DISTANCE_PX : -PAGE_SLIDE_DISTANCE_PX;
}

function getScreenEnterOffset(direction) {
    return direction === 'back' ? -SCREEN_SLIDE_DISTANCE_PX : SCREEN_SLIDE_DISTANCE_PX;
}

function getScreenExitOffset(direction) {
    return direction === 'back' ? SCREEN_SLIDE_DISTANCE_PX : -SCREEN_SLIDE_DISTANCE_PX;
}

function applyEntryPageTransition() {
    let direction = '';

    try {
        direction = sessionStorage.getItem(PAGE_TRANSITION_KEY) || '';
        sessionStorage.removeItem(PAGE_TRANSITION_KEY);
    } catch (error) {
        console.warn('Page transition state unavailable:', error);
    }

    if (!direction) return;

    const frame = document.querySelector('.frame');
    const entryAnimation = animateElement(
        frame,
        [
            { opacity: 0, transform: `translateX(${getPageEnterOffset(direction)}px)` },
            { opacity: 1, transform: 'translateX(0)' }
        ],
        {
            duration: PAGE_SLIDE_DURATION_MS,
            easing: TRANSITION_EASING,
            fill: 'both'
        }
    );

    if (entryAnimation) {
        entryAnimation.finished.catch(() => { });
    }
}

function navigateWithSlide(url, direction = 'next') {
    if (!url) return;

    const safeDirection = direction === 'back' ? 'back' : 'next';
    const frame = document.querySelector('.frame');
    let hasNavigated = false;
    const finishNavigation = () => {
        if (hasNavigated) return;
        hasNavigated = true;
        window.location.href = url;
    };

    try {
        sessionStorage.setItem(PAGE_TRANSITION_KEY, safeDirection);
    } catch (error) {
        console.warn('Page transition state unavailable:', error);
    }

    if (window.__marungkoNavigating || prefersReducedMotion || !frame || typeof frame.animate !== 'function') {
        finishNavigation();
        return;
    }

    window.__marungkoNavigating = true;
    document.body.style.pointerEvents = 'none';

    const exitAnimation = frame.animate(
        [
            { opacity: 1, transform: 'translateX(0)' },
            { opacity: 0, transform: `translateX(${getPageExitOffset(safeDirection)}px)` }
        ],
        {
            duration: PAGE_SLIDE_DURATION_MS,
            easing: TRANSITION_EASING,
            fill: 'forwards'
        }
    );

    const fallbackTimer = window.setTimeout(finishNavigation, PAGE_SLIDE_DURATION_MS + 120);

    exitAnimation.finished
        .catch(() => { })
        .finally(() => {
            window.clearTimeout(fallbackTimer);
            finishNavigation();
        });
}

window.navigateWithSlide = navigateWithSlide;
applyEntryPageTransition();

// Clear lesson badges from localStorage on hard reload/new session
if (!sessionStorage.getItem('marungko_session')) {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.endsWith('_done') || key.endsWith('_wrong'))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    sessionStorage.setItem('marungko_session', '1');
}

function stopAllAudio() {
    document.querySelectorAll('audio').forEach(audio => {
        if (audio.dataset && audio.dataset.bgm === 'true') return;
        audio.pause();
        audio.currentTime = 0;
    });
}

function resetAnimatedTextElements() {
    const animElements = document.querySelectorAll(
        '.pop-animation, .pop-delayed, .syllable-text, .letter-text, .letter-y-in-word, .first-letter-in-word, .blend-text, .grid-item'
    );

    animElements.forEach(el => {
        el.classList.remove('pop-animation', 'pop-delayed');
        void el.offsetWidth;
    });
}

function handlePageArrival(pageId) {
    if (pageId === 'page11') updateNotebookBadges('page11');
    if (pageId === 'page14') updateNotebookBadges('page14');

    if (pageId === 'page10') {
        const instrAudio = document.getElementById('instruction_audio');
        if (instrAudio) {
            instrAudio.currentTime = 0;
            setTimeout(() => instrAudio.play(), 400);
        }
    }

    if (pageId === 'page12') {
        const instrAudio2 = document.getElementById('instruction_audio2');
        if (instrAudio2) {
            instrAudio2.currentTime = 0;
            setTimeout(() => instrAudio2.play(), 400);
        }
    }

    if (pageId === 'page7') {
        const page7Audio = document.getElementById('page7_audio');
        if (page7Audio) {
            page7Audio.currentTime = 0;
            setTimeout(() => page7Audio.play(), 400);
        }
    }

    if (pageId === 'page8') {
        const page8Audio = document.getElementById('page8_audio');
        if (page8Audio) {
            page8Audio.currentTime = 0;
            setTimeout(() => page8Audio.play(), 400);
        }
    }

    if (pageId === 'page8_5') {
        const mahusayAudio = document.getElementById('mahusay_audio');
        const trumpetAudio = document.getElementById('trumpet_audio');

        if (trumpetAudio) {
            trumpetAudio.currentTime = 0;
            trumpetAudio.onended = () => {
                trumpetAudio.onended = null;
                if (mahusayAudio) {
                    mahusayAudio.currentTime = 0;
                    setTimeout(() => mahusayAudio.play(), 200);
                }
            };
            trumpetAudio.play().catch(e => console.warn('Audio play blocked:', e));
        } else if (mahusayAudio) {
            mahusayAudio.currentTime = 0;
            setTimeout(() => mahusayAudio.play(), 400);
        }
    }
}

function inferScreenDirection(currentScreen, targetScreen) {
    if (!currentScreen || !targetScreen || currentScreen.parentElement !== targetScreen.parentElement) {
        return 'next';
    }

    const siblingScreens = Array.from(currentScreen.parentElement.querySelectorAll('.screen'));
    return siblingScreens.indexOf(targetScreen) < siblingScreens.indexOf(currentScreen) ? 'back' : 'next';
}

function cleanupScreenTransition(screen) {
    if (!screen) return;

    screen.classList.remove('transitioning');
    screen.style.opacity = '';
    screen.style.transform = '';
    screen.style.zIndex = '';
}

function showPage(pageId, options = {}) {
    const targetScreen = document.getElementById(pageId);
    const currentScreen = document.querySelector('.screen.active');

    if (!targetScreen || currentScreen === targetScreen) return;
    if (isScreenTransitionRunning && !options.immediate) return;

    stopAllAudio();
    resetAnimatedTextElements();

    const direction = options.direction || inferScreenDirection(currentScreen, targetScreen);
    const shouldAnimate = !options.immediate
        && !prefersReducedMotion
        && !isScreenTransitionRunning
        && currentScreen
        && typeof currentScreen.animate === 'function'
        && typeof targetScreen.animate === 'function';

    if (!shouldAnimate) {
        if (currentScreen) currentScreen.classList.remove('active');
        targetScreen.classList.add('active');
        handlePageArrival(pageId);
        return;
    }

    isScreenTransitionRunning = true;

    currentScreen.classList.add('transitioning');
    targetScreen.classList.add('active', 'transitioning');
    currentScreen.style.zIndex = '3';
    targetScreen.style.zIndex = '4';

    const enterKeyframes = [
        { opacity: 0, transform: `translateX(${getScreenEnterOffset(direction)}px)` },
        { opacity: 1, transform: 'translateX(0)' }
    ];

    const exitKeyframes = [
        { opacity: 1, transform: 'translateX(0)' },
        { opacity: 0, transform: `translateX(${getScreenExitOffset(direction)}px)` }
    ];

    const animationOptions = {
        duration: SCREEN_SLIDE_DURATION_MS,
        easing: TRANSITION_EASING,
        fill: 'forwards'
    };

    const enterAnimation = targetScreen.animate(enterKeyframes, animationOptions);
    const exitAnimation = currentScreen.animate(exitKeyframes, animationOptions);

    let cleanedUp = false;
    const finishTransition = () => {
        if (cleanedUp) return;
        cleanedUp = true;

        enterAnimation.cancel();
        exitAnimation.cancel();

        currentScreen.classList.remove('active');
        cleanupScreenTransition(currentScreen);
        cleanupScreenTransition(targetScreen);

        isScreenTransitionRunning = false;
        handlePageArrival(pageId);
    };

    window.setTimeout(finishTransition, SCREEN_SLIDE_DURATION_MS + 80);

    Promise.allSettled([enterAnimation.finished, exitAnimation.finished]).then(finishTransition);
}

/**
 * Reads localStorage completion flags and adds/keeps green check badges
 * on the notebook buttons for completed lessons.
 */
function updateNotebookBadges(pageId) {
    const page = document.getElementById(pageId);
    if (!page) return;

    page.querySelectorAll('.lesson-btn[data-lesson]').forEach(btn => {
        const key = btn.getAttribute('data-lesson');
        const isDone = localStorage.getItem(key + '_done') === '1';
        const isWrong = localStorage.getItem(key + '_wrong') === '1';

        btn.querySelectorAll('.nb-done-badge, .nb-wrong-badge').forEach(badge => badge.remove());

        if (isDone) {
            const badge = document.createElement('div');
            badge.className = 'nb-done-badge';
            badge.textContent = '\u2713';
            btn.appendChild(badge);
        } else if (isWrong) {
            const badge = document.createElement('div');
            badge.className = 'nb-wrong-badge';
            badge.textContent = '\u2715';
            btn.appendChild(badge);
        }
    });
}

function playAudio(audioId, textId) {
    const audio = document.getElementById(audioId);
    if (audio) {
        audio.currentTime = 0;
        audio.play();
    }

    const textEl = document.getElementById(textId);
    if (!textEl) return;

    if (textEl.classList.contains('word')) {
        const firstLetter = textEl.querySelector('.first-letter-in-word') || textEl.querySelector('.letter-y-in-word');
        const letters = textEl.querySelectorAll('.syllable-text');

        letters.forEach(el => {
            el.classList.remove('pop-animation', 'pop-delayed');
            void el.offsetWidth;
        });

        if (!firstLetter) {
            letters.forEach(el => el.classList.add('pop-animation'));
            return;
        }

        const onFirstLetterEnd = function () {
            firstLetter.removeEventListener('animationend', onFirstLetterEnd);

            let delay = 500;
            if (textId === 'targetWord3') {
                delay += 200;
            } else if (textId === 'targetWord4') {
                delay += 0;
            }

            setTimeout(() => {
                letters.forEach(el => {
                    el.classList.remove('pop-animation', 'pop-delayed');
                    void el.offsetWidth;
                    el.classList.add('pop-animation');
                });
            }, delay);
        };

        firstLetter.addEventListener('animationend', onFirstLetterEnd);
        firstLetter.classList.add('pop-animation');
        return;
    }

    if (textEl.classList.contains('letter-wrapper')) {
        const textElement = textEl.querySelector('.letter-text');
        if (textElement) {
            textElement.classList.remove('pop-animation');
            void textElement.offsetWidth;
            textElement.classList.add('pop-animation');
        }
    } else if (textEl.classList.contains('blend-text') || textEl.classList.contains('grid-item')) {
        textEl.classList.remove('pop-animation');
        void textEl.offsetWidth;
        textEl.classList.add('pop-animation');
    }
}

document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || link.target === '_blank' || link.hasAttribute('download')) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return;

    event.preventDefault();

    const direction = link.dataset.transitionDirection
        || (link.classList.contains('return-btn') || link.classList.contains('back-btn') ? 'back' : 'next');

    navigateWithSlide(link.href, direction);
});

document.addEventListener('DOMContentLoaded', () => {
    setupGlobalBackgroundMusic('../audio/');

    if (window.location.hash) {
        const pageId = window.location.hash.substring(1);
        if (document.getElementById(pageId)) {
            showPage(pageId, { immediate: true });
        }
        history.replaceState(null, '', window.location.pathname);
    }
});

/**
 * Plays an audio element, disables interaction, limits gameplay from breaking,
 * and waits for a specific delay before navigating to the next screen.
 */
function playWithDelay(audioId, targetPageId, delayMs) {
    const audioEl = document.getElementById(audioId);

    if (audioEl) {
        stopAllAudio();
        audioEl.currentTime = 0;
        audioEl.play().catch(e => console.warn('Audio play blocked:', e));
    }

    document.body.style.pointerEvents = 'none';

    setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
        showPage(targetPageId);
    }, delayMs);
}

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
