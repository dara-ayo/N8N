const pptxgen = require("pptxgenjs");
const fs = require("fs");

const pptx = new pptxgen();

// -------------------------------------------------------------------
// Global defaults
// -------------------------------------------------------------------
const DARK_BLUE = "1e3a5f";
const ACCENT_BLUE = "2563eb";
const WHITE = "FFFFFF";
const LIGHT_GRAY = "f1f5f9";
const MEDIUM_GRAY = "64748b";
const DARK_TEXT = "1e293b";
const GREEN = "16a34a";
const RED = "dc2626";
const FONT_FACE = "Calibri";
const TOTAL_SLIDES = 17;

pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pptx.author = "Ayodele Oluwafimidaraayo";
pptx.company = "Content Generation & Publishing Automation";
pptx.subject = "Content Generation & Publishing Automation";
pptx.title = "Content Generation & Publishing Automation — Project Demo";

// Helper: add a dark-blue bar at the top of every non-title slide
function addHeader(slide, title) {
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: "100%", h: 1.1,
    fill: { color: DARK_BLUE },
  });
  slide.addText(title, {
    x: 0.6, y: 0.2, w: 12, h: 0.7,
    fontSize: 28, fontFace: FONT_FACE, bold: true,
    color: WHITE,
  });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 1.1, w: "100%", h: 0.06,
    fill: { color: ACCENT_BLUE },
  });
}

// Helper: small footer on every slide
function addFooter(slide, slideNum) {
  slide.addText(
    [
      { text: "Ayodele Oluwafimidaraayo", options: { color: MEDIUM_GRAY } },
      { text: `   |   Slide ${slideNum} of ${TOTAL_SLIDES}`, options: { color: MEDIUM_GRAY } },
    ],
    {
      x: 0.6, y: 6.9, w: 12, h: 0.4,
      fontSize: 10, fontFace: FONT_FACE,
    }
  );
}

// Helper: bullet list
function addBulletList(slide, bullets, startY, opts = {}) {
  const fontSize = opts.fontSize || 16;
  const spacing = opts.spacing || 0.55;
  const xStart = opts.x || 0.8;
  const width = opts.width || 11.5;

  bullets.forEach((text, i) => {
    const yPos = startY + i * spacing;
    slide.addText("\u25B8", {
      x: xStart, y: yPos, w: 0.4, h: 0.45,
      fontSize: fontSize, fontFace: FONT_FACE, color: ACCENT_BLUE, bold: true,
    });
    slide.addText(text, {
      x: xStart + 0.4, y: yPos, w: width - 0.4, h: 0.45,
      fontSize: fontSize, fontFace: FONT_FACE, color: DARK_TEXT,
    });
  });
}

// -------------------------------------------------------------------
// Slide 1 — Title
// -------------------------------------------------------------------
(() => {
  const slide = pptx.addSlide();

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: "100%", h: "100%",
    fill: { color: DARK_BLUE },
  });

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 3.2, w: "100%", h: 0.06,
    fill: { color: ACCENT_BLUE },
  });

  slide.addText("Content Generation &\nPublishing Automation", {
    x: 0.8, y: 0.8, w: 11.5, h: 2.2,
    fontSize: 40, fontFace: FONT_FACE, bold: true,
    color: WHITE, lineSpacingMultiple: 1.15,
  });

  slide.addText("AI-Powered Multi-Platform Content System", {
    x: 0.8, y: 3.5, w: 11.5, h: 0.7,
    fontSize: 22, fontFace: FONT_FACE,
    color: ACCENT_BLUE,
  });

  slide.addText("Built by Ayodele Oluwafimidaraayo", {
    x: 0.8, y: 4.5, w: 6, h: 0.5,
    fontSize: 18, fontFace: FONT_FACE, color: WHITE,
  });

  slide.addText("March 2026", {
    x: 0.8, y: 5.1, w: 6, h: 0.5,
    fontSize: 16, fontFace: FONT_FACE, color: MEDIUM_GRAY,
  });

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8, y: 6.6, w: 3, h: 0.04,
    fill: { color: ACCENT_BLUE },
  });

  slide.addNotes(
    "Welcome everyone. I'm Ayodele Oluwafimidaraayo and today I'll be walking you through the Content Generation and Publishing Automation system I built. This project turns a single content idea into fully formatted, SEO-optimized posts across LinkedIn, X/Twitter, and email newsletters — with human oversight, role-based team collaboration, and one-click multi-platform publishing."
  );
})();

// -------------------------------------------------------------------
// Slide 2 — Problem Statement
// -------------------------------------------------------------------
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "Problem Statement");
  addFooter(slide, 2);

  const bullets = [
    ["Content creation is manual and time-consuming (2-4 hours per topic)"],
    ["Adapting for 3 platforms means 3x the repetitive effort"],
    ["No centralized system for team collaboration on content"],
    ["Publishing to multiple platforms is disconnected"],
    ["Inconsistent SEO optimization — rankings left to chance"],
    ["Creative energy wasted on reformatting instead of strategy"],
  ];

  bullets.forEach(([text], i) => {
    const yPos = 1.55 + i * 0.85;

    slide.addShape(pptx.shapes.OVAL, {
      x: 0.8, y: yPos + 0.05, w: 0.38, h: 0.38,
      fill: { color: ACCENT_BLUE },
    });

    slide.addText((i + 1).toString(), {
      x: 0.8, y: yPos + 0.05, w: 0.38, h: 0.38,
      fontSize: 14, fontFace: FONT_FACE, bold: true,
      color: WHITE, align: "center", valign: "middle",
    });

    slide.addText(text, {
      x: 1.4, y: yPos, w: 11, h: 0.5,
      fontSize: 18, fontFace: FONT_FACE, color: DARK_TEXT,
    });
  });

  slide.addNotes(
    "The core problem: content creation is manual and time-consuming. A single blog topic takes 2-4 hours when you include LinkedIn formatting, Twitter's character limits, and newsletter layout. That's effectively 3x the work for every content idea. There's no centralized collaboration system, publishing is disconnected across platforms, and SEO is inconsistent. Creative teams spend more time reformatting than on actual creative strategy."
  );
})();

