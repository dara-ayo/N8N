-- Content Generation & Publishing Automation
-- Seed data for development and testing
-- Author: Oluwademilade Bickersteth
-- Date: 2026-03-25

-- ============================================
-- SUBMISSIONS
-- 5 submissions in various lifecycle states
-- ============================================

-- 1. PUBLISHED submission (URL input, fully complete)
INSERT INTO submissions (id, content_hash, input_type, raw_input, content_base, drafts, selected_draft, status, publish_immediately, created_at, updated_at)
VALUES (
  'sub_a1b2c3d4',
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'url',
  'https://techcrunch.com/2026/03/20/openai-launches-new-reasoning-model',
  'OpenAI has announced GPT-5, its latest reasoning model that demonstrates significant improvements in multi-step logical reasoning, mathematical problem-solving, and code generation. The model was trained using a novel reinforcement learning approach that emphasizes chain-of-thought reasoning. Early benchmarks show a 40% improvement over GPT-4o on complex reasoning tasks. The model is available through the API starting today with consumer access rolling out next week.',
  '[
    {
      "index": 1,
      "angle": "Industry Impact Analysis",
      "title": "GPT-5 Signals a New Era for Enterprise AI Adoption",
      "content": "OpenAI''s release of GPT-5 is not just another model update -- it represents a fundamental shift in what enterprises can expect from AI reasoning capabilities.\n\nThe 40% improvement in complex reasoning tasks means that use cases previously considered too nuanced for AI -- legal contract analysis, financial modeling with multiple variables, and multi-step engineering decisions -- are now within reach.\n\nFor CTOs and engineering leaders, the key question is no longer whether AI can handle complex reasoning, but how quickly your organization can build the infrastructure to leverage it.\n\nThree immediate implications:\n\n1. **Reduced human-in-the-loop requirements**: Tasks that needed expert review at every step can now be partially automated with confidence.\n2. **New product possibilities**: Applications that were technically infeasible six months ago are now buildable.\n3. **Competitive pressure**: Organizations that delay adoption will face a widening capability gap.\n\nThe enterprises that move fastest to integrate GPT-5''s reasoning capabilities into their workflows will establish advantages that compound over time.",
      "wordCount": 158
    },
    {
      "index": 2,
      "angle": "Developer-Focused Technical Breakdown",
      "title": "What GPT-5''s Chain-of-Thought Architecture Means for Your Tech Stack",
      "content": "OpenAI''s GPT-5 introduces a reinforcement-learning-driven chain-of-thought reasoning system that fundamentally changes how developers should think about prompt engineering and application architecture.\n\nUnlike previous models where reasoning was an emergent behavior, GPT-5 was explicitly trained to decompose problems into logical steps. This has practical implications for anyone building on the API:\n\n**Prompt engineering simplification**: You no longer need elaborate chain-of-thought prompting techniques. The model handles decomposition internally, which means simpler prompts often yield better results than complex ones.\n\n**Reduced token costs for complex tasks**: Because the model reasons more efficiently, tasks that previously required multiple API calls with intermediate processing can often be handled in a single call.\n\n**New error patterns**: The model''s reasoning can be confidently wrong in novel ways. Testing strategies need to account for plausible-sounding multi-step reasoning that arrives at incorrect conclusions.\n\n**Architecture recommendation**: Consider implementing a validation layer that checks the model''s intermediate reasoning steps, not just the final output. The API now exposes reasoning traces that make this practical.",
      "wordCount": 178
    },
    {
      "index": 3,
      "angle": "Contrarian Take",
      "title": "GPT-5 Is Impressive, But We''re Measuring the Wrong Things",
      "content": "The AI community is celebrating GPT-5''s 40% improvement on reasoning benchmarks. But here''s the uncomfortable question: are these benchmarks actually measuring what matters for real-world applications?\n\nMost reasoning benchmarks test the model''s ability to solve well-defined problems with clear correct answers -- math proofs, logic puzzles, coding challenges. These are precisely the tasks where traditional software already excels.\n\nThe real bottleneck in most organizations isn''t solving well-defined problems. It''s dealing with ambiguity, incomplete information, and competing stakeholder priorities. On these dimensions, GPT-5 shows modest improvements at best.\n\nThis matters because enterprise buyers are about to be sold a narrative about revolutionary reasoning capabilities based on benchmark improvements that may not translate to their actual pain points.\n\nBefore investing in GPT-5 integration, ask yourself: Is my bottleneck a reasoning problem, or is it a data quality, process design, or organizational alignment problem? For most companies, it''s the latter -- and no amount of improved AI reasoning will fix that.\n\nThe organizations that will benefit most from GPT-5 are those that have already solved their data and process problems and are genuinely bottlenecked on reasoning complexity.",
      "wordCount": 195
    }
  ]'::jsonb,
  1,
  'published',
  true,
  '2026-03-23 09:15:00+00',
  '2026-03-23 09:48:00+00'
);

