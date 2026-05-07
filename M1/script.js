// Global variables
let currentScreen = 0;
let audioContext = null;
let currentAudio = null;
let isPlaying = false;
let screens = [];
let audioFiles = {};
let localStorageKey = 'marungko_progress';
let progressFillEl = null;
let progressPercentEl = null;
const M1_PROGRESS_OVERRIDE_KEY = 'm1_progress_override';
const GLOBAL_BGM_ENABLED_KEY = 'marungko_bgm_enabled';
const GLOBAL_BGM_TIME_KEY = 'marungko_bgm_time';
const GLOBAL_BGM_AUDIO_ID = 'marungko-global-bgm';
const GLOBAL_BGM_TOGGLE_ID = 'marungko-bgm-toggle';
const GLOBAL_BGM_CONTROLS_ID = 'marungko-bgm-controls';
const GLOBAL_BGM_VOLUME_ID = 'marungko-bgm-volume';
const GLOBAL_BGM_VOLUME_KEY = 'marungko_bgm_volume';
const GLOBAL_BGM_VOLUME = 0.22;
const SYLLABLE_AUDIO_MAP = {
    ma: '../audio/Ma.m4a?v=20260507',
    am: '../audio/Am.m4a?v=20260507',
    sa: '../audio/Sa.m4a?v=20260507',
    as: '../audio/As.m4a?v=20260507',
    ama: '../audio/Ama.m4a?v=20260507',
    sama: '../audio/Sama.m4a?v=20260507',
    mama: '../audio/Mama.m4a?v=20260507',
    asa: '../audio/Asa.m4a?v=20260507',
    masa: '../audio/Masa.m4a?v=20260507',
    masama: '../audio/Masama.m4a?v=20260507'
};
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupGlobalBackgroundMusic('../audio/');
    initializeApp();
});

function initializeApp() {
    // Clear lesson badges from localStorage on hard reload/new session
    if (!sessionStorage.getItem('m1_session_started')) {
        for (let i = 1; i <= 6; i++) {
            localStorage.removeItem(`m1_q${i}_done`);
            localStorage.removeItem(`m1_q${i}_wrong`);
            localStorage.removeItem(`m1_q${i}a_done`);
            localStorage.removeItem(`m1_q${i}a_wrong`);
        }
        sessionStorage.setItem('m1_session_started', 'true');
    }

    // Get all screen elements
    screens = document.querySelectorAll('.screen');

    if (document.querySelector('.lesson-btn')) {
        sessionStorage.removeItem(M1_PROGRESS_OVERRIDE_KEY);
    }
    
    // Load progress from localStorage
    loadProgress();
    
    // Set up navigation
    setupNavigation();
    
    // Set up audio
    setupAudio();

    // Fit the board to the viewport
    setupBoardScale();

    // Build progress bar UI
    setupProgressBar();

    // Track notebook clicks to keep progress aligned with slide
    setupLessonLinks();
    
    // Show initial screen
    showScreen(currentScreen);
    
    // Set up keyboard navigation
    setupKeyboardNavigation();
}

function setupLessonLinks() {
    const lessonLinks = document.querySelectorAll('.lesson-btn[href]');
    if (!lessonLinks.length) return;

    lessonLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (!screens.length) return;
            const progress = Math.round(((currentScreen + 1) / screens.length) * 100);
            sessionStorage.setItem(M1_PROGRESS_OVERRIDE_KEY, String(progress));
        });
    });
}