// -------------------------------------------------------------------
// Slide 3 — Solution Overview
// -------------------------------------------------------------------
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "Solution Overview");
  addFooter(slide, 3);

  const features = [
    "AI-powered content generation from ideas or URLs",
    "3 distinct draft angles: Contrarian, How-To, Data & Trends",
    "Automatic adaptation for LinkedIn, X/Twitter, and Newsletter",
    "One-click publishing to all connected platforms",
    "Role-based team collaboration (Owner > Admin > Editor > Viewer)",
    "Human-in-the-loop: AI generates options, humans decide",
  ];

  features.forEach((text, i) => {
    const yPos = 1.45 + i * 0.58;
    slide.addText("\u25B8", {
      x: 0.7, y: yPos, w: 0.4, h: 0.48,
      fontSize: 18, fontFace: FONT_FACE, color: ACCENT_BLUE, bold: true,
    });
    slide.addText(text, {
      x: 1.1, y: yPos, w: 11.5, h: 0.48,
      fontSize: 17, fontFace: FONT_FACE, color: DARK_TEXT,
    });
  });

  // --- Flow Diagram ---
  const diagramY = 5.2;
  const boxH = 0.7;
  const boxColors = [ACCENT_BLUE, DARK_BLUE, ACCENT_BLUE, DARK_BLUE, ACCENT_BLUE];
  const labels = ["Idea / URL", "3 AI Drafts", "Human\nSelects", "3 Platform\nAdaptations", "One-Click\nPublish"];
  const boxW = 1.8;
  const gap = 0.6;
  const startX = 0.8;

  labels.forEach((label, i) => {
    const x = startX + i * (boxW + gap);
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x, y: diagramY, w: boxW, h: boxH,
      fill: { color: boxColors[i] },
      rectRadius: 0.1,
    });
    slide.addText(label, {
      x, y: diagramY, w: boxW, h: boxH,
      fontSize: 12, fontFace: FONT_FACE, bold: true,
      color: WHITE, align: "center", valign: "middle",
      lineSpacingMultiple: 0.95,
    });

    if (i < labels.length - 1) {
      const arrowX = x + boxW + 0.05;
      slide.addText("\u279C", {
        x: arrowX, y: diagramY, w: gap - 0.1, h: boxH,
        fontSize: 22, fontFace: FONT_FACE, color: ACCENT_BLUE,
        align: "center", valign: "middle",
      });
    }
  });

  slide.addNotes(
    "The solution is an end-to-end AI-powered content system. Submit an idea or URL, and the system generates 3 distinct SEO-optimized drafts — Contrarian, How-To, and Data & Trends angles. A human reviews and selects the best draft. The system then adapts it automatically for LinkedIn, X/Twitter, and Newsletter formats. One click publishes to all connected platforms. The entire process is governed by role-based access control with four tiers."
  );
})();

// -------------------------------------------------------------------
// Slide 4 — System Architecture
// -------------------------------------------------------------------
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "System Architecture");
  addFooter(slide, 4);

  // Architecture boxes
  const components = [
    { label: "React Frontend", x: 0.5, y: 1.6, w: 2.5, h: 0.7, color: ACCENT_BLUE },
    { label: "n8n Workflows (2)", x: 3.8, y: 1.6, w: 2.8, h: 0.7, color: DARK_BLUE },
    { label: "Supabase\n(PostgreSQL + Auth + RLS)", x: 7.4, y: 1.6, w: 2.8, h: 0.7, color: ACCENT_BLUE },
    { label: "Platform APIs", x: 11.0, y: 1.6, w: 2.0, h: 0.7, color: DARK_BLUE },
  ];

  components.forEach((c) => {
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: c.x, y: c.y, w: c.w, h: c.h,
      fill: { color: c.color }, rectRadius: 0.1,
    });
    slide.addText(c.label, {
      x: c.x, y: c.y, w: c.w, h: c.h,
      fontSize: 12, fontFace: FONT_FACE, bold: true, color: WHITE,
      align: "center", valign: "middle", lineSpacingMultiple: 0.9,
    });
  });

  // Arrows between components
  [3.1, 6.7, 10.3].forEach((x) => {
    slide.addText("\u279C", {
      x, y: 1.6, w: 0.6, h: 0.7,
      fontSize: 22, color: ACCENT_BLUE, align: "center", valign: "middle",
    });
  });

  // Workflow details
  const wfData = [
    { name: "Content Pipeline", desc: "Intake, drafts, adaptation, publishing (107 nodes)" },
    { name: "Operations", desc: "OAuth token exchange + stale submission cleanup" },
  ];

  slide.addText("2 n8n Workflows:", {
    x: 0.6, y: 2.7, w: 6, h: 0.4,
    fontSize: 16, fontFace: FONT_FACE, bold: true, color: DARK_BLUE,
  });

  wfData.forEach((wf, i) => {
    const y = 3.2 + i * 0.85;
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.8, y, w: 5.8, h: 0.7,
      fill: { color: LIGHT_GRAY }, rectRadius: 0.06,
    });
    slide.addText(wf.name, {
      x: 1.0, y: y + 0.05, w: 5.4, h: 0.32,
      fontSize: 14, fontFace: FONT_FACE, bold: true, color: DARK_BLUE, valign: "middle",
    });
    slide.addText(wf.desc, {
      x: 1.0, y: y + 0.35, w: 5.4, h: 0.28,
      fontSize: 12, fontFace: FONT_FACE, color: DARK_TEXT, valign: "middle",
    });
  });

  // Supabase details
  slide.addText("Supabase Responsibilities:", {
    x: 7.2, y: 2.7, w: 5, h: 0.4,
    fontSize: 16, fontFace: FONT_FACE, bold: true, color: DARK_BLUE,
  });

  const supaFeatures = [
    "State management (submissions, drafts, adaptations)",
    "Row Level Security (RBAC at DB level)",
    "Platform credential storage (encrypted)",
    "Magic Link auth + invite token flow",
    "Team membership & role management",
  ];

  supaFeatures.forEach((text, i) => {
    const y = 3.2 + i * 0.55;
    slide.addText("\u25B8 " + text, {
      x: 7.4, y, w: 5.5, h: 0.45,
      fontSize: 12, fontFace: FONT_FACE, color: DARK_TEXT,
    });
  });

  // Connected platforms
  slide.addText("LinkedIn (live) | Twitter/X (built, credits depleted) | Resend Newsletter (live)", {
    x: 0.6, y: 6.1, w: 12, h: 0.4,
    fontSize: 13, fontFace: FONT_FACE, bold: true, color: ACCENT_BLUE,
    align: "center",
  });

  slide.addNotes(
    "The architecture has four layers: React Frontend, two n8n workflows, Supabase as the database and auth layer, and the platform APIs. The Content Pipeline workflow (107 nodes) handles everything from submission to publishing in one unified flow. The Operations workflow handles OAuth token exchange and stale submission cleanup. Supabase manages state, enforces RBAC through Row Level Security, stores encrypted platform credentials, and handles authentication via magic links and invite tokens. LinkedIn and Newsletter are live. Twitter is built but blocked by depleted API credits."
  );
})();