-- 2. PROCESSING submission (raw idea, draft selected, Workflow 2 in progress)
INSERT INTO submissions (id, content_hash, input_type, raw_input, content_base, drafts, selected_draft, status, publish_immediately, created_at, updated_at)
VALUES (
  'sub_e5f6g7h8',
  'a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a',
  'raw_idea',
  'Write about how small businesses can use AI automation to save 10+ hours per week without any coding skills. Focus on practical tools and real workflows.',
  'Write about how small businesses can use AI automation to save 10+ hours per week without any coding skills. Focus on practical tools and real workflows.',
  '[
    {
      "index": 1,
      "angle": "Step-by-Step Practical Guide",
      "title": "The No-Code AI Playbook: 5 Automations That Save Small Businesses 10+ Hours Weekly",
      "content": "If you run a small business, you''ve probably heard that AI can save you time. But most advice assumes you have a developer on staff or hours to spend learning complex tools.\n\nHere are five automations you can set up this week using no-code platforms, each saving 2+ hours weekly:\n\n**1. Email triage and response drafting (Saves ~3 hrs/week)**\nTool: Zapier + ChatGPT integration\nSetup: Connect your inbox to Zapier. Create a zap that categorizes incoming emails and drafts responses for common queries. You review and send with one click.\n\n**2. Social media content repurposing (Saves ~2.5 hrs/week)**\nTool: Make.com + Claude API\nSetup: When you publish a blog post, automatically generate LinkedIn, Twitter, and newsletter versions. Each is adapted to the platform''s format and audience.\n\n**3. Invoice processing and bookkeeping (Saves ~2 hrs/week)**\nTool: Zapier + OCR + QuickBooks\nSetup: Forward invoices to a dedicated email. OCR extracts the data, AI categorizes the expense, and it''s entered into QuickBooks automatically.\n\n**4. Customer FAQ responses (Saves ~1.5 hrs/week)**\nTool: Chatbase or CustomGPT\nSetup: Upload your FAQ documents and product guides. Deploy a chatbot on your website that handles 80% of customer questions accurately.\n\n**5. Meeting notes and action items (Saves ~1.5 hrs/week)**\nTool: Otter.ai + Notion integration\nSetup: Record meetings with Otter. AI generates a summary and extracts action items, which are automatically added to your Notion task board.\n\nTotal: 10.5 hours saved weekly. The setup time for all five is roughly one weekend afternoon.",
      "wordCount": 262
    },
    {
      "index": 2,
      "angle": "ROI-Focused Business Case",
      "title": "The Math Behind AI Automation: Why Every Small Business Owner Losing 10 Hours a Week Is Leaving Money on the Table",
      "content": "Let''s talk numbers. If you value your time at $75/hour (conservative for a business owner), 10 hours per week of manual work costs you $39,000 per year.\n\nThe AI automation tools to eliminate those hours cost between $100-300/month. That''s a 10-30x return on investment.\n\nBut the real cost isn''t just money -- it''s opportunity cost. Those 10 hours could be spent on business development, strategic thinking, or simply avoiding burnout.\n\nHere''s where most small businesses are bleeding time:\n\n**Content creation and distribution**: 3-4 hours/week writing social posts, newsletters, and marketing copy from scratch.\n**Email management**: 2-3 hours/week reading, categorizing, and responding to routine emails.\n**Data entry and bookkeeping**: 2-3 hours/week manually processing invoices, updating spreadsheets, and reconciling accounts.\n**Customer support**: 1-2 hours/week answering the same questions repeatedly.\n\nThe no-code AI automation stack to address all four costs roughly $250/month:\n- Make.com or Zapier: $70/month\n- AI API costs (Claude or GPT): $30-50/month\n- Specialized tools (Otter.ai, Chatbase): $80-100/month\n- Misc integrations: $20-30/month\n\nThat''s $3,000/year to save $39,000 worth of time. And the setup requires zero coding -- just connecting tools through visual interfaces and writing plain-English instructions for the AI.\n\nThe question isn''t whether you can afford to automate. It''s whether you can afford not to.",
      "wordCount": 230
    },
    {
      "index": 3,
      "angle": "Cautionary Perspective with Balanced Advice",
      "title": "AI Automation for Small Business: What Actually Works (And What''s Just Hype)",
      "content": "The internet is full of claims about AI saving businesses hundreds of hours. Most of these claims come from people selling AI tools. Let''s separate what actually works from what''s still aspirational.\n\n**What genuinely works today:**\n\nContent repurposing is the strongest use case. Taking one piece of long-form content and adapting it for multiple platforms is a well-solved problem. Tools like Make.com connected to Claude or GPT can handle this reliably with minimal oversight.\n\nEmail categorization and draft responses work well for businesses with predictable email patterns. If 70% of your emails fall into recognizable categories, AI can draft responses that need only a quick review.\n\nMeeting transcription and summarization is essentially solved. Otter.ai, Fireflies, and similar tools produce good-enough transcripts and summaries for most business contexts.\n\n**What''s overhyped:**\n\nFully autonomous customer support chatbots still hallucinate enough to be risky for most businesses. Use them for FAQ routing, not open-ended customer interaction.\n\nAI-generated marketing strategy is unreliable. These tools can execute on a strategy you define, but they shouldn''t be defining the strategy.\n\nAutomated bookkeeping with zero oversight is asking for trouble. Use AI to reduce bookkeeping time, not eliminate oversight entirely.\n\n**The realistic expectation:**\n\nAI automation can save a small business 5-10 hours per week on routine tasks within the first month of setup. Claims of 20+ hours saved usually involve tasks that shouldn''t have been manual in the first place, or they undercount the time spent reviewing and correcting AI output.\n\nStart with content repurposing and email management. These have the highest reliability and the fastest setup time. Expand from there based on what actually works for your specific business.",
      "wordCount": 278
    }
  ]'::jsonb,
  2,
  'processing',
  false,
  '2026-03-24 14:30:00+00',
  '2026-03-25 08:12:00+00'
);

