export const BACKEND_MOOD_MAP = {
  "Happy": "Happy",
  "Sad": "Sad",
  "Stressed": "Stressed",
  "Anxious": "Anxious",
  "Neutral": "Neutral",
  "Love": "Happy",
  "Motivated": "Motivated",
  "Lonely": "Sad",
  "Overwhelmed": "Stressed",
  "Angry": "Angry",
  "Grateful": "Calm",
  "Tired": "Tired",
};

export const isTechnicalOrFactual = (text) => {
  const clean = text.toLowerCase();
  const techKeywords = [
    "javascript", "python", "html", "css", "code", "function", "api", "database", "sql",
    "git", "npm", "server", "class", "react", "vue", "compile", "bug", "error", "math",
    "equation", "formula", "translate", "translation", "meaning", "define", "what is",
    "how to write", "solve", "factorial", "algorithm", "json", "object", "array",
    "variable", "typescript", "c++", "java", "coding", "programming", "bug", "debugging"
  ];
  const hasTech = techKeywords.some(kw => clean.includes(kw));
  const personalPronouns = ["i", "me", "my", "myself", "feel", "feeling", "am", "was", "want", "wish", "hate", "love", "sad", "happy", "stress", "anxious", "tired", "excited", "upset"];
  const hasPersonal = personalPronouns.some(p => {
    const regex = new RegExp(`\\b${p}\\b`, "i");
    return regex.test(clean);
  });
  return hasTech && !hasPersonal;
};

export const analyzeMoodAndIntensity = (text, backendMoodHint, currentMoodState) => {
  const cleanText = text.toLowerCase();
  if (isTechnicalOrFactual(text)) {
    return currentMoodState;
  }

  const moodsList = ["Happy", "Neutral", "Sad", "Angry", "Anxious", "Stressed", "Excited", "Motivated", "Tired", "Calm"];
  const confidences = { ...currentMoodState.confidences };
  let currentMood = currentMoodState.currentMood;

  let hintMood = null;
  if (backendMoodHint && BACKEND_MOOD_MAP[backendMoodHint]) {
    hintMood = BACKEND_MOOD_MAP[backendMoodHint];
  }

  const highIntensityKeywords = ["lost", "passed away", "died", "hopeless", "fired", "happiest", "dream interview", "perfect", "furious", "ruined", "disaster", "broken", "depression", "depressed", "worst day", "suicide", "end it", "kill myself"];
  const isHighIntensity = highIntensityKeywords.some(kw => cleanText.includes(kw));

  const mediumIntensityKeywords = ["stressed", "anxious", "worried", "nervous", "sad", "angry", "annoyed", "excited", "motivated", "tired", "exhausted", "lonely", "alone", "calm", "peaceful", "happy", "glad"];
  const isMediumIntensity = mediumIntensityKeywords.some(kw => cleanText.includes(kw));

  const intensityMultiplier = isHighIntensity ? 3 : (isMediumIntensity ? 2 : 1);

  let strongOverrideDetected = false;
  if (isHighIntensity) {
    if (cleanText.includes("lost") || cleanText.includes("died") || cleanText.includes("passed away") || cleanText.includes("hopeless") || cleanText.includes("depressed")) {
      confidences.Sad = Math.min(100, confidences.Sad + 50);
      strongOverrideDetected = true;
    } else if (cleanText.includes("fired") || cleanText.includes("ruined") || cleanText.includes("worst day")) {
      confidences.Stressed = Math.min(100, confidences.Stressed + 45);
      strongOverrideDetected = true;
    } else if (cleanText.includes("happiest") || cleanText.includes("dream interview") || cleanText.includes("perfect")) {
      confidences.Happy = Math.min(100, confidences.Happy + 50);
      confidences.Excited = Math.min(100, confidences.Excited + 50);
      strongOverrideDetected = true;
    } else if (cleanText.includes("furious") || cleanText.includes("hate")) {
      confidences.Angry = Math.min(100, confidences.Angry + 45);
      strongOverrideDetected = true;
    }
  }

  const moodKeywords = {
    Happy: ["happy", "glad", "joy", "cheerful", "good", "great", "wonderful", "amazing", "smiling", "smile"],
    Sad: ["sad", "unhappy", "cry", "crying", "tears", "lonely", "alone", "grief", "upset"],
    Angry: ["angry", "mad", "frustrated", "pissed", "irritated", "annoyed"],
    Anxious: ["anxious", "nervous", "scared", "fear", "afraid", "panic", "worry", "worried", "unsettled"],
    Stressed: ["stressed", "stress", "overwhelmed", "pressure", "exams", "deadlines", "exam", "study"],
    Excited: ["excited", "thrilled", "hype", "eager", "awesome"],
    Motivated: ["motivated", "determined", "inspire", "inspired", "focus", "focused", "build", "create", "make", "success", "achieve"],
    Tired: ["tired", "exhausted", "sleepy", "drained", "fatigue", "weary", "burnout", "burnt out"],
    Calm: ["calm", "peaceful", "relaxed", "peace", "grateful", "thankful", "blessed", "steady", "chill"],
  };

  let matchedMoods = [];
  Object.entries(moodKeywords).forEach(([mood, keywords]) => {
    if (keywords.some(kw => cleanText.includes(kw))) {
      matchedMoods.push(mood);
    }
  });

  if (hintMood && hintMood !== "Neutral" && !matchedMoods.includes(hintMood)) {
    matchedMoods.push(hintMood);
  }

  if (matchedMoods.length > 0) {
    matchedMoods.forEach(mood => {
      const baseIncrease = 15;
      const increase = baseIncrease * intensityMultiplier;
      confidences[mood] = Math.min(100, confidences[mood] + increase);
    });

    moodsList.forEach(mood => {
      if (mood !== "Neutral" && !matchedMoods.includes(mood)) {
        const baseDecrease = 5;
        const decrease = baseDecrease * intensityMultiplier;
        confidences[mood] = Math.max(0, confidences[mood] - decrease);
      }
    });

    confidences.Neutral = Math.max(0, confidences.Neutral - (10 * intensityMultiplier));
  } else {
    const currentDominant = currentMood;
    if (currentDominant !== "Neutral") {
      confidences[currentDominant] = Math.max(0, confidences[currentDominant] - 10);
    }
    confidences.Neutral = Math.min(100, confidences.Neutral + 10);
  }

  const sum = Object.values(confidences).reduce((a, b) => a + b, 0);
  if (sum > 200) {
    const factor = 200 / sum;
    Object.keys(confidences).forEach(m => {
      confidences[m] = Math.min(100, Math.round(confidences[m] * factor));
    });
  }

  let maxMood = currentMood;
  let maxVal = confidences[currentMood] || 0;

  Object.entries(confidences).forEach(([mood, val]) => {
    if (mood !== currentMood) {
      if (val > (confidences[currentMood] || 0) + 15 && val > maxVal) {
        maxVal = val;
        maxMood = mood;
      }
    }
  });

  return {
    currentMood: maxMood,
    confidences: confidences
  };
};
