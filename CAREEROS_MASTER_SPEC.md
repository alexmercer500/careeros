# CareerOS — MASTER PROJECT HANDOFF
## Complete Product, Architecture & Implementation Specification

**Project:** CareerOS  
**Version:** 1.0  
**Product Type:** Personal-first, SaaS-ready AI Career Management Platform  
**Development Approach:** AI-assisted, milestone-based implementation  
**Primary Coding Agent:** Local DeepSeek  
**Architecture:** Modular monolith with independent background workers

---

# PART 1 — INSTRUCTIONS TO THE CODING AGENT

You are the primary engineering agent responsible for building CareerOS.

Your responsibility is not simply to generate code. You must act as a senior full-stack engineer, software architect and implementation partner.

You must understand the entire product before implementing individual features.

## Non-negotiable development rules

1. Inspect the existing development environment before making changes.
2. Never assume that a repository is empty.
3. Do not overwrite existing files without inspecting them.
4. Follow consistent architecture and coding conventions.
5. Use TypeScript with strict mode.
6. Validate all API inputs and AI-generated outputs.
7. Implement database migrations instead of making undocumented schema changes.
8. Keep business logic separate from UI components.
9. Do not duplicate business logic across frontend and backend.
10. Never expose API keys, OAuth credentials or secrets to the browser.
11. Implement authentication and authorization correctly.
12. Implement Row Level Security for tenant-owned data.
13. Write meaningful tests for business-critical workflows.
14. Do not fabricate professional information.
15. Never submit a job application without explicit user authorization.
16. Do not use unauthorized scraping or bypass website security mechanisms.
17. Do not mark a feature complete merely because its UI has been created.
18. Run linting, type checking, tests and production builds at appropriate milestones.
19. Document important architectural decisions.
20. Maintain a working project at the end of each milestone.

## Required working methodology

Before implementing anything:

- Inspect the repository.
- Inspect installed dependencies.
- Inspect available runtime versions.
- Identify existing architecture.
- Identify available environment variables.
- Check available database and deployment configuration.
- Identify the coding agent's available terminal, browser and filesystem capabilities.

Then create an implementation plan.

Do not start implementing the entire application immediately.

First create the project documentation, architecture proposal, database design and initial task breakdown.

Wait for the project owner's approval of the architecture before substantial implementation.

---

# PART 2 — PRODUCT VISION

CareerOS is a centralized AI-powered career management platform.

Its objective is to help job seekers manage their entire professional identity and job-search lifecycle from one place.

The application should centralize:

- Professional profile management.
- Employment history.
- Projects and achievements.
- Resume management.
- LinkedIn and Naukri profile optimization.
- Job discovery.
- Job description extraction.
- AI-powered job matching.
- Customized resume generation.
- Cover-letter generation.
- Application management.
- Browser-assisted application submission.
- Email monitoring.
- Recruiter communication.
- Application analytics.
- Career improvement recommendations.

## Product strategy

Build the platform for personal use first.

However, the architecture must support future expansion into a multi-user SaaS application.

Do not implement SaaS billing, subscriptions or complex administration in the MVP.

Design the underlying data model to support multiple users and workspaces from the beginning.

## Primary user goals

The user wants to:

1. Maintain one verified professional profile.
2. Target Product Engineer, Senior Frontend Engineer and Full Stack Developer roles.
3. Find relevant job opportunities.
4. Understand whether an opportunity is worth applying for.
5. Generate customized application documents.
6. Apply through supported application workflows.
7. Approve every application before submission.
8. Track recruiter responses.
9. Measure interview and rejection rates.
10. Improve career positioning based on actual results.

Compensation expectations must remain flexible and configurable.

Initial geography: India, with support for other locations.

---

# PART 3 — PROFESSIONAL POSITIONING

Initial professional positioning:

**Product-Minded Full Stack Engineer**

Supporting roles:

- Product Engineer.
- Senior Frontend Engineer.
- Full Stack Developer.

Core professional narrative:

An engineer who develops applications while also taking responsibility for technical implementation, translating business requirements into technical solutions, coordinating development, collaborating with clients and stakeholders, and delivering production-ready products.

The system must distinguish between:

- Actual technical implementation.
- Technical decision-making.
- Project coordination.
- Client communication.
- Product ownership.
- People management.

Never imply people management or formal product ownership unless supported by actual experience.

## Initial technical background

Use the following as initial profile-import context, not as verified final employment records.

Frontend:
- HTML.
- CSS.
- JavaScript.
- TypeScript.
- React.
- Next.js.
- Tailwind CSS.
- Bootstrap.
- Material UI.