// -------------------------------------------------------------------
// Slide 5 — Content Pipeline: Content Intake & Draft Generation
// -------------------------------------------------------------------
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "Content Pipeline \u2014 Content Intake & Draft Generation");
  addFooter(slide, 5);

  // Left: Process steps
  const steps = [
    "Validate input (payload size, format, injection)",
    "Deduplication check (content hash + 10-min window)",
    "URL content extraction (if URL provided)",
    "Generate Draft 1: Contrarian angle",
    "Generate Draft 2: How-To angle",
    "Generate Draft 3: Data & Trends angle",
    "Store all drafts in Supabase",
    "Return draft IDs to frontend",
  ];

  slide.addText("Process Flow:", {
    x: 0.6, y: 1.4, w: 6, h: 0.4,
    fontSize: 16, fontFace: FONT_FACE, bold: true, color: DARK_BLUE,
  });

  steps.forEach((step, i) => {
    const y = 1.9 + i * 0.6;
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.8, y, w: 6.5, h: 0.48,
      fill: { color: LIGHT_GRAY }, rectRadius: 0.06,
    });
    slide.addText(`${i + 1}.  ${step}`, {
      x: 1.0, y, w: 6.1, h: 0.48,
      fontSize: 13, fontFace: FONT_FACE, color: DARK_TEXT, valign: "middle",
    });
    if (i < steps.length - 1) {
      slide.addText("\u2193", {
        x: 3.8, y: y + 0.42, w: 0.5, h: 0.22,
        fontSize: 12, fontFace: FONT_FACE, color: ACCENT_BLUE, align: "center",
      });
    }
  });

  // Right: Key details
  slide.addText("Key Details", {
    x: 8.0, y: 1.4, w: 5, h: 0.4,
    fontSize: 16, fontFace: FONT_FACE, bold: true, color: DARK_BLUE,
  });

  const details = [
    { label: "Input", value: "Content idea or URL" },
    { label: "Output", value: "3 SEO-optimized articles" },
    { label: "Time", value: "~15-20 seconds" },
    { label: "AI Model", value: "GPT-4o-mini" },
    { label: "Generation", value: "Sequential (ensures diversity)" },
  ];

  details.forEach((d, i) => {
    const y = 2.0 + i * 0.7;
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 8.0, y, w: 4.8, h: 0.55,
      fill: { color: LIGHT_GRAY }, rectRadius: 0.06,
    });
    slide.addText(d.label + ":", {
      x: 8.2, y, w: 1.6, h: 0.55,
      fontSize: 13, fontFace: FONT_FACE, bold: true, color: ACCENT_BLUE, valign: "middle",
    });
    slide.addText(d.value, {
      x: 9.8, y, w: 2.8, h: 0.55,
      fontSize: 13, fontFace: FONT_FACE, color: DARK_TEXT, valign: "middle",
    });
  });

  // Draft angles
  slide.addText("3 Draft Angles:", {
    x: 8.0, y: 5.6, w: 5, h: 0.4,
    fontSize: 14, fontFace: FONT_FACE, bold: true, color: DARK_BLUE,
  });

  const angles = [
    { name: "Contrarian", desc: "Provocative counter-take" },
    { name: "How-To", desc: "Actionable step-by-step" },
    { name: "Data & Trends", desc: "Statistics-backed analysis" },
  ];

  angles.forEach((a, i) => {
    const y = 6.05 + i * 0.35;
    slide.addText(`\u25B8 ${a.name}: ${a.desc}`, {
      x: 8.2, y, w: 4.6, h: 0.3,
      fontSize: 12, fontFace: FONT_FACE, color: DARK_TEXT,
    });
  });

  slide.addNotes(
    "Workflow 1 handles content intake and draft generation. Input is validated for payload size, format, and injection attacks. A deduplication check uses content hashing with a 10-minute window to prevent duplicates. If a URL was provided, content is extracted. Then three AI drafts are generated sequentially — Contrarian, How-To, and Data & Trends — using GPT-4o-mini. Sequential generation ensures each draft is genuinely different. The whole process takes about 15-20 seconds and stores results in Supabase."
  );
})();

// -------------------------------------------------------------------
// Slide 6 — Content Pipeline: Platform Adaptation
// -------------------------------------------------------------------
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "Content Pipeline \u2014 Platform Adaptation");
  addFooter(slide, 6);

  // Process steps
  const steps = [
    { step: "1", title: "Lock Submission", desc: "Prevent concurrent modifications" },
    { step: "2", title: "Adapt for LinkedIn", desc: "Problem-Agitation-Solution (PAS) format" },
    { step: "3", title: "Adapt for X/Twitter", desc: "280 characters with relevant hashtags" },
    { step: "4", title: "Adapt for Newsletter", desc: "Compelling subject line + HTML body" },
  ];

  steps.forEach((s, i) => {
    const yPos = 1.5 + i * 1.2;

    slide.addShape(pptx.shapes.OVAL, {
      x: 0.7, y: yPos + 0.1, w: 0.45, h: 0.45,
      fill: { color: ACCENT_BLUE },
    });
    slide.addText(s.step, {
      x: 0.7, y: yPos + 0.1, w: 0.45, h: 0.45,
      fontSize: 16, fontFace: FONT_FACE, bold: true, color: WHITE,
      align: "center", valign: "middle",
    });

    slide.addText(s.title, {
      x: 1.35, y: yPos, w: 4, h: 0.35,
      fontSize: 16, fontFace: FONT_FACE, bold: true, color: DARK_BLUE,
    });
    slide.addText(s.desc, {
      x: 1.35, y: yPos + 0.35, w: 4.5, h: 0.3,
      fontSize: 13, fontFace: FONT_FACE, color: MEDIUM_GRAY,
    });

    if (i < steps.length - 1) {
      slide.addShape(pptx.shapes.RECTANGLE, {
        x: 0.91, y: yPos + 0.58, w: 0.03, h: 0.6,
        fill: { color: ACCENT_BLUE },
      });
    }
  });

  // Right side: Sample outputs
  const sampleX = 6.5;
  const sampleW = 6.2;

  slide.addText("Platform Output Samples", {
    x: sampleX, y: 1.4, w: sampleW, h: 0.4,
    fontSize: 16, fontFace: FONT_FACE, bold: true, color: DARK_BLUE,
  });

  // LinkedIn sample
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: sampleX, y: 1.9, w: sampleW, h: 1.3,
    fill: { color: LIGHT_GRAY }, rectRadius: 0.08,
  });
  slide.addText("LinkedIn (PAS)", {
    x: sampleX + 0.15, y: 1.95, w: 4, h: 0.3,
    fontSize: 12, fontFace: FONT_FACE, bold: true, color: ACCENT_BLUE,
  });
  slide.addText(
    "Problem: Remote work is emptying offices.\nAgitation: Commercial landlords face record vacancies...\nSolution: Smart investors are converting to co-living...",
    {
      x: sampleX + 0.15, y: 2.25, w: sampleW - 0.3, h: 0.9,
      fontSize: 11, fontFace: FONT_FACE, color: DARK_TEXT, lineSpacingMultiple: 1.2,
    }
  );

  // Twitter sample
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: sampleX, y: 3.4, w: sampleW, h: 0.9,
    fill: { color: LIGHT_GRAY }, rectRadius: 0.08,
  });
  slide.addText("X / Twitter (280 chars)", {
    x: sampleX + 0.15, y: 3.45, w: 4, h: 0.3,
    fontSize: 12, fontFace: FONT_FACE, bold: true, color: ACCENT_BLUE,
  });
  slide.addText(
    "Remote work isn\u2019t killing real estate \u2014 it\u2019s reshaping it. #RealEstate #RemoteWork",
    {
      x: sampleX + 0.15, y: 3.75, w: sampleW - 0.3, h: 0.5,
      fontSize: 11, fontFace: FONT_FACE, color: DARK_TEXT,
    }
  );

  // Newsletter sample
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: sampleX, y: 4.5, w: sampleW, h: 1.0,
    fill: { color: LIGHT_GRAY }, rectRadius: 0.08,
  });
  slide.addText("Newsletter", {
    x: sampleX + 0.15, y: 4.55, w: 4, h: 0.3,
    fontSize: 12, fontFace: FONT_FACE, bold: true, color: ACCENT_BLUE,
  });
  slide.addText(
    "Subject: The Office Is Dead \u2014 Long Live Co-Living\nHi [First Name], The shift to remote work has created...",
    {
      x: sampleX + 0.15, y: 4.85, w: sampleW - 0.3, h: 0.6,
      fontSize: 11, fontFace: FONT_FACE, color: DARK_TEXT, lineSpacingMultiple: 1.15,
    }
  );

  // Key stats
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 6.2, w: 12, h: 0.45,
    fill: { color: ACCENT_BLUE }, rectRadius: 0.1,
  });
  slide.addText("Processing time: ~10-15 seconds  |  Input: Selected draft  |  Output: 3 platform-ready versions", {
    x: 0.6, y: 6.2, w: 12, h: 0.45,
    fontSize: 13, fontFace: FONT_FACE, bold: true, color: WHITE,
    align: "center", valign: "middle",
  });

  slide.addNotes(
    "The platform adaptation section of the Content Pipeline handles this step. After a human selects the best draft, the submission is locked to prevent concurrent modifications. The system then adapts the draft for LinkedIn using Problem-Agitation-Solution format for maximum engagement, X/Twitter within the 280-character limit with relevant hashtags, and a newsletter format with a compelling subject line and HTML body. The whole process takes about 10-15 seconds."
  );
})();