function setupProgressBar() {
    const frame = document.querySelector('.frame');
    const chalkboard = document.querySelector('.chalkboard');
    if (!frame || !chalkboard) return;
    if (frame.querySelector('.progress-wrap')) {
        progressFillEl = frame.querySelector('.progress-fill');
        updateProgressBar();
        return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'progress-wrap';

    const track = document.createElement('div');
    track.className = 'progress-track';
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', 'Lesson progress');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');

    const fill = document.createElement('div');
    fill.className = 'progress-fill';

    const percent = document.createElement('span');
    percent.className = 'progress-percent';
    percent.textContent = '0%';

    track.appendChild(fill);
    wrap.appendChild(track);
    wrap.appendChild(percent);
    frame.insertAdjacentElement('afterend', wrap);

    progressFillEl = fill;
    progressPercentEl = percent;
    syncProgressBarWidth();
    updateProgressBar();

    window.addEventListener('resize', syncProgressBarWidth);
    window.addEventListener('orientationchange', syncProgressBarWidth);
}

function syncProgressBarWidth() {
    const frame = document.querySelector('.frame');
    const wrap = document.querySelector('.progress-wrap');
    if (!frame || !wrap) return;
    const rect = frame.getBoundingClientRect();
    wrap.style.width = `${rect.width}px`;
}

function updateProgressBar() {
    if (!progressFillEl || !screens.length) return;
    let progress = ((currentScreen + 1) / screens.length) * 100;
    const overrideValue = sessionStorage.getItem(M1_PROGRESS_OVERRIDE_KEY);
    const isSingleScreen = screens.length <= 1;
    if (overrideValue && isSingleScreen) {
        const parsed = parseInt(overrideValue, 10);
        if (Number.isFinite(parsed)) {
            progress = parsed;
        }
    }

    progressFillEl.style.width = `${progress}%`;
    if (progressPercentEl) {
        progressPercentEl.textContent = `${Math.round(progress)}%`;
    }
    const track = progressFillEl.parentElement;
    if (track) {
        track.setAttribute('aria-valuenow', String(Math.round(progress)));
    }
}

function setupBoardScale() {
    const frame = document.querySelector('.frame');
    if (!frame) return;

    const setScaleMode = (enabled) => {
        if (enabled) {
            document.body.classList.add('board-scale-enabled');
        } else {
            document.body.classList.remove('board-scale-enabled');
            frame.style.setProperty('--board-scale', '1');
        }
    };

    const cacheBaseSize = () => {
        frame.style.setProperty('--board-scale', '1');
        const baseWidth = frame.offsetWidth || frame.getBoundingClientRect().width;
        const baseHeight = frame.offsetHeight || frame.getBoundingClientRect().height;
        if (baseWidth && baseHeight) {
            frame.dataset.baseWidth = String(baseWidth);
            frame.dataset.baseHeight = String(baseHeight);
        }
    };

    const updateScale = () => {
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;
        const shouldScale = viewportWidth >= 900 && viewportHeight >= 520;

        setScaleMode(shouldScale);
        if (!shouldScale) {
            return;
        }

        const baseWidth = parseFloat(frame.dataset.baseWidth || '') || frame.offsetWidth;
        const baseHeight = parseFloat(frame.dataset.baseHeight || '') || frame.offsetHeight;
        if (!baseWidth || !baseHeight) return;

        const margin = 16;
        const scale = Math.min(
            1,
            (viewportWidth - margin * 2) / baseWidth,
            (viewportHeight - margin * 2) / baseHeight
        );

        frame.style.setProperty('--board-scale', scale.toFixed(3));
    };

    let resizeRaf = null;
    const onResize = () => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(updateScale);
    };

    cacheBaseSize();
    updateScale();

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
}

function setupNavigation() {
    // Home button - no confirmation needed, inline onclick handlers are used
    // Note: Navigation buttons use inline onclick handlers, so no need to add listeners here
}

function setupAudio() {
    // Create audio context for better audio control
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.warn('Web Audio API not supported');
    }
    
    // Note: Speaker icons use inline onclick handlers, so no additional listeners needed here
}

function setupKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
        switch(e.key) {
            case 'ArrowRight':
            case ' ':
                e.preventDefault();
                nextScreen();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                prevScreen();
                break;
            case 'Home':
                e.preventDefault();
                window.location.href = 'index.html';
                break;
        }
    });
}

