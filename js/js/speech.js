const SpeechEngine = {
    recognition: null,

    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
        }
    },

    speak(text, lang) {
        window.speechSynthesis.cancel(); // Stop active tracks
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        window.speechSynthesis.speak(utterance);
    },

    // Calculates phrase alignment percentage for accent analysis
    calculateSimilarity(str1, str2) {
        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();
        
        if (s1 === s2) return 100;
        if (s1.length === 0 || s2.length === 0) return 0;

        const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
        for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
        for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

        for (let j = 1; j <= s2.length; j += 1) {
            for (let i = 1; i <= s1.length; i += 1) {
                const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(
                    track[j][row - 1] + 1, // deletion
                    track[j - 1][i] + 1, // insertion
                    track[j - 1][i - 1] + indicator // substitution
                );
            }
        }
        const distance = track[s2.length][s1.length];
        const longestLength = Math.max(s1.length, s2.length);
        return Math.round(((longestLength - distance) / longestLength) * 100);
    }
};

SpeechEngine.init();