// -------------------------------------------------------------------
// Slide 7 — Operations Workflow: OAuth & Publishing
// -------------------------------------------------------------------
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "Operations Workflow \u2014 OAuth & Publishing");
  addFooter(slide, 7);

  // OAuth - Left
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 1.5, w: 5.9, h: 0.55,
    fill: { color: DARK_BLUE }, rectRadius: 0.08,
  });
  slide.addText("OAuth Token Exchange", {
    x: 0.5, y: 1.5, w: 5.9, h: 0.55,
    fontSize: 16, fontFace: FONT_FACE, bold: true, color: WHITE,
    align: "center", valign: "middle",
  });

  const oauthSteps = [
    "Receives authorization code from frontend",
    "LinkedIn: OAuth 2.0 bearer token exchange",
    "Twitter: OAuth 2.0 + PKCE token exchange",
    "Stores tokens in Supabase (platform_connections)",
    "Handles token refresh on expiry",
  ];

  oauthSteps.forEach((text, i) => {
    const y = 2.3 + i * 0.65;
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.7, y, w: 5.5, h: 0.52,
      fill: { color: LIGHT_GRAY }, rectRadius: 0.06,
    });
    slide.addText(`${i + 1}. ${text}`, {
      x: 0.9, y, w: 5.1, h: 0.52,
      fontSize: 13, fontFace: FONT_FACE, color: DARK_TEXT, valign: "middle",
    });
  });

  // Publishing - Right
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 6.9, y: 1.5, w: 5.9, h: 0.55,
    fill: { color: ACCENT_BLUE }, rectRadius: 0.08,
  });
  slide.addText("Content Pipeline: Publishing", {
    x: 6.9, y: 1.5, w: 5.9, h: 0.55,
    fontSize: 16, fontFace: FONT_FACE, bold: true, color: WHITE,
    align: "center", valign: "middle",
  });

  const pubSteps = [
    "Fetches adapted content + platform tokens",
    "Publishes to LinkedIn API (live, Fetemi's acct)",
    "Publishes to Twitter API v2 (built; credits depleted)",
    "Sends Newsletter via Resend API (live)",
    "Updates per-platform status in Supabase",
  ];

  pubSteps.forEach((text, i) => {
    const y = 2.3 + i * 0.65;
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 7.1, y, w: 5.5, h: 0.52,
      fill: { color: LIGHT_GRAY }, rectRadius: 0.06,
    });
    slide.addText(`${i + 1}. ${text}`, {
      x: 7.3, y, w: 5.1, h: 0.52,
      fontSize: 13, fontFace: FONT_FACE, color: DARK_TEXT, valign: "middle",
    });
  });

  // Key features callouts
  const features = [
    "Idempotency keys prevent duplicate posts across all platforms",
    "Partial failure handling: one platform failing does not block others",
    "Real-time status updates pushed to frontend via Supabase",
  ];

  slide.addText("Key Features:", {
    x: 0.6, y: 5.7, w: 12, h: 0.35,
    fontSize: 15, fontFace: FONT_FACE, bold: true, color: DARK_BLUE,
  });

  features.forEach((text, i) => {
    slide.addText("\u2713 " + text, {
      x: 0.8, y: 6.05 + i * 0.35,
      w: 12, h: 0.3,
      fontSize: 13, fontFace: FONT_FACE, color: DARK_TEXT,
    });
  });

  slide.addNotes(
    "The Operations workflow handles OAuth token exchange for both LinkedIn (OAuth 2.0) and Twitter (OAuth 2.0 + PKCE). It receives authorization codes from the frontend, exchanges them for access tokens, stores them in Supabase, and handles token refresh on expiry. The Content Pipeline's publishing section fetches adapted content and platform tokens, then publishes to all three platforms. LinkedIn and Newsletter are live. Twitter publishing is built and would work but the developer account's API credits are depleted — this is a billing issue, not a code issue. Idempotency keys prevent duplicate posts, and partial failure handling means one platform failing doesn't block the others."
  );
})();

// -------------------------------------------------------------------
// Slide 8 — Frontend: User Experience
// -------------------------------------------------------------------
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "Frontend \u2014 User Experience");
  addFooter(slide, 8);

  const features = [
    { title: "Magic Link Authentication", desc: "No passwords — secure email-based login via Supabase Auth" },
    { title: "Invite Flow", desc: "Token-based invite URL → AcceptInvite page → magic link → active member" },
    { title: "Role-Based Access", desc: "UI adapts based on user role (Owner > Admin > Editor > Viewer)" },
    { title: "Real-Time Dashboard", desc: "Submission status updates with 15s polling" },
    { title: "Draft Review", desc: "Expand/collapse 3 generated drafts, compare angles side-by-side" },
    { title: "Approval Gate", desc: "Only Admin/Owner can approve and trigger publishing" },
  ];

  features.forEach((f, i) => {
    const y = 1.5 + i * 0.88;
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y, w: 12.1, h: 0.75,
      fill: { color: i % 2 === 0 ? LIGHT_GRAY : WHITE }, rectRadius: 0.06,
      line: { color: "cbd5e1", width: 0.5 },
    });
    slide.addText(f.title, {
      x: 0.9, y, w: 3.5, h: 0.75,
      fontSize: 15, fontFace: FONT_FACE, bold: true, color: DARK_BLUE, valign: "middle",
    });
    slide.addText(f.desc, {
      x: 4.4, y, w: 8.0, h: 0.75,
      fontSize: 13, fontFace: FONT_FACE, color: DARK_TEXT, valign: "middle",
    });
  });

  slide.addNotes(
    "The frontend provides a streamlined user experience. Authentication uses magic links — no passwords needed. The UI adapts based on the user's role, showing or hiding features accordingly. The dashboard shows real-time submission status. Users can review all three generated drafts with expand/collapse functionality. Before publishing, they can preview the adapted content for each platform. An approval gate ensures only Admin or Owner roles can trigger publishing."
  );
})();

