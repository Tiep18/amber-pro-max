---
name: Ambertinybear Storefront
description: A refined, gentle handmade shop built around crochet imagery and warm paper tones.
colors:
  background: '#f6f2ea'
  foreground: '#3b332d'
  brand: '#62220c'
  surface: '#fffaf2'
  surface-paper: '#fffdf8'
  surface-muted: '#ece3d4'
  surface-blush: '#f8ebe5'
  accent: '#a94734'
  accent-hover: '#873627'
  muted-foreground: '#786b61'
  border: '#ded2c2'
  success: '#2f6b4f'
  warning: '#8a5a16'
  destructive: '#b42318'
typography:
  display:
    fontFamily: 'Nunito, sans-serif'
    fontSize: '2.75rem'
    fontWeight: 700
    lineHeight: 0.93
  headline:
    fontFamily: 'Nunito, sans-serif'
    fontSize: '1.875rem'
    fontWeight: 600
    lineHeight: 1.05
  body:
    fontFamily: 'Nunito, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'Nunito, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 600
    letterSpacing: '0.2em'
rounded:
  control: '8px'
  card: '8px'
  product-card: '18px'
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '#ffffff'
    rounded: '{rounded.control}'
    padding: '8px 16px'
    height: '44px'
  button-primary-hover:
    backgroundColor: '{colors.accent-hover}'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.foreground}'
    rounded: '{rounded.control}'
    padding: '8px 16px'
    height: '44px'
  card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.foreground}'
    rounded: '{rounded.card}'
    padding: '24px'
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.foreground}'
    rounded: '{rounded.control}'
    padding: '8px 12px'
    height: '44px'
---

# Design System: Ambertinybear

## Overview

**Creative North Star: "Cửa hàng thủ công tinh tế"**

The storefront feels refined and gentle. Warm cream surfaces and deep clay-brown accents make a quiet frame for the crochet work, which carries the strongest visual detail. The existing homepage uses a studio photograph, a readable cream overlay, and restrained typography to introduce the brand.

The visual system is mostly flat: paper-like surfaces, fine borders, and generous space establish structure. Soft shadows mark selected interactive or featured elements. Controls remain tidy, easy to use, and light in character. This document records the implemented storefront; the admin interface may use its existing denser, task-focused treatment.

**Key Characteristics:**

- Cream and clay-brown palette, with product and studio photography as the focal point.
- Nunito throughout, from prominent headings to compact labels.
- Flat default surfaces; selective soft elevation for emphasis and interaction.
- Clear market and language controls without disturbing the shopping content.

## Colors

The normative values are in the frontmatter and originate in `src/app/globals.css`.

### Primary

- **Deep Clay** (`brand`): prominent storefront headlines, prices, and the homepage hero action.
- **Warm Terracotta** (`accent`): standard actions, links, focus, and small highlights. `accent-hover` is its darker interaction state.

### Neutral

- **Cream Paper** (`background`): page canvas. `surface-paper` is the lightest section surface; `surface` is the main control and card surface.
- **Soft Oat** (`surface-muted`): quiet backgrounds and placeholders. `surface-blush` provides a warmer accent tint.
- **Ink Brown** (`foreground`): primary text. `muted-foreground` handles supporting copy; `border` separates surfaces gently.

Success, warning, and destructive colors are reserved for those states; their corresponding pale surfaces are defined in the global CSS.

**The Cream-and-Clay Rule.** Keep the warm cream and clay-brown relationship visible across customer-facing screens; product imagery provides the richer color variation.

## Typography

Nunito is loaded for Latin and Vietnamese in `src/app/layout.tsx`. Body text is regular at 16px with 1.5 line height. The homepage display title begins at 2.75rem and grows to 3.5rem and 4rem at its responsive breakpoints; section headings commonly use 1.875rem to 2.25rem. Small uppercase labels use 0.2em tracking. Other pages adjust the scale to their task rather than copying the homepage hero.

Use strong weight and compact line height for short display copy, then quieter, more spacious supporting text. The homepage's long introduction is constrained to roughly 46 characters per line.

## Layout

The shared container is at most 1400px wide with 1rem side padding, increasing to 1.5rem at 640px and 2rem at 1024px. Sections use spacious vertical rhythm; the homepage commonly uses 4rem on small screens and 6rem from 640px. Shopping paths become two columns from 640px, while featured product grids reach four columns on wide screens. Product cards keep a 5:4 media area.

The header stays sticky. On smaller screens, primary navigation moves into a side sheet while the logo, cart, and shopping context remain accessible. Preserve the same content hierarchy in Vietnamese and English, allowing text to wrap naturally.

## Elevation & Depth

Surfaces are flat by default, separated by tonal shifts and subtle borders. Use soft, warm shadows on featured product cards, hero actions, overlays, and hover states where elevation helps interaction. The global vocabulary includes `--shadow-soft` and `--shadow-lifted`; individual featured components also use local warm shadows. Motion is brief and purposeful, and reduced-motion preferences disable decorative transitions.

**The Selective Elevation Rule.** A shadow signals emphasis or interaction; ordinary content and form surfaces remain visually quiet.

## Shapes

Shared controls and basic cards use gently rounded 8px corners. Featured product cards use 18px corners, and large image-led shopping paths use 16px. Fine borders, soft color transitions, and occasional fully rounded pills complement these shapes; they do not replace the 8px control baseline.

## Components

### Buttons

- The shared primary button uses terracotta, white text, 8px corners, and a minimum 44px height; its hover state deepens the color.
- Secondary buttons use the warm surface with a fine border; ghost buttons keep the same text color without a filled background.
- The homepage hero action is a deliberate brand-brown exception with a soft shadow and arrow movement.
- All button variants retain visible focus and disabled states.

### Cards and product tiles

- Basic cards are warm surfaces with an 8px corner, subtle border, and 24px padding.
- Product tiles are image-led, with an 18px corner, 5:4 image, soft resting shadow, slight hover lift, compact type badge, and a price separated by a fine rule.

### Inputs and status

- Inputs use a warm surface, fine border, 8px corners, and at least 44px height. Focus adds an accent border and ring.
- Status alerts use the semantic success, warning, or destructive palette instead of the brand accent.

### Navigation

- The sticky header is translucent over the warm surface. The active desktop link has a fine accent underline; mobile navigation uses a side sheet.

## Do's and Don'ts

### Do:

- **Do** keep crochet photography and product details as the visual focal point.
- **Do** use cream surfaces, clay-brown typography, and terracotta interaction cues consistently.
- **Do** retain clear focus, hover, disabled, and reduced-motion behavior.

### Don't:

- **Don't** apply heavy shadows to every card or form surface.
- **Don't** replace the warm page canvas with an all-white default.
- **Don't** copy the marketing hero's scale into task-focused checkout or admin screens.
