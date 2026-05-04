# AI Writing Patterns Dictionary

Full reference of AI writing tells. Compiled from Wikipedia's "Signs of AI Writing,"
GPTZero research, and the brandonwise/blader/lguz humanizer projects.

---

## 1. Banned Vocabulary

### Tier 1 — Dead giveaways (almost never used naturally by humans)

| AI word | Human alternative |
|---------|-------------------|
| delve | dig into, look at, explore |
| tapestry | mix, combination |
| landscape (abstract) | space, world, field |
| pivotal | important, key, big |
| underscore (verb) | show, highlight |
| testament | proof, sign, evidence |
| intricate / intricacies | complicated, detailed, tricky |
| meticulous / meticulously | careful, thorough |
| nuanced | subtle, complex |
| multifaceted | complex, many-sided |
| embark | start, begin |
| spearhead | lead, drive |
| bolster / bolstered | support, strengthen |
| garner | get, earn, attract |
| interplay | relationship, interaction |
| realm | area, space, world |
| robust | strong, solid |
| seamless / seamlessly | smooth, easy |
| groundbreaking | new, novel |
| transformative | big, significant |
| paramount | most important |
| myriad | many |
| cornerstone | foundation, basis |
| catalyst | trigger, spark |
| invaluable | very useful |
| bustling | busy, active |
| nestled | located, sitting |
| reimagine | rethink, redesign |
| empower | help, enable, let |
| vibrant | lively, active |
| comprehensive | full, complete, thorough |

### Tier 2 — Overused (humans use them, AI clusters them)

| AI word | Human alternative |
|---------|-------------------|
| crucial | important, key |
| enhance | improve, boost |
| leverage | use, take advantage of |
| navigate (abstract) | deal with, handle, figure out |
| illuminate | clarify, show, explain |
| showcase | show, display |
| foster | encourage, support, grow |
| enduring | lasting, long-term |
| holistic | complete, whole |
| innovative | new, creative, fresh |
| dynamic | active, changing, fluid |
| cutting-edge | latest, newest |
| game-changer | big deal, breakthrough |
| resonate | connect, land, hit home |

### Tier 3 — Transition clusters (fine alone; a tell when clustered)

Furthermore, Moreover, Additionally, Consequently, Nevertheless, Subsequently,
Notably, Indeed, Nonetheless, Hence, Thus, In conclusion, In summary,
"It's worth noting that", "It's important to understand that" → delete or replace
with simpler connectors ("also", "but", "so") or no connector at all.

### Overused phrases

- "In today's digital age" / "rapidly evolving landscape"
- "plays a crucial role" / "serves as a testament"
- "delve into" / "harness the power of" / "embark on a journey"
- "without further ado" / "let's dive in" / "let's unpack this"
- "key takeaways" / "paradigm shift" / "move the needle"
- "double-click on" / "circle back" / "pain points"
- "not only X but also Y" / "not just X, it's Y"

---

## 2. Structural Patterns

### Em dash overuse
**Tell:** AI uses em dashes at 3–5× the rate of human writers. Wikipedia editors
call it the "ChatGPT dash."
```
Before: The term is primarily promoted by Dutch institutions—not by the people
themselves—even in official documents.
After: The term is primarily promoted by Dutch institutions, not by the people
themselves, even in official documents.
```
**Rule:** Max 1 em dash per 500 words, only for genuine emphasis.

### Parallel negation ("Not X, but Y")
**Tell:** Appears 5–10× more often in AI text than human text.
```
Before: It's not just about the beat riding under the vocals; it's part of the
aggression and atmosphere.
After: The heavy beat adds to the aggressive tone.
```

### Rule of three (tricolon)
**Tell:** AI forces ideas into groups of three to sound comprehensive.
```
Before: The event features keynote sessions, panel discussions, and networking
opportunities.
After: The event includes talks and panels, with time for networking between sessions.
```

### Rhetorical Q + answer
**Tell:** "What does this mean? It means..." Used as a transition device every few
paragraphs. State the point directly.
```
Before: What does this mean in practice? It means teams need autonomy.
After: Teams need autonomy.
```

### Mirror structure (A/B parallelism)
**Tell:** Perfect structural symmetry in consecutive sentences.
```
Before: Engineers want clarity. Managers want context.
After: Engineers want clarity. For managers, it's more about context — what's
happening around the decision they can't see from their level.
```

