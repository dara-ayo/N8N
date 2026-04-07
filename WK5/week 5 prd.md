# Week 5: Lead Generation and Outreach Automation

## Business Context

We run a service that connects early-stage founders with trained AI automation assistants. These assistants help companies automate repetitive workflows using cutting-edge AI tools.

To continue to grow, we're running outbound campaigns to reach founders, operations leads, and agency owners who could benefit from having an automation assistant on their team. Right now, that entire process is manual: we define the target persona, search for leads, research the company to gather context, validate emails, and write cold messages from scratch. It's time-consuming and doesn't scale.

I'd like you to build an automation that streamlines this. It should start with a few basic input fields — job title, location, company size, and keyword — and use those to find relevant leads. For each lead, store their details in Airtable, including their core information. We will verify the existence of their website and LinkedIn profile, scrape the company's 'About' sections, and validate email deliverability.

Once we have a clean list of usable leads, I want to automatically generate a personalized 3-step cold email sequence and a short LinkedIn message for each one. The messaging should reference the company context and pitch our service in a way that feels relevant to what they do.

You don't need to send anything. Just store everything neatly in Airtable so it's ready for review.

---

## Tools

- [n8n](http://n8n.io) — For building the automation
- [Airtable](http://airtable.com) — For target persona input and storing leads
- [Apify](https://apify.com/) — For scraping tools like:
  - [Leads Scraper](https://console.apify.com/organization/mLS9MpKvLFmeepjBP/actors/VYRyEF4ygTTkaIghe/information/latest/readme#how-to-use)
  - [LinkedIn Company Scraper](https://apify.com/bebity/linkedin-premium-actor)
- [Bouncer](http://usebouncer.com) — For verifying email deliverability

---

## Deliverables

- Your completed **n8n workflow JSON**
- A short **Loom video** showing how the automation works
- Answer the questions in your **reflection sheet** for this project
- A **one pager** explaining how your automation works and how to use it

---

## Resources

Here are key learning resources to help you confidently tackle and complete this project:

**Triggering automations from status changes in Airtable**
- https://www.youtube.com/watch?v=spvDKkbNPKk

**Comprehensive guide on Apify**
- https://youtu.be/KQIo1gNFAeM?si=MaFswFyeszYGnN4-
- https://youtu.be/fNkNwXvVuv0?si=A7dALQXIpeIj_cGl

**Apify API Documentation**
- https://docs.apify.com/api/v2/actors
- https://docs.apify.com/api/client/js/docs

**Making HTTP requests to work with APIs of platforms that aren't integrated into n8n**
