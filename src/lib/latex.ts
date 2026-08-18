const GREEK: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", zeta: "ζ",
  eta: "η", theta: "θ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ",
  nu: "ν", xi: "ξ", omicron: "ο", pi: "π", rho: "ρ", sigma: "σ",
  varsigma: "ς", tau: "τ", upsilon: "υ", phi: "φ", chi: "χ", psi: "ψ",
  omega: "ω",
  Alpha: "Α", Beta: "Β", Gamma: "Γ", Delta: "Δ", Epsilon: "Ε", Zeta: "Ζ",
  Eta: "Η", Theta: "Θ", Iota: "Ι", Kappa: "Κ", Lambda: "Λ", Mu: "Μ",
  Nu: "Ν", Xi: "Ξ", Omicron: "Ο", Pi: "Π", Rho: "Ρ", Sigma: "Σ",
  Tau: "Τ", Upsilon: "Υ", Phi: "Φ", Chi: "Χ", Psi: "Ψ", Omega: "Ω",
};

const SYMBOLS: Record<string, string> = {
  times: "×", cdot: "·", div: "÷", pm: "±", mp: "∓", ne: "≠", le: "≤",
  ge: "≥", approx: "≈", equiv: "≡", sim: "∼", propto: "∝",
  in: "∈", notin: "∉", subset: "⊂", supset: "⊃", cap: "∩", cup: "∪",
  emptyset: "∅", infty: "∞", to: "→", rightarrow: "→", leftarrow: "←",
  Rightarrow: "⇒", Leftarrow: "⇐", leftrightarrow: "↔",
  implies: "⇒", Leftrightarrow: "⇔", exists: "∃", forall: "∀", partial: "∂",
  nabla: "∇", degree: "°", degrees: "°", angle: "∠", sum: "∑", prod: "∏",
  int: "∫", prime: "′", ldots: "…", cdots: "⋯", bullet: "•", oplus: "⊕",
  otimes: "⊗", iff: "⇔", not: "¬", and: "∧", or: "∨",
};

const SUPER: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶",
  "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", "(": "⁽", ")": "⁾",
  "=": "⁼", "n": "ⁿ", "i": "ⁱ", "a": "ᵃ", "b": "ᵇ", "c": "ᶜ", "d": "ᵈ",
  "e": "ᵉ", "m": "ᵐ", "p": "ᵖ", "r": "ʳ", "t": "ᵗ", "x": "ˣ", "k": "ᵏ",
};

const SUB: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆",
  "7": "₇", "8": "₈", "9": "₉", "+": "₊", "-": "₋", "(": "₍", ")": "₎",
  "=": "₌", "a": "ₐ", "e": "ₑ", "i": "ᵢ", "o": "ₒ", "r": "ᵣ", "u": "ᵤ",
  "x": "ₓ",
};

function mapChars(input: string, table: Record<string, string>): string {
  let out = "";
  for (const ch of input) out += table[ch] ?? ch;
  return out;
}

function convertGroup(inner: string): string {
  let s = inner;
  // \text{...} y variantes \mathrm{...}, etc. -> contenido
  s = s.replace(
    /\\(?:text|mathrm|mathbf|mathit|mathtt|mathsf|mathbb|mathcal|boldsymbol|operatorname|textup)\{([^{}]*)\}/g,
    "$1"
  );
  // \frac{a}{b} -> (a)/(b)
  s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)");
  // \sqrt[n]{x} y \sqrt{x}
  s = s.replace(
    /\\sqrt\[([^{}]*)\]\{([^{}]*)\}/g,
    (_, n, x) => mapChars(n, SUPER) + "√" + x
  );
  s = s.replace(/\\sqrt\{([^{}]*)\}/g, "√$1");
  // \left( \right) etc.
  s = s.replace(
    /\\(?:left|right|big|Big|bigg|Bigg|bigl|bigr|Bigl|Bigr|biggl|biggr)([()\[\]{}|.])/g,
    "$1"
  );
  s = s.replace(/\\(?:left|right)\./g, "");
  // espaciado
  s = s.replace(/\\(?:,|;|:|\!|\ )/g, " ");
  s = s.replace(/\\(?:quad|qquad)\s*/g, "  ");
  s = s.replace(/\\(?:hspace\{[^{}]*\})\s*/g, " ");
  // exponentes y subíndices
  s = s.replace(/\^\{([^{}]*)\}/g, (_, g) => mapChars(g, SUPER));
  s = s.replace(/\^([0-9a-zA-Z+\-=(])/g, (_, c) => SUPER[c] ?? c);
  s = s.replace(/\_\{([^{}]*)\}/g, (_, g) => mapChars(g, SUB));
  s = s.replace(/\_([0-9a-zA-Z+\-=(])/g, (_, c) => SUB[c] ?? c);
  // comandos nombrados (griego y símbolos)
  s = s.replace(/\\([a-zA-Z]+)/g, (_, name) => GREEK[name] ?? SYMBOLS[name] ?? `\\${name}`);
  // backslashes residuales
  s = s.replace(/\\/g, "");
  return s.trim();
}

/**
 * Convierte expresiones LaTeX inline ($$...$$, $...$, \[...\], \(...\))
 * a texto con símbolos Unicode legibles.
 */
export function convertLatex(text: string): string {
  return text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, g) => convertGroup(g))
    .replace(/\$([^$\n]+)\$/g, (_, g) => convertGroup(g))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, g) => convertGroup(g))
    .replace(/\\\(([^\\\n]+?)\\\)/g, (_, g) => convertGroup(g));
}