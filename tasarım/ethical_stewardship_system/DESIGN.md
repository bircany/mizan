---
name: Ethical Stewardship System
colors:
  surface: '#f9f9f7'
  surface-dim: '#dadad8'
  surface-bright: '#f9f9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f2'
  surface-container: '#eeeeec'
  surface-container-high: '#e8e8e6'
  surface-container-highest: '#e2e3e1'
  on-surface: '#1a1c1b'
  on-surface-variant: '#3f4945'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1ef'
  outline: '#6f7975'
  outline-variant: '#bec9c4'
  surface-tint: '#1a6a59'
  primary: '#005243'
  on-primary: '#ffffff'
  primary-container: '#1b6b5a'
  on-primary-container: '#9ee9d3'
  inverse-primary: '#8bd5c0'
  secondary: '#755b00'
  on-secondary: '#ffffff'
  secondary-container: '#fed977'
  on-secondary-container: '#785d00'
  tertiary: '#484847'
  on-tertiary: '#ffffff'
  tertiary-container: '#605f5f'
  on-tertiary-container: '#dcd9d9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a6f1db'
  primary-fixed-dim: '#8bd5c0'
  on-primary-fixed: '#002019'
  on-primary-fixed-variant: '#005142'
  secondary-fixed: '#ffe08f'
  secondary-fixed-dim: '#e6c364'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#584400'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474747'
  background: '#f9f9f7'
  on-background: '#1a1c1b'
  surface-variant: '#e2e3e1'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.25'
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The visual identity of this design system centers on the concept of *Mizan* (Balance). It is designed to evoke a sense of professional reliability, spiritual groundedness, and communal warmth. The target audience includes individual donors, institutional partners, and students of the association’s educational programs. 

The design style is **Corporate Modern with a Warm Humanist touch**. It avoids the sterility of pure tech startups by utilizing a soft, off-white background and gold accents that suggest value and heritage. The interface should feel organized and intentional, reflecting the meticulous nature of humanitarian work while remaining approachable enough for community-driven engagement.

## Colors

The palette is anchored by **Deep Teal (#1B6B5A)**, representing growth, stability, and Islamic tradition. This is the primary color for calls to action, headers, and brand-defining elements. **Warm Gold (#C9A84C)** is used sparingly as an accent to highlight progress, high-tier information, and moments of spiritual significance.

The background uses **Off-white (#FAFAF8)** rather than pure white to reduce eye strain and provide a softer, more parchment-like warmth. **Dark Charcoal (#2D2D2D)** is utilized for primary text to ensure maximum legibility and an authoritative tone without the harshness of pure black.

## Typography

This design system utilizes **Inter** as its sole typeface. Its geometric precision combined with a tall x-height makes it exceptionally legible for both UI labels and long-form educational content. 

To maintain the "Modern Corporate" aesthetic, typography should rely on strong weight contrasts rather than excessive decorative styling. Headline levels use tighter letter-spacing and heavier weights to command attention, while body text uses a generous line height (1.6) to ensure accessibility for readers of all ages. Arabic numerals must be rendered in their Western forms but should be meticulously aligned within data-heavy components like donation trackers.

## Layout & Spacing

The layout follows a **12-column fluid grid** for desktop and a **4-column grid** for mobile. Spacing is based on an 8px baseline rhythm to ensure mathematical harmony between elements. 

To reflect "spiritual groundedness," the layout prioritizes generous whitespace (*Ma*). Content should never feel cramped; instead, use the `lg` (48px) and `xl` (80px) spacing tokens to separate major sections of a page. Container widths are capped at 1200px to maintain optimal line length for reading and to prevent the UI from feeling over-stretched on ultra-wide monitors.

## Elevation & Depth

Visual hierarchy is established primarily through **Tonal Layering** supplemented by **Ambient Shadows**. 

- **Surface Level 0:** The main background (#FAFAF8).
- **Surface Level 1:** Raised cards and containers using pure white (#FFFFFF). These use a very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.04)) to create a gentle lift without looking overly digital.
- **Surface Level 2:** Interactive states or pop-overs. These use a slightly deeper shadow with a hint of Teal in the ambient occlusion (0px 8px 30px rgba(27, 107, 90, 0.08)) to maintain brand cohesion.

Avoid harsh outlines or high-contrast borders; depth should feel natural and light-filled.

## Shapes

The shape language is defined by **Rounded (Level 2)** geometry. Standard UI components like buttons and input fields utilize a 0.5rem (8px) corner radius. This choice balances the professional rigor of a formal association with the friendly, approachable nature of a community-driven charity. 

For high-level containers and cards, `rounded-lg` (16px) should be used to create a "softer" container for content. Interactive elements should never be sharp, as sharp corners evoke a clinical or aggressive feeling that contradicts the brand's mission of care.

## Components

### Buttons
Primary buttons are solid Deep Teal with white text, using the 0.5rem roundedness. Secondary buttons use a Teal outline or the Warm Gold for specific "Urgent/Donate" actions. Hover states should involve a subtle darkening of the color rather than a dramatic change.

### Donation Cards
Cards are the primary vehicle for information. They feature a white background, soft shadows, and a **Progress Bar**. The progress bar uses a light-teal track with a solid Deep Teal fill, and a small Warm Gold indicator for the percentage or target reached.

### Input Fields
Inputs use a subtle 1px border in a light grey-teal, which shifts to a 2px Deep Teal border on focus. Labels are always positioned above the field for clarity.

### Icons
Icons should be thin-stroke, monolinear, and elegant. Brand-specific icons (Crescent, Scales, Water Well) should be rendered in the secondary Warm Gold color when used as decorative accents, and in Deep Teal when used as functional UI cues.

### Footer
The footer deviates from the light theme, using a **Dark Charcoal (#2D2D2D)** or **Deep Teal (#1B6B5A)** background. This provides a "grounding" effect to the page and houses the association's legal, contact, and spiritual mission statements in high-contrast white or light-gold text.