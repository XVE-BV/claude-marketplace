#!/bin/sh
# Opt-in user-scope Claude Code preferences. Args: workflows memory recap suggestions style
set -eu

dir=${CLAUDE_CONFIG_DIR:-$HOME/.claude}
file=$dir/settings.json

python3 -c 'pass' >/dev/null 2>&1 || { echo "needs python3: xcode-select --install (macOS), apt install python3 (Linux)"; exit 1; }

# name -> "key value"
spec_of() {
  case $1 in
    workflows) echo "disableWorkflows true" ;;
    memory) echo "autoMemoryEnabled false" ;;
    recap) echo "awaySummaryEnabled false" ;;
    suggestions) echo "promptSuggestionEnabled false" ;;
    style) echo 'outputStyle "starter:ultra-concise"' ;;
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
  python3 -c 'import json,sys; d=json.load(open(sys.argv[1], encoding="utf-8-sig")); d[sys.argv[2]]=json.loads(sys.argv[3]); open(sys.argv[1] + ".tmp", "w", encoding="utf-8").write(json.dumps(d, indent=2, ensure_ascii=False) + "\n")' "$file" "$1" "$2"
  mv "$file.tmp" "$file"
}

[ $# -gt 0 ] || { echo "usage: setup.sh workflows memory recap suggestions style"; exit 2; }
for name in "$@"; do
  spec_of "$name" >/dev/null || { echo "unknown name: $name (workflows memory recap suggestions style)"; exit 2; }
done

existed=0
if [ -f "$file" ]; then
  existed=1
  [ -s "$file" ] && ! is_object && { echo "invalid JSON object: $file"; exit 1; }
  [ -s "$file" ] || printf '{}\n' > "$file"
else
  mkdir -p "$dir"
  printf '{}\n' > "$file"
  echo "created $file"
fi

backed=0
for name in "$@"; do
  spec=$(spec_of "$name")
  key=${spec% *}
  val=${spec#* }
  if [ "$(get "$key")" = "$val" ]; then
    echo "already $key=$val"
    continue
  fi
  if [ $existed = 1 ] && [ $backed = 0 ]; then
    bak=$file.bak.$(date +%Y%m%d%H%M%S)
    cp "$file" "$bak"
    echo "backup $bak"
    backed=1
  fi
  put "$key" "$val"
  echo "written $key=$val"
done
