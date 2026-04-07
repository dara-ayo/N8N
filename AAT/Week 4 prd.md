# Week 4: Content Generation and Publishing automation

## Introduction

The content team at a Fetemi marketing agency follows a process for creating and publishing content on LinkedIn, X (Twitter), and an email newsletter.

The workflow involves brainstorming content ideas, creating fully optimised SEO articles, adapting them for platform-specific formats, and publishing after internal reviews. 

While effective, this process is manual, time-consuming, and difficult to scale while maintaining consistency.

The team now wants this internal workflow translated into a fully automated system to save time and standardise how content is produced and published. 

The goal of this project is to build an end-to-end content creation and publishing automation using n8n that mirrors the existing workflow, but is operated through a simple web interface (built with **antigravity**).

The automation begins when a content manager submits either a raw content idea or a URL pointing to similar content through the front-end. If a URL is provided, the system extracts and summarises the content to serve as the base idea. 

Next, the system will generate three article drafts from the input. Each draft must strictly adhere to [SEO Best Practices](https://docs.google.com/document/d/1aj8mGTwvJkkodz016XzEjf879TTG67r2Xf2yL9um3yY/edit?usp=sharing) and present the topic from a different angle.

The manager then reviews the drafts in the front-end and selects one to move forward. 

The selected article is adapted for LinkedIn, X, and an email newsletter using [predefined formatting rules](https://docs.google.com/document/d/146Jw0zspMAJuzbLgfeVzVO4NpnOGCunLPFp3rEhYvg8/edit?tab=t.0#heading=h.bp2cc7l5oz5b), after which the content can either be published immediately or saved for scheduling. 

All generated content should be grounded in reviewed source material and guided by clear human decisions.

---

### **Deliverables**

- Your completed **n8n workflow JSON**
- A short **Loom video** showing how the automation works
- Answer the questions in your **reflection sheet** for this project
- A **one pager** explaining how your automation works and how to use it.