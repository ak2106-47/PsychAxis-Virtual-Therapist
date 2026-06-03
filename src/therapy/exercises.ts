// The full guided-therapy library. Each exercise is a scripted sequence of
// steps; every step has narration (spoken by Vera + shown on screen), a
// duration used for pacing/timer, and a pose that drives the animated human
// figure. The `goodFor` tags let Vera suggest the right exercise dynamically.

export type ExerciseCategory = "calm" | "ground" | "thoughts" | "lift" | "move";

export type FigurePose =
  | "sitCalm"
  | "standCalm"
  | "breathe"
  | "neckRoll"
  | "shoulderRoll"
  | "reachUp"
  | "sideStretch"
  | "forwardFold"
  | "catCow"
  | "shakeOut"
  | "butterflyHug"
  | "handOnHeart"
  | "sway"
  | "walk";

export interface ExerciseStep {
  text: string;
  seconds: number;
  pose?: FigurePose;
  breath?: "in" | "hold" | "out" | "rest";
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  blurb: string;
  goodFor: string[];
  intro: string;
  steps: ExerciseStep[];
  outro: string;
}

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  calm: "Calm the body",
  ground: "Ground & refocus",
  thoughts: "Work with thoughts",
  lift: "Lift & reconnect",
  move: "Move & release",
};

// Helper to build a box-breathing cycle (in-hold-out-hold).
const boxCycle = (n: number): ExerciseStep[] => {
  const out: ExerciseStep[] = [];
  for (let i = 0; i < n; i++) {
    out.push(
      { text: "Breathe in slowly through your nose…", seconds: 4, pose: "breathe", breath: "in" },
      { text: "Hold gently…", seconds: 4, pose: "breathe", breath: "hold" },
      { text: "And breathe out, all the way…", seconds: 4, pose: "breathe", breath: "out" },
      { text: "Hold, empty…", seconds: 4, pose: "breathe", breath: "rest" }
    );
  }
  return out;
};

