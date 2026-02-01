# Development Process

This document explains how development work flows through the KLeague Manager project, from idea to completion.

**Audience:** Stakeholders, new team members, anyone wanting to understand how we work

---

## Table of Contents

1. [Overview](#overview)
2. [Task Lifecycle](#task-lifecycle)
3. [Task Structure](#task-structure)
4. [Definition of Done](#definition-of-done)
5. [Roles](#roles)
6. [Communication](#communication)
7. [Quality Standards](#quality-standards)
8. [Tools](#tools)

---

## Overview

KLeague Manager follows a **Verified Development Framework** - a structured approach ensuring every change is specified, approved, implemented incrementally, and verified before completion.

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Specification First** | No code without an approved spec |
| **Incremental Implementation** | Small, verifiable steps |
| **User Verification** | User confirms each step works |
| **Comprehensive Documentation** | Every task fully documented |
| **No Assumptions** | Ask questions rather than guess |

### Why This Approach?

1. **Prevents rework** - Specs catch misunderstandings early
2. **Ensures quality** - Verification at each step
3. **Creates audit trail** - Full history of decisions
4. **Enables handoffs** - Anyone can pick up where another left off
5. **Builds trust** - Transparent, verifiable progress

---

## Task Lifecycle

Every piece of work follows this lifecycle:
```
┌─────────┐    ┌─────────┐    ┌───────────┐    ┌──────────┐    ┌────────┐    ┌─────────┐
│ CREATE  │───>│ SPECIFY │───>│ IMPLEMENT │───>│ DOCUMENT │───>│ VERIFY │───>│  CLOSE  │
└─────────┘    └─────────┘    └───────────┘    └──────────┘    └────────┘    └─────────┘
     │              │               │                │              │              │
     │              │               │                │              │              │
  New task      Write full      Code in         Complete all    User tests    Move to
  file from     spec, get       small steps,    sections of     and confirms  completed/
  template      approval        verify each     task file       working       folder
```

### Stage Details

#### 1. CREATE

- New task created from template (`tasks/templates/TASK-TEMPLATE.md`)
- Placed in `tasks/active/` or `tasks/backlog/`
- Given unique ID (e.g., TASK-701)
- Basic objective documented

**Output:** Task file exists with objective

#### 2. SPECIFY

- Full specification written
- Includes requirements, acceptance criteria, technical approach
- User reviews and approves
- No code written yet

**Output:** Complete spec, user approval

#### 3. IMPLEMENT

- Code written incrementally
- Each step small enough to verify
- Verification commands provided
- User confirms each step before proceeding

**Output:** Working code

#### 4. DOCUMENT

- All task file sections completed
- Files Created/Modified tables filled
- Completion notes written
- Related docs updated if needed

**Output:** Fully documented task

#### 5. VERIFY

- User runs verification commands
- Confirms expected behavior
- Reports any issues
- Approves completion

**Output:** User confirmation

#### 6. CLOSE

- Task file moved to `tasks/completed/{phase}/`
- `tasks/INDEX.md` updated
- Status set to COMPLETED
- Completion date recorded

**Output:** Archived task, updated index

---

## Task Structure

Every task file follows a standard template:
```markdown
# TASK-XXX: Title

**Status:** BACKLOG | IN PROGRESS | COMPLETED
**Created:** YYYY-MM-DD
**Completed:** YYYY-MM-DD
**Priority:** High | Medium | Low
**Phase:** Phase X - Name

---

## Objective
[1-2 sentences: what this accomplishes]

## Background
[Why this task exists, context]

## Specification
[Detailed requirements, business rules, acceptance criteria]

## Technical Approach
[How it will be implemented]

## Files Created
| File | Purpose |
|------|---------|

## Files Modified
| File | Change |
|------|--------|

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Verification
[Commands/steps to verify]

## Completion Notes
[What actually happened, deviations, follow-ups]

## Related
[Links to other tasks, docs]
```

### Section Requirements

| Section | Required | Notes |
|---------|----------|-------|
| Objective | Yes | 1-2 sentences max |
| Background | Yes | Context for why |
| Specification | Yes | Detailed requirements |
| Technical Approach | Yes | Can be "TBD" for backlog |
| Files Created | If applicable | Table format |
| Files Modified | If applicable | Table format |
| Acceptance Criteria | Yes | Checkboxes |
| Verification | Yes | Runnable commands |
| Completion Notes | Yes | After completion |
| Related | If applicable | Links |

---

## Definition of Done

A task is **NOT complete** until ALL of these are checked:

- [ ] All acceptance criteria checked off
- [ ] "Files Created" table populated (if applicable)
- [ ] "Files Modified" table populated (if applicable)
- [ ] Verification commands provided AND executed successfully
- [ ] "Completion Notes" section written with actual outcome
- [ ] Task file moved to `tasks/completed/{phase}/`
- [ ] `tasks/INDEX.md` updated with completion status
- [ ] Related docs updated if applicable (ARCHITECTURE.md, API.md, etc.)
- [ ] User has explicitly approved closure

### Common Mistakes

| Mistake | Consequence |
|---------|-------------|
| Skipping spec approval | Rework when requirements misunderstood |
| Large implementation steps | Hard to verify, debug |
| Empty documentation sections | Lost knowledge, hard handoffs |
| Not updating INDEX.md | Inaccurate project status |
| Claiming done without verification | Bugs discovered later |

---

## Roles

### Commissioner (Product Owner)

- Defines requirements and priorities
- Approves specifications
- Verifies completed work
- Makes scope decisions

### Developer (Claude/Claude Code)

- Writes specifications for approval
- Implements code incrementally
- Provides verification commands
- Documents everything
- Asks clarifying questions

### Workflow Between Roles
```
Commissioner                    Developer
     │                              │
     │  "I need feature X"          │
     │ ────────────────────────────>│
     │                              │
     │                              │ Writes spec
     │                              │
     │  Spec for approval           │
     │ <────────────────────────────│
     │                              │
     │  "Approved" or "Change Y"    │
     │ ────────────────────────────>│
     │                              │
     │                              │ Implements step 1
     │                              │
     │  "Verify: run this command"  │
     │ <────────────────────────────│
     │                              │
     │  Runs command, confirms      │
     │ ────────────────────────────>│
     │                              │
     │                              │ Implements step 2...
     │                              │
     │  "Task complete, verify"     │
     │ <────────────────────────────│
     │                              │
     │  "Approved, close it"        │
     │ ────────────────────────────>│
     │                              │
     │                              │ Closes task
```

---

## Communication

### When Starting a Session

1. Read `.clinerules`
2. Read `tasks/INDEX.md`
3. Read any active task file
4. Confirm with user what to work on

### During Implementation

- Report progress after each step
- Provide verification commands
- Wait for user confirmation
- Ask questions rather than assume

### When Blocked

- Clearly state what's blocking
- Propose solutions if possible
- Ask specific questions
- Don't proceed with assumptions

### Documentation Updates

After any significant change, update:
- Task file (always)
- `tasks/INDEX.md` (always)
- `docs/*.md` (if relevant)
- `.clinerules` (if new patterns/rules discovered)

---

## Quality Standards

### Code Quality

| Standard | Enforcement |
|----------|-------------|
| TypeScript types | Compile-time checking |
| No console errors | Manual verification |
| Responsive design | Manual verification |
| Consistent styling | Tailwind + shadcn/ui |

### Documentation Quality

| Standard | Enforcement |
|----------|-------------|
| All sections completed | Definition of Done checklist |
| Accurate file lists | Verified before closing |
| Working verification commands | User runs them |
| Clear completion notes | Required for closure |

### Testing

| Area | Approach |
|------|----------|
| Keeper calculator | Unit tests (33 cases) |
| API routes | Manual verification commands |
| UI | Manual testing |
| Integration | End-to-end manual testing |

---

## Tools

### Task Management

| Tool | Purpose | Location |
|------|---------|----------|
| Task files | Individual task tracking | `tasks/` |
| INDEX.md | Project status dashboard | `tasks/INDEX.md` |
| Template | Standard task format | `tasks/templates/TASK-TEMPLATE.md` |

### Development

| Tool | Purpose |
|------|---------|
| Claude Code | AI-assisted development |
| VS Code | Code editor |
| Prisma Studio | Database GUI |
| Vercel | Deployment |
| GitHub | Version control |

### Documentation

| Document | Purpose |
|----------|---------|
| `.clinerules` | Development rules (read first) |
| `docs/` | Project documentation |
| `PRD.md` | Product requirements |

---

## Quick Reference

### Starting Work
```
1. Read .clinerules
2. Read tasks/INDEX.md
3. Confirm task with user
4. Read task file
5. Begin with spec (if not done)
```

### During Work
```
1. Implement one small step
2. Provide verification command
3. Wait for user confirmation
4. Repeat until complete
```

### Finishing Work
```
1. Complete all task file sections
2. Get user verification
3. Move task to completed/
4. Update INDEX.md
5. Update related docs
```

---

## Related Documents

- [.clinerules](../.clinerules) - Development rules
- [tasks/INDEX.md](../tasks/INDEX.md) - Task dashboard
- [tasks/templates/TASK-TEMPLATE.md](../tasks/templates/TASK-TEMPLATE.md) - Task template
- [Development Guide](./DEVELOPMENT.md) - Technical setup

---

**Last Updated:** February 1, 2026