State management and frontend architecture:
- Redux.
- Zustand.
- React Router.
- TanStack Table.

Backend exposure:
- Node.js.
- Express.js.
- PHP collaboration.
- MongoDB.
- PostgreSQL.
- Supabase.
- Firebase.

Tools:
- Git.
- Vite.
- Webpack.
- VS Code.
- Vercel.
- Netlify.

AI-related exposure:
- OpenAI APIs.
- Gemini APIs.
- RAG.
- Vector databases.
- LangChain.js.

The user has previously described project experience involving:

- Sports and luxury automobile marketplaces.
- Advanced search and filtering interfaces.
- Buyer and seller management.
- Quiz-based React applications.
- E-commerce applications.
- Next.js websites and SEO.

Previously mentioned performance achievements include:

- 27% improvement in performance score.
- 25% improvement in performance.
- 30% reduction in load time.

These figures and their project associations must be verified before they are used in the master resume.

Do not invent employer dates, project names, responsibilities, metrics or employment history.

Create a guided onboarding process to verify these details.

---

# PART 4 — TECHNOLOGY STACK

Use the following preferred stack unless the initial environment audit reveals a compelling reason to change it.

## Frontend

- Next.js App Router.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Lucide icons.
- TanStack Table.
- Zustand only where shared client-side state is required.
- React Hook Form.
- Zod validation.

## Backend

- Next.js route handlers for application APIs.
- Node.js background workers.
- Server-side business logic.
- Inngest for asynchronous workflows.

## Database and authentication

- Supabase PostgreSQL.
- Supabase Auth.
- Supabase Storage.
- PostgreSQL Row Level Security.

## AI integration

Use a provider-independent architecture.

Initial providers:

- DeepSeek.
- Anthropic Claude.
- OpenAI.

Preferred integration options:

- Vercel AI SDK where supported.
- Custom provider adapters where necessary.

Do not hardcode individual providers into business logic.

## Browser automation

- Playwright.
- Separate isolated browser worker.
- Persistent user-authorized sessions where supported.
- Explicit approval before submission.

## Documents

- DOCX generation using structured templates.
- PDF generation.
- Resume parsing.
- Document versioning.
- ATS-readable output.

## Background processing

- Inngest.
- Retry handling.
- Idempotency.
- Scheduled workflows.

## Hosting

- Vercel for web application.
- Separate worker deployment.
- Supabase for database and storage.

## Repository

Prefer:

- pnpm.
- Turborepo when multiple deployable applications are introduced.
- Git-based version control.

Do not introduce unnecessary infrastructure.

---

# PART 5 — PRODUCT MODULES

## MODULE 1: MASTER CAREER PROFILE

Priority: P0.

Build a centralized professional profile.

Features:

- Personal information.
- Contact details.
- Professional summary.
- Current designation.
- Employment history.
- Projects.
- Skills.
- Education.
- Certifications.
- Achievements.
- Professional links.
- Notice period.
- Career preferences.

Employment history must include:

- Company.
- Designation.
- Start date.
- End date.
- Responsibilities.
- Technologies.
- Projects.
- Achievements.
- Client involvement.
- Ownership responsibilities.

### Achievement database

Create an independent achievement database.

Each achievement must include:

- Description.
- Associated project.
- Associated employment record.
- Metric, if applicable.
- Evidence reference.
- Verification status.
- Approval for resume usage.

Verification statuses:

- Verified.
- User confirmed.
- Needs evidence.
- Excluded.

AI must never independently promote an unverified achievement into a verified one.

### Career positioning profiles

Support multiple professional positioning profiles:

1. Product Engineer.
2. Senior Frontend Engineer.
3. Full Stack Developer.

Each profile should maintain:

- Headline.
- Professional summary.
- Priority skills.
- Relevant projects.
- Relevant achievements.
- Preferred job titles.

---

## MODULE 2: RESUME INTELLIGENCE STUDIO

Priority: P0.

Features:

- Upload existing resumes.
- PDF and DOCX parsing.
- Extract career information.
- Compare against master profile.
- Identify missing information.
- Maintain multiple resume templates.
- Generate job-specific resumes.
- Manual editing.
- PDF export.
- DOCX export.
- Document version history.

Every generated resume must use verified master profile information.

Preserve the exact file submitted for every application.

Never silently overwrite a previously submitted document.

---

## MODULE 3: JOB DISCOVERY

Priority: P0.

Support multiple job sources:

