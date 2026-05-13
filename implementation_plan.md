# Build Neurotube Frontend via Stitch MCP

Based on the PRD, we will build the "Neurotube" frontend focusing on a highly interactive, "bouncy," and visually pleasing user experience (UX) adapted from the "Mem Form" aesthetic (soft pinks, magenta, dark/light modes).

## Proposed Changes

We will use the Stitch MCP to generate the UI components and pages as described in the PRD. Since we are building this specifically for the agent manager to focus on the frontend, our steps will be executed within the Stitch environment.

### 1. Initialize Project & Environment
- **Create React App**: Use Vite to scaffold a new React TypeScript project in the local `frontend/` directory.
- **Install Dependencies**: 
  - `tailwindcss`, `postcss`, `autoprefixer` for styling.
  - `framer-motion` for bouncy animations.
  - `lucide-react` for icons.
  - `@tanstack/react-router` for seamless routing.
  - Shadcn UI for base components.
- **Configure Theme**: Set up `tailwind.config.js` and `index.css` to use the "Pink Mem Form" aesthetic (soft pinks, magenta, dark/light modes, highly rounded corners).

### 2. Implement Core Components & Pages
We will build the following structure locally:

1. **Home / Landing Page (`frontend/src/routes/index.tsx`)**
   - Bouncy, interactive, pink-themed UI.
   - Responsive input bar with YouTube URL validation.
   - **"See a Sample Result"** button for an instant demonstration.
   - History list (`AnalyzedVideoList.tsx`) fetching from local storage or mocked API.

2. **Analytics Result Page (`frontend/src/routes/video.tsx`)**
   - Seamless page transitions using Framer Motion.
   - Colorful and smoothly animated sentiment charts (using `recharts` and `framer-motion`).
   - Displays Video Details, Comment Stats, and the Comment Section.

3. **Loading State & Animations**
   - Interactive loading animations using Framer Motion to prevent user boredom.

## User Review Required

> [!IMPORTANT]
> Since we are building this locally, I will execute the terminal commands to scaffold the project, install dependencies, and then write the code files directly into your workspace. I will use Bun as the package manager as specified in your PRD directory structure.

## Verification Plan

### Automated/Manual Verification
- I will run `bun run dev` (or `npm run dev`) to start the local development server.
- I will use the browser subagent to verify the UI renders correctly and the bouncy animations trigger on hover/click.
- I will check that routing between the home page and analytics page is seamless.