export const EXERCISES: Exercise[] = [
  // ---------------- CALM THE BODY ----------------
  {
    id: "box-breathing",
    name: "Box breathing",
    category: "calm",
    blurb: "Paced 4-4-4-4 breathing to settle a racing heart.",
    goodFor: ["anxious", "panicky", "stressed", "overwhelmed", "fearful", "tense"],
    intro:
      "Let's slow things down together with some box breathing. Follow the orb — in, hold, out, hold. I'll count with you.",
    steps: boxCycle(4),
    outro: "Beautiful. Notice your body a little softer now. Stay with this calm as long as you like.",
  },
  {
    id: "pmr",
    name: "Progressive muscle relaxation",
    category: "calm",
    blurb: "Tense and release each muscle group to let go of held tension.",
    goodFor: ["stressed", "tense", "anxious", "restless"],
    intro: "We'll gently tense and release each part of your body. Only as far as is comfortable.",
    steps: [
      { text: "Scrunch your face tight… hold…", seconds: 5, pose: "sitCalm" },
      { text: "…and release. Let it soften completely.", seconds: 6, pose: "sitCalm" },
      { text: "Shrug your shoulders up to your ears… hold…", seconds: 5, pose: "shoulderRoll" },
      { text: "…and drop them. Feel the weight fall away.", seconds: 6, pose: "sitCalm" },
      { text: "Clench your fists and arms… hold…", seconds: 5, pose: "sitCalm" },
      { text: "…and let go. Notice the warmth as they relax.", seconds: 6, pose: "sitCalm" },
      { text: "Finally, tense your legs and feet… hold…", seconds: 5, pose: "standCalm" },
      { text: "…and release everything. Soft, heavy, calm.", seconds: 7, pose: "sitCalm" },
    ],
    outro: "Your whole body has permission to rest now. Well done.",
  },
  {
    id: "body-scan",
    name: "Body scan",
    category: "calm",
    blurb: "Slow attention through the body — good for winding down.",
    goodFor: ["restless", "tense", "stressed", "tired"],
    intro: "Let's gently move our attention through the body, noticing without changing anything.",
    steps: [
      { text: "Bring your attention to the top of your head and your face.", seconds: 8, pose: "sitCalm" },
      { text: "Let it drift down to your neck and shoulders.", seconds: 8, pose: "sitCalm" },
      { text: "Notice your chest rising and falling, and your belly.", seconds: 8, pose: "breathe", breath: "in" },
      { text: "Move down through your arms, all the way to your hands.", seconds: 8, pose: "sitCalm" },
      { text: "And finally your legs and feet, resting on the floor.", seconds: 9, pose: "sitCalm" },
    ],
    outro: "You've visited your whole body with kindness. Notice how it feels now.",
  },
  {
    id: "safe-place",
    name: "Safe-place visualization",
    category: "calm",
    blurb: "Picture a calming place in vivid detail.",
    goodFor: ["anxious", "fearful", "overwhelmed", "stressed"],
    intro: "Let's picture a place where you feel completely safe and at ease. Close your eyes if you'd like.",
    steps: [
      { text: "Imagine a place — real or invented — where you feel calm and safe.", seconds: 10, pose: "sitCalm" },
      { text: "What do you see there? Notice the colors and the light.", seconds: 10, pose: "sitCalm" },
      { text: "What can you hear? And what does the air feel like on your skin?", seconds: 10, pose: "sitCalm" },
      { text: "Let yourself rest here. You can return any time you need to.", seconds: 10, pose: "sitCalm" },
    ],
    outro: "This place is always yours. Carry a little of its calm with you.",
  },

  // ---------------- GROUND & REFOCUS ----------------
  {
    id: "grounding-54321",
    name: "5-4-3-2-1 grounding",
    category: "ground",
    blurb: "Anchor to the present using your five senses.",
    goodFor: ["anxious", "panicky", "overwhelmed", "fearful", "dissociated"],
    intro: "Let's anchor to right now using your senses. Take your time with each one.",
    steps: [
      { text: "Look around and name five things you can see.", seconds: 12, pose: "sitCalm" },
      { text: "Now four things you can feel — your feet, your chair, the air.", seconds: 12, pose: "sitCalm" },
      { text: "Three things you can hear, near or far.", seconds: 11, pose: "sitCalm" },
      { text: "Two things you can smell, or two scents you like.", seconds: 10, pose: "sitCalm" },
      { text: "And one thing you can taste, or one slow breath.", seconds: 9, pose: "breathe", breath: "in" },
    ],
    outro: "You're here, in this moment. That's solid ground to stand on.",
  },
  {
    id: "mindful-observation",
    name: "Mindful observation",
    category: "ground",
    blurb: "Focus fully on one object to quiet a busy mind.",
    goodFor: ["overwhelmed", "anxious", "restless", "rumination"],
    intro: "Pick one object near you. We'll give it our complete attention for a little while.",
    steps: [
      { text: "Hold or look at your object. Notice its shape and edges.", seconds: 12, pose: "sitCalm" },
      { text: "Explore its color, its texture, the way light falls on it.", seconds: 12, pose: "sitCalm" },
      { text: "Imagine seeing it for the very first time, with curiosity.", seconds: 12, pose: "sitCalm" },
    ],
    outro: "When the mind wanders, this is always here — one thing, fully seen.",
  },
  {
    id: "emotion-labeling",
    name: "Name it to tame it",
    category: "ground",
    blurb: "Put words to the feeling to take some of its charge away.",
    goodFor: ["overwhelmed", "angry", "anxious", "sad", "confused"],
    intro: "Naming a feeling can soften it. Let's gently put some words to what's here.",
    steps: [
      { text: "Notice what you're feeling right now. Where do you feel it in your body?", seconds: 10, pose: "handOnHeart" },
      { text: "See if you can name it: 'I'm noticing some…' anxiety, sadness, anger?", seconds: 10, pose: "sitCalm" },
      { text: "There's no wrong answer. Just acknowledge it: 'This is here right now.'", seconds: 10, pose: "sitCalm" },
    ],
    outro: "You met the feeling instead of fighting it. That takes real courage.",
  },

  // ---------------- WORK WITH THOUGHTS ----------------
  {
    id: "cbt-reframe",
    name: "Thought reframe",
    category: "thoughts",
    blurb: "Examine a tough thought and find a more balanced view.",
    goodFor: ["sad", "anxious", "self-critical", "rumination", "hopeless"],
    intro: "Let's gently look at a difficult thought together and see if we can find a fairer view.",
    steps: [
      { text: "Bring to mind one thought that's been weighing on you.", seconds: 10, pose: "sitCalm" },
      { text: "What's the evidence it's completely true? And evidence against it?", seconds: 12, pose: "sitCalm" },
      { text: "What would you say to a friend who had this exact thought?", seconds: 11, pose: "sitCalm" },
      { text: "Can you phrase a kinder, more balanced version of it?", seconds: 11, pose: "sitCalm" },
    ],
    outro: "Thoughts aren't facts. You just practiced holding one a little more gently.",
  },
  {
    id: "defusion",
    name: "Cognitive defusion",
    category: "thoughts",
    blurb: "Create distance from a sticky thought.",
    goodFor: ["rumination", "anxious", "self-critical", "overwhelmed"],
    intro: "We'll practice stepping back from a thought, so it has less grip on you.",
    steps: [
      { text: "Notice the thought that keeps returning.", seconds: 8, pose: "sitCalm" },
      { text: "Now add a phrase: 'I'm having the thought that…' and repeat it.", seconds: 11, pose: "sitCalm" },
      { text: "Then: 'I notice I'm having the thought that…' Feel the small distance.", seconds: 11, pose: "sitCalm" },
      { text: "The thought is something you have — not something you are.", seconds: 9, pose: "sitCalm" },
    ],
    outro: "You're the sky; thoughts are just weather passing through.",
  },
  {
    id: "worry-postponement",
    name: "Worry postponement",
    category: "thoughts",
    blurb: "Park worries in a set 'worry time' to free up now.",
    goodFor: ["anxious", "rumination", "overwhelmed", "restless"],
    intro: "Worries don't all need answering right now. Let's set some of them aside, on purpose.",
    steps: [
      { text: "Notice the worry. Acknowledge it: 'I see you.'", seconds: 9, pose: "sitCalm" },
      { text: "Decide a time later today to think it through — say, fifteen minutes.", seconds: 10, pose: "sitCalm" },
      { text: "Mentally place the worry in a box until then. It will keep.", seconds: 10, pose: "sitCalm" },
      { text: "For now, return your attention to one thing in front of you.", seconds: 9, pose: "sitCalm" },
    ],
    outro: "You're allowed to choose when to carry things. Now isn't the only time.",
  },

  // ---------------- LIFT & RECONNECT ----------------
  {
    id: "gratitude",
    name: "Gratitude reflection",
    category: "lift",
    blurb: "Sit with a few good things to lift a low mood.",
    goodFor: ["sad", "low", "flat", "lonely", "hopeless"],
    intro: "Let's gently turn toward a few good things, however small.",
    steps: [
      { text: "Think of one thing today that went okay, or felt good.", seconds: 10, pose: "handOnHeart" },
      { text: "Now a person you're grateful for. Picture their face.", seconds: 10, pose: "sitCalm" },
      { text: "And one small comfort you sometimes take for granted.", seconds: 10, pose: "sitCalm" },
      { text: "Let the warmth of these sit with you for a moment.", seconds: 9, pose: "handOnHeart" },
    ],
    outro: "Good things can be quiet. You just made a little room to notice them.",
  },
  {
    id: "self-compassion",
    name: "Self-compassion break",
    category: "lift",
    blurb: "Acknowledge the hurt and offer yourself kindness.",
    goodFor: ["self-critical", "sad", "hopeless", "lonely", "ashamed"],
    intro: "Let's offer you the kindness you'd give a good friend. Place a hand on your heart if you like.",
    steps: [
      { text: "Acknowledge it: 'This is a moment of difficulty.'", seconds: 9, pose: "handOnHeart" },
      { text: "Remember you're not alone: 'Struggle is part of being human.'", seconds: 10, pose: "handOnHeart" },
      { text: "Now offer yourself a kind wish: 'May I be gentle with myself.'", seconds: 10, pose: "handOnHeart" },
      { text: "Feel the warmth of your own hand, steady and caring.", seconds: 9, pose: "handOnHeart" },
    ],
    outro: "You deserve your own kindness, especially now. Hold onto that.",
  },
  {
    id: "behavioral-activation",
    name: "One small step",
    category: "lift",
    blurb: "Choose one small, doable, meaningful action.",
    goodFor: ["low", "flat", "hopeless", "stuck", "sad"],
    intro: "When everything feels heavy, one tiny action can shift things. Let's find yours.",
    steps: [
      { text: "Think of something small that usually gives you a little lift.", seconds: 10, pose: "standCalm" },
      { text: "Make it tiny and doable — a glass of water, a window opened, one text.", seconds: 11, pose: "standCalm" },
      { text: "Picture yourself doing just that one thing in the next hour.", seconds: 10, pose: "standCalm" },
    ],
    outro: "You don't have to do it all. Just the next small step. That counts.",
  },
  {
    id: "loving-kindness",
    name: "Loving-kindness",
    category: "lift",
    blurb: "Direct warm wishes toward yourself and others.",
    goodFor: ["lonely", "sad", "angry", "low", "disconnected"],
    intro: "We'll send a few warm wishes outward, and inward. Repeat each phrase quietly.",
    steps: [
      { text: "For yourself: 'May I be happy. May I be at peace.'", seconds: 10, pose: "handOnHeart" },
      { text: "For someone you love: 'May you be happy. May you be at peace.'", seconds: 10, pose: "sitCalm" },
      { text: "For someone you find difficult: 'May you, too, find peace.'", seconds: 11, pose: "sitCalm" },
      { text: "And for everyone: 'May we all be well.'", seconds: 9, pose: "handOnHeart" },
    ],
    outro: "Warmth grows the more it's shared. You just widened the circle.",
  },

  // ---------------- MOVE & RELEASE ----------------
  {
    id: "neck-shoulder",
    name: "Neck & shoulder release",
    category: "move",
    blurb: "Slow rolls to undo desk and phone tension.",
    goodFor: ["tense", "stressed", "restless", "tired"],
    intro: "Let's loosen the neck and shoulders. Move slowly, only within comfort.",
    steps: [
      { text: "Let your head drop gently toward one shoulder. Breathe.", seconds: 7, pose: "neckRoll" },
      { text: "Slowly roll it forward and across to the other side.", seconds: 8, pose: "neckRoll" },
      { text: "Now roll both shoulders up, back, and down, slowly.", seconds: 8, pose: "shoulderRoll" },
      { text: "Reverse the circle — forward, up, and around again.", seconds: 8, pose: "shoulderRoll" },
    ],
    outro: "Feel the space you just made across your neck and shoulders.",
  },
  {
    id: "full-stretch",
    name: "Full-body stretch",
    category: "move",
    blurb: "A guided head-to-toe release.",
    goodFor: ["tense", "tired", "restless", "stressed", "low"],
    intro: "Let's wake the whole body up with a gentle stretch. Move at your own pace.",
    steps: [
      { text: "Reach both arms up high, lengthening your spine. Breathe in.", seconds: 8, pose: "reachUp", breath: "in" },
      { text: "Lean gently to one side, feeling the stretch along your ribs.", seconds: 8, pose: "sideStretch" },
      { text: "And gently to the other side. Slow and easy.", seconds: 8, pose: "sideStretch" },
      { text: "Now fold forward softly, letting your head and arms hang.", seconds: 9, pose: "forwardFold", breath: "out" },
      { text: "Slowly roll back up, one vertebra at a time.", seconds: 8, pose: "standCalm" },
    ],
    outro: "Nicely done. Notice your body feeling a little longer and looser.",
  },
  {
    id: "shake-out",
    name: "Shake it out",
    category: "move",
    blurb: "Gently shake the limbs to discharge stress.",
    goodFor: ["restless", "anxious", "angry", "stressed", "tense"],
    intro: "Animals shake off stress — so can we. Let's shake out the tension. Loose and silly is good.",
    steps: [
      { text: "Start by shaking out your hands and wrists. Keep them loose.", seconds: 8, pose: "shakeOut" },
      { text: "Add your arms, all the way up to the shoulders.", seconds: 8, pose: "shakeOut" },
      { text: "Now bounce gently through your knees, shaking the whole body.", seconds: 9, pose: "shakeOut" },
      { text: "Then slow it down… and come to stillness. Notice the buzz fade.", seconds: 8, pose: "standCalm" },
    ],
    outro: "That restless energy has somewhere to go now. Feel how it settles.",
  },
  {
    id: "yoga-flow",
    name: "Gentle yoga flow",
    category: "move",
    blurb: "A few calming poses linked with breath.",
    goodFor: ["stressed", "tense", "restless", "anxious"],
    intro: "A short, gentle flow. Let your breath lead the movement.",
    steps: [
      { text: "Breathe in and arch gently, opening the chest — like cat-cow.", seconds: 8, pose: "catCow", breath: "in" },
      { text: "Breathe out and round the back softly the other way.", seconds: 8, pose: "catCow", breath: "out" },
      { text: "Reach tall through both arms on a long inhale.", seconds: 8, pose: "reachUp", breath: "in" },
      { text: "Fold forward and release on a slow exhale.", seconds: 9, pose: "forwardFold", breath: "out" },
    ],
    outro: "You moved with your breath. Carry that steadiness with you.",
  },
  {
    id: "mindful-walking",
    name: "Mindful walking",
    category: "move",
    blurb: "A slow, attentive walk — pairs well with grounding.",
    goodFor: ["restless", "low", "anxious", "stuck", "flat"],
    intro: "Let's walk slowly in place, paying attention to each step. Stand when you're ready.",
    steps: [
      { text: "Begin stepping slowly, noticing each foot lifting and landing.", seconds: 10, pose: "walk" },
      { text: "Feel the shift of weight, the contact with the floor.", seconds: 10, pose: "walk" },
      { text: "Match a slow breath to a few steps. In… and out…", seconds: 10, pose: "walk", breath: "in" },
      { text: "Gradually slow to a stop, and feel yourself grounded.", seconds: 8, pose: "standCalm" },
    ],
    outro: "Movement and attention together — a simple way back to yourself.",
  },
  {
    id: "butterfly-hug",
    name: "Butterfly hug",
    category: "move",
    blurb: "Bilateral self-tapping for soothing.",
    goodFor: ["anxious", "fearful", "overwhelmed", "panicky", "sad"],
    intro: "Cross your arms over your chest, hands on opposite shoulders. We'll tap slowly, side to side.",
    steps: [
      { text: "Cross your arms and rest your hands on your shoulders.", seconds: 6, pose: "butterflyHug" },
      { text: "Tap one hand, then the other — slow, like a butterfly's wings.", seconds: 12, pose: "butterflyHug" },
      { text: "Keep the rhythm steady, and breathe slowly as you tap.", seconds: 12, pose: "butterflyHug", breath: "in" },
      { text: "Let the taps gradually slow… and rest your hands.", seconds: 8, pose: "handOnHeart" },
    ],
    outro: "That steady rhythm tells your nervous system it's safe. Well done.",
  },
  {
    id: "grounded-standing",
    name: "Grounded standing",
    category: "move",
    blurb: "Root through your feet and find steadiness.",
    goodFor: ["anxious", "overwhelmed", "dissociated", "restless", "fearful"],
    intro: "Let's find some solid ground. Stand with your feet about hip-width apart.",
    steps: [
      { text: "Press your feet evenly into the floor. Feel them rooted.", seconds: 9, pose: "standCalm" },
      { text: "Let your knees soften, and sway gently side to side.", seconds: 9, pose: "sway" },
      { text: "Slow the sway, find your center, tall and steady.", seconds: 9, pose: "standCalm" },
      { text: "Take one full breath here, strong and grounded.", seconds: 8, pose: "standCalm", breath: "in" },
    ],
    outro: "You're rooted and steady. The ground has you.",
  },
];

export const exerciseById = (id: string): Exercise | undefined =>
  EXERCISES.find((e) => e.id === id);

export const exercisesByCategory = (): Record<ExerciseCategory, Exercise[]> => {
  const out = { calm: [], ground: [], thoughts: [], lift: [], move: [] } as Record<
    ExerciseCategory,
    Exercise[]
  >;
  for (const e of EXERCISES) out[e.category].push(e);
  return out;
};

// Compact catalog (id, name, goodFor) sent to the model so it can suggest one.
export const CATALOG_FOR_MODEL = EXERCISES.map((e) => ({
  id: e.id,
  name: e.name,
  goodFor: e.goodFor,
}));