// -------------------------------------------------------------------
// Slide 9 — Frontend: Team & Platform Management
// -------------------------------------------------------------------
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "Frontend \u2014 Team & Platform Management");
  addFooter(slide, 9);

  // Team Management - Left
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 1.5, w: 5.9, h: 0.55,
    fill: { color: DARK_BLUE }, rectRadius: 0.08,
  });
  slide.addText("Team Management", {
    x: 0.5, y: 1.5, w: 5.9, h: 0.55,
    fontSize: 16, fontFace: FONT_FACE, bold: true, color: WHITE,
    align: "center", valign: "middle",
  });

  const teamFeatures = [
    "Invite members by email",
    "Assign roles: Owner, Admin, Editor, Viewer",
    "Update or remove team member roles",
    "View team member activity and status",
    "Role changes take effect immediately (RLS)",
  ];

  teamFeatures.forEach((text, i) => {
    const y = 2.3 + i * 0.6;
    slide.addText("\u25B8 " + text, {
      x: 0.7, y, w: 5.5, h: 0.48,
      fontSize: 14, fontFace: FONT_FACE, color: DARK_TEXT,
    });
  });

  // Platform Management - Right
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 6.9, y: 1.5, w: 5.9, h: 0.55,
    fill: { color: ACCENT_BLUE }, rectRadius: 0.08,
  });
  slide.addText("Platform Connections", {
    x: 6.9, y: 1.5, w: 5.9, h: 0.55,
    fontSize: 16, fontFace: FONT_FACE, bold: true, color: WHITE,
    align: "center", valign: "middle",
  });

  const platforms = [
    { name: "LinkedIn", method: "OAuth 2.0 flow", icon: "\u{1F517}" },
    { name: "Twitter / X", method: "OAuth 2.0 + PKCE flow", icon: "\u{1F517}" },
    { name: "Newsletter (Resend)", method: "API key configuration", icon: "\u2709" },
  ];

  platforms.forEach((p, i) => {
    const y = 2.3 + i * 1.0;
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 7.1, y, w: 5.5, h: 0.8,
      fill: { color: LIGHT_GRAY }, rectRadius: 0.06,
    });
    slide.addText(p.name, {
      x: 7.3, y: y + 0.02, w: 5.1, h: 0.35,
      fontSize: 14, fontFace: FONT_FACE, bold: true, color: DARK_BLUE,
    });
    slide.addText(p.method, {
      x: 7.3, y: y + 0.38, w: 5.1, h: 0.35,
      fontSize: 12, fontFace: FONT_FACE, color: MEDIUM_GRAY,
    });
  });

  const settingsFeatures = [
    "View connection status per platform",
    "Disconnect / reconnect at any time",
    "Only Owner can manage platform connections",
  ];

  settingsFeatures.forEach((text, i) => {
    const y = 5.5 + i * 0.4;
    slide.addText("\u25B8 " + text, {
      x: 7.1, y, w: 5.5, h: 0.35,
      fontSize: 12, fontFace: FONT_FACE, color: DARK_TEXT,
    });
  });

  slide.addNotes(
    "The Team page lets you invite members by email using a token-based invite link, assign roles, and manage access. Role changes take effect immediately because they're enforced at the database level through Supabase RLS. The Settings page handles platform connections: LinkedIn uses OAuth 2.0, Twitter uses OAuth 2.0 with PKCE, and Newsletter uses a Resend API key. Only the Owner role can manage platform connections. Users can view connection status and disconnect or reconnect platforms at any time."
  );
})();

// -------------------------------------------------------------------
// Slide 10 — RBAC: Role Permissions
// -------------------------------------------------------------------
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "RBAC \u2014 Role Permissions");
  addFooter(slide, 10);

  // Table
  const tableX = 0.6;
  const tableY = 1.6;
  const colWidths = [3.5, 2.0, 2.0, 2.0, 2.0];
  const rowH = 0.6;
  const headers = ["Action", "Owner", "Admin", "Editor", "Viewer"];
  const rows = [
    ["View content", "Yes", "Yes", "Yes", "Yes"],
    ["Submit ideas", "Yes", "Yes", "Yes", "No"],
    ["Select drafts", "Yes", "Yes", "Yes", "No"],
    ["Approve & Publish", "Yes", "Yes", "No", "No"],
    ["Manage team", "Yes", "Yes", "No", "No"],
    ["Connect platforms", "Yes", "No", "No", "No"],
  ];

  // Header row
  let xPos = tableX;
  headers.forEach((h, i) => {
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: xPos, y: tableY, w: colWidths[i], h: rowH,
      fill: { color: DARK_BLUE }, rectRadius: 0.04,
    });
    slide.addText(h, {
      x: xPos, y: tableY, w: colWidths[i], h: rowH,
      fontSize: 14, fontFace: FONT_FACE, bold: true, color: WHITE,
      align: "center", valign: "middle",
    });
    xPos += colWidths[i] + 0.1;
  });

  // Data rows
  rows.forEach((row, ri) => {
    const y = tableY + (ri + 1) * (rowH + 0.08);
    let xPos = tableX;
    row.forEach((cell, ci) => {
      const bgColor = ri % 2 === 0 ? LIGHT_GRAY : WHITE;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: xPos, y, w: colWidths[ci], h: rowH,
        fill: { color: bgColor }, rectRadius: 0.04,
        line: { color: "cbd5e1", width: 0.5 },
      });

      let textColor = DARK_TEXT;
      let cellText = cell;
      if (ci > 0) {
        textColor = cell === "Yes" ? GREEN : RED;
        cellText = cell === "Yes" ? "\u2713 Yes" : "\u2717 No";
      }

      slide.addText(ci === 0 ? cell : cellText, {
        x: xPos, y, w: colWidths[ci], h: rowH,
        fontSize: 13, fontFace: FONT_FACE,
        bold: ci === 0,
        color: ci === 0 ? DARK_BLUE : textColor,
        align: "center", valign: "middle",
      });
      xPos += colWidths[ci] + 0.1;
    });
  });

  // Enforcement note
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 1.5, y: 6.1, w: 10.3, h: 0.5,
    fill: { color: ACCENT_BLUE }, rectRadius: 0.1,
  });
  slide.addText("Enforced at database level via Supabase RLS  |  Frontend enforces UI restrictions as secondary check", {
    x: 1.5, y: 6.1, w: 10.3, h: 0.5,
    fontSize: 13, fontFace: FONT_FACE, bold: true, color: WHITE,
    align: "center", valign: "middle",
  });

  slide.addNotes(
    "The RBAC system has four roles in a strict hierarchy: Owner, Admin, Editor, and Viewer. Everyone can view content. Editors and above can submit ideas and select drafts. Only Admins and Owners can approve and publish content or manage team members. Only the Owner can connect platform credentials. This is enforced at the database level through Supabase Row Level Security policies, with the frontend providing a secondary UI-level check."
  );
})();

