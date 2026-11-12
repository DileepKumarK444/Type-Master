export type Level = "beginner" | "intermediate";
export type Kind = "letters" | "capitals" | "punct" | "digits" | "words" | "sentences";

export interface LessonDef {
  id: number;
  unit: number;
  level: Level;
  title: string;
  /** one-line summary shown on the path */
  blurb: string;
  newKeys: string[];
  /** shown in the lesson player */
  tip: string;
  kind: Kind;
  /** minimum accuracy (%) on the final test to pass */
  passAccuracy: number;
  /** WPM needed (with high accuracy) for the third star */
  targetWpm: number;
}

export interface UnitDef { id: number; title: string; level: Level }

export const UNITS: UnitDef[] = [
  { id: 1, title: "Home row", level: "beginner" },
  { id: 2, title: "Top row", level: "beginner" },
  { id: 3, title: "Bottom row & full alphabet", level: "beginner" },
  { id: 4, title: "Capitals & punctuation", level: "intermediate" },
  { id: 5, title: "Numbers", level: "intermediate" },
  { id: 6, title: "Words & sentences", level: "intermediate" },
];

const B = (id: number, unit: number, title: string, blurb: string, newKeys: string[], tip: string, targetWpm: number, kind: Kind = "letters"): LessonDef =>
  ({ id, unit, level: "beginner", title, blurb, newKeys, tip, kind, passAccuracy: 90, targetWpm });
const I = (id: number, unit: number, title: string, blurb: string, newKeys: string[], tip: string, kind: Kind, targetWpm: number): LessonDef =>
  ({ id, unit, level: "intermediate", title, blurb, newKeys, tip, kind, passAccuracy: 93, targetWpm });

export const LESSONS: LessonDef[] = [
  B(1, 1, "Index fingers: F and J", "Find home position", ["f", "j"], "Rest your index fingers on F and J — feel the small bumps. Keep thumbs on the space bar.", 10),
  B(2, 1, "Middle fingers: D and K", "Add the middle fingers", ["d", "k"], "Middle fingers press D (left) and K (right). Return every finger to home after each press.", 10),
  B(3, 1, "Ring fingers: S and L", "Add the ring fingers", ["s", "l"], "Ring fingers are weaker — move slowly and press firmly. S is left, L is right.", 10),
  B(4, 1, "Pinkies: A and ;", "Complete the home row", ["a", ";"], "Pinkies press A and the semicolon. Now all eight fingers sit on the home row.", 10),
  B(5, 1, "Reach: G and H", "Index fingers reach sideways", ["g", "h"], "Stretch the index finger sideways to G or H, then return to F or J.", 10),
  B(6, 2, "Top row: E and I", "Middle fingers reach up", ["e", "i"], "Middle fingers reach up to E (left) and I (right). Come straight back home.", 15),
  B(7, 2, "Top row: R and U", "Index fingers reach up", ["r", "u"], "Index fingers reach up and slightly inward: R (left), U (right).", 15),
  B(8, 2, "Top row: T and Y", "Long index reaches", ["t", "y"], "T and Y are the longest reaches. Use the index finger, then return to F or J.", 15),
  B(9, 2, "Top row: W, O, Q, P", "Ring and pinky reaches", ["w", "o", "q", "p"], "Ring fingers: W and O. Pinkies: Q and P. Keep your wrists relaxed.", 15),
  B(10, 3, "Bottom row: C, M , .", "First reaches down", ["c", "m", ",", "."], "Curl fingers down: C (left middle), M (right index), comma (right middle), period (right ring).", 15),
  B(11, 3, "Bottom row: V, B, N, X, Z, /", "Finish the bottom row", ["v", "b", "n", "x", "z", "/"], "V and B belong to the left index, N to the right index. Z is left pinky, X left ring.", 15),
  B(12, 3, "Full alphabet review", "Every letter together", [], "No new keys — just everything you know. Keep your eyes on the screen, not your hands.", 18),
  I(13, 4, "Capital letters", "Using Shift", ["shift"], "Use the Shift key on the opposite hand: left pinky for right-hand letters, and the reverse.", "capitals", 20),
  I(14, 4, "Punctuation", "Periods, commas, questions", [".", ",", "?", "!", "'"], "Pinky and ring finger handle most punctuation. Add Shift for ? and !.", "punct", 20),
  I(15, 5, "Numbers 1–5", "Left-hand number row", ["1", "2", "3", "4", "5"], "Reach up from the home row; the same finger that types the letter below types the number.", "digits", 20),
  I(16, 5, "Numbers 6–0", "Right-hand number row", ["6", "7", "8", "9", "0"], "Right index covers 6 and 7, then middle, ring and pinky for 8, 9 and 0.", "digits", 20),
  I(17, 6, "Everyday words", "Flow between common words", [], "Type whole words in one smooth rhythm rather than key by key.", "words", 25),
  I(18, 6, "Short sentences", "Capitals and full stops", [], "Think one word ahead. Pause only at the end of a sentence.", "sentences", 25),
  I(19, 6, "Longer sentences", "Commas and question marks", [], "Keep a steady pace. A slower, accurate pace beats a fast, messy one.", "sentences", 28),
  I(20, 6, "Paragraph rhythm", "Build endurance", [], "A full paragraph: keep your rhythm even from first word to last.", "sentences", 30),
];

export const getLesson = (id: number): LessonDef | undefined => LESSONS.find((l) => l.id === id);
export const LESSON_COUNT = LESSONS.length;
