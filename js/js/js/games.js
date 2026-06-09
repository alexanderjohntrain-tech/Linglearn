const GameModules = {
    // --- LEARN MODE ENGINE ---
    async initLearnMode() {
        const container = document.getElementById('learn-options');
        const questionPrompt = document.getElementById('learn-question');
        container.innerHTML = "Assembling choices...";

        let subset = [...AppState.vocabulary].sort(() => 0.5 - Math.random()).slice(0, 4);
        if(subset.length < 2) {
            container.innerHTML = "Please import more vocab words to play!";
            return;
        }

        let target = subset[0];
        const langKey = AppState.getLangKey();
        let correctAnswer = target[langKey] || await TranslationAPI.getTranslation(target.en, AppState.currentLang);

        questionPrompt.innerText = `Translate: "${target.en}"`;

        let choices = [];
        for (let item of subset) {
            let translation = item[langKey] || await TranslationAPI.getTranslation(item.en, AppState.currentLang);
            choices.push(translation);
        }
        choices.sort(() => 0.5 - Math.random());

        container.innerHTML = "";
        choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.innerText = choice;
            btn.onclick = () => {
                if (choice === correctAnswer) {
                    alert("Excellent! Correct.");
                    AppState.addXP(10);
                    this.initLearnMode();
                } else {
                    alert(`Incorrect. The correct answer was: ${correctAnswer}`);
                }
            };
            container.appendChild(btn);
        });
    },

    // --- MATCH GAME ENGINE ---
    matchTimer: null,
    firstSelection: null,

    async initMatchMode() {
        clearInterval(this.matchTimer);
        const grid = document.getElementById('match-grid');
        grid.innerHTML = "Configuring board tiles...";

        let shuffled = [...AppState.vocabulary].sort(() => 0.5 - Math.random()).slice(0, 4);
        let cardsPool = [];
        const langKey = AppState.getLangKey();

        for (let item of shuffled) {
            let translation = item[langKey] || await TranslationAPI.getTranslation(item.en, AppState.currentLang);
            cardsPool.push({ text: item.en, matchId: item.en });
            cardsPool.push({ text: translation, matchId: item.en });
        }

        cardsPool.sort(() => 0.5 - Math.random());
        grid.innerHTML = "";

        cardsPool.forEach(card => {
            const tile = document.createElement('div');
            tile.className = 'match-card';
            tile.innerText = card.text;
            tile.dataset.matchId = card.matchId;
            tile.onclick = () => this.handleTileClick(tile);
            grid.appendChild(tile);
        });

        let startTime = performance.now();
        this.matchTimer = setInterval(() => {
            document.getElementById('match-timer').innerText = ((performance.now() - startTime) / 1000).toFixed(1);
        }, 100);
    },

    handleTileClick(tile) {
        if (tile.classList.contains('matched') || tile === this.firstSelection) return;
        tile.classList.add('selected');

        if (!this.firstSelection) {
            this.firstSelection = tile;
        } else {
            if (this.firstSelection.dataset.matchId === tile.dataset.matchId) {
                this.firstSelection.classList.add('matched');
                tile.classList.add('matched');
                AppState.addXP(5);
            } else {
                const prev = this.firstSelection;
                setTimeout(() => {
                    prev.classList.remove('selected');
                    tile.classList.remove('selected');
                }, 400);
            }
            this.firstSelection = null;
        }

        if (document.querySelectorAll('.match-card:not(.matched)').length === 0) {
            clearInterval(this.matchTimer);
            alert(`Grid Cleared in ${document.getElementById('match-timer').innerText}s!`);
            AppState.addXP(25);
        }
    },

    // --- LIVE ENGINE ---
    liveLoop: null,
    liveScores: { player: 0, bot1: 0, bot2: 0 },
    liveAnswer: "",

    async runLiveGame() {
        this.liveScores = { player: 0, bot1: 0, bot2: 0 };
        this.syncLiveUI();
        await this.nextLiveQuestion();

        this.liveLoop = setInterval(() => {
            if (Math.random() > 0.65) this.liveScores.bot1++;
            if (Math.random() > 0.65) this.liveScores.bot2++;
            this.syncLiveUI();
            this.checkLiveStatus();
        }, 2200);
    },

    async nextLiveQuestion() {
        const langKey = AppState.getLangKey();
        let pool = [...AppState.vocabulary].sort(() => 0.5 - Math.random()).slice(0, 3);
        let correctItem = pool[0];

        this.liveAnswer = correctItem[langKey] || await TranslationAPI.getTranslation(correctItem.en, AppState.currentLang);
        document.getElementById('live-question').innerText = correctItem.en;

        let options = [];
        for(let item of pool) {
            options.push(item[langKey] || await TranslationAPI.getTranslation(item.en, AppState.currentLang));
        }
        options.sort(() => 0.5 - Math.random());

        const optContainer = document.getElementById('live-options');
        optContainer.innerHTML = "";
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.innerText = opt;
            btn.onclick = () => {
                if (opt === this.liveAnswer) {
                    this.liveScores.player++;
                    this.syncLiveUI();
                    if (!this.checkLiveStatus()) this.nextLiveQuestion();
                } else {
                    this.liveScores.player = Math.max(0, this.liveScores.player - 2); // Quizlet accuracy drop penalty
                    this.syncLiveUI();
                }
            };
            optContainer.appendChild(btn);
        });
    },

    syncLiveUI() {
        for (let profile in this.liveScores) {
            document.getElementById(`score-${profile}`).innerText = `${this.liveScores[profile]}/10`;
            document.getElementById(`progress-${profile}`).style.width = `${this.liveScores[profile] * 10}%`;
        }
    },

    checkLiveStatus() {
        if (this.liveScores.player >= 10) { return this.terminateLive("Victory! Your squad claimed 1st place!", 50); }
        if (this.liveScores.bot1 >= 10) { return this.terminateLive("Defeat! Cyber Owls crossed the finish line first."); }
        if (this.liveScores.bot2 >= 10) { return this.terminateLive("Defeat! Turbo Lions won the round."); }
        return false;
    },

    terminateLive(msg, bonusXP = 0) {
        clearInterval(this.liveLoop);
        alert(msg);
        if (bonusXP) AppState.addXP(bonusXP);
        document.getElementById('live-setup').style.display = "block";
        document.getElementById('live-arena').style.display = "none";
        return true;
    }
};
