const TranslationAPI = {
    cache: JSON.parse(localStorage.getItem('lang_cache')) || {},

    async getTranslation(text, targetLang) {
        const langCode = targetLang.split('-')[0];
        const cacheKey = `${text.toLowerCase().trim()}:${langCode}`;

        if (this.cache[cacheKey]) {
            return this.cache[cacheKey];
        }

        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${langCode}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            let translated = data.responseData.translatedText;
            
            // Format cleanup
            translated = translated.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").trim();
            
            // Cache updates
            this.cache[cacheKey] = translated;
            localStorage.setItem('lang_cache', JSON.stringify(this.cache));
            
            return translated;
        } catch (error) {
            console.error("Translation Engine Exception:", error);
            return null;
        }
    }
};