- LinkedIn Jobs.
- Naukri.
- Wellfound.
- Instahyre.
- Foundit.
- Indeed.
- Company career pages.
- Workday.
- Greenhouse.
- Lever.

Integration methods must respect the access rules of each platform.

Initial job import methods:

1. Paste job description.
2. Import job URL.
3. Upload job description.
4. Import supported job alert.
5. Manually create a job.
6. Add supported career-page discovery later.

Do not depend on unauthorized scraping.

Job records must include:

- Title.
- Company.
- Description.
- Original URL.
- Location.
- Work mode.
- Employment type.
- Experience requirement.
- Compensation.
- Required skills.
- Responsibilities.
- Posted date.
- Discovery date.
- Application deadline.

Implement duplicate detection.

---

## MODULE 4: AI JOB MATCHING

Priority: P0.

Initial weighted scoring:

- Technical skills: 25%.
- Relevant experience: 20%.
- Responsibilities and ownership: 20%.
- Seniority alignment: 15%.
- Domain fit: 10%.
- Location and compensation: 10%.

Classification:

- 85–100: Excellent.
- 70–84: Strong.
- 55–69: Possible.
- Below 55: Low priority.

AI must produce:

- Matching skills.
- Missing skills.
- Experience gaps.
- Seniority concerns.
- Hard requirement mismatches.
- Relevant achievements.
- Reasons to apply.
- Reasons not to apply.
- Confidence score.

The matching engine must be configurable.

Hard requirement mismatches must never be hidden by a high aggregate score.

Store immutable assessment snapshots.

---

## MODULE 5: APPLICATION STUDIO

Priority: P0.

Generate:

- Customized resume.
- Customized cover letter.
- Recruiter outreach message.
- Skills checklist.
- Application preparation brief.
- Interview preparation brief.

Allow the user to compare:

- Master profile.
- Original resume.
- Tailored resume.
- Job requirements.

Maintain editable documents and version history.

Every generated claim must be traceable to the master career profile.

---

## MODULE 6: APPLICATION MANAGEMENT

Priority: P0.

Create a centralized application tracker.

Statuses:

- Discovered.
- Shortlisted.
- Preparing.
- Ready for Approval.
- Approved.
- Submitted.
- Screening.
- Interview.
- Offer.
- Rejected.
- Withdrawn.
- On Hold.
- Closed.
- No Response.

Every application must preserve:

- Job details.
- Company.
- Role.
- Application date.
- Original URL.
- ATS reference ID.
- Submitted documents.
- Submitted answers.
- Approval record.
- Status history.
- Notes.
- Outcome.

Support:

- Kanban board.
- Table view.
- Filters.
- Sorting.
- Search.
- Follow-up reminders.

---

## MODULE 7: APPLICATION AUTOMATION

Priority: P1.

Build an assisted browser automation agent using Playwright.

Workflow:

1. Open supported application page.
2. Identify form fields.
3. Map fields to verified profile information.
4. Populate known fields.
5. Upload approved documents.
6. Flag unknown questions.
7. Display application preview.
8. Wait for explicit approval.
9. Submit after approval.
10. Record confirmation.

Approval must be per application.

Approval must be tied to the exact document versions and application payload.

If the payload changes, require approval again.

Never automatically guess answers involving sensitive or legal declarations.

Never bypass CAPTCHA, access controls or website security.

For unsupported websites, provide guided manual application assistance.

---

## MODULE 8: GMAIL INTEGRATION

Priority: P1.

Use Gmail OAuth.

Minimum necessary permissions.

Detect:

- Application confirmation.
- Rejection.
- Interview invitation.
- Assessment.
- Recruiter communication.
- Offer letter.
- Additional information request.

Associate messages with existing applications.

Use confidence-based matching.

Request confirmation when the relationship between an email and an application is uncertain.

Support:

- Communication timeline.
- Follow-up reminders.
- Draft replies.
- Recruiter response tracking.

Do not send messages automatically.

---

## MODULE 9: CAREER ANALYTICS

Priority: P1.

Track:

- Jobs discovered.
- Applications submitted.
- Shortlisted applications.
- Screening conversion.
- Interview conversion.
- Offer conversion.
- Rejection rate.
- No-response rate.
- Average response time.
- Resume performance.
- Role-wise conversion.
- Source-wise conversion.

Use resolved applications for rejection-rate calculations.

Provide comparisons:

- Resume version A vs B.
- Product Engineer vs Full Stack.
- Job source performance.
- Company response rates.
- Match score vs interview conversion.

Generate evidence-based improvement recommendations.

Do not make causal claims from insufficient sample sizes.

---

