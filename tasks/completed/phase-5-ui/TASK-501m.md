# TASK-501m: Restyle Auth Pages (Login/Register)

**Status:** COMPLETED
**Created:** January 2026
**Completed:** January 2026
**Priority:** Medium
**Depends On:** TASK-501l
**Phase:** Phase 5 - UI/UX Polish

---

## Objective

Apply Forest theme and shadcn/ui components to Auth Layout, Login, and Register pages.

---

## Background

The authentication pages (login and register) are the first pages users see. They needed to be updated with Forest theme styling to provide a consistent brand experience from the very first interaction.

---

## Specification

### Requirements
- Auth layout uses Forest theme background (bg-background)
- Auth container uses shadcn/ui Card
- Login form uses shadcn/ui Input, Button, Label
- Register form uses shadcn/ui Input, Button, Label
- Error messages use Forest semantic colors (bg-error/10, text-error)
- Maintain all existing functionality
- Links between login/register styled consistently
- Emerald primary accent for buttons and links

### Form Fields
**Login:**
- Email input (shadcn/ui Input)
- Password input (shadcn/ui Input)
- Sign In button (shadcn/ui Button, primary variant)
- Link to Register

**Register:**
- Name input (shadcn/ui Input)
- Email input (shadcn/ui Input)
- Password input (shadcn/ui Input)
- Confirm Password input (shadcn/ui Input)
- Register button (shadcn/ui Button, primary variant)
- Link to Login

---

## Technical Approach

1. Install shadcn/ui Label component
2. Update auth layout with Forest background
3. Wrap auth forms in shadcn/ui Card
4. Replace inputs with shadcn/ui Input
5. Add shadcn/ui Label for form labels
6. Replace buttons with shadcn/ui Button
7. Apply Forest error colors to error messages
8. Style links with primary (emerald) color

---

## Files Created

| File | Purpose |
|------|---------|
| `components/ui/label.tsx` | Installed shadcn/ui Label component |

---

## Files Modified

| File | Change |
|------|--------|
| `app/(auth)/layout.tsx` | Forest theme background (bg-background), shadcn/ui Card |
| `app/(auth)/login/page.tsx` | shadcn/ui Input, Button, Label; Forest error colors |
| `app/(auth)/register/page.tsx` | shadcn/ui Input, Button, Label; Forest error colors |

---

## Acceptance Criteria

- [x] Auth layout uses Forest theme background (bg-background)
- [x] Auth container uses shadcn/ui Card
- [x] Login form uses shadcn/ui Input, Button, Label
- [x] Register form uses shadcn/ui Input, Button, Label
- [x] Error messages use Forest semantic colors (bg-error/10, text-error)
- [x] Sign in functionality still works
- [x] Registration functionality still works
- [x] Redirect after login still works
- [x] Responsive on mobile
- [x] No TypeScript errors
- [x] Visual consistency with Forest theme

---

## Verification

### Login Testing
1. Navigate to `/login`
2. Verify Forest theme background
3. Verify Card container styling
4. Verify Input and Label styling
5. Verify Button styling (emerald primary)
6. Test with invalid credentials (error message styling)
7. Test with valid credentials (login and redirect)
8. Test link to register page

### Register Testing
1. Navigate to `/register`
2. Verify same Forest theme styling
3. Test form validation (password mismatch)
4. Test successful registration
5. Test link to login page
6. Test on mobile viewport

---

## Completion Notes

Auth pages restyled with shadcn/ui Card, Input, Button, Label. Forest theme applied throughout with emerald primary accent.

**Components Installed:**
- Label (for form field labels)

**Design Decisions:**
- Centered Card on dark background
- App title/logo at top of Card
- Clean form layout with proper spacing
- Primary button with emerald accent
- Muted text for links, primary on hover
- Error messages in red with subtle background

This completes the Phase 5 UI restyle work. All pages now use consistent Forest theme and shadcn/ui components.

---

## Related

- [TASK-501l](./TASK-501l.md) - Restyle Admin Rules + Seasons Pages (prerequisite)
- [TASK-501d](./TASK-501d.md) - UI Foundation (design system)
- [TASK-002](../phase-0-setup/TASK-002.md) - Authentication System (original implementation)
