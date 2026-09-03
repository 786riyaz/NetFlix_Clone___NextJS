const LANGUAGE_NAMES: Record<string, string> = {
en: "English", eng: "English",
hi: "Hindi", hin: "Hindi",
te: "Telugu", tel: "Telugu",
ta: "Tamil", tam: "Tamil",
kn: "Kannada", kan: "Kannada",
ml: "Malayalam", mal: "Malayalam",
bn: "Bengali", ben: "Bengali",
mr: "Marathi", mar: "Marathi",
gu: "Gujarati", guj: "Gujarati",
pa: "Punjabi", pan: "Punjabi",
ur: "Urdu", urd: "Urdu",
or: "Odia", ori: "Odia",
as: "Assamese", asm: "Assamese",
ja: "Japanese", jpn: "Japanese",
ko: "Korean", kor: "Korean",
zh: "Chinese", chi: "Chinese", zho: "Chinese",
fr: "French", fre: "French", fra: "French",
de: "German", ger: "German", deu: "German",
es: "Spanish", spa: "Spanish",
it: "Italian", ita: "Italian",
pt: "Portuguese", por: "Portuguese",
ru: "Russian", rus: "Russian",
ar: "Arabic", ara: "Arabic",
th: "Thai", tha: "Thai",
vi: "Vietnamese", vie: "Vietnamese",
id: "Indonesian", ind: "Indonesian",
tr: "Turkish", tur: "Turkish",
nl: "Dutch", dut: "Dutch", nld: "Dutch",
pl: "Polish", pol: "Polish",
und: "Unknown",
};

/** Best-effort human label for an audio track: prefers an embedded title
 * (e.g. "Hindi 5.1"), falls back to the language code lookup, then the
 * raw code, then a generic "Track N". */
export function languageName(code: string | null, title: string | null, indexForFallback: number): string {
if (title && title.trim()) return title.trim();
if (code) {
const key = code.toLowerCase().trim();
if (LANGUAGE_NAMES[key]) return LANGUAGE_NAMES[key];
return code.toUpperCase();
}
return `Track ${indexForFallback + 1}`;
}
