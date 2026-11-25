<!-- Stand-in for the team code rules used in strict mode, written from robbe-review-skill's own text and the starter coding rules. Robbe replaces this whole file with the real one. -->
Strict mode only: each rule below that the diff breaks is one 🔵 with the better code and one sentence why, only when the better version is clearly simpler, clearer or more maintainable and carries no risk.
No comments in code; names and structure carry the meaning; a suggested fix never adds a comment.
Minimum code that solves the ticket: no speculative features, no single-use abstraction, no unrequested flexibility or configuration, no error handling for states that cannot happen.
Code that could be a quarter of its length -> show the short version.
Match the surrounding code's style and patterns even where another style reads nicer; a new pattern for something the codebase already solves one way -> point at the existing one.
One source per business rule, value or user-facing text; a second copy is 🟡 Risk per Step 3, never 🔵.
Every changed line traces to the ticket; unrelated changes are judged by Step 2f scope rules, not here.