function showScreen(index) {
    // Hide all screens
    screens.forEach(screen => {
        screen.classList.remove('active');
        screen.classList.remove('transitioning');
    });
    
    // Show target screen
    if (screens[index]) {
        screens[index].classList.add('transitioning');
        setTimeout(() => {
            screens[index].classList.add('active');
            screens[index].classList.remove('transitioning');
        }, 50);
    }
    
    // Update current screen
    currentScreen = index;

    updateProgressBar();
    
    // Save progress
    saveProgress();
    
    // Stop any playing audio
    stopAudio();
    
    // Update navigation buttons
    updateNavigationButtons();
    
    // Update notebook badges on lesson menu pages
    if (screens[index] && (screens[index].id === 'page6' || screens[index].id === 'page8')) {
        updateNotebookBadges();
    }
}

function nextScreen() {
    if (currentScreen < screens.length - 1) {
        showScreen(currentScreen + 1);
    }
}

function prevScreen() {
    if (currentScreen > 0) {
        showScreen(currentScreen - 1);
    }
}

function showPage(pageId) {
    const page = document.getElementById(pageId);
    if (page) {
        const index = Array.from(screens).indexOf(page);
        if (index !== -1) {
            showScreen(index);
        }
    }
}

function updateNavigationButtons() {
    const navBtn = document.querySelector('.nav-btn');
    const backBtn = document.querySelector('.back-btn');
    
    if (navBtn) {
        if (currentScreen === screens.length - 1) {
            // Last screen - hide next button
            navBtn.style.display = 'none';
        } else {
            navBtn.style.display = 'flex';
        }
    }
    
    if (backBtn) {
        if (currentScreen === 0) {
            // First screen - hide back button
            backBtn.style.display = 'none';
        } else {
            backBtn.style.display = 'flex';
        }
    }
}

function playAudioForCurrentScreen() {
    const screenId = screens[currentScreen].id;
    const audioKey = getAudioKeyForScreen(screenId);
    
    if (audioKey && audioFiles[audioKey]) {
        playAudio(audioFiles[audioKey]);
    }
}

function getAudioKeyForScreen(screenId) {
    // Map screen IDs to audio file keys
    const audioMap = {
        'page1': 'intro',
        'page2': 'letter_y',
        'page3': 'letter_y_sound',
        'page4': 'word_ya',
        'page5': 'word_ya_sound',
        'page6': 'blending_y_a',
        'page7': 'syllables',
        'page8': 'syllables_practice',
        'page9': 'try_it',
        'page10': 'instruction',
        'page11': 'lesson_menu',
        'lesson1-screen': 'lesson1',
        'lesson2-screen': 'lesson2',
        'lesson3-screen': 'lesson3',
        'lesson4-screen': 'lesson4',
        'lesson5-screen': 'lesson5',
        'lesson6-screen': 'lesson6',
        'lesson7-screen': 'lesson7',
        'lesson8-screen': 'lesson8',
        'lesson9-screen': 'lesson9',
        'page17': 'questions'
    };
    
    return audioMap[screenId];
}

