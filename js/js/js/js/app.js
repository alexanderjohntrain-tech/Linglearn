const AppState = {
    vocabulary: JSON.parse(localStorage.getItem('vocab_list')) || [
        { en: "Hello", es: "Hola", pt: "Olá", fr: "Bonjour" },
        { en: "Always", es: "Siempre", pt: "Sempre", fr: "Toujours" },
        { en: "Water", es: "Agua", pt: "Água", fr: "Eau" },
        { en: "Thank you", es: "Gracias", pt: "Obrigado", fr: "Merci" },
        { en: "Friend", es: "Amigo", pt: "Amigo", fr: "Ami" }
    ],
    currentLang: "es-ES",
    cardIndex: 0,
    activeSolution: "",
    xp: parseInt(localStorage.getItem('user_xp')) || 0,
    streak: parseInt(localStorage.getItem('user_streak')) || 0,

    init() {
        this.currentLang = document.getElementById('lang-select').value;
        this.updateStatsUI();
        loadCard();
        this.updateStreak();
    },

    getLangKey() {
        return this.currentLang.split('-')[0];
    },

    addXP(amount) {
        this.xp += amount;
        localStorage.setItem('user_xp', this.xp);
        this.updateStatsUI();
    },

    updateStatsUI() {
        document.getElementById('stat-xp').innerText = this.xp;
        document.getElementById('stat-streak').innerText = this.streak;
    },

    updateStreak() {
        const lastVisit = localStorage.getItem('last_visit_date');
        const today = new Date().toDateString();

        if (lastVisit !== today) {
            if (lastVisit) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                if (lastVisit === yesterday.toDateString()) {
                    this.streak++;
                } else {
                    this.streak = 1;
                }
            } else {
                this.streak = 1;
            }
            localStorage.setItem('user_streak', this.streak);
            localStorage.setItem('last_visit_date', today);
            this.updateStatsUI();
        }
    }
};

// --- View Router Router Integration ---
function switchView(targetView) {
    document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

    document.getElementById(`view-${targetView}`).classList.add('active');
    event.target.classList.add('active');

    clearInterval(GameModules.matchTimer);
    clearInterval(GameModules.liveLoop);

    if (targetView === 'learn') GameModules.initLearnMode();
    if (targetView === 'match') GameModules.initMatchMode();
}

// --- Card Logic Connectors ---
async function loadCard() {
    const card = document.getElementById('flashcard');
    card.classList.remove('is-flipped');
    document.getElementById('speech-feedback').innerText = "";
    
    AppState.currentLang = document.getElementById('lang-select').value;
    const currentItem = AppState.vocabulary[AppState.cardIndex];
    
    document.getElementById('eng-text').innerText = currentItem.en;
    document.getElementById('target-tag').innerText = document.getElementById('lang-select').options[document.getElementById('lang-select').selectedIndex].text;

    const langKey = AppState.getLangKey();
    if (currentItem[langKey]) {
        AppState.activeSolution = currentItem[langKey];
    } else {
        document.getElementById('translation-text').innerText = "Translating...";
        AppState.activeSolution = await TranslationAPI.getTranslation(currentItem.en, AppState.currentLang);
    }
    document.getElementById('translation-text').innerText = AppState.activeSolution;
}

function nextCard() {
    AppState.cardIndex = (AppState.cardIndex + 1) % AppState.vocabulary.length;
    loadCard();
}

function speakCurrentWord(e) {
    e.stopPropagation();
    SpeechEngine.speak(AppState.activeSolution, AppState.currentLang);
}

function listenToUser(e) {
    e.stopPropagation();
    if (!SpeechEngine.recognition) return alert("Web Speech Engine blocked or not supported natively.");

    const btn = document.getElementById('mic-btn');
    btn.classList.add('listening');
    document.getElementById('speech-feedback').innerText = "Listening...";

    SpeechEngine.recognition.lang = AppState.currentLang;
    SpeechEngine.recognition.start();

    SpeechEngine.recognition.onresult = (resEvent) => {
        const spokenText = resEvent.results[0][0].transcript;
        const accuracy = SpeechEngine.calculateSimilarity(spokenText, AppState.activeSolution);
        
        const feedback = document.getElementById('speech-feedback');
        let badgeColor = accuracy > 75 ? 'var(--success)' : 'var(--error)';
        
        feedback.innerHTML = `You said: "${spokenText}" <span class="score-indicator" style="background:${badgeColor}">${accuracy}% Match</span>`;
        
        if (accuracy > 75) AppState.addXP(15);
    };

    SpeechEngine.recognition.onspeechend = () => btn.classList.remove('listening');
    SpeechEngine.recognition.onerror = () => btn.classList.remove('listening');
}

// --- Import Module Operations ---
function processImport() {
    const rawData = document.getElementById('import-input').value.trim();
    if (!rawData) return alert("Pasting plain text definitions is required.");

    const lines = rawData.split('\n');
    let freshVocab = [];

    lines.forEach(line => {
        let block = line.split(',');
        if (block.length >= 2) {
            freshVocab.push({
                en: block[0].trim(),
                es: block[1].trim(),
                pt: block[1].trim(),
                fr: block[1].trim()
            });
        }
    });

    if (freshVocab.length > 0) {
        AppState.vocabulary = freshVocab;
        localStorage.setItem('vocab_list', JSON.stringify(freshVocab));
        AppState.cardIndex = 0;
        alert(`Loaded ${freshVocab.length} words!`);
        switchView('flashcards');
        loadCard();
    }
}

// Start Lifecycle Execution
window.onload = () => AppState.init();
