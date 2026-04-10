Update the Past.Self. CLAUDE.md file to reflect the current state of the project. This should be run after any significant feature is completed, a bug is fixed, or a product decision is made.

The CLAUDE.md to update is at: `C:/Users/Daryll/Downloads/PastSelf_restyled/PastSelfApp/CLAUDE.md`

## Process

### Step 1 — Gather current state
Before making any changes, read:
1. `CLAUDE.md` — current documented state
2. `git log --oneline -20` — recent commits to understand what's changed
3. Any files mentioned in recent commits that are relevant to the working state

### Step 2 — Ask before writing
Do NOT edit CLAUDE.md immediately. First present a summary of what you found:
- What appears to have changed since the last update
- Which sections of CLAUDE.md need updating
- Any decisions or architecture details from this session that should be captured

Then ask: "Should I apply these updates?"

### Step 3 — Apply updates (only after confirmation)
Update only the sections that need changing. Sections to check:

**"Current State → Working"**
- Move completed items here if they were previously in Pending
- Be specific — include what was fixed, not just what the feature is

**"Current State → Known Issues / Pending"**
- Remove items that are now resolved
- Add new known issues discovered in this session
- Add new pending items if scope has expanded

**"Data Model"**
- Update if any fields were added/changed/removed from `ScheduledVideo`, `PrefillData`, or `appTrigger`

**"Key Logic"**
- Update if architecture changed (new patterns, fixed bugs that change how something works)

**"Tech Stack"**
- Update if packages were added or removed

**"App Guard Architecture"** (if App Guard was touched)
- Update to reflect current implementation state

**"TODO Before App Store"**
- Remove completed items, add new ones

### Step 4 — What NOT to change
- Do not rewrite sections that aren't affected
- Do not add commentary or opinion to CLAUDE.md — it's a facts-only reference file
- Do not change the "Core Instructions" section unless Dary explicitly asks
- Do not change product decisions (pricing, no-ads policy, etc.) without explicit instruction
- Do not update the timestamp or version — CLAUDE.md has no version header

### Step 5 — Confirm and remind
After updating, output:
```
[ CLAUDE.md UPDATED ]
Sections changed: [list]
Remind Dary: push to GitHub — git add CLAUDE.md && git commit -m "docs: update CLAUDE.md"
```