### Inflation of importance
**Tell:** AI puffs up significance without adding information.
```
Before: This marks a pivotal moment in the evolution of regional statistics. This
is a testament to ongoing commitment.
After: The Statistical Institute of Catalonia was established in 1989 to collect
and publish regional statistics independently.
```

### Neat paragraph endings
**Tell:** Every paragraph wraps up with a tidy conclusion or takeaway.
**Fix:** Let at least 30% of paragraphs just stop. Not every thought needs a landing.

### Signposting / announcement
**Tell:** "Let's dive in", "Here's what you need to know", "Without further ado."
```
Before: Let's dive into how caching works in Next.js. Here's what you need to know.
After: Next.js caches data at multiple layers, including request memoization, the
data cache, and the router cache.
```

### Fragmented headers
**Tell:** Heading followed by a one-liner that just restates it before the real
content.
```
Before:
## Performance
Speed matters.
When users hit a slow page, they leave.

After:
## Performance
When users hit a slow page, they leave.
```

### Inline-header lists
**Tell:** Every bullet starts with a bold phrase followed by a colon.
```
Before:
- **Speed:** Code generation is faster, reducing friction.
- **Quality:** Output quality has been enhanced.

After:
Code generation is faster. Output quality has improved through better training.
```

### Copula avoidance
**Tell:** "serves as", "stands as", "boasts", "features" instead of "is" / "has".
```
Before: Gallery 825 serves as LAAA's exhibition space and boasts 3,000 square feet.
After: Gallery 825 is LAAA's exhibition space. It has 3,000 square feet.
```

### Superficial -ing analyses
**Tell:** Tacking "-ing" participial phrases onto sentences to add fake depth.
```
Before: The temple uses blue and gold, reflecting the community's deep connection
to the land, symbolizing the Gulf coast, showcasing regional identity.
After: The architect chose blue and gold to reference local bluebonnets and the
Gulf coast.
```

### Vague attributions
**Tell:** "Experts believe", "Studies show", "Industry observers note."
```
Before: Experts believe it plays a crucial role in the regional ecosystem.
After: A 2019 survey by the Chinese Academy of Sciences found several endemic
fish species.
```

### Formulaic challenges section
**Tell:** "Despite challenges... continues to thrive."
```
Before: Despite challenges typical of urban areas, Korattur continues to thrive
as an integral part of Chennai's growth.
After: Traffic congestion increased after 2015 when three new IT parks opened.
```

---

## 3. Communication Artifacts

These belong in chat interfaces, not in content:

- "Great question!" / "Certainly!" / "Of course!" / "You're absolutely right!"
- "I hope this helps!" / "Let me know if you'd like me to expand on this."
- "As of my last training..." / "While specific details are limited..."
- "Here is an overview of..." / "Would you like me to..."

**Fix:** Cut them entirely. Start with the actual content.

---

## 4. Formatting Tells

- **Boldface overuse** — mechanical emphasis everywhere. Use sparingly; bold only
  what truly requires it.
- **Emojis in professional text** — 🚀💡✅ decorating bullets and headings.
- **Curly/smart quotes** — AI outputs "..." (curly), humans type "..." (straight).
- **Title Case In Every Heading** — use sentence case instead.
- **Uniform paragraph structure** — every paragraph same length, same shape. Vary it.
- **Hyphenated word pairs** — AI hyphenates "data-driven", "client-facing",
  "decision-making" with perfect consistency. Humans are inconsistent.

---

## 5. Tone Tells

- **No imperfections** — human writing has half-finished thoughts, awkward transitions,
  fragments, sentences starting with "And" or "But." AI text is uniformly polished.
- **Too balanced** — AI gives equal weight to all perspectives. Real humans have
  opinions.
- **Absence of personal voice** — no humor, no sarcasm, no frustration, no tangents.
- **Uniform sentence length** — AI writes at a steady rhythm. Humans speed up and
  slow down.
- **Excessive hedging** — "generally speaking," "to some extent," "it could be argued
  that." Just say what you think.
- **Generic conclusions** — "The future looks bright", "Exciting times lie ahead."
  End with something specific.
- **No concrete details** — AI generates plausible-sounding but generic examples.
  Real writing has specific names, dates, places, numbers.

---

## Sources

- [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)
- [brandonwise/humanizer](https://github.com/brandonwise/humanizer) (MIT)
- [blader/humanizer](https://github.com/blader/humanizer) (MIT)
- [lguz/humanize-writing-skill](https://github.com/lguz/humanize-writing-skill)