## MODULE 10: PROFILE OPTIMIZATION

Priority: P1.

Create profile content packages for:

- LinkedIn.
- Naukri.
- Foundit.
- Wellfound.
- Instahyre.
- Personal portfolio.

Generate:

- Headline.
- About section.
- Professional summary.
- Employment descriptions.
- Skills.
- Project descriptions.
- Keywords.

Initially generate content for user review and manual updating.

Use official integrations only where available and authorized.

---

# PART 6 — DATABASE ARCHITECTURE

Use PostgreSQL with UUID primary keys.

Implement workspace ownership and tenant isolation from the beginning.

Core tables:

1. users
2. workspaces
3. workspace_members
4. career_profiles
5. experiences
6. projects
7. skills
8. achievements
9. career_positions
10. job_preferences
11. integrations
12. jobs
13. job_requirements
14. match_assessments
15. documents
16. document_versions
17. applications
18. application_events
19. application_documents
20. application_answers
21. approvals
22. email_events
23. automation_runs
24. ai_runs
25. audit_logs

### Required database conventions

- UUID primary keys.
- Foreign key constraints.
- Created and updated timestamps.
- Workspace IDs on tenant-owned records.
- Proper indexes.
- Unique constraints.
- Database migrations.
- Referential integrity.
- Row Level Security.

### Important approval schema

Approval must contain:

- Application ID.
- Approval type.
- Approving user.
- Timestamp.
- Approved document version IDs.
- Approved payload hash.
- Expiry.
- Consumption timestamp.

Do not implement approval as a simple unrestricted boolean.

---

# PART 7 — AI ARCHITECTURE

Create specialized AI services.

1. CareerProfileAgent.
2. JobExtractionAgent.
3. JobMatchingAgent.
4. CareerStrategistAgent.
5. ResumeAgent.
6. CoverLetterAgent.
7. ApplicationAssistantAgent.
8. EmailMonitoringAgent.
9. CareerAnalyticsAgent.

### Initial model allocation

DeepSeek:
- Bulk job extraction.
- Skill classification.
- Structured parsing.
- Matching.
- Email classification.
- Routine processing.

Claude:
- Resume writing.
- Professional positioning.
- Complex reasoning.
- Quality review.
- Difficult code reviews.

OpenAI:
- Career strategy.
- Alternative reasoning.
- Research and analysis.
- Optional strategic review.

All providers must be interchangeable.

### AI execution pipeline

Input → Context retrieval → Prompt construction → Model routing → Structured output → Schema validation → Business rule validation → User review → Persistence.

### AI logging

Record:

- Provider.
- Model.
- Task.
- User ID.
- Related job ID.
- Token usage.
- Execution duration.
- Estimated cost.
- Validation result.
- Error details.

Keep prompts versioned.

Never give AI agents unrestricted database access.

---

# PART 8 — API ARCHITECTURE

Use versioned REST APIs.

Base path:

/api/v1

Core routes:

- /profile
- /experiences
- /projects
- /skills
- /achievements
- /jobs
- /jobs/import
- /jobs/search
- /jobs/match
- /documents
- /documents/generate
- /documents/export
- /applications
- /applications/approve
- /applications/submit
- /integrations
- /integrations/gmail
- /analytics
- /ai/models
- /ai/usage
- /automation/prepare
- /automation/preview
- /automation/execute

Use asynchronous events for long-running operations.

Suggested events:

- job.imported
- job.extracted
- job.match.completed
- resume.generation.requested
- resume.generation.completed
- application.approval.granted
- application.submission.requested
- application.submission.completed
- email.received
- application.status.updated

Implement idempotency for submission operations.

---

# PART 9 — PROJECT STRUCTURE

Preferred starting structure:

careeros/
  apps/
    web/
      src/
        app/
        components/
        features/
          dashboard/
          career-profile/
          resume-studio/
          job-discovery/
          job-matching/
          applications/
          analytics/
          integrations/
        lib/
    workers/
      email-processing/
      document-generation/
      browser-automation/
      job-discovery/

  packages/
    ai/
      providers/
      agents/
      prompts/
      schemas/
    database/
    shared-types/
    validation/
    document-engine/

  supabase/
    migrations/
    seed.sql

  docs/
    PRD.md
    ARCHITECTURE.md
    DATABASE.md
    AI_AGENTS.md
    SECURITY.md
    ROADMAP.md
    IMPLEMENTATION_LOG.md

  tests/
    integration/
    e2e/

  package.json

Adjust this structure based on the actual repository and deployment requirements.

Do not create empty modules solely to match the folder tree.

