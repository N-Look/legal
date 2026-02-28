# Lex AI Landing Page

A premium, production-ready landing page tailored for a legal operations/KM/litigation support audience. Built with Next.js (App Router), Tailwind CSS, framer-motion, and shadcn/ui.

## Features

- **Semantic sections:** Structured for trust and rigor (Hero, Problem vs Solution, Governance, Outputs, etc.).
- **Smooth Animations:** Integrated with `framer-motion` for scroll-triggered fades, translation effects, and a highly polished sticky hero section that scales down smoothly on scroll. It automatically stops the animations if the user has `prefers-reduced-motion` enabled.
- **Responsive:** Mobile-friendly UI (collapsing nav, responsive grid).

## How to Run

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`
   Note: `framer-motion` is required for the animations.

2. **Start the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`

3. **View the site:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Where to Edit Copy

- The content of the landing page is centralized directly in `app/page.tsx`.
- Look for arrays such as `steps` and `features` to quickly modify the "How It Works" and "Feature Grid" content.
- Update the page headlines directly in the HTML structure (e.g., search for `The Defensible Authority Companion`).
- All `{{PROJECT_NAME}}` placeholders have been replaced with **Lex AI**.

## How to Swap Screenshots/Branding

- **Logos:** The text logo is defined in the `<nav>` section (`Top Nav`). Replace this with your actual SVG logo.
- **Mock UI:** The "floating preview card" in the Hero section is built natively using React components for a premium feel. To update its contents, modify the `Card` component inside the hero.
- **Colors:** The theme relies entirely on Tailwind + shadcn CSS tokens (`primary`, `destructive`, `background`, `card`). You can tune these in `globals.css` (see the `:root` and `.dark` blocks).

## Scroll Effects and Tuning

The scroll effects are driven by `framer-motion`'s `useScroll` and `useTransform` hooks. You can adjust the parameters in `app/page.tsx`:

```tsx
// Adjust the range (e.g., [0, 400]) to determine when the animation starts/stops
// Adjust the output array to define the intensity of the effect
const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
const heroScale = useTransform(scrollY, [0, 400], [1, 0.95]);
const previewY = useTransform(scrollY, [0, 400], [0, 50]);
const previewBlur = useTransform(scrollY, [0, 400], ["blur(0px)", "blur(8px)"]);
```

To adjust the fade-in speeds for sections lower down on the page, alter the `fadeUpVariant`:
```tsx
const fadeUpVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};
```
