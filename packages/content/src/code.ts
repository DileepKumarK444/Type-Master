/**
 * Real code for programmers to practise on. Rules for every snippet: plain ASCII typeable on a US keyboard, indentation
 * with SPACES (never tabs), 1–4 lines, no trailing spaces. Lines are separated by "\n" (the Enter key).
 */
export type CodeLang = "js" | "python" | "sql" | "shell" | "html";

export const CODE_LANGS: { id: CodeLang; label: string }[] = [
  { id: "js", label: "JavaScript / TypeScript" },
  { id: "python", label: "Python" },
  { id: "sql", label: "SQL" },
  { id: "shell", label: "Shell & Git" },
  { id: "html", label: "HTML & CSS" },
];

export const SNIPPETS: Record<CodeLang, string[]> = {
  js: [
    "const total = items.reduce((sum, item) => sum + item.price, 0);",
    "function add(a, b) {\n  return a + b;\n}",
    'if (user && user.isActive) {\n  console.log("Welcome back!");\n}',
    "const names = users.map((u) => u.name).filter(Boolean);",
    "async function load(id) {\n  const res = await fetch(`/api/items/${id}`);\n  return res.json();\n}",
    "for (let i = 0; i < arr.length; i++) {\n  total += arr[i];\n}",
    "export default function App() {\n  return <Button onClick={() => setOpen(!open)}>Toggle</Button>;\n}",
    'const { id, name = "guest", ...rest } = props;',
    "const isValid = value !== null && value !== undefined && value.length > 0;",
    "try {\n  await save(data);\n} catch (err) {\n  console.error(err.message);\n}",
  ],
  python: [
    'def greet(name):\n    return f"Hello, {name}!"',
    "squares = [x ** 2 for x in range(10) if x % 2 == 0]",
    'with open("data.txt", "r") as f:\n    lines = f.read().splitlines()',
    'for key, value in config.items():\n    print(f"{key}: {value}")',
    "class User:\n    def __init__(self, name):\n        self.name = name",
    "import os\nfrom pathlib import Path",
    "result = {k: v for k, v in data.items() if v is not None}",
    "try:\n    value = int(text)\nexcept ValueError:\n    value = 0",
  ],
  sql: [
    "SELECT id, name, email FROM users WHERE active = 1 ORDER BY created_at DESC LIMIT 10;",
    "INSERT INTO orders (user_id, total) VALUES (42, 19.99);",
    "UPDATE users SET last_login = NOW() WHERE id = 7;",
    "SELECT u.name, COUNT(o.id) AS orders\nFROM users u\nJOIN orders o ON o.user_id = u.id\nGROUP BY u.name;",
    "CREATE TABLE items (\n  id SERIAL PRIMARY KEY,\n  title TEXT NOT NULL\n);",
    "DELETE FROM sessions WHERE expires_at < NOW();",
  ],
  shell: [
    'git commit -m "Fix login redirect"',
    "git checkout -b feature/new-lesson",
    "npm install && npm run build",
    'cd ~/projects && ls -la | grep ".js"',
    "docker run -p 3000:3000 --rm my-app:latest",
    'curl -s https://api.example.com/items | jq ".[0]"',
    'export DATABASE_URL="postgres://localhost:5432/app"',
    "git log --oneline --graph --all",
  ],
  html: [
    '<div class="card">\n  <h2 id="title">Hello</h2>\n</div>',
    '<a href="/about" target="_blank">About us</a>',
    ".button {\n  padding: 8px 16px;\n  border-radius: 4px;\n}",
    '<input type="email" name="email" required />',
    "body { margin: 0; font-family: sans-serif; }",
    "<ul>\n  <li>One</li>\n  <li>Two</li>\n</ul>",
    "@media (max-width: 600px) {\n  .menu { display: none; }\n}",
  ],
};

/** Short code-ish tokens for the bracket / operator drills (single line, no spaces inside a token unless natural). */
export const BRACKET_TOKENS = [
  "fn(x)", "arr[0]", "{ a: 1 }", "[1, 2, 3]", '"text"', "'ok'", "(a, b)", "list[i][j]", "obj.key", "map(f)", "{}", "[]", "()", "<div>", "Array<T>",
  "if (x) {", "}", "foo(bar(1))", "{ ...rest }", "items[idx]", "`tpl`", '["a", "b"]', "(x) => {", "})", "];", "});", "new Map()", "fn({ id })",
];

export const OPERATOR_TOKENS = [
  "a === b", "x !== y", "i++", "n += 1", "a && b", "a || b", "x ?? y", "p => p.id", "a <= b", "i % 2", "!ok", "a ? b : c", "x ** 2",
  "a | b", "a & b", "~x", "x << 2", "n /= 2", "n -= 1", "a ^ b", "i--", "a >= b", "x *= 3", "a != b", "!!value", "a == b", "x >>> 1", "a <> b",
];
