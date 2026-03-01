/**
 * Lightweight, zero-dependency syntax highlighter.
 * Tokenizes source code for common languages and returns React-safe
 * span markup with color classes. Covers JS/TS, Python, HTML, CSS,
 * JSON, Go, Rust, Java, C/C++, Ruby, Shell, SQL, YAML, Markdown, and more.
 */

// ── Token types ──────────────────────────────────────────────────────
export type TokenType =
  | "keyword"
  | "string"
  | "number"
  | "comment"
  | "function"
  | "type"
  | "operator"
  | "punctuation"
  | "property"
  | "tag"
  | "attribute"
  | "variable"
  | "builtin"
  | "regex"
  | "plain";

export interface Token {
  type: TokenType;
  value: string;
}

// ── Color mapping (CSS classes for light/dark) ───────────────────────
export const TOKEN_COLORS: Record<TokenType, string> = {
  keyword: "text-[#d73a49] dark:text-[#ff7b72]",
  string: "text-[#032f62] dark:text-[#a5d6ff]",
  number: "text-[#005cc5] dark:text-[#79c0ff]",
  comment: "text-[#6a737d] dark:text-[#8b949e] italic",
  function: "text-[#6f42c1] dark:text-[#d2a8ff]",
  type: "text-[#22863a] dark:text-[#7ee787]",
  operator: "text-[#d73a49] dark:text-[#ff7b72]",
  punctuation: "text-[#24292e] dark:text-[#c9d1d9]",
  property: "text-[#005cc5] dark:text-[#79c0ff]",
  tag: "text-[#22863a] dark:text-[#7ee787]",
  attribute: "text-[#6f42c1] dark:text-[#d2a8ff]",
  variable: "text-[#e36209] dark:text-[#ffa657]",
  builtin: "text-[#005cc5] dark:text-[#79c0ff]",
  regex: "text-[#032f62] dark:text-[#a5d6ff]",
  plain: "",
};

// ── Language keyword sets ────────────────────────────────────────────
const JS_KEYWORDS = new Set([
  "abstract", "arguments", "async", "await", "break", "case", "catch",
  "class", "const", "continue", "debugger", "default", "delete", "do",
  "else", "enum", "export", "extends", "false", "finally", "for",
  "from", "function", "get", "if", "implements", "import", "in",
  "instanceof", "interface", "let", "new", "null", "of", "package",
  "private", "protected", "public", "return", "set", "static", "super",
  "switch", "this", "throw", "true", "try", "typeof", "undefined",
  "var", "void", "while", "with", "yield", "type", "as", "readonly",
  "declare", "module", "namespace", "require",
]);

const PYTHON_KEYWORDS = new Set([
  "False", "None", "True", "and", "as", "assert", "async", "await",
  "break", "class", "continue", "def", "del", "elif", "else", "except",
  "finally", "for", "from", "global", "if", "import", "in", "is",
  "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try",
  "while", "with", "yield",
]);

const GO_KEYWORDS = new Set([
  "break", "case", "chan", "const", "continue", "default", "defer",
  "else", "fallthrough", "for", "func", "go", "goto", "if", "import",
  "interface", "map", "package", "range", "return", "select", "struct",
  "switch", "type", "var",
]);

const RUST_KEYWORDS = new Set([
  "as", "break", "const", "continue", "crate", "else", "enum", "extern",
  "false", "fn", "for", "if", "impl", "in", "let", "loop", "match",
  "mod", "move", "mut", "pub", "ref", "return", "self", "static",
  "struct", "super", "trait", "true", "type", "unsafe", "use", "where",
  "while", "async", "await", "dyn",
]);

const SQL_KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "INSERT", "UPDATE", "DELETE", "CREATE",
  "DROP", "ALTER", "TABLE", "INDEX", "VIEW", "JOIN", "LEFT", "RIGHT",
  "INNER", "OUTER", "ON", "AND", "OR", "NOT", "IN", "EXISTS", "BETWEEN",
  "LIKE", "ORDER", "BY", "GROUP", "HAVING", "LIMIT", "OFFSET", "AS",
  "SET", "VALUES", "INTO", "NULL", "IS", "DISTINCT", "UNION", "ALL",
  "PRIMARY", "KEY", "FOREIGN", "REFERENCES", "CASCADE", "DEFAULT",
  "CHECK", "CONSTRAINT", "UNIQUE", "IF", "THEN", "ELSE", "END", "CASE",
  "WHEN", "BEGIN", "COMMIT", "ROLLBACK", "GRANT", "REVOKE", "WITH",
  "select", "from", "where", "insert", "update", "delete", "create",
  "drop", "alter", "table", "index", "view", "join", "left", "right",
  "inner", "outer", "on", "and", "or", "not", "in", "exists", "between",
  "like", "order", "by", "group", "having", "limit", "offset", "as",
  "set", "values", "into", "null", "is", "distinct", "union", "all",
  "primary", "key", "foreign", "references", "cascade", "default",
  "check", "constraint", "unique", "if", "then", "else", "end", "case",
  "when", "begin", "commit", "rollback", "grant", "revoke", "with",
]);

