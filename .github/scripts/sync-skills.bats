#!/usr/bin/env bats

SCRIPT="$BATS_TEST_DIRNAME/sync-skills.sh"

setup() {
    WORK_DIR=$(mktemp -d)

    # The script targets mikefarah/yq (pre-installed on GitHub Actions ubuntu-latest
    # runners), which the local machine may not have. This mock handles the specific
    # invocation pattern used by sync-skills.sh and injects genkit-managed: true into
    # the SKILL.md frontmatter so the rest of the script logic can be tested normally.
    local mock_bin="$WORK_DIR/mock-bin"
    mkdir -p "$mock_bin"
    cat > "$mock_bin/yq" <<'MOCK'
#!/usr/bin/env python3
import sys, re
path = sys.argv[-1]
with open(path) as f:
    content = f.read()
m = re.match(r'^---\n([\s\S]*?)\n---\n', content)
if m:
    body = content[m.end():]
    content = '---\n' + m.group(1) + '\nmetadata:\n  genkit-managed: true\n---\n' + body
with open(path, 'w') as f:
    f.write(content)
MOCK
    chmod +x "$mock_bin/yq"
    export PATH="$mock_bin:$PATH"

    mkdir -p "$WORK_DIR/genkit-skills/skills"
    mkdir -p "$WORK_DIR/firebase-skills/skills"
    cd "$WORK_DIR"
}

teardown() {
    rm -rf "$WORK_DIR"
}

_make_skill() {
    local name="$1"
    local dir="$WORK_DIR/genkit-skills/skills/$name"
    mkdir -p "$dir"
    printf -- '---\nname: %s\ndescription: test skill\n---\n# Body\n' "$name" > "$dir/SKILL.md"
}

@test "exits successfully when source has no skills" {
    run bash "$SCRIPT"
    [ "$status" -eq 0 ]
}

@test "copies skill directory to destination" {
    _make_skill "my-skill"
    bash "$SCRIPT"
    [ -d "$WORK_DIR/firebase-skills/skills/my-skill" ]
}

@test "copies SKILL.md to destination" {
    _make_skill "my-skill"
    bash "$SCRIPT"
    [ -f "$WORK_DIR/firebase-skills/skills/my-skill/SKILL.md" ]
}

@test "injects genkit-managed into destination SKILL.md" {
    _make_skill "my-skill"
    bash "$SCRIPT"
    grep -q 'genkit-managed' "$WORK_DIR/firebase-skills/skills/my-skill/SKILL.md"
}

@test "removes stale files from destination before syncing" {
    _make_skill "my-skill"
    mkdir -p "$WORK_DIR/firebase-skills/skills/my-skill"
    touch "$WORK_DIR/firebase-skills/skills/my-skill/stale.md"
    bash "$SCRIPT"
    [ ! -f "$WORK_DIR/firebase-skills/skills/my-skill/stale.md" ]
}

@test "does not create entries for non-directory items in source" {
    touch "$WORK_DIR/genkit-skills/skills/not-a-dir.txt"
    bash "$SCRIPT"
    [ ! -e "$WORK_DIR/firebase-skills/skills/not-a-dir.txt" ]
}

@test "syncs multiple skills in a single run" {
    _make_skill "skill-alpha"
    _make_skill "skill-beta"
    bash "$SCRIPT"
    [ -d "$WORK_DIR/firebase-skills/skills/skill-alpha" ]
    [ -d "$WORK_DIR/firebase-skills/skills/skill-beta" ]
}

@test "preserves reference files alongside SKILL.md" {
    _make_skill "my-skill"
    echo "# Reference" > "$WORK_DIR/genkit-skills/skills/my-skill/guide.md"
    bash "$SCRIPT"
    [ -f "$WORK_DIR/firebase-skills/skills/my-skill/guide.md" ]
}