// -------------------------------------------------------------------
// Slide 11 — Edge Cases & Error Handling
// -------------------------------------------------------------------
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "Edge Cases & Error Handling");
  addFooter(slide, 11);

  const cases = [
    { trigger: "Input validation", response: "Payload size limits, unicode handling, injection protection", color: "dc2626" },
    { trigger: "Duplicate detection", response: "Content hash + 10-min dedup window (409 Conflict)", color: "ea580c" },
    { trigger: "AI API failure", response: "3x exponential backoff (1s, 2s, 4s), then graceful error", color: "ca8a04" },
    { trigger: "Partial publish failure", response: "Per-platform error handling, others continue", color: "2563eb" },
    { trigger: "Mid-execution recovery", response: "Stale submission cleanup for abandoned workflows", color: "7c3aed" },
    { trigger: "Token expiry", response: "Automatic OAuth token refresh before publishing", color: "059669" },
    { trigger: "X/Twitter overflow", response: "Smart truncation at nearest sentence boundary", color: "0891b2" },
    { trigger: "Concurrent access", response: "Optimistic locking prevents race conditions", color: "6d28d9" },
  ];

  // Column headers
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 1.5, w: 4.5, h: 0.5,
    fill: { color: DARK_BLUE }, rectRadius: 0.06,
  });
  slide.addText("Edge Case", {
    x: 0.6, y: 1.5, w: 4.5, h: 0.5,
    fontSize: 14, fontFace: FONT_FACE, bold: true, color: WHITE,
    align: "center", valign: "middle",
  });

  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 5.3, y: 1.5, w: 7.4, h: 0.5,
    fill: { color: DARK_BLUE }, rectRadius: 0.06,
  });
  slide.addText("How It's Handled", {
    x: 5.3, y: 1.5, w: 7.4, h: 0.5,
    fontSize: 14, fontFace: FONT_FACE, bold: true, color: WHITE,
    align: "center", valign: "middle",
  });

  cases.forEach((c, i) => {
    const y = 2.15 + i * 0.58;

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y, w: 4.5, h: 0.48,
      fill: { color: LIGHT_GRAY }, rectRadius: 0.04,
    });
    slide.addShape(pptx.shapes.RECTANGLE, {
      x: 0.6, y: y + 0.06, w: 0.08, h: 0.36,
      fill: { color: c.color },
    });
    slide.addText(c.trigger, {
      x: 0.85, y, w: 4.2, h: 0.48,
      fontSize: 12, fontFace: FONT_FACE, color: DARK_TEXT, valign: "middle",
    });

    slide.addText("\u279C", {
      x: 4.9, y, w: 0.5, h: 0.48,
      fontSize: 16, color: ACCENT_BLUE, align: "center", valign: "middle",
    });

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 5.3, y, w: 7.4, h: 0.48,
      fill: { color: LIGHT_GRAY }, rectRadius: 0.04,
    });
    slide.addText(c.response, {
      x: 5.5, y, w: 7.0, h: 0.48,
      fontSize: 11, fontFace: FONT_FACE, color: DARK_TEXT, valign: "middle",
    });
  });

  // Error-trigger workflow note
  slide.addText("Dedicated error-trigger workflow captures and logs all failures gracefully", {
    x: 0.6, y: 6.4, w: 12, h: 0.3,
    fontSize: 12, fontFace: FONT_FACE, italic: true, color: MEDIUM_GRAY, align: "center",
  });

  slide.addNotes(
    "The system handles eight categories of edge cases. Input validation covers payload size, unicode, and injection attacks. Duplicate detection uses content hashing with a 10-minute window. AI API failures trigger three retries with exponential backoff. Partial publishing failures are handled per-platform so one failure doesn't block others. Mid-execution recovery cleans up stale abandoned workflows. Token expiry triggers automatic OAuth refresh. Twitter overflow uses smart sentence-boundary truncation. And optimistic locking prevents race conditions on concurrent access."
  );
})();

// -------------------------------------------------------------------
// Slide 12 — Pressure Testing Results
// -------------------------------------------------------------------
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "Pressure Testing Results");
  addFooter(slide, 12);

  const tests = [
    { scenario: "Burst Load", details: "20 concurrent submissions", result: "90% success", color: GREEN },
    { scenario: "Sustained Load", details: "100 over 60 seconds", result: "93% success", color: GREEN },
    { scenario: "Poison Payloads", details: "15 adversarial inputs", result: "100% handled", color: GREEN },
    { scenario: "Cascading Failure", details: "Platform API outage", result: "Partial success preserved", color: "ca8a04" },
    { scenario: "Data Integrity", details: "All scenarios combined", result: "No corruption", color: GREEN },
  ];

  // Table header
  const cols = [
    { label: "Test Scenario", w: 3.0 },
    { label: "Details", w: 4.0 },
    { label: "Result", w: 4.5 },
  ];
  let xPos = 0.6;

  cols.forEach((col) => {
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: xPos, y: 1.6, w: col.w, h: 0.6,
      fill: { color: DARK_BLUE }, rectRadius: 0.06,
    });
    slide.addText(col.label, {
      x: xPos, y: 1.6, w: col.w, h: 0.6,
      fontSize: 15, fontFace: FONT_FACE, bold: true, color: WHITE,
      align: "center", valign: "middle",
    });
    xPos += col.w + 0.1;
  });

  tests.forEach((t, i) => {
    const y = 2.4 + i * 0.75;
    const bgColor = i % 2 === 0 ? LIGHT_GRAY : WHITE;
    let xPos = 0.6;

    // Scenario
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: xPos, y, w: 3.0, h: 0.6,
      fill: { color: bgColor }, rectRadius: 0.04,
      line: { color: "cbd5e1", width: 0.5 },
    });
    slide.addText(t.scenario, {
      x: xPos + 0.2, y, w: 2.6, h: 0.6,
      fontSize: 14, fontFace: FONT_FACE, bold: true, color: DARK_BLUE, valign: "middle",
    });
    xPos += 3.1;

    // Details
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: xPos, y, w: 4.0, h: 0.6,
      fill: { color: bgColor }, rectRadius: 0.04,
      line: { color: "cbd5e1", width: 0.5 },
    });
    slide.addText(t.details, {
      x: xPos + 0.2, y, w: 3.6, h: 0.6,
      fontSize: 13, fontFace: FONT_FACE, color: DARK_TEXT, valign: "middle",
    });
    xPos += 4.1;

    // Result
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: xPos, y, w: 4.5, h: 0.6,
      fill: { color: bgColor }, rectRadius: 0.04,
      line: { color: "cbd5e1", width: 0.5 },
    });
    slide.addText(t.result, {
      x: xPos + 0.2, y, w: 4.1, h: 0.6,
      fontSize: 14, fontFace: FONT_FACE, bold: true, color: t.color,
      valign: "middle", align: "center",
    });
  });

  // Summary callout
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 1.5, y: 6.1, w: 10.3, h: 0.5,
    fill: { color: ACCENT_BLUE }, rectRadius: 0.1,
  });
  slide.addText("27 test cases passing  |  System degrades gracefully  |  Zero data corruption", {
    x: 1.5, y: 6.1, w: 10.3, h: 0.5,
    fontSize: 14, fontFace: FONT_FACE, bold: true, color: WHITE,
    align: "center", valign: "middle",
  });

  slide.addNotes(
    "Pressure testing covered five scenarios. Burst load with 20 concurrent submissions achieved 90% success. Sustained load of 100 submissions over 60 seconds hit 93% success. All 15 adversarial poison payloads were handled correctly with 100% success. During cascading failures when a platform API went down, partial success was preserved — the other platforms continued. Most importantly, no data corruption occurred in any scenario. All 27 test cases pass."
  );
})();