const JAVA_KEYWORDS = new Set([
  "abstract", "assert", "boolean", "break", "byte", "case", "catch",
  "char", "class", "const", "continue", "default", "do", "double",
  "else", "enum", "extends", "final", "finally", "float", "for",
  "goto", "if", "implements", "import", "instanceof", "int", "interface",
  "long", "native", "new", "package", "private", "protected", "public",
  "return", "short", "static", "strictfp", "super", "switch",
  "synchronized", "this", "throw", "throws", "transient", "try",
  "void", "volatile", "while", "true", "false", "null",
]);

const CSS_KEYWORDS = new Set([
  "important", "inherit", "initial", "unset", "none", "auto", "block",
  "inline", "flex", "grid", "absolute", "relative", "fixed", "sticky",
  "hidden", "visible", "solid", "dashed", "dotted", "normal", "bold",
]);

const SHELL_KEYWORDS = new Set([
  "if", "then", "else", "elif", "fi", "for", "while", "do", "done",
  "case", "esac", "in", "function", "return", "exit", "echo", "read",
  "export", "source", "local", "declare", "readonly", "unset", "shift",
  "true", "false",
]);

// ── Language detection from string ───────────────────────────────────
function getKeywords(language: string): Set<string> {
  switch (language) {
    case "javascript": case "typescript": case "jsx": case "tsx": return JS_KEYWORDS;
    case "python": return PYTHON_KEYWORDS;
    case "go": return GO_KEYWORDS;
    case "rust": return RUST_KEYWORDS;
    case "sql": return SQL_KEYWORDS;
    case "java": case "kotlin": case "csharp": case "scala": return JAVA_KEYWORDS;
    case "css": case "scss": case "less": return CSS_KEYWORDS;
    case "shell": case "bash": return SHELL_KEYWORDS;
    default: return JS_KEYWORDS;
  }
}

// ── Single-line tokenizer ────────────────────────────────────────────
export function tokenizeLine(line: string, language: string): Token[] {
  const tokens: Token[] = [];
  const keywords = getKeywords(language);
  let i = 0;

  while (i < line.length) {
    // Comments
    if (line[i] === "/" && line[i + 1] === "/") {
      tokens.push({ type: "comment", value: line.slice(i) });
      return tokens;
    }
    if (line[i] === "#" && (language === "python" || language === "shell" || language === "yaml" || language === "ruby")) {
      tokens.push({ type: "comment", value: line.slice(i) });
      return tokens;
    }
    if (line[i] === "-" && line[i + 1] === "-" && language === "sql") {
      tokens.push({ type: "comment", value: line.slice(i) });
      return tokens;
    }

    // Strings
    if (line[i] === '"' || line[i] === "'" || line[i] === "`") {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === "\\") j++;
        j++;
      }
      tokens.push({ type: "string", value: line.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(line[i]) && (i === 0 || /[\s,;:({[=+\-*/%<>!&|^~?]/.test(line[i - 1]))) {
      let j = i;
      if (line[j] === "0" && (line[j + 1] === "x" || line[j + 1] === "X")) {
        j += 2;
        while (j < line.length && /[0-9a-fA-F_]/.test(line[j])) j++;
      } else {
        while (j < line.length && /[0-9._eE+\-]/.test(line[j])) j++;
      }
      tokens.push({ type: "number", value: line.slice(i, j) });
      i = j;
      continue;
    }

    // HTML/XML tags
    if (line[i] === "<" && (language === "html" || language === "xml" || language === "vue" || language === "svelte" || language === "astro")) {
      let j = i + 1;
      if (line[j] === "/") j++;
      while (j < line.length && /[a-zA-Z0-9-]/.test(line[j])) j++;
      if (j > i + 1) {
        tokens.push({ type: "punctuation", value: line.slice(i, i + (line[i + 1] === "/" ? 2 : 1)) });
        tokens.push({ type: "tag", value: line.slice(i + (line[i + 1] === "/" ? 2 : 1), j) });
        i = j;
        continue;
      }
    }

    // Words (identifiers, keywords)
    if (/[a-zA-Z_$@]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);

      if (keywords.has(word)) {
        tokens.push({ type: "keyword", value: word });
      } else if (j < line.length && line[j] === "(") {
        tokens.push({ type: "function", value: word });
      } else if (/^[A-Z][a-zA-Z0-9]*$/.test(word) && word.length > 1) {
        tokens.push({ type: "type", value: word });
      } else if (language === "css" && word.startsWith("@")) {
        tokens.push({ type: "keyword", value: word });
      } else {
        tokens.push({ type: "plain", value: word });
      }
      i = j;
      continue;
    }

    // Operators
    if (/[=+\-*/%<>!&|^~?:]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[=+\-*/%<>!&|^~?:]/.test(line[j])) j++;
      tokens.push({ type: "operator", value: line.slice(i, j) });
      i = j;
      continue;
    }

    // Punctuation
    if (/[{}()[\].,;]/.test(line[i])) {
      tokens.push({ type: "punctuation", value: line[i] });
      i++;
      continue;
    }

    // CSS property-like patterns
    if (language === "css" && line[i] === "-" && /[a-z]/.test(line[i + 1] || "")) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9-]/.test(line[j])) j++;
      tokens.push({ type: "property", value: line.slice(i, j) });
      i = j;
      continue;
    }

    // Whitespace and other
    tokens.push({ type: "plain", value: line[i] });
    i++;
  }

  return tokens;
}