function playAudio(audioSrcOrId, targetId = null) {
    // Stop current audio
    stopAudio();
    
    // Check if audioSrcOrId is an element ID or a file path
    let audioElement = document.getElementById(audioSrcOrId);
    
    if (audioElement && audioElement.tagName === 'AUDIO') {
        // It's an audio element ID
        currentAudio = audioElement;
        currentAudio.currentTime = 0;
    } else {
        // It's a file path - create new audio element
        currentAudio = new Audio(audioSrcOrId);
    }
    
    // Ensure audio is not muted
    currentAudio.muted = false;
    currentAudio.volume = 0.8;
    
    // Add visual feedback to speaker icons
    const speakers = document.querySelectorAll('.speaker-icon, .top-left-speaker, .lesson-speaker-btn, .q-speaker');
    speakers.forEach(speaker => {
        speaker.classList.add('playing');
    });
    
    // Play audio with error handling
    const playPromise = currentAudio.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            isPlaying = true;
        }).catch(error => {
            console.error('Audio play failed:', error);
            isPlaying = false;
            speakers.forEach(speaker => {
                speaker.classList.remove('playing');
            });
        });
    }
    
    // Handle audio ending
    currentAudio.onended = function() {
        isPlaying = false;
        speakers.forEach(speaker => {
            speaker.classList.remove('playing');
        });
    };
    
    // Handle errors
    currentAudio.onerror = function() {
        console.error('Audio loading/playback error for:', audioSrcOrId);
        console.error('Error code:', currentAudio.error);
        isPlaying = false;
        speakers.forEach(speaker => {
            speaker.classList.remove('playing');
        });
    };
    
    // Pop target text when provided (used by blend/grid text like m, a, s)
    if (targetId) {
        const targetEl = document.getElementById(targetId);
        if (
            targetEl &&
            (
                targetEl.classList.contains('blend-text') ||
                targetEl.classList.contains('grid-item') ||
                targetEl.classList.contains('letter-text') ||
                targetEl.classList.contains('syllable-text')
            )
        ) {
            targetEl.classList.remove('pop-animation');
            // Force reflow so repeated clicks replay animation
            void targetEl.offsetWidth;
            targetEl.classList.add('pop-animation');
        }
    }

    // Log audio source for debugging
    console.log('Playing audio:', audioSrcOrId);
}

function playSyllableAudio(syllable, targetId = null) {
    if (typeof syllable !== 'string') return false;

    const normalized = syllable.toLowerCase().trim();
    const mappedSrc = SYLLABLE_AUDIO_MAP[normalized];
    if (!mappedSrc) return false;

    playAudio(mappedSrc, targetId);
    return true;
}

// Play two or more audio clips in sequence (used for blended sounds like "ma")
function playAudioSequence(audioIds, targetId) {
    if (!Array.isArray(audioIds) || audioIds.length === 0) return;

    if (audioIds.length === 2) {
        const firstLetter = String(audioIds[0]).split('_').pop().toLowerCase();
        const secondLetter = String(audioIds[1]).split('_').pop().toLowerCase();
        if (playSyllableAudio(`${firstLetter}${secondLetter}`, targetId)) {
            return;
        }
    }

    stopAudio();

    const sequence = audioIds
        .map(id => document.getElementById(id))
        .filter(el => el && el.tagName === 'AUDIO');

    if (sequence.length === 0) return;

    const targetEl = targetId ? document.getElementById(targetId) : null;
    if (targetEl) {
        targetEl.classList.remove('pop-animation');
        // Force reflow so animation restarts on repeated clicks
        void targetEl.offsetWidth;
        targetEl.classList.add('pop-animation');
    }

    const speakers = document.querySelectorAll('.speaker-icon, .top-left-speaker, .lesson-speaker-btn, .q-speaker');
    speakers.forEach(speaker => speaker.classList.add('playing'));

    let index = 0;
    isPlaying = true;

    const playNext = () => {
        if (index >= sequence.length) {
            isPlaying = false;
            currentAudio = null;
            speakers.forEach(speaker => speaker.classList.remove('playing'));
            return;
        }

        const audio = sequence[index++];
        currentAudio = audio;
        audio.currentTime = 0;
        audio.muted = false;
        audio.volume = 0.8;
        audio.onended = playNext;
        audio.onerror = playNext;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => playNext());
        }
    };

    playNext();
}