// -------------------------------------------------------------------
// Slide 13 — Tech Stack
// -------------------------------------------------------------------
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "Tech Stack");
  addFooter(slide, 13);

  const stack = [
    { category: "Frontend", tech: "React 18, Tailwind CSS, Vite, React Router", color: ACCENT_BLUE },
    { category: "Automation", tech: "n8n (2 workflows, 107+ nodes)", color: DARK_BLUE },
    { category: "Database", tech: "Supabase (PostgreSQL + Auth + RLS)", color: ACCENT_BLUE },
    { category: "AI", tech: "OpenAI GPT-4o-mini (cost-optimized)", color: DARK_BLUE },
    { category: "Publishing", tech: "Twitter API v2, LinkedIn API, Resend", color: ACCENT_BLUE },
    { category: "Auth", tech: "Supabase Magic Links + custom RBAC", color: DARK_BLUE },
  ];

  stack.forEach((s, i) => {
    const y = 1.5 + i * 0.88;

    // Category badge
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.8, y: y + 0.05, w: 2.5, h: 0.65,
      fill: { color: s.color }, rectRadius: 0.08,
    });
    slide.addText(s.category, {
      x: 0.8, y: y + 0.05, w: 2.5, h: 0.65,
      fontSize: 16, fontFace: FONT_FACE, bold: true, color: WHITE,
      align: "center", valign: "middle",
    });

    // Arrow
    slide.addText("\u279C", {
      x: 3.4, y: y + 0.05, w: 0.6, h: 0.65,
      fontSize: 20, color: ACCENT_BLUE, align: "center", valign: "middle",
    });

    // Tech detail
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 4.1, y: y + 0.05, w: 8.6, h: 0.65,
      fill: { color: LIGHT_GRAY }, rectRadius: 0.08,
    });
    slide.addText(s.tech, {
      x: 4.3, y: y + 0.05, w: 8.2, h: 0.65,
      fontSize: 15, fontFace: FONT_FACE, color: DARK_TEXT, valign: "middle",
    });
  });

  slide.addNotes(
    "The tech stack: React 18 with Tailwind CSS and Vite for the frontend. n8n handles automation with 4 workflows and over 80 nodes. Supabase provides PostgreSQL database, authentication, and Row Level Security. AI is powered by GPT-4o-mini for cost optimization. Publishing connects to Twitter API v2, LinkedIn API, and Resend for newsletters. Authentication uses Supabase Magic Links with a custom RBAC layer."
  );
})();

// -------------------------------------------------------------------
// Slide 14 — What I Learned
// -------------------------------------------------------------------
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "What I Learned");
  addFooter(slide, 14);

  const lessons = [
    {
      title: "n8n Expression Syntax",
      detail: "JSON body construction and dynamic field mapping require careful escaping and testing across node boundaries",
    },
    {
      title: "OAuth 2.0 + PKCE",
      detail: "Twitter's PKCE flow adds real complexity vs LinkedIn's simpler authorization code flow",
    },
    {
      title: "Supabase RLS",
      detail: "Row Level Security enables role-based data access at the database level, eliminating backend middleware",
    },
    {
      title: "Sequential AI Generation",
      detail: "Generating drafts one at a time with context from previous outputs ensures genuine diversity",
    },
    {
      title: "End-to-End System Building",
      detail: "Connecting frontend, automation, database, and third-party APIs into a cohesive SaaS-like product",
    },
  ];

  lessons.forEach((l, i) => {
    const y = 1.5 + i * 1.05;

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y, w: 12.1, h: 0.9,
      fill: { color: i % 2 === 0 ? LIGHT_GRAY : WHITE }, rectRadius: 0.06,
      line: { color: "cbd5e1", width: 0.5 },
    });

    // Colored left accent
    slide.addShape(pptx.shapes.RECTANGLE, {
      x: 0.6, y: y + 0.1, w: 0.1, h: 0.7,
      fill: { color: ACCENT_BLUE },
    });

    slide.addText(l.title, {
      x: 0.9, y: y + 0.02, w: 11.5, h: 0.38,
      fontSize: 15, fontFace: FONT_FACE, bold: true, color: DARK_BLUE,
    });
    slide.addText(l.detail, {
      x: 0.9, y: y + 0.42, w: 11.5, h: 0.42,
      fontSize: 13, fontFace: FONT_FACE, color: MEDIUM_GRAY,
    });
  });

  slide.addNotes(
    "Key learnings from this project. First, n8n expression syntax for JSON body construction requires careful escaping — moving complex construction to Code nodes solves this entirely. Second, OAuth 2.0 with PKCE for Twitter adds real complexity vs LinkedIn's simpler authorization code flow. Third, Supabase Row Level Security is powerful for enforcing role-based access at the database level without backend middleware. Fourth, sequential AI generation with context passing ensures diverse draft angles. And fifth, consolidating four workflows into two improved debugging by giving one execution log per user action instead of four separate logs to correlate."
  );
})();

