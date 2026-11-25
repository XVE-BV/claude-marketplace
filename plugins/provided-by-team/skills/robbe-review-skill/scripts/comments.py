"""Turns a robbe-review-skill comments file into a page with a Copy button per comment and opens it.

Usage: comments.py /tmp/robbe-review-skill/<name>.md ["https://github.com/<owner>/<repo>/pull/<n>"]
"""

import hashlib
import html
import re
import subprocess
import sys
from pathlib import Path

HEADER = re.compile(r"^==== (.+?) ====[ \t]*$", re.M)
LOCATION = re.compile(r"(.+?):~?(\d+)")


def blocks(text):
    parts = HEADER.split(text)
    return [(parts[i].strip(), parts[i + 1].strip("\n")) for i in range(1, len(parts), 2)]


def line_url(pr_url, location):
    match = LOCATION.fullmatch(location.strip())
    if not pr_url or not match:
        return None
    path, line = match.groups()
    return f"{pr_url}/files#diff-{hashlib.sha256(path.encode()).hexdigest()}R{line}"


def card(header, body, pr_url):
    parts = [p.strip() for p in header.split("·")]
    if len(parts) == 3:
        number, severity, location = parts
        url = line_url(pr_url, location)
        place = html.escape(location)
        if url:
            place = f'<a href="{html.escape(url)}" target="_blank">{place}</a>'
        title = f"{html.escape(number)} {html.escape(severity)} {place}"
    else:
        title = html.escape(header)
    return (
        '<section><div class="head"><span>' + title + "</span>"
        '<button onclick="copy(this)">Copy</button></div>'
        "<pre>" + html.escape(body.strip()) + "</pre></section>"
    )


PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review comments — {name}</title>
<style>
:root {{ color-scheme: light dark; --bg: #f6f7f9; --card: #fff; --text: #1d1f23; --muted: #667;
  --line: #dde1e6; --accent: #2563eb; }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg: #16181c; --card: #1f2227; --text: #e6e8eb;
  --muted: #99a; --line: #30343a; --accent: #6ea0ff; }} }}
body {{ margin: 0; padding: 24px; background: var(--bg); color: var(--text);
  font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }}
main {{ max-width: 900px; margin: 0 auto; }}
h1 {{ font-size: 18px; margin: 0 0 16px; }}
h1 a {{ color: var(--accent); }}
section {{ background: var(--card); border: 1px solid var(--line); border-radius: 8px;
  margin-bottom: 16px; overflow: hidden; }}
.head {{ display: flex; justify-content: space-between; align-items: center; gap: 12px;
  padding: 10px 14px; border-bottom: 1px solid var(--line); color: var(--muted); }}
.head a {{ color: var(--accent); }}
button {{ font: inherit; padding: 4px 14px; border-radius: 6px; border: 1px solid var(--line);
  background: var(--bg); color: var(--text); cursor: pointer; }}
button.done {{ border-color: var(--accent); color: var(--accent); }}
pre {{ margin: 0; padding: 14px; white-space: pre-wrap; word-break: break-word;
  font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }}
</style></head>
<body><main>
<h1>{title}</h1>
{cards}
</main>
<script>
function copy(button) {{
  const text = button.closest("section").querySelector("pre").textContent;
  const done = () => {{ button.textContent = "Copied"; button.classList.add("done");
    setTimeout(() => {{ button.textContent = "Copy"; button.classList.remove("done"); }}, 1500); }};
  if (navigator.clipboard && window.isSecureContext) {{
    navigator.clipboard.writeText(text).then(done, () => fallback(text, done));
  }} else {{ fallback(text, done); }}
}}
function fallback(text, done) {{
  const area = document.createElement("textarea");
  area.value = text; document.body.appendChild(area); area.select();
  document.execCommand("copy"); area.remove(); done();
}}
</script>
</body></html>
"""


def main():
    if len(sys.argv) not in (2, 3):
        sys.exit("usage: comments.py <comments.md> [<PR url>]")
    source = Path(sys.argv[1])
    pr_url = sys.argv[2].rstrip("/") if len(sys.argv) == 3 else ""

    found = blocks(source.read_text(encoding="utf-8"))
    if not found:
        sys.exit(f"No '==== ... ====' blocks in {source}.")

    title = html.escape(f"Review comments — {source.stem}")
    if pr_url:
        title = f'<a href="{html.escape(pr_url)}/files" target="_blank">{title}</a>'
    page = PAGE.format(
        name=html.escape(source.stem),
        title=title,
        cards="\n".join(card(h, b, pr_url) for h, b in found),
    )

    target = source.with_suffix(".html")
    target.write_text(page, encoding="utf-8")
    opener = "open" if sys.platform == "darwin" else "xdg-open"
    try:
        subprocess.run([opener, str(target)], check=False)
    except OSError:
        pass
    print(f"{len(found)} comments: {target}")


main()