function selectPantig(starEl, syllableType) {
    const page = starEl ? starEl.closest('.screen') : null;
    if (!page) return;

    const audioPrefix = page.id === 'page13' ? 'audio13' : page.id === 'page20' ? 'audio20' : 'audio11';

    page.querySelectorAll('.star-syllable-star').forEach(star => {
        star.classList.remove('active');
    });

    page.querySelectorAll('.star-syllable-text').forEach(text => {
        text.classList.remove('active', 'pop-animation');
        void text.offsetWidth;
    });

    starEl.classList.add('active');

    const textEl = starEl.nextElementSibling;
    if (textEl && textEl.classList.contains('star-syllable-text')) {
        textEl.classList.add('active', 'pop-animation');
    }

    const textId = textEl && textEl.id ? textEl.id : null;

    if (typeof syllableType === 'string' && syllableType.length >= 2) {
        if (playSyllableAudio(syllableType, textId)) {
            return;
        }

        const firstLetter = syllableType.charAt(0).toLowerCase();
        const secondLetter = syllableType.charAt(1).toLowerCase();
        playAudioSequence([`${audioPrefix}_${firstLetter}`, `${audioPrefix}_${secondLetter}`], textId);
    }
}

function speakSyllable(text, targetEl = null) {
    stopAudio();

    if (!window.speechSynthesis) {
        return;
    }

    window.speechSynthesis.cancel();

    const activeItems = document.querySelectorAll('.star-syllable-star.active, .star-syllable-text.active');
    activeItems.forEach(item => item.classList.remove('active'));

    const itemEl = targetEl && targetEl.classList ? targetEl : null;
    const starEl = itemEl ? itemEl.querySelector('.star-syllable-star') : null;
    const textEl = itemEl ? itemEl.querySelector('.star-syllable-text') : null;

    if (starEl) starEl.classList.add('active');
    if (textEl) textEl.classList.add('active');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tl-PH';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const clearActiveState = () => {
        if (starEl) starEl.classList.remove('active');
        if (textEl) textEl.classList.remove('active');
    };

    utterance.onend = clearActiveState;
    utterance.onerror = clearActiveState;

    window.speechSynthesis.speak(utterance);
}

function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
        isPlaying = false;
        
        // Remove playing class from all speakers
        const speakers = document.querySelectorAll('.speaker-icon, .top-left-speaker, .lesson-speaker-btn, .q-speaker');
        speakers.forEach(speaker => {
            speaker.classList.remove('playing');
        });
    }
}

function loadProgress() {
    // Check if returning from a question page
    const targetPage = sessionStorage.getItem('targetPage');
    if (targetPage) {
        sessionStorage.removeItem('targetPage');
        // Convert page name to screen index (page6 = index 5)
        const pageNum = parseInt(targetPage.replace('page', ''));
        currentScreen = Math.max(0, pageNum - 1);
    } else {
        // Always start from page 1 (index 0) on fresh load
        currentScreen = 0;
    }
    
    // Uncomment below if you want to load saved progress
    // const saved = localStorage.getItem(localStorageKey);
    // if (saved) {
    //     try {
    //         const progress = JSON.parse(saved);
    //         if (progress.currentScreen !== undefined) {
    //             currentScreen = Math.min(progress.currentScreen, screens.length - 1);
    //         }
    //     } catch (e) {
    //         console.warn('Failed to load progress:', e);
    //     }
    // }
}

/**
 * Reads localStorage completion flags and adds/keeps green check badges
 * or red X badges on the lesson/notebook buttons.
 */
function updateNotebookBadges() {
    const badgePages = [
        { pageId: 'page6', keySuffix: '' },
        { pageId: 'page8', keySuffix: 'a' }
    ];

    badgePages.forEach(({ pageId, keySuffix }) => {
        const pageEl = document.getElementById(pageId);
        if (!pageEl) return;

        const notebooks = pageEl.querySelectorAll('.lesson-btn');

        notebooks.forEach((btn, index) => {
            const questionNum = index + 1;
            const isDone = localStorage.getItem(`m1_q${questionNum}${keySuffix}_done`);
            const isWrong = localStorage.getItem(`m1_q${questionNum}${keySuffix}_wrong`);

            // Remove existing badges to prevent duplicates
            btn.querySelectorAll('.nb-done-badge, .nb-wrong-badge').forEach(badge => badge.remove());

            // Add badge based on status
            if (isDone) {
                const badge = document.createElement('div');
                badge.className = 'nb-done-badge';
                badge.textContent = '✓';
                btn.appendChild(badge);
            } else if (isWrong) {
                const badge = document.createElement('div');
                badge.className = 'nb-wrong-badge';
                badge.textContent = '✕';
                btn.appendChild(badge);
            }
        });
    });
}

