#!/usr/bin/env bash
#
# Integration test script for CLI flows.
# Runs actual CLI commands against fixtures and validates output.
#
# Usage: npm run test:cli

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FIXTURES_DIR="$PROJECT_DIR/fixtures"

cli() {
  FORCE_COLOR=0 npx tsx "$PROJECT_DIR/src/cli.ts" "$@" 2>&1 | sed $'s/\x1b\[[0-9;?]*[a-zA-Z]//g; s/\x1b\[J//g'
}

PASSED=0
FAILED=0
ERRORS=()

# Colors (respect NO_COLOR)
if [[ -z "${NO_COLOR:-}" ]]; then
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  CYAN='\033[0;36m'
  BOLD='\033[1m'
  RESET='\033[0m'
else
  GREEN='' RED='' YELLOW='' CYAN='' BOLD='' RESET=''
fi

# ──────────────────────────────────────────────────────────────
# Test helpers
# ──────────────────────────────────────────────────────────────

assert_output_contains() {
  local test_name="$1"
  local output="$2"
  local expected="$3"

  if echo "$output" | grep -qF -- "$expected"; then
    echo -e "  ${GREEN}PASS${RESET} $test_name"
    PASSED=$((PASSED + 1))
  else
    echo -e "  ${RED}FAIL${RESET} $test_name"
    echo -e "       Expected output to contain: ${YELLOW}$expected${RESET}"
    FAILED=$((FAILED + 1))
    ERRORS+=("$test_name: expected '$expected'")
  fi
}

assert_output_not_contains() {
  local test_name="$1"
  local output="$2"
  local unexpected="$3"

  if ! echo "$output" | grep -qF -- "$unexpected"; then
    echo -e "  ${GREEN}PASS${RESET} $test_name"
    PASSED=$((PASSED + 1))
  else
    echo -e "  ${RED}FAIL${RESET} $test_name"
    echo -e "       Expected output NOT to contain: ${YELLOW}$unexpected${RESET}"
    FAILED=$((FAILED + 1))
    ERRORS+=("$test_name: unexpected '$unexpected'")
  fi
}

assert_exit_code() {
  local test_name="$1"
  local actual="$2"
  local expected="$3"

  if [[ "$actual" == "$expected" ]]; then
    echo -e "  ${GREEN}PASS${RESET} $test_name"
    PASSED=$((PASSED + 1))
  else
    echo -e "  ${RED}FAIL${RESET} $test_name"
    echo -e "       Expected exit code $expected, got $actual"
    FAILED=$((FAILED + 1))
    ERRORS+=("$test_name: exit code $actual != $expected")
  fi
}

assert_file_exists() {
  local test_name="$1"
  local file_path="$2"

  if [[ -f "$file_path" ]]; then
    echo -e "  ${GREEN}PASS${RESET} $test_name"
    PASSED=$((PASSED + 1))
  else
    echo -e "  ${RED}FAIL${RESET} $test_name"
    echo -e "       File not found: ${YELLOW}$file_path${RESET}"
    FAILED=$((FAILED + 1))
    ERRORS+=("$test_name: file not found '$file_path'")
  fi
}

# ──────────────────────────────────────────────────────────────
# Setup
# ──────────────────────────────────────────────────────────────

echo -e "${BOLD}CLI Integration Tests${RESET}"
echo ""

# Generate fresh fixtures
echo -e "${CYAN}[SETUP]${RESET} Generating fixtures..."
bash "$SCRIPT_DIR/generate-fixtures.sh" --clean >/dev/null 2>&1 || true
bash "$SCRIPT_DIR/generate-fixtures.sh" >/dev/null 2>&1
echo ""

# ──────────────────────────────────────────────────────────────
# Test 1: list command
# ──────────────────────────────────────────────────────────────

echo -e "${BOLD}1. list --data-dir${RESET}"
OUTPUT=$(cli list --data-dir "$FIXTURES_DIR")

assert_output_contains "shows book count" "$OUTPUT" "Downloaded Books (5)"
assert_output_contains "shows complete book" "$OUTPUT" "The Great Adventure"
assert_output_contains "shows tagged book" "$OUTPUT" "Mystery at Midnight"
assert_output_contains "shows merged book" "$OUTPUT" "Science of Everything"
assert_output_contains "shows no-metadata book" "$OUTPUT" "Unknown Book"
assert_output_contains "shows multi-author book" "$OUTPUT" "Collaborative Work"
assert_output_not_contains "skips no-chapters book" "$OUTPUT" "Empty Promises"
assert_output_contains "shows chapter count" "$OUTPUT" "chapters)"
assert_output_contains "shows tagged status" "$OUTPUT" "tagged"
assert_output_contains "shows merged status" "$OUTPUT" "merged"
assert_output_contains "shows authors" "$OUTPUT" "Jane Smith"
assert_output_contains "shows multi-authors" "$OUTPUT" "Author One, Author Two, Author Three"
assert_output_contains "shows summary" "$OUTPUT" "Total: 5"
assert_output_contains "shows next steps" "$OUTPUT" "libby tag"
echo ""

# ──────────────────────────────────────────────────────────────
# Test 2: list with empty directory
# ──────────────────────────────────────────────────────────────

echo -e "${BOLD}2. list with empty directory${RESET}"
EMPTY_DIR=$(mktemp -d)
OUTPUT=$(cli list --data-dir "$EMPTY_DIR")
rmdir "$EMPTY_DIR"