-- 3. PENDING_REVIEW submission (URL input, drafts ready, awaiting user selection)
INSERT INTO submissions (id, content_hash, input_type, raw_input, content_base, drafts, selected_draft, status, publish_immediately, created_at, updated_at)
VALUES (
  'sub_i9j0k1l2',
  'b5bb9d8014a0f9b1d61e21e796d78dccdf1352f23cd32812f4850b878ae4944c',
  'url',
  'https://blog.google/technology/ai/gemini-robotics-models/',
  'Google DeepMind has unveiled Gemini Robotics, a family of AI models designed to give robots the ability to understand and interact with the physical world. The models combine Gemini''s language and vision capabilities with new spatial reasoning and motor control modules. In demonstrations, robots powered by Gemini Robotics successfully completed tasks like sorting mixed recycling, assembling furniture components, and navigating cluttered warehouse environments. Google plans to offer the models through a cloud API for robotics companies.',
  '[
    {
      "index": 1,
      "angle": "Future of Work",
      "title": "Google''s Gemini Robotics Could Redefine Blue-Collar Automation Within 5 Years",
      "content": "Google DeepMind''s Gemini Robotics announcement is the clearest signal yet that physical-world AI is moving from research demos to production readiness.\n\nThe combination of language understanding, visual perception, and motor control in a single model family addresses the core challenge that has kept robotics automation limited to highly structured environments like automotive assembly lines.\n\nThe warehouse and recycling demonstrations are particularly significant. These are environments with high variability -- mixed objects, unpredictable layouts, items that look different every time. Traditional robotics fails here because you can''t pre-program every scenario.\n\nFor the workforce, this means:\n- Warehouse roles will shift from manual picking to robot supervision within 3-5 years\n- Recycling and waste management -- currently labor-intensive and hazardous -- will see rapid automation\n- The ''last mile'' of manufacturing automation becomes solvable\n\nThe cloud API model is strategically important. By making these capabilities available as a service, Google is ensuring that smaller robotics companies can build on this foundation without needing DeepMind-scale research budgets.\n\nThe question is no longer whether robots can handle unstructured physical tasks. It''s how quickly the economics make sense for each industry.",
      "wordCount": 189
    },
    {
      "index": 2,
      "angle": "Technical Architecture Deep Dive",
      "title": "Inside Gemini Robotics: How Google Merged Language Models with Motor Control",
      "content": "The most technically interesting aspect of Gemini Robotics isn''t any single capability -- it''s the architecture that unifies language, vision, and motor control into a coherent system.\n\nPrevious approaches to robot learning typically used separate models for perception, planning, and execution. Gemini Robotics uses a shared representation space where all three modalities are encoded in a common format. This means the model can reason about physical actions using the same mechanisms it uses for language.\n\nPractical implications for robotics developers:\n\n**Natural language task specification**: Instead of programming robot behaviors in code, you describe tasks in plain English. The model translates ''sort the recycling by material type'' into a sequence of perception, grasping, and placement actions.\n\n**Zero-shot generalization**: The model can handle objects and environments it wasn''t explicitly trained on, because it draws on Gemini''s broad world knowledge to infer physical properties.\n\n**Failure recovery**: When a grasp fails or an object is in an unexpected position, the model reasons about what went wrong and adjusts -- rather than stopping and requesting human intervention.\n\nThe cloud API architecture means robotics companies send sensor data to Google''s servers and receive motor commands back. This introduces latency concerns for time-critical tasks, but the computational requirements for this model family are beyond what current edge hardware can handle.\n\nExpect a push toward edge deployment as the models are distilled and hardware catches up.",
      "wordCount": 228
    },
    {
      "index": 3,
      "angle": "Competitive Landscape",
      "title": "The AI Robotics Race: How Google''s Gemini Entry Changes the Game for Everyone",
      "content": "With Gemini Robotics, Google has entered a race that until now has been dominated by startups and Tesla''s Optimus program. The competitive dynamics are about to shift dramatically.\n\nThe current landscape:\n- **Tesla Optimus**: Focused on humanoid form factor for manufacturing. Vertically integrated with Tesla''s own factories as the first customer.\n- **Figure AI**: Well-funded startup building general-purpose humanoid robots. Strong engineering team but limited compute resources compared to big tech.\n- **Boston Dynamics (Hyundai)**: Best-in-class hardware, but historically dependent on traditional control systems rather than AI-driven approaches.\n- **Google Gemini Robotics**: The new entrant with the deepest AI research bench and a cloud-first distribution model.\n\nGoogle''s advantages are significant. They have the foundational model (Gemini), the compute infrastructure (Google Cloud), and the distribution channel (API marketplace). They don''t need to build robots -- they need to be the brain inside everyone else''s robots.\n\nThis is the Android strategy applied to robotics: own the intelligence layer, let hardware companies compete on physical design.\n\nThe risk for existing robotics companies is dependency. If you build on Gemini Robotics, Google controls your core capability. The alternative -- building your own foundation models -- requires billions in compute investment.\n\nFor investors, the signal is clear: pure-play robotics companies without proprietary AI are about to face intense margin pressure. The value in robotics is migrating from hardware to intelligence.",
      "wordCount": 234
    }
  ]'::jsonb,
  NULL,
  'pending_review',
  false,
  '2026-03-25 10:00:00+00',
  '2026-03-25 10:22:00+00'
);