---

# PART 10 — DEVELOPMENT ROADMAP

## PHASE 0: ENVIRONMENT AND ARCHITECTURE

Deliverables:

- Repository inspection.
- Runtime and dependency audit.
- Architecture proposal.
- Database ER diagram.
- Database schema.
- Security architecture.
- AI provider strategy.
- Development task breakdown.
- Documentation.

No substantial feature implementation until the architecture has been reviewed.

## PHASE 1: FOUNDATION

- Next.js setup.
- TypeScript configuration.
- UI system.
- Supabase integration.
- Authentication.
- Workspace architecture.
- Database migrations.
- Row Level Security.
- Dashboard shell.

## PHASE 2: CAREER PROFILE

- Profile CRUD.
- Employment records.
- Projects.
- Skills.
- Achievements.
- Career positioning.
- Resume upload.
- Resume parsing.
- Profile verification.

## PHASE 3: JOB INTELLIGENCE

- Job import.
- URL import.
- Text extraction.
- Job database.
- Duplicate detection.
- Requirement extraction.
- Job matching.
- Match explanation.
- Discovery dashboard.

## PHASE 4: APPLICATION STUDIO

- Resume generation.
- Resume editor.
- DOCX export.
- PDF export.
- Cover-letter generation.
- Document history.
- Application tracker.
- Approval workflow.

## PHASE 5: INTEGRATIONS

- Gmail OAuth.
- Email parsing.
- Application status detection.
- Background processing.
- Playwright worker.
- Supported ATS assistance.
- Application confirmation capture.

## PHASE 6: ANALYTICS

- Conversion funnel.
- Rejection analysis.
- Resume performance.
- Source-wise performance.
- Role-wise analytics.
- AI recommendations.

## PHASE 7: SAAS READINESS

- Multi-tenant verification.
- Workspace administration.
- Usage quotas.
- Model usage limits.
- Billing architecture.
- Data export.
- Account deletion.

Do not implement billing until the personal version has demonstrated value.

---

# PART 11 — TESTING REQUIREMENTS

Required tests:

### Profile integrity
- No fabricated employment.
- No unsupported skills.
- Correct dates.
- Correct achievement associations.

### Job matching
- Correct weighted score.
- Hard requirement mismatch detection.
- Missing skills.
- Reproducible assessment.

### Resume generation
- Claims traceable to verified facts.
- Correct project associations.
- ATS-readable formatting.
- Valid PDF and DOCX output.

### Application management
- Correct status transitions.
- Complete history.
- Correct document associations.

### Approval
- Submission impossible without valid approval.
- Modified documents invalidate approval.
- Expired approval rejected.
- Duplicate submission prevented.

### Security
- Workspace isolation.
- RLS enforcement.
- Private storage.
- Secure OAuth credentials.
- Server-side API keys.

### Browser automation
- Stop on unsupported websites.
- Stop on CAPTCHA.
- Stop on unknown legal declarations.
- Never submit before approval.
- Capture confirmation evidence.

---

# PART 12 — DEFINITION OF DONE

A feature is complete only when:

1. Its UI is implemented.
2. Its business logic is implemented.
3. Its database operations work.
4. Input validation is present.
5. Error handling is implemented.
6. Authorization is tested.
7. Loading and empty states are handled.
8. Relevant automated tests pass.
9. Documentation is updated.
10. The feature works in a real development environment.

A visually complete screen is not a completed feature.

---

# PART 13 — CODING AGENT EXECUTION INSTRUCTIONS

Begin with PHASE 0.

Your first response must contain:

1. Existing repository assessment.
2. Recommended architecture.
3. Any conflicts with existing project setup.
4. Proposed database schema.
5. Recommended dependency list.
6. Security considerations.
7. Phase 0 deliverables.
8. Initial implementation task breakdown.
9. Questions that genuinely block implementation.

Do not ask questions already answered in this specification.

Do not generate the entire application in one response.

After Phase 0 is reviewed, implement Phase 1.

At the end of each phase, provide:

- Files created.
- Files modified.
- Features implemented.
- Database changes.
- Tests executed.
- Test results.
- Known issues.
- Outstanding work.
- Recommended next milestone.

Maintain docs/IMPLEMENTATION_LOG.md throughout development.

Use small, reviewable changes.

Never claim that an integration works without testing it against the actual service.

Never use mock data to claim that a production workflow is complete.

The final objective is a working, reliable CareerOS application, not a collection of generated UI screens.

**Start with Phase 0: inspect the existing local environment and prepare the architecture proposal.**