assert_output_contains "shows no books message" "$OUTPUT" "No books found"
echo ""

# ──────────────────────────────────────────────────────────────
# Test 3: list with nonexistent directory
# ──────────────────────────────────────────────────────────────

echo -e "${BOLD}3. list with nonexistent directory${RESET}"
OUTPUT=$(cli list --data-dir "/tmp/nonexistent-libby-test-dir")

assert_output_contains "shows no books for missing dir" "$OUTPUT" "No books found"
echo ""

# ──────────────────────────────────────────────────────────────
# Test 4: tag direct (single book)
# ──────────────────────────────────────────────────────────────

echo -e "${BOLD}4. tag direct (single book)${RESET}"
OUTPUT=$(cli tag "$FIXTURES_DIR/The Great Adventure") || true
EXIT_CODE=$?

assert_exit_code "exits successfully" "$EXIT_CODE" "0"
assert_output_contains "shows success message" "$OUTPUT" "Tagged 3 files"
echo ""

# Verify the book now shows as tagged
echo -e "${BOLD}5. verify tagged status after tagging${RESET}"
OUTPUT=$(cli list --data-dir "$FIXTURES_DIR")

assert_output_contains "tagged count increased" "$OUTPUT" "Tagged: 3/5"
echo ""

# ──────────────────────────────────────────────────────────────
# Test 6: tag with options override
# ──────────────────────────────────────────────────────────────

echo -e "${BOLD}6. tag with no-metadata book using options${RESET}"
OUTPUT=$(cli tag "$FIXTURES_DIR/Unknown Book" --title "Custom Title" --author "Custom Author") || true
EXIT_CODE=$?

assert_exit_code "exits successfully" "$EXIT_CODE" "0"
assert_output_contains "shows success" "$OUTPUT" "Tagged 2 files"
echo ""

# ──────────────────────────────────────────────────────────────
# Test 7: merge direct (single book)
# ──────────────────────────────────────────────────────────────

echo -e "${BOLD}7. merge direct (single book)${RESET}"
OUTPUT=$(cli merge "$FIXTURES_DIR/The Great Adventure") || true
EXIT_CODE=$?

assert_exit_code "exits successfully" "$EXIT_CODE" "0"
assert_output_contains "shows loaded metadata" "$OUTPUT" "The Great Adventure"
assert_output_contains "shows chapter count" "$OUTPUT" "3 chapters"
assert_output_contains "shows merge complete" "$OUTPUT" "Merge complete"
assert_output_contains "shows output file" "$OUTPUT" "The Great Adventure.m4b"
assert_file_exists "creates m4b file" "$FIXTURES_DIR/The Great Adventure/The Great Adventure.m4b"
echo ""

# ──────────────────────────────────────────────────────────────
# Test 8: merge already-merged book (should fail)
# ──────────────────────────────────────────────────────────────

echo -e "${BOLD}8. merge already-merged book${RESET}"
OUTPUT=$(cli merge "$FIXTURES_DIR/The Great Adventure" || true)

assert_output_contains "shows already exists error" "$OUTPUT" "already exists"
echo ""

# ──────────────────────────────────────────────────────────────
# Test 9: help output
# ──────────────────────────────────────────────────────────────

echo -e "${BOLD}9. help output${RESET}"
OUTPUT=$(cli --help)

assert_output_contains "shows program name" "$OUTPUT" "libby"
assert_output_contains "shows list command" "$OUTPUT" "list"
assert_output_contains "shows tag command" "$OUTPUT" "tag"
assert_output_contains "shows merge command" "$OUTPUT" "merge"
assert_output_contains "shows data-dir option" "$OUTPUT" "--data-dir"
assert_output_contains "shows verbose option" "$OUTPUT" "--verbose"
echo ""

# ──────────────────────────────────────────────────────────────
# Test 10: verbose mode
# ──────────────────────────────────────────────────────────────

echo -e "${BOLD}10. verbose mode${RESET}"
OUTPUT=$(cli list --data-dir "$FIXTURES_DIR" --verbose)

assert_output_contains "shows verbose output" "$OUTPUT" "Downloaded Books"
echo ""

# ──────────────────────────────────────────────────────────────
# Test 11: version flag
# ──────────────────────────────────────────────────────────────

echo -e "${BOLD}11. version flag${RESET}"
OUTPUT=$(cli --version)

assert_output_contains "shows version" "$OUTPUT" "1.0.0"
echo ""

# ──────────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────────

echo -e "${BOLD}────────────────────────────────────${RESET}"
TOTAL=$((PASSED + FAILED))
echo -e "${BOLD}Results: ${GREEN}$PASSED passed${RESET}, ${RED}$FAILED failed${RESET} ($TOTAL total)"

if [[ ${#ERRORS[@]} -gt 0 ]]; then
  echo ""
  echo -e "${RED}Failures:${RESET}"
  for err in "${ERRORS[@]}"; do
    echo -e "  - $err"
  done
fi

echo ""

# Cleanup
echo -e "${CYAN}[CLEANUP]${RESET} Resetting fixtures..."
bash "$SCRIPT_DIR/generate-fixtures.sh" --clean >/dev/null 2>&1 || true
bash "$SCRIPT_DIR/generate-fixtures.sh" >/dev/null 2>&1

exit $FAILED