-- 4. GENERATING submission (raw idea, Workflow 1 still in progress)
INSERT INTO submissions (id, content_hash, input_type, raw_input, content_base, drafts, selected_draft, status, publish_immediately, created_at, updated_at)
VALUES (
  'sub_m3n4o5p6',
  'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592',
  'raw_idea',
  'The hidden costs of technical debt in startups - how cutting corners in year 1 leads to 3x engineering costs in year 3. Include real examples and a framework for deciding when to take on tech debt intentionally.',
  NULL,
  '[]'::jsonb,
  NULL,
  'generating',
  false,
  '2026-03-25 11:45:00+00',
  '2026-03-25 11:45:00+00'
);

-- 5. ERROR submission (URL input, failed during generation)
INSERT INTO submissions (id, content_hash, input_type, raw_input, content_base, drafts, selected_draft, status, error_details, publish_immediately, created_at, updated_at)
VALUES (
  'sub_q7r8s9t0',
  'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
  'url',
  'https://example.com/article-behind-paywall',
  NULL,
  '[]'::jsonb,
  NULL,
  'error',
  'Content extraction failed: Unable to access article content. The URL returned a 403 Forbidden response, likely due to a paywall or bot detection. Please paste the article text directly as a raw idea instead.',
  false,
  '2026-03-24 16:20:00+00',
  '2026-03-24 16:20:45+00'
);