function saveProgress() {
    const progress = {
        currentScreen: currentScreen,
        timestamp: Date.now()
    };
    
    try {
        localStorage.setItem(localStorageKey, JSON.stringify(progress));
    } catch (e) {
        console.warn('Failed to save progress:', e);
    }
}

// Lesson-specific functions
function setupLessonInteractions() {
    // Choice circles (lessons 1-5)
    const choiceCircles = document.querySelectorAll('.lesson-choice-circle');
    choiceCircles.forEach(circle => {
        circle.addEventListener('click', function() {
            handleChoiceSelection(this);
        });
    });
    
    // Choice cards (lessons 6-9)
    const choiceCards = document.querySelectorAll('.lesson-choice-card');
    choiceCards.forEach(card => {
        card.addEventListener('click', function() {
            handleChoiceSelection(this);
        });
    });
}

function handleChoiceSelection(element) {
    const isCorrect = element.classList.contains('correct');
    const feedbackPanel = document.querySelector('.lesson-feedback-panel');
    
    if (feedbackPanel) {
        if (isCorrect) {
            feedbackPanel.classList.add('correct');
            feedbackPanel.classList.remove('wrong');
        } else {
            feedbackPanel.classList.add('wrong');
            feedbackPanel.classList.remove('correct');
        }
        
        feedbackPanel.classList.add('show');
        
        // Auto-hide after 2 seconds
        setTimeout(() => {
            feedbackPanel.classList.remove('show');
        }, 2000);
    }
    
    // Visual feedback
    element.style.transform = 'scale(0.95)';
    setTimeout(() => {
        element.style.transform = '';
    }, 150);
}

// Initialize lesson interactions when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setupLessonInteractions();
});

// Preload audio files
function preloadAudio() {
    const audioPaths = [
        'audio/intro.mp3',
        'audio/letter_y.mp3',
        'audio/letter_y_sound.mp3',
        'audio/word_ya.mp3',
        'audio/word_ya_sound.mp3',
        'audio/blending_y_a.mp3',
        'audio/syllables.mp3',
        'audio/syllables_practice.mp3',
        'audio/try_it.mp3',
        'audio/instruction.mp3',
        'audio/lesson_menu.mp3',
        'audio/lesson1.mp3',
        'audio/lesson2.mp3',
        'audio/lesson3.mp3',
        'audio/lesson4.mp3',
        'audio/lesson5.mp3',
        'audio/lesson6.mp3',
        'audio/lesson7.mp3',
        'audio/lesson8.mp3',
        'audio/lesson9.mp3',
        'audio/questions.mp3'
    ];
    
    audioPaths.forEach(path => {
        const key = path.split('/').pop().replace('.mp3', '');
        audioFiles[key] = path;
    });
}

// Call preload on initialization
document.addEventListener('DOMContentLoaded', function() {
    preloadAudio();
});

// Stop all audio
function stopAllAudio() {
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
        if (audio.dataset && audio.dataset.bgm === 'true') return;
        audio.pause();
        audio.currentTime = 0;
    });
}

// Play audio with delay and navigate
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

// Navigate to main.html with target page
function navigateToMainPage(pageId) {
    sessionStorage.removeItem(M1_PROGRESS_OVERRIDE_KEY);
    sessionStorage.setItem('targetPage', pageId);
    window.location.href = 'main.html';
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
