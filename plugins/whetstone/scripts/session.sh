#!/usr/bin/env bash
# whetstone session state. All state lives in <project>/.whetstone/.
#
#   session.sh start <topic...>      open a gym session (arms the write guard)
#   session.sh hint                  record one more hint, print the new level (1-3)
#   session.sh status                print the open session, or "none"
#   session.sh stop <red> <yellow>   close it, append a ledger row, print the summary
#   session.sh stats                 print the ledger and the trend in red findings
set -eu

root="${CLAUDE_PROJECT_DIR:-$PWD}"
dir="$root/.whetstone"
lock="$dir/gym.lock"
ledger="$dir/ledger.tsv"
cmd="${1:-status}"; shift || true

get() { sed -n "s/^$1=//p" "$lock" | head -n 1; }

case "$cmd" in
  start)
    topic="$*"
    [ -n "$topic" ] || { echo "usage: session.sh start <topic>" >&2; exit 1; }
    if [ -f "$lock" ]; then echo "already open: $(get topic). Close it with /whet-done first." >&2; exit 1; fi
    mkdir -p "$dir/sessions"
    printf 'topic=%s\nstarted=%s\nhints=0\n' "$topic" "$(date +%s)" > "$lock"
    echo "gym session open: $topic"
    echo "write guard armed: Claude can only write inside .whetstone/ and to the learning log"
    ;;
  hint)
    [ -f "$lock" ] || { echo "no gym session open" >&2; exit 1; }
    n=$(( $(get hints) + 1 ))
    tmp="$lock.tmp"
    sed "s/^hints=.*/hints=$n/" "$lock" > "$tmp" && mv "$tmp" "$lock"
    level=$n; [ "$level" -gt 3 ] && level=3
    echo "hints used: $n  ->  give a level $level hint"
    ;;
  status)
    if [ -f "$lock" ]; then
      mins=$(( ( $(date +%s) - $(get started) ) / 60 ))
      echo "open: $(get topic) | ${mins} min | hints used: $(get hints)"
    else
      echo "none"
    fi
    ;;
  stop)
    [ -f "$lock" ] || { echo "no gym session open" >&2; exit 1; }
    red="${1:-0}"; yellow="${2:-0}"
    topic="$(get topic)"; hints="$(get hints)"
    mins=$(( ( $(date +%s) - $(get started) ) / 60 ))
    [ -f "$ledger" ] || printf 'date\tminutes\thints\tred\tyellow\ttopic\n' > "$ledger"
    printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$(date +%F)" "$mins" "$hints" "$red" "$yellow" "$topic" >> "$ledger"
    mkdir -p "$dir/sessions"
    mv "$lock" "$dir/sessions/$(date +%Y%m%d-%H%M%S).done"
    echo "closed: $topic | ${mins} min | hints $hints | red $red | yellow $yellow"
    echo "write guard disarmed"
    ;;
  stats)
    [ -f "$ledger" ] || { echo "no sessions recorded yet"; exit 0; }
    cat "$ledger"
    awk -F'\t' 'NR>1 { n++; red[n]=$4; hints[n]=$3 }
      END {
        if (n < 2) { print "\ntrend: need at least 2 sessions"; exit }
        h = int(n/2); for (i=1;i<=h;i++) { a+=red[i]; ha+=hints[i] } for (i=h+1;i<=n;i++) { b+=red[i]; hb+=hints[i] }
        printf "\nsessions: %d\nred per session:   first half %.1f -> second half %.1f\nhints per session: first half %.1f -> second half %.1f\n", n, a/h, b/(n-h), ha/h, hb/(n-h)
      }' "$ledger"
    ;;
  *)
    echo "unknown command: $cmd" >&2; exit 1 ;;
esac