-- ============================================
-- ADAPTED CONTENT
-- Records for the published and processing submissions
-- ============================================

-- Adapted content for the PUBLISHED submission (sub_a1b2c3d4)
-- All platforms published
INSERT INTO adapted_content (id, submission_id, linkedin_content, linkedin_char_count, linkedin_has_cta, linkedin_published_at, linkedin_published_url, twitter_content, twitter_char_count, twitter_truncated, twitter_published_at, twitter_published_url, newsletter_subject, newsletter_content, newsletter_word_count, newsletter_has_subject, newsletter_has_cta, newsletter_sent_at, created_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'sub_a1b2c3d4',
  'GPT-5 is not just another model update -- it represents a fundamental shift in enterprise AI capabilities.

The 40% improvement in complex reasoning means use cases previously considered too nuanced for AI are now within reach:

- Legal contract analysis
- Financial modeling with multiple variables
- Multi-step engineering decisions

For engineering leaders, the key question has changed. It''s no longer "can AI handle this?" but "how fast can we build the infrastructure to use it?"

Three things to watch:

1. Reduced human-in-the-loop needs for expert review tasks
2. Applications that were technically infeasible 6 months ago are now buildable
3. Companies that delay adoption face a widening capability gap

The organizations that move fastest will build compounding advantages.

What''s the first complex reasoning task you''d delegate to GPT-5?

#AI #GPT5 #EnterpriseAI #MachineLearning #TechLeadership',
  768,
  true,
  '2026-03-23 09:45:00+00',
  'https://www.linkedin.com/feed/update/urn:li:activity:7177234567890123456',
  'GPT-5''s 40% reasoning improvement means legal analysis, financial modeling, and multi-step engineering decisions are now AI-ready.

The question isn''t whether AI can handle complex reasoning. It''s how fast you can build infrastructure to use it.

First movers will compound their advantage.',
  272,
  false,
  '2026-03-23 09:46:00+00',
  'https://x.com/user/status/1903456789012345678',
  'GPT-5 Signals a New Era for Enterprise AI -- Here''s What It Means for Your Team',
  'GPT-5 Signals a New Era for Enterprise AI Adoption

OpenAI''s release of GPT-5 is not just another model update -- it represents a fundamental shift in what enterprises can expect from AI reasoning capabilities.

The 40% improvement in complex reasoning tasks means that use cases previously considered too nuanced for AI -- legal contract analysis, financial modeling with multiple variables, and multi-step engineering decisions -- are now within reach.

For CTOs and engineering leaders, the key question is no longer whether AI can handle complex reasoning, but how quickly your organization can build the infrastructure to leverage it.

Three immediate implications:

1. REDUCED HUMAN-IN-THE-LOOP REQUIREMENTS
Tasks that needed expert review at every step can now be partially automated with confidence. This does not mean eliminating human oversight -- it means focusing human attention where it matters most.

2. NEW PRODUCT POSSIBILITIES
Applications that were technically infeasible six months ago are now buildable. If your product roadmap was constrained by AI reasoning limitations, it is time to revisit those shelved ideas.

3. COMPETITIVE PRESSURE
Organizations that delay adoption will face a widening capability gap. The enterprises that move fastest to integrate GPT-5''s reasoning capabilities into their workflows will establish advantages that compound over time.

WHAT SHOULD YOU DO THIS WEEK?

- Identify your top 3 workflows that are bottlenecked on complex reasoning
- Run a proof-of-concept with GPT-5''s API on the highest-impact one
- Share the results with your leadership team

The window for early-mover advantage is open, but it will not stay open for long.

Reply to this email with your biggest AI automation challenge -- I read every response.',
  253,
  true,
  true,
  '2026-03-23 09:48:00+00',
  '2026-03-23 09:42:00+00'
);

