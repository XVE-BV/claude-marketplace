#!/bin/sh
# Opt-in user-scope Claude Code preferences.
# Args: workflows memory recap suggestions idlecompact style advisor chat coding writing
set -eu

dir=${CLAUDE_CONFIG_DIR:-$HOME/.claude}
file=$dir/settings.json
src=$(cd "$(dirname "$0")" && pwd)/../assets/rules
names="workflows memory recap suggestions idlecompact style advisor chat coding writing"

# settings item: name -> "key value"
spec_of() {
  case $1 in
    workflows) echo "disableWorkflows true" ;;
    memory) echo "autoMemoryEnabled false" ;;
    recap) echo "awaySummaryEnabled false" ;;
    suggestions) echo "promptSuggestionEnabled false" ;;
    idlecompact) echo "idleCompaction false" ;;
    style) echo 'outputStyle "starter:ultra-concise"' ;;
    *) return 1 ;;
  esac
}

# rule item: name -> file name under assets/rules and under $dir/rules
rule_of() {
  case $1 in
    advisor|chat|coding|writing) echo "starter-$1.md" ;;
    *) return 1 ;;
  esac
}

# is_object: file holds a JSON object. get KEY: current value as JSON, or "unset".
# put KEY VALUE: rewrite the file with KEY set.
is_object() {
  python3 -c 'import json,sys; assert isinstance(json.load(open(sys.argv[1], encoding="utf-8-sig")), dict)' "$file" 2>/dev/null
}
get() {
  python3 -c 'import json,sys; d=json.load(open(sys.argv[1], encoding="utf-8-sig")); print(json.dumps(d[sys.argv[2]]) if sys.argv[2] in d else "unset")' "$file" "$1"
}
put() {
  python3 -c 'import json,sys; d=json.load(open(sys.argv[1], encoding="utf-8-sig")); d[sys.argv[2]]=json.loads(sys.argv[3]); open(sys.argv[1] + ".tmp", "w", encoding="utf-8", newline="\n").write(json.dumps(d, indent=2, ensure_ascii=False) + "\n")' "$file" "$1" "$2"
  mv "$file.tmp" "$file"
}

# install_rule NAME: copy asset to $dir/rules as LF; overwrite when content differs.
install_rule() {
  f=$(rule_of "$1")
  s=$src/$f
  t=$dir/rules/$f
  [ -f "$s" ] || { echo "missing asset: $s"; exit 1; }
  mkdir -p "$dir/rules"
  tr -d '\r' < "$s" > "$t.tmp"
  if [ -f "$t" ]; then
    if tr -d '\r' < "$t" | cmp -s - "$t.tmp"; then
      rm "$t.tmp"
      echo "already rule $t"
      return 0
    fi
  fi
  mv "$t.tmp" "$t"
  echo "written rule $t"
}

[ $# -gt 0 ] || { echo "usage: setup.sh $names"; exit 2; }
settings=0
ruleitems=0
for name in "$@"; do
  if spec_of "$name" >/dev/null 2>&1; then settings=1
  elif rule_of "$name" >/dev/null 2>&1; then ruleitems=1
  else echo "unknown name: $name ($names)"; exit 2
  fi
done

if [ $settings = 1 ]; then
  python3 -c 'pass' >/dev/null 2>&1 || { echo "needs python3: xcode-select --install (macOS), apt install python3 (Linux)"; exit 1; }
  if [ -f "$file" ]; then
    [ -s "$file" ] && ! is_object && { echo "invalid JSON object: $file"; exit 1; }
    [ -s "$file" ] || printf '{}\n' > "$file"
  else
    mkdir -p "$dir"
    printf '{}\n' > "$file"
    echo "created $file"
  fi
fi

skip_rules=0
if [ $ruleitems = 1 ] && [ -f "$dir/CLAUDE.md" ] && grep -q 'BEGIN core:guidelines' "$dir/CLAUDE.md"; then
  echo "skipped rules: CLAUDE.md already has core:guidelines"
  skip_rules=1
fi

for name in "$@"; do
  if spec=$(spec_of "$name" 2>/dev/null); then
    key=${spec% *}
    val=${spec#* }
    if [ "$(get "$key")" = "$val" ]; then
      echo "already $key=$val"
      continue
    fi
    put "$key" "$val"
    echo "written $key=$val"
  else
    [ $skip_rules = 1 ] && continue
    install_rule "$name"
  fi
done
