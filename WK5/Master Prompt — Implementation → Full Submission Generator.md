# **Master Prompt — Implementation → Full Submission Generator**

You are now responsible for **converting the implementation you just generated into a full project submission package.**

Your goal is to help the builder **confidently explain the system as if they designed and built it themselves.**

Everything you write must reflect **real engineering reasoning**, not generic summaries.

The documentation must feel like **a thoughtful engineer reflecting on their own implementation decisions.**

---

# **Core Objective**

Based on the implementation you just produced:

1. Explain **what was built**

2. Explain **why it was built that way**

3. Explain **what trade-offs were made**

4. Show **how production readiness was considered**

Focus on:

* edge cases

* failure handling

* repeatability

* reliability

* cost awareness

* data safety

Do not produce shallow summaries.

---

# **Writing Style (Extremely Important)**

Follow these rules strictly.

### **Write like a real builder**

Avoid AI-sounding phrases such as:

* “This solution leverages”

* “In conclusion”

* “Seamlessly integrates”

Instead write naturally, like someone explaining their own system.

Example tone:

Good:

I originally used filters here, but that caused a problem when multiple conditions needed to be evaluated. Switching to a router made the logic easier to reason about and prevented silent failures.

Bad:

The system utilizes a router for improved logical flow.

---

### **Explain reasoning**

Always explain:

* why a step exists

* why it was placed there

* what alternative approaches existed

* what trade-offs were accepted

---

### **Be concrete**

Mention:

* node names

* module names

* conditions

* formulas

* field mappings

* logic paths

---

# **Required Outputs**

You must generate the following deliverables.

Each must be output as a **separate file**.

/docs/executive-summary.md  
/docs/implementation-breakdown.md  
/docs/reflections.md  
/docs/one-pager.md  
/docs/reflection-answers.md  
/slides/demo-presentation.pptx

Markdown files must contain **clean headings and readable formatting**.

The slides must be **an actual PowerPoint file**.

---

# **Step 1 — Builder Mindset Simulation**

Before writing anything, reconstruct the **builder’s thought process**.

Internally determine:

• What problem the automation solves  
 • Why the architecture was structured this way  
 • Where the biggest implementation difficulty occurred  
 • What trade-offs were made  
 • What could break in production

Then write all documentation **from that perspective**.

The reader should feel like:

“This person actually built this.”

---

# **File 1 — Executive Summary**

`/docs/executive-summary.md`

Purpose: help someone quickly understand the system.

Structure:

### **Overview**

Plain explanation of what the automation does.

### **Business Problem**

What manual process or operational problem existed.

### **Solution**

How the system solves the problem.

### **System Behavior**

High-level description of the workflow.

### **Key Design Decisions**

Explain things like:

* why routers were used instead of filters

* why validation happens early in the pipeline

* how duplicates are prevented

* how failures are surfaced

* why specific nodes were chosen

### **Outcome**

What operational change happens when the automation runs successfully.

---

# **File 2 — Implementation Breakdown**

`/docs/implementation-breakdown.md`

This section explains the **actual workflow architecture**.

### **Workflow Overview**

Describe the pipeline from trigger to final output.

---

### **Node-by-Node Breakdown**

For each node/module include:

Node Name

Purpose  
Why this node exists.

Key Configuration  
Important settings or mappings.

Placement Reasoning  
Why this step appears at this stage of the pipeline.

Failure Considerations  
What could go wrong here and how it is handled.  
---

### **Data Flow**

Explain how data moves through the workflow.

---

### **Error Handling**

Explain where failures may occur and how they become visible.

---

### **Duplicate Protection**

Explain how the system avoids corrupting data on repeated runs.

---

### **Cost Awareness**

Explain how unnecessary API calls or executions are avoided.

---

# **File 3 — Reflections**

`/docs/reflections.md`

Write this like **a real engineering reflection after finishing a project**.

Include:

### **How the approach evolved**

Example topics:

* starting with filters

* moving to routers

* restructuring the pipeline

Explain **why the change improved reliability.**

---

### **Biggest Challenge**

Explain:

• what the challenge was  
 • what caused it  
 • how it was solved

---

### **Trade-offs**

Examples:

* simplicity vs robustness

* early filtering vs downstream filtering

* router complexity vs filter simplicity

---

### **Edge Cases Considered**

Examples:

* missing Airtable fields

* malformed dates

* duplicate triggers

* empty responses

Explain **how each was handled**.

---

### **What Could Still Break**

Be honest about limitations.

---

### **Improvements for Production**

If this system ran in production for months, what would you add?

Examples:

* logging

* monitoring

* retries

* alerting

Also Discuss:

* lessons learned

* reliability considerations

* engineering judgment

---

# **File 4 — One Pager**

`/docs/one-pager.md`

Follow **this structure exactly**.

---

### **Header**

Title  
 Owner  
 Key Links  
 Last Updated Date

---

### **Purpose & Success Criteria**

Explain:

• who the system is for  
 • what problem existed  
 • what the automation does  
 • what changes if it works  
 • how success is measured

---

### **How it Works**

High-level system behavior.

Focus on **what the system does**, not nodes.

---

### **How to Use It**

Step-by-step:

1. What triggers the system

2. What inputs are required

3. What happens automatically

4. What output is produced

---

### **Appendix (optional)**

Include:

* assumptions

* limitations

* troubleshooting

* artefacts

---

# **File 5 — Reflection Answers**

`/docs/reflection-answers.md`

Answer these questions clearly.

### **In a business setting, what clarifying questions would you ask when assigned this project?**

### **What was the most significant challenge you faced while building this automation, and what was its root cause?**

### **If you were to start this project again with your current knowledge, what is the one thing you would do differently?**

### **What edge cases did you account for and how?** 

---

# **File 6 — Demo Presentation Slides**

`/slides/demo-presentation.pptx`

Generate an **actual PowerPoint presentation file**.

Target: **5–8 minute demo**

Slide structure:

### **Slide 1 — Introduction**

Who you are  
 What you built

### **Slide 2 — Business Problem**

Explain the operational problem.

### **Slide 3 — Solution Overview**

How the system solves it.

### **Slide 4 — System Behavior**

Explain workflow behavior at a high level.

### **Slide 5 — Demo (Happy Path)**

What happens when everything works.

### **Slide 6 — Demo (Edge Case)**

Show one failure or unexpected input.

### **Slide 7 — Key Artefacts**

Workflow diagram  
 Important components.

### **Slide 8 — Trade-offs and Improvements**

Explain design decisions and future improvements.

Each slide must include **speaker notes**.

Focus on:

• behavior  
 • outcomes  
 • reliability

Do **not** explain every node.

---

# **Final Output Format**

Return the files clearly separated like this:

/docs/executive-summary.md  
(content)

/docs/implementation-breakdown.md  
(content)

/docs/reflections.md  
(content)

/docs/one-pager.md  
(content)

/docs/reflection-answers.md  
(content)

/slides/demo-presentation.pptx  
(file)  
---

# **Important Reminder**

The documentation should make it easy for the builder to confidently say:

“Here’s why the system was designed this way.”

Not just:

“Here’s what it does.”