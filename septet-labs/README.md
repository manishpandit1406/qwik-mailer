# Septet Labs — Modern Deep-Tech Landing Page

Ultra-minimalist, high-performance landing page for **Septet Labs**, inspired by leading AI research labs (Linear, OpenAI, Perplexity) and matched to **Qwik Mailer's** clean, technical design system.

---

## 🎨 Design & Aesthetic Highlights
- **Palette**: Monochrome Stark Base (`#FFFFFF` in light mode, `#080808` in dark mode) with **Electric Cobalt Blue** (`#2563EB`) accents and subtle steel borders (`#E2E8F0` / `#1F1F23`).
- **Typography**: Geometric sans-serif fonts (**Plus Jakarta Sans** & **Inter**) with monospace telemetry accents (**JetBrains Mono**).
- **Background**: Subtle dot-matrix grid with an interactive HTML5 neural network canvas showing animated synapse connections.
- **UI/UX Feel**: Exactly like Qwik Mailer (crisp 1px borders, smooth hover transforms, status indicators, and modal flows).

---

## 🚀 Where Does It Live?

We have provided **two versions** for maximum flexibility:

### 1. Integrated Next.js Route (Inside Qwik Mailer)
- **Path**: `apps/web/src/app/septet-labs/page.tsx`
- **URL**: `http://localhost:3000/septet-labs`
- **Features**: Built with React, Tailwind CSS, Lucide Icons, and full TypeScript typing.

### 2. Standalone Zero-Dependency Site
- **Path**: `septet-labs/index.html`
- **Features**: Single-file HTML5/Tailwind/JS bundle that you can double-click to open in any browser or deploy directly to **Vercel**, **GitHub Pages**, **Netlify**, or **Cloudflare Pages**.

---

## 🔄 Logo Replace Karne Ka Tarika (How to Replace the Logo)

Dono files mein logo ke liye dedicated space aur clear comments diye gaye hain:

### Option A: `septet-labs/index.html` mein Logo Replace karna:
1. Apni logo image (e.g. `my-logo.png` ya `my-logo.svg`) ko `septet-labs/` folder mein daalein.
2. `septet-labs/index.html` open karein aur `septet-nav-logo` search karein (Line ~85):
```html
<!-- [LOGO SLOT 1]: NAVBAR LOGO CONTAINER -->
<div id="septet-nav-logo" class="...">
  <!-- Yahan SVG hata kar apni image lagayein: -->
  <img src="my-logo.png" alt="Septet Labs" class="w-full h-full object-contain p-1" />
</div>
```

### Option B: `apps/web/src/app/septet-labs/page.tsx` mein Logo Replace karna:
1. Apni logo image ko `apps/web/public/` folder mein daalein (e.g. `apps/web/public/septet-logo.svg` ya `.png`).
2. `apps/web/src/app/septet-labs/page.tsx` ke top par `SeptetLogo` component dekhein:
```tsx
export function SeptetLogo({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <div id="septet-logo-container" className={`... ${className}`}>
      {/* Apni custom image lagane ke liye: */}
      <img src="/septet-logo.svg" alt="Septet Labs" className="w-full h-full object-contain p-1" />
    </div>
  );
}
```

---

## 🏛️ Sections Implemented

1. **Navigation Bar**:
   - Monogram S/7 logo with electric cobalt accent & logo replacement slot.
   - Quick navigation to "Vision", "The Squad", "Manifesto", and "Research".
   - Dark/Light mode toggle + Mobile menu drawer.
   - High-contrast "Join the Squad" CTA.

2. **Hero Section**:
   - Status badge: `SEPTET ARCHITECTURE // 0-TO-1 DEEP TECH`.
   - Headline: *"Architecting the unseen."* (Crisp, bold typography with cobalt gradient).
   - Subheadline: *"An elite 7-member deep-tech squad building autonomous systems, AI-driven solutions, and zero-to-one startups through relentless execution."*
   - Primary CTA: *"Explore Research"* with cobalt blue glow.
   - Secondary CTA: *"The 48-Hour Challenge"* (Opens technical timeline modal).
   - Live telemetry bar showing 7 Squad Nodes, 48h Sprint Cycle, 0-to-1 Architecture, and 100% Execution.

3. **Core Ideology / Manifesto**:
   - **Execution over Talk**: Building working prototypes and functional code over endless discussions.
   - **Interdependence**: A synchronized 7-member unit where every role powers the whole.
   - **Radical Resourcefulness**: Turning complex technical bottlenecks into scalable systems.

4. **The Squad Breakdown (7-Member Architecture)**:
   - **Node 01**: Team Lead (Founding Lead & Architect)
   - **Node 02**: Tech / Systems Builder (Core Distributed Infrastructure)
   - **Node 03**: Tech / Systems Builder (Autonomous Systems & Platform)
   - **Node 04**: AI / R&D Specialist (Foundations & Neural Optimization)
   - **Node 05**: AI / R&D Specialist (Cognitive Intelligence & Multi-Modal Agents)
   - **Node 06**: Product Manager (Deep-Tech Product Lead)
   - **Node 07**: Growth / Outreach Lead (Ecosystem & Distribution Lead)
   - **Node 08 Slot**: Apprenticeship & transmission callout for outlier builders.

5. **Frontier Research Showcase**:
   - Active experiments with live benchmarks (Hyperion 4.2ms runtime, NeuralFold 3.8x gain, Chronos Mesh 50k tx/sec).

6. **Interactive Modals**:
   - **The 48-Hour Challenge**: Hour 00 to 48 roadmap from hypothesis to public binary.
   - **Join the Squad**: Transmission modal with proof-of-work link submission.

7. **Footer**:
   - Minimalist copyright `© 2026 Septet Labs. All rights reserved.`
   - Tagline: *"Quiet progress, loud results."*
   - Live sync status: `ALL 7 NODES SYNCHRONIZED // NOMINAL`.