// -------------------------------------------------------------------
// Slide 15 — Future Enhancements
// -------------------------------------------------------------------
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "Future Enhancements");
  addFooter(slide, 15);

  const enhancements = [
    { title: "Content Scheduling", desc: "Calendar view for planned publishing across platforms" },
    { title: "Analytics Dashboard", desc: "Engagement metrics per platform (likes, shares, clicks)" },
    { title: "AI Prompt Optimization", desc: "Improve prompts based on historical performance data" },
    { title: "Webhook Security", desc: "HMAC signature verification for all inbound webhooks" },
    { title: "Multi-Organization Support", desc: "Isolate teams and content by organization" },
    { title: "Pre-Publish Review Gate", desc: "Second approval after platform adaptation" },
    { title: "Token Cost Tracking", desc: "Per-submission AI cost tracking for budget visibility" },
  ];

  enhancements.forEach((e, i) => {
    const y = 1.5 + i * 0.72;

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.8, y, w: 11.7, h: 0.58,
      fill: { color: LIGHT_GRAY }, rectRadius: 0.06,
    });

    slide.addText(`${i + 1}.`, {
      x: 0.95, y, w: 0.45, h: 0.58,
      fontSize: 14, fontFace: FONT_FACE, bold: true, color: ACCENT_BLUE, valign: "middle",
    });

    slide.addText(e.title, {
      x: 1.4, y, w: 3.2, h: 0.58,
      fontSize: 14, fontFace: FONT_FACE, bold: true, color: DARK_BLUE, valign: "middle",
    });

    slide.addText(e.desc, {
      x: 4.6, y, w: 7.7, h: 0.58,
      fontSize: 13, fontFace: FONT_FACE, color: DARK_TEXT, valign: "middle",
    });
  });

  slide.addNotes(
    "Future enhancements I'd prioritize. Content scheduling with a calendar view. An analytics dashboard for engagement metrics per platform. AI prompt optimization based on historical performance. Webhook security with HMAC signatures. Multi-organization support to isolate teams and content. A second approval gate after platform adaptation. And token cost tracking per submission for budget visibility."
  );
})();

// -------------------------------------------------------------------
// Slide 16 — Demo
// -------------------------------------------------------------------
(() => {
  const slide = pptx.addSlide();
  addHeader(slide, "Live Demo");
  addFooter(slide, 16);

  slide.addText("Complete Flow Walkthrough", {
    x: 0.6, y: 1.5, w: 12, h: 0.5,
    fontSize: 20, fontFace: FONT_FACE, bold: true, color: DARK_BLUE,
    align: "center",
  });

  const demoSteps = [
    { step: "1", title: "Submit Idea", desc: '"Remote work reshaping real estate"' },
    { step: "2", title: "Generate Drafts", desc: "3 AI drafts: Contrarian, How-To, Data & Trends" },
    { step: "3", title: "Select Best Draft", desc: "Review and choose the strongest angle" },
    { step: "4", title: "Adapt Content", desc: "Auto-format for LinkedIn, X/Twitter, Newsletter" },
    { step: "5", title: "Approve & Publish", desc: "Admin/Owner approves, one-click publish" },
    { step: "6", title: "Verify", desc: "Confirm published content on each platform" },
  ];

  demoSteps.forEach((s, i) => {
    const yPos = 2.2 + i * 0.82;

    // Step number circle
    slide.addShape(pptx.shapes.OVAL, {
      x: 2.0, y: yPos + 0.05, w: 0.5, h: 0.5,
      fill: { color: ACCENT_BLUE },
    });
    slide.addText(s.step, {
      x: 2.0, y: yPos + 0.05, w: 0.5, h: 0.5,
      fontSize: 18, fontFace: FONT_FACE, bold: true, color: WHITE,
      align: "center", valign: "middle",
    });

    slide.addText(s.title, {
      x: 2.7, y: yPos, w: 3.5, h: 0.3,
      fontSize: 16, fontFace: FONT_FACE, bold: true, color: DARK_BLUE,
    });
    slide.addText(s.desc, {
      x: 2.7, y: yPos + 0.3, w: 7.5, h: 0.3,
      fontSize: 13, fontFace: FONT_FACE, color: MEDIUM_GRAY,
    });

    // Connector line
    if (i < demoSteps.length - 1) {
      slide.addShape(pptx.shapes.RECTANGLE, {
        x: 2.24, y: yPos + 0.57, w: 0.03, h: 0.25,
        fill: { color: ACCENT_BLUE },
      });
    }
  });

  slide.addNotes(
    "Let me walk through the complete flow live. Step 1: Submit the idea 'Remote work reshaping real estate.' Step 2: View the 3 generated drafts — Contrarian, How-To, and Data & Trends. Step 3: Select the strongest draft. Step 4: The system automatically adapts the content for LinkedIn, X/Twitter, and Newsletter. Step 5: An Admin or Owner approves and triggers one-click publishing. Step 6: We verify the content is live on each platform."
  );
})();

// -------------------------------------------------------------------
// Slide 17 — Thank You
// -------------------------------------------------------------------
(() => {
  const slide = pptx.addSlide();

  // Full dark-blue background
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: "100%", h: "100%",
    fill: { color: DARK_BLUE },
  });

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 2.8, w: "100%", h: 0.06,
    fill: { color: ACCENT_BLUE },
  });

  slide.addText("Thank You", {
    x: 0.8, y: 0.8, w: 11.5, h: 1.5,
    fontSize: 44, fontFace: FONT_FACE, bold: true,
    color: WHITE, align: "center", valign: "middle",
  });

  slide.addText("Built by Ayodele Oluwafimidaraayo", {
    x: 0.8, y: 3.2, w: 11.5, h: 0.7,
    fontSize: 22, fontFace: FONT_FACE, color: WHITE, align: "center",
  });

  slide.addText("React + n8n + Supabase + OpenAI", {
    x: 0.8, y: 4.0, w: 11.5, h: 0.5,
    fontSize: 18, fontFace: FONT_FACE, color: ACCENT_BLUE, align: "center",
  });

  // Highlights
  const highlights = [
    "2 n8n workflows, 107+ nodes",
    "3 publishing platforms (LinkedIn + Newsletter live)",
    "4-tier RBAC system",
    "93%+ success rate under load",
    "27 test cases passing",
  ];

  highlights.forEach((text, i) => {
    slide.addText("\u25B8 " + text, {
      x: 3.5, y: 4.8 + i * 0.38, w: 6.3, h: 0.35,
      fontSize: 14, fontFace: FONT_FACE, color: MEDIUM_GRAY, align: "center",
    });
  });

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 4.5, y: 6.8, w: 4.3, h: 0.04,
    fill: { color: ACCENT_BLUE },
  });

  slide.addText("Questions?", {
    x: 0.8, y: 6.9, w: 11.5, h: 0.5,
    fontSize: 20, fontFace: FONT_FACE, bold: true, color: ACCENT_BLUE, align: "center",
  });

  slide.addNotes(
    "Thank you for your time. This Content Generation and Publishing Automation system was built with React, n8n, Supabase, and OpenAI. It features 4 workflows with over 80 nodes, publishes to 3 platforms, implements a 4-tier RBAC system, achieves a 93% success rate under sustained load, and passes all 27 test cases. I'm happy to take any questions."
  );
})();

// -------------------------------------------------------------------
// Write file
// -------------------------------------------------------------------
const OUTPUT_PATH = "/Users/ayodeleoluwafimidaraayo/Desktop/AAT/deliverables/presentation.pptx";

pptx.writeFile({ fileName: OUTPUT_PATH })
  .then(() => {
    console.log(`Presentation saved to ${OUTPUT_PATH}`);
  })
  .catch((err) => {
    console.error("Error generating presentation:", err);
    process.exit(1);
  });