-- Adapted content for the PROCESSING submission (sub_e5f6g7h8)
-- Content generated but not yet published (Workflow 2 is mid-execution)
INSERT INTO adapted_content (id, submission_id, linkedin_content, linkedin_char_count, linkedin_has_cta, linkedin_published_at, linkedin_published_url, twitter_content, twitter_char_count, twitter_truncated, twitter_published_at, twitter_published_url, newsletter_subject, newsletter_content, newsletter_word_count, newsletter_has_subject, newsletter_has_cta, newsletter_sent_at, created_at)
VALUES (
  'b1ffcd00-ad1c-5fg9-cc7e-7cc0ce491b22',
  'sub_e5f6g7h8',
  'The math behind AI automation for small businesses is compelling:

If you value your time at $75/hour, 10 hours/week of manual work = $39,000/year.

The AI tools to automate those hours? $100-300/month.

That is a 10-30x ROI.

But here is what most people miss -- the real cost is not just money. It is the opportunity cost.

Those 10 hours could be spent on:
- Business development
- Strategic planning
- Avoiding burnout

Where most small businesses are bleeding time:
- Content creation & distribution: 3-4 hrs/week
- Email management: 2-3 hrs/week
- Data entry & bookkeeping: 2-3 hrs/week
- Customer support: 1-2 hrs/week

The no-code automation stack to address all four: ~$250/month.

$3,000/year to save $39,000 worth of your time.

The question is not whether you can afford to automate.

It is whether you can afford not to.

What manual task eats up most of your time? Drop it in the comments.

#SmallBusiness #AIAutomation #NoCode #Productivity #Entrepreneurship',
  832,
  true,
  NULL,
  NULL,
  'Small business owners: 10 hrs/week of manual work = $39K/year at $75/hr.

AI automation tools cost $250/mo.

That''s a 13x ROI and you don''t need to write a single line of code.

The question isn''t whether you can afford to automate. It''s whether you can afford not to.',
  268,
  false,
  NULL,
  NULL,
  'You''re Losing $39,000/Year on Tasks AI Can Handle -- Here''s the Fix',
  'The Math Behind AI Automation: Why Every Small Business Owner Losing 10 Hours a Week Is Leaving Money on the Table

Let us talk numbers.

If you value your time at $75/hour (conservative for a business owner), 10 hours per week of manual work costs you $39,000 per year.

The AI automation tools to eliminate those hours cost between $100-300/month. That is a 10-30x return on investment.

But the real cost is not just money -- it is opportunity cost. Those 10 hours could be spent on business development, strategic thinking, or simply avoiding burnout.

HERE IS WHERE MOST SMALL BUSINESSES ARE BLEEDING TIME:

Content creation and distribution: 3-4 hours/week writing social posts, newsletters, and marketing copy from scratch.

Email management: 2-3 hours/week reading, categorizing, and responding to routine emails.

Data entry and bookkeeping: 2-3 hours/week manually processing invoices, updating spreadsheets, and reconciling accounts.

Customer support: 1-2 hours/week answering the same questions repeatedly.

THE NO-CODE AI AUTOMATION STACK (~$250/MONTH):

- Make.com or Zapier: $70/month
- AI API costs (Claude or GPT): $30-50/month
- Specialized tools (Otter.ai, Chatbase): $80-100/month
- Misc integrations: $20-30/month

That is $3,000/year to save $39,000 worth of time. And the setup requires zero coding -- just connecting tools through visual interfaces and writing plain-English instructions for the AI.

WHAT TO DO THIS WEEK:

1. Track your time for 3 days and identify your most repetitive tasks
2. Pick the single most time-consuming repetitive task
3. Search "[task name] + Zapier automation" or "[task name] + Make.com" to find a template
4. Set it up -- most templates take under 30 minutes

Start with one automation. See the results. Then expand.

Reply to this email with the task you are going to automate first -- I will send you a specific walkthrough.',
  313,
  true,
  true,
  NULL,
  '2026-03-25 08:15:00+00'
);
