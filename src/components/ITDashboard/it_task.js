const itRoles = [
  // ─────────────────────────────────────────────
  // 1. UI/UX DESIGN
  // ─────────────────────────────────────────────
  {
    name: 'UI/UX Design',
    tasks: [
      // Research & Discovery
      'Stakeholder Kickoff & Goal Alignment Workshop',
      'User Research Planning & Methodology Selection',
      'User Interviews & Contextual Inquiry Sessions',
      'Survey Design & Quantitative Data Collection',
      'Competitive & Heuristic Analysis',
      'User Persona & Empathy Map Creation',
      'Jobs-to-Be-Done (JTBD) Framework Mapping',
      'Affinity Diagramming & Research Synthesis',
      'Behavioral Analytics Review (Hotjar / FullStory / Mixpanel)',

      // Information Architecture & Strategy
      'Information Architecture (IA) Design',
      'Site Map & Navigation Structure Definition',
      'Content Hierarchy & Taxonomy Planning',
      'User Flow & Task Flow Diagramming',
      'User Journey Map Creation',
      'Service Blueprint Development',
      'Card Sorting & Tree Testing',

      // Wireframing & Prototyping
      'Low-Fidelity Wireframe Design (Balsamiq / Whimsical)',
      'Mid-Fidelity Wireframe Design',
      'High-Fidelity Mockup Design (Figma / Adobe XD / Sketch)',
      'Interactive Prototype Development (Figma / ProtoPie / Framer)',
      'Micro-interaction & Animation Design (Lottie / Framer Motion)',
      'Motion Design & Transition Specification',
      'Dark Mode & Theme Variant Design',
      'RTL (Right-to-Left) Layout Design',
      'Multi-platform Design (Web / iOS / Android / Tablet)',

      // Design Systems & Standards
      'Design System Architecture & Setup',
      'Component Library Creation (Atoms / Molecules / Organisms)',
      'Design Token Definition (Colors / Typography / Spacing / Elevation)',
      'Icon Set Design & Icon Library Curation',
      'Illustration & Graphic Asset Creation',
      'Typography Scale & Font Pairing Selection',
      'Color Palette & Brand Consistency Review',
      'Style Guide Documentation',
      'Pattern Library Maintenance',

      // Accessibility & Compliance
      'WCAG 2.1 / 2.2 Accessibility Audit',
      'Color Contrast Ratio Validation',
      'Screen Reader Compatibility Design (ARIA Role Mapping)',
      'Focus Management & Keyboard Navigation Design',
      'Accessible Form & Error State Design',
      'Alt Text & Label Strategy Documentation',

      // Usability Testing & Validation
      'Moderated Usability Testing Session Planning & Facilitation',
      'Unmoderated Remote Usability Testing (Maze / Lookback)',
      'A/B & Multivariate Test Design',
      'First-Click Testing & Navigation Testing',
      'Eye-tracking & Heatmap Study Analysis',
      'Usability Test Report & Insight Presentation',
      'Iterative Design Based on Feedback Loops',

      // Handoff & Collaboration
      'Design Handoff Preparation (Figma Dev Mode / Zeplin)',
      'Redline Annotation & Spacing Specification',
      'Design QA & Pixel-perfect Review with Developers',
      'Storybook Integration for Design Tokens',
      'Design Version Control & Changelog Management',
      'Stakeholder Presentation & Design Walkthrough',
      'Design Review & Critique Facilitation',
      'Cross-functional Design Alignment Sessions'
    ]
  },

  // ─────────────────────────────────────────────
  // 2. FRONTEND DEVELOPMENT
  // ─────────────────────────────────────────────
  {
    name: 'Frontend Development',
    tasks: [
      // Architecture & Setup
      'Frontend Architecture Design & Tech Stack Selection',
      'Monorepo Setup & Workspace Configuration (Nx / Turborepo)',
      'Build Tooling Configuration (Vite / Webpack / Turbopack / Rollup)',
      'Module Federation Setup for Micro-Frontend Architecture',
      'Environment Variable & Config Management',
      'ESLint, Prettier & Husky Pre-commit Hook Setup',
      'TypeScript Configuration & Strict Mode Enablement',
      'Path Aliasing & Import Resolution Setup',

      // Component Development
      'UI Component Development (React / Vue / Angular / Svelte)',
      'Atomic Design Pattern Implementation',
      'Reusable Component Library Development',
      'Compound Component & Render Props Patterns',
      'Server Components & Streaming SSR (Next.js 14+ / Nuxt)',
      'Slot-based & Headless Component Architecture',
      'Form Component Development (React Hook Form / Formik / Vee-Validate)',
      'Rich Text Editor Integration (TipTap / Quill / Slate)',
      'Data Grid / Table Component Development (AG Grid / TanStack Table)',
      'Chart & Data Visualization Component Integration (Recharts / ECharts / D3.js)',
      'Map Integration (Google Maps / Mapbox / Leaflet)',
      'Calendar & Date Picker Component Development',
      'Drag-and-Drop Interface Implementation (DnD Kit / React Beautiful DnD)',
      'File Upload & Media Preview Component',
      'Infinite Scroll & Virtual List Implementation (TanStack Virtual)',
      'Toast / Notification System Integration',
      'Modal, Drawer & Overlay Management',

      // State Management & Data Fetching
      'Global State Management (Redux Toolkit / Zustand / Pinia / Jotai / Recoil)',
      'Server State Management (TanStack Query / SWR / Apollo Client)',
      'GraphQL Client Integration & Query/Mutation Optimization',
      'WebSocket & Real-time Data Integration (Socket.io / Ably)',
      'Optimistic UI Updates & Rollback Handling',
      'Client-side Caching & Persistence Strategy',
      'URL State Management & Deep Linking',

      // Rendering & Performance
      'SSR (Server-Side Rendering) Implementation',
      'SSG (Static Site Generation) & ISR Setup',
      'Core Web Vitals Optimization (LCP / FID / CLS / INP)',
      'Bundle Size Analysis & Reduction (Bundlephobia / Webpack Bundle Analyzer)',
      'Lazy Loading, Dynamic Imports & Code Splitting',
      'Image Optimization (Next/Image / Cloudinary / Imgix)',
      'Font Loading Strategy & FOUT Prevention',
      'Service Worker & Offline Caching Strategy (Workbox)',
      'Progressive Web App (PWA) Manifest & Installation Flow',
      'Prefetching & Preloading Strategy',

      // Styling & Theming
      'CSS Architecture Design (BEM / SMACSS / ITCSS)',
      'Utility-first CSS Implementation (Tailwind CSS)',
      'CSS-in-JS Integration (Styled Components / Emotion / Vanilla Extract)',
      'CSS Custom Property (Variable) System Design',
      'Dark Mode & Multi-theme Implementation',
      'Animation & Transition Development (Framer Motion / GSAP / CSS Keyframes)',
      'CSS Grid & Flexbox Layout Systems',
      'Responsive Design Implementation (Mobile-first / Fluid Typography)',
      'Print Stylesheet Design',

      // API & Integration
      'RESTful API Integration & Error Handling',
      'GraphQL Query, Mutation & Subscription Integration',
      'OAuth 2.0 / OpenID Connect Login Flow (Auth0 / Clerk / NextAuth)',
      'Third-party SDK Integration (Payment Gateways / Maps / Analytics)',
      'Internationalization (i18n) & Localization (l10n) Setup (i18next / FormatJS)',
      'Analytics & Event Tracking Integration (GA4 / Segment / Mixpanel)',
      'Feature Flag Integration (LaunchDarkly / Flagsmith)',

      // Testing & Quality
      'Unit Testing (Jest / Vitest)',
      'Component Testing (React Testing Library / Vue Test Utils)',
      'Integration Testing (MSW - Mock Service Worker)',
      'End-to-End Testing (Playwright / Cypress)',
      'Visual Regression Testing (Chromatic / Percy)',
      'Test Coverage Reporting & Threshold Enforcement',
      'Snapshot Testing & UI Diff Review',
      'Performance Testing (Lighthouse CI / WebPageTest)',
      'Accessibility Testing (axe-core / Storybook a11y Addon)',

      // Security
      'Content Security Policy (CSP) Header Configuration',
      'XSS & CSRF Prevention Implementation',
      'Sensitive Data Masking in UI',
      'Dependency Audit & Vulnerability Patching (npm audit / Snyk)',
      'Secure Local Storage & Token Handling',
      'Subresource Integrity (SRI) Setup',

      // Documentation & Collaboration
      'Storybook Component Documentation & Story Writing',
      'Chromatic Visual Test & Review Workflow',
      'Component API Documentation (JSDoc / TSDoc)',
      'Code Review & PR Description Standards',
      'Frontend Onboarding Guide Creation',
      'Technical Debt Identification & Refactoring',
      'Cross-browser & Cross-device Compatibility Testing',
      'Frontend Error Monitoring (Sentry / Datadog RUM)'
    ]
  },

  // ─────────────────────────────────────────────
  // 3. BACKEND DEVELOPMENT
  // ─────────────────────────────────────────────
  {
    name: 'Backend Development',
    tasks: [
      // Architecture & Design
      'System Architecture Design & Tech Stack Selection',
      'RESTful API Design & Resource Modeling',
      'GraphQL Schema Design (SDL-first / Code-first)',
      'gRPC Service Definition & Protobuf Schema Design',
      'Microservices Decomposition & Bounded Context Mapping',
      'Monolith-to-Microservices Migration Planning',
      'Event-Driven Architecture Design (CQRS / Event Sourcing)',
      'Domain-Driven Design (DDD) Implementation',
      'Hexagonal / Clean Architecture Setup',
      'API Versioning Strategy (URL / Header / Content Negotiation)',
      'OpenAPI / Swagger Specification-first Design',

      // Core Development
      'API Endpoint Development & Route Configuration',
      'Middleware Development (Logging / Auth / Rate Limiting)',
      'Authentication Implementation (JWT / Session / API Keys)',
      'OAuth 2.0 & OpenID Connect Provider Integration (Keycloak / Auth0)',
      'Multi-factor Authentication (MFA/TOTP) Integration',
      'SAML 2.0 / SSO Integration',
      'Role-based Access Control (RBAC) Implementation',
      'Attribute-based Access Control (ABAC) Implementation',
      'Multi-tenancy Architecture Design & Implementation',
      'Server-side Validation & Input Sanitization',
      'Business Logic Layer Development',
      'Domain Entity & Value Object Modeling',
      'Repository Pattern & Data Access Layer Implementation',
      'Unit of Work Pattern Implementation',
      'Service Layer & Use Case Implementation',

      // Integrations & Messaging
      'Message Queue Integration (RabbitMQ / Apache Kafka / AWS SQS)',
      'Event Bus & Pub/Sub Pattern (Redis Pub/Sub / Google Pub/Sub)',
      'WebSocket & SSE (Server-Sent Events) Implementation',
      'Third-party REST/SOAP API Integration',
      'Payment Gateway Integration (Razorpay / Stripe / PayU)',
      'Email Service Integration (SendGrid / Mailgun / SES)',
      'SMS & OTP Service Integration (Twilio / MSG91)',
      'File Storage Integration (AWS S3 / Azure Blob / GCS)',
      'Push Notification Backend (FCM / APNs via backend)',
      'Webhook Design, Registration & Signature Verification',
      'Outbox Pattern for Reliable Event Publishing',

      // Performance & Scalability
      'Caching Layer Implementation (Redis / Memcached)',
      'Cache Invalidation Strategy (TTL / Event-based / Write-through)',
      'Database Query Performance Optimization & Indexing',
      'N+1 Query Problem Detection & Resolution',
      'Pagination Strategy (Offset / Cursor / Keyset)',
      'Bulk Data Processing & Batch Job Implementation',
      'Background Job & Worker Queue (BullMQ / Celery / Sidekiq)',
      'Cron Job & Scheduled Task Management',
      'Rate Limiting & Throttling (Token Bucket / Sliding Window)',
      'Circuit Breaker & Retry Logic Implementation (Resilience4j / Polly)',
      'Connection Pooling Configuration',
      'Async / Non-blocking I/O Optimization',
      'Horizontal Scaling & Stateless Service Design',

      // Data & Storage
      'Database Schema Design & ERD Creation',
      'ORM Configuration & Relationship Mapping (Prisma / TypeORM / Sequelize / Hibernate)',
      'Database Migration Script Development',
      'Seed Data & Fixture Management',
      'Soft Delete & Audit Trail Implementation',
      'Full-text Search Integration (Elasticsearch / Typesense / MeiliSearch)',
      'Geospatial Query Implementation (PostGIS / MongoDB Geospatial)',
      'Data Encryption at Rest & in Transit',
      'GDPR / DPDP Data Handling & Right-to-Erasure Implementation',

      // Testing & Quality
      'Unit Testing for Business Logic (Jest / Mocha / JUnit / PyTest)',
      'Integration Testing with Real Dependencies (Testcontainers)',
      'API Contract Testing (Pact / Dredd)',
      'Mutation Testing (Stryker / PITest)',
      'Performance & Load Testing (k6 / Locust)',
      'Test Coverage Enforcement & Reporting',
      'API Mock & Stub Development (Nock / WireMock)',
      'Database Integration Test Setup & Teardown',
      'Code Review & Architecture Review Facilitation',

      // Security
      'OWASP Top 10 Threat Mitigation',
      'SQL Injection & NoSQL Injection Prevention',
      'Secrets Management (HashiCorp Vault / AWS Secrets Manager / Azure Key Vault)',
      'HTTPS Enforcement & TLS Configuration',
      'Security Headers Configuration (HSTS / X-Frame-Options / CORS)',
      'Dependency Vulnerability Scanning (Snyk / OWASP Dependency-Check)',
      'Audit Logging & Non-repudiation Implementation',
      'Data Masking & Tokenization for Sensitive Fields',
      'Penetration Test Remediation',

      // Documentation & Operations
      'API Documentation (Swagger UI / Redoc / Scalar)',
      'Postman Collection & Environment Setup',
      'Developer SDK & Client Library Development',
      'Server-side Error Handling & Structured Error Response Design',
      'Logging Strategy & Structured Log Format (JSON / ELK)',
      'Distributed Tracing Setup (Jaeger / Zipkin / OpenTelemetry)',
      'Application Health Check & Readiness Probe Endpoint',
      'Feature Flag Backend Implementation',
      'Runbook & On-call Documentation'
    ]
  },

  // ─────────────────────────────────────────────
  // 4. MOBILE DEVELOPMENT
  // ─────────────────────────────────────────────
  {
    name: 'Mobile Development',
    tasks: [
      'Cross-platform App Development (React Native / Flutter)',
      'Native iOS Development (Swift / SwiftUI)',
      'Native Android Development (Kotlin / Jetpack Compose)',
      'Mobile UI Component Implementation',
      'Push Notification Integration (FCM / APNs)',
      'Offline Storage & Sync (SQLite / Realm / Hive)',
      'Biometric Authentication Integration',
      'Deep Linking & Universal Links Setup',
      'Mobile API Integration & Error Handling',
      'App Performance Profiling & Optimization',
      'App Store / Play Store Submission & Review',
      'OTA Update Configuration (CodePush / EAS Update)',
      'Mobile Crash Reporting (Sentry / Firebase Crashlytics)',
      'Mobile Accessibility (TalkBack / VoiceOver)',
      'Unit & Widget Testing',
      'Device & OS Compatibility Testing'
    ]
  },

  // ─────────────────────────────────────────────
  // 5. DEVOPS & CI/CD
  // ─────────────────────────────────────────────
  {
    name: 'DevOps & CI/CD',
    tasks: [
      'CI/CD Pipeline Design & Implementation (GitHub Actions / GitLab CI / Jenkins)',
      'Docker Containerization & Multi-stage Builds',
      'Kubernetes Cluster Setup & Management',
      'Helm Chart Development & Deployment',
      'Infrastructure as Code (Terraform / Pulumi)',
      'Configuration Management (Ansible / Chef / Puppet)',
      'Environment Management (Dev / Staging / Production)',
      'Secrets & Credentials Management (Vault / AWS Secrets Manager)',
      'Automated Testing Integration in Pipeline',
      'Blue-Green & Canary Deployment Strategy',
      'Rollback Automation & Incident Runbooks',
      'Artifact Repository Management (Nexus / ECR / Harbor)',
      'Build Optimization & Cache Strategies',
      'SLA-based Alerting & On-call Rotation Setup',
      'GitOps Workflow Implementation (ArgoCD / Flux)',
      'Post-deployment Smoke & Sanity Testing'
    ]
  },

  // ─────────────────────────────────────────────
  // 6. CLOUD & INFRASTRUCTURE
  // ─────────────────────────────────────────────
  {
    name: 'Cloud & Infrastructure',
    tasks: [
      'Cloud Architecture Design (AWS / Azure / GCP)',
      'Virtual Machine & Compute Provisioning (EC2 / Azure VM / GCE)',
      'Serverless Architecture (Lambda / Azure Functions / Cloud Run)',
      'Container Registry & Orchestration (EKS / AKS / GKE)',
      'CDN Setup & Configuration (CloudFront / Azure CDN / Cloudflare)',
      'Object Storage Management (S3 / Blob Storage / GCS)',
      'VPC, Subnet & Network Security Group Design',
      'Load Balancer & Auto-scaling Configuration',
      'Cloud Cost Optimization & FinOps Review',
      'Multi-region & Disaster Recovery Setup',
      'Cloud IAM & Privilege Access Management',
      'DNS Management & SSL/TLS Certificate Lifecycle',
      'Cloud-native Monitoring (CloudWatch / Azure Monitor / GCP Ops)',
      'Database Cloud Services (RDS / Azure SQL / Cloud Spanner)',
      'Cloud Compliance Audit (SOC2 / ISO 27001 / HIPAA)',
      'Cloud Migration Planning & Execution'
    ]
  },

  // ─────────────────────────────────────────────
  // 7. DATABASE ADMINISTRATION
  // ─────────────────────────────────────────────
  {
    name: 'Database Administration',
    tasks: [
      // Relational Databases
      'Relational DB Administration (PostgreSQL / MySQL / MSSQL / Oracle)',
      'Database Instance Setup, Configuration & Hardening',
      'Tablespace, Schema & User Management',
      'Table Partitioning Strategy (Range / List / Hash)',
      'Index Design, Analysis & Rebuilding (B-Tree / GIN / GiST / Partial)',
      'Query Execution Plan Analysis (EXPLAIN / EXPLAIN ANALYZE)',
      'Slow Query Log Analysis & Optimization',
      'Stored Procedure, Function & Trigger Development',
      'View & Materialized View Design & Refresh Strategy',
      'Database Normalization & Denormalization Trade-off Analysis',
      'Referential Integrity & Constraint Design',
      'Sequence & Auto-increment Management',

      // NoSQL Databases
      'NoSQL DB Administration (MongoDB / Cassandra / DynamoDB / Couchbase)',
      'MongoDB Collection Design & Aggregation Pipeline Optimization',
      'Cassandra Keyspace, Table & Partition Key Design',
      'DynamoDB Table Design, GSI & LSI Strategy',
      'Redis Cluster Setup, Eviction Policy & Persistence Configuration',
      'Elasticsearch Index Design, Mapping & Shard Strategy',
      'Search Query Optimization (Full-text / Fuzzy / Geo)',

      // Replication & High Availability
      'Primary-Replica Replication Setup & Monitoring',
      'Multi-master / Multi-region Replication Configuration',
      'Read Replica Load Balancing Strategy',
      'Failover Testing & Automatic Promotion Configuration',
      'Patroni / Pacemaker HA Cluster Setup (PostgreSQL)',
      'Always On Availability Group Configuration (MSSQL)',
      'Connection Pooling Setup (PgBouncer / HikariCP / ProxySQL)',

      // Backup & Recovery
      'Full, Incremental & Differential Backup Strategy',
      'Point-in-time Recovery (PITR) Configuration',
      'Logical Backup & Restore (pg_dump / mysqldump)',
      'Physical Backup (pg_basebackup / Percona XtraBackup)',
      'Backup Encryption & Offsite/Cloud Storage Upload',
      'Backup Restoration Drill & RTO/RPO Validation',
      'WAL Archiving & Log Shipping Setup',

      // Migration & DevOps
      'Schema Version Control & Migration Management (Flyway / Liquibase / Alembic)',
      'Zero-downtime Schema Migration Strategy',
      'Cross-platform Database Migration (On-prem to Cloud)',
      'Database Seed Data Management',
      'Blue-Green Database Deployment Strategy',
      'Database Change Review Process Setup',

      // Performance & Monitoring
      'Database Performance Baseline & Benchmarking',
      'Capacity Planning & Storage Growth Projection',
      'Table Bloat Analysis & VACUUM / ANALYZE Scheduling (PostgreSQL)',
      'Statistics Update & Query Planner Tuning',
      'Lock Contention & Deadlock Detection and Resolution',
      'Connection Count Monitoring & Alert Tuning',
      'Database Monitoring Dashboard Setup (Grafana / pg_activity / SolarWinds DPA)',
      'Alerting for Disk Usage, Replication Lag & Long-running Queries',
      'Automated Health Check & Self-healing Script Development',

      // Security & Compliance
      'Database User Role & Privilege Audit',
      'Row-level Security (RLS) Policy Implementation',
      'Database Activity Monitoring (DAM) Setup',
      'Audit Logging Configuration (pgaudit / MySQL Audit Plugin)',
      'Transparent Data Encryption (TDE) Setup',
      'Column-level Data Masking & Tokenization',
      'GDPR / DPDP Right-to-Erasure Implementation',
      'Database Firewall & Network Access Control',
      'Penetration Test Remediation for DB Layer',
      'Database Vulnerability Scan (DbProtect / Imperva)'
    ]
  },

  // ─────────────────────────────────────────────
  // 8. QA & TESTING
  // ─────────────────────────────────────────────
  {
    name: 'QA & Testing',
    tasks: [
      'Test Strategy & Test Plan Creation',
      'Requirements Traceability Matrix (RTM)',
      'Manual Functional & Regression Testing',
      'Automated Test Framework Setup (Selenium / Playwright / Appium)',
      'API Testing (Postman / RestAssured / Karate)',
      'Performance & Load Testing (JMeter / k6 / Gatling)',
      'Security Vulnerability Scanning (OWASP ZAP / Burp Suite)',
      'Accessibility Testing (Axe / Wave)',
      'Cross-browser & Cross-device Testing',
      'User Acceptance Testing (UAT) Coordination',
      'Test Data Management & Mocking',
      'Defect Lifecycle Management (Jira / Azure DevOps)',
      'Root Cause Analysis & Defect Prevention',
      'CI-integrated Test Reporting (Allure / TestRail)',
      'Shift-left Testing & Developer Enablement',
      'End-to-End Release Sign-off'
    ]
  },

  // ─────────────────────────────────────────────
  // 9. CYBERSECURITY
  // ─────────────────────────────────────────────
  {
    name: 'Cybersecurity',
    tasks: [
      'Security Architecture Review & Threat Modelling',
      'Vulnerability Assessment & Penetration Testing (VAPT)',
      'SIEM Setup & Security Event Monitoring (Splunk / Microsoft Sentinel)',
      'Endpoint Detection & Response (EDR) Management',
      'Firewall Rule Management & Audit',
      'Zero Trust Network Architecture Implementation',
      'Identity & Privileged Access Management (PAM)',
      'Security Patch Management & CVE Tracking',
      'Incident Response & Forensic Investigation',
      'Data Loss Prevention (DLP) Policy Configuration',
      'Phishing Simulation & Security Awareness Training',
      'PKI & Certificate Lifecycle Management',
      'Compliance Audit (ISO 27001 / NIST / SOC2 / GDPR)',
      'Web Application Firewall (WAF) Configuration',
      'Dark Web Monitoring & Threat Intelligence',
      'Security Policy & Runbook Documentation'
    ]
  },

  // ─────────────────────────────────────────────
  // 10. NETWORK ADMINISTRATION
  // ─────────────────────────────────────────────
  {
    name: 'Network Administration',
    tasks: [
      'LAN / WAN Design & Configuration',
      'Router, Switch & VLAN Management',
      'Firewall Policy & ACL Management (Cisco / Palo Alto / Fortinet)',
      'VPN Setup & Remote Access Management (IPSec / SSL / WireGuard)',
      'Wi-Fi Infrastructure Management (Cisco Meraki / Aruba / UniFi)',
      'SD-WAN Deployment & Optimization',
      'Network Performance Monitoring (PRTG / SolarWinds / Zabbix)',
      'DNS & DHCP Server Administration',
      'Bandwidth Monitoring & QoS Configuration',
      'Network Redundancy & Failover Planning',
      'ISP & Circuit Management',
      'Network Security Audit & Log Review',
      'IP Address Management (IPAM)',
      'Structured Cabling & Physical Infrastructure Audit',
      'Network Incident Triage & RCA'
    ]
  },

  // ─────────────────────────────────────────────
  // 11. SYSTEM ADMINISTRATION
  // ─────────────────────────────────────────────
  {
    name: 'System Administration',
    tasks: [
      'Windows Server Administration (2019 / 2022)',
      'Linux Server Administration (RHEL / Ubuntu / CentOS)',
      'Active Directory Domain Services (AD DS) Management',
      'Group Policy Object (GPO) Design & Deployment',
      'Patch & Update Management (WSUS / SCCM / Ansible)',
      'Virtualization Management (VMware vSphere / Hyper-V / Proxmox)',
      'Server Backup & Disaster Recovery (Veeam / Commvault)',
      'System Performance Monitoring & Capacity Planning',
      'User Account Lifecycle Management',
      'Remote Desktop & Support Infrastructure (RDS / Citrix)',
      'Storage Administration (SAN / NAS / iSCSI)',
      'Log Management & SIEM Integration',
      'Scripting & Automation (PowerShell / Bash / Python)',
      'Hardware Procurement & Asset Lifecycle Management',
      'ITIL-based Change & Incident Management'
    ]
  },

  // ─────────────────────────────────────────────
  // 12. IT ADMIN & M365
  // ─────────────────────────────────────────────
  {
    name: 'IT Admin & M365',
    tasks: [
      'Microsoft 365 Tenant Administration',
      'Azure Active Directory (Entra ID) User & Group Management',
      'Exchange Online Mailbox & Mail Flow Configuration',
      'Microsoft Teams Administration & Policy Management',
      'SharePoint Online Site Design & Permissions',
      'OneDrive for Business Policy & Quota Management',
      'Intune MDM / MAM Device Enrollment & Policy Deployment',
      'Microsoft Defender for Endpoint Configuration',
      'Conditional Access & MFA Policy Management',
      'Power Platform Administration (Power Apps / Power Automate)',
      'Power BI Workspace & Capacity Administration',
      'Microsoft Purview (Compliance Center) Configuration',
      'License Management & Cost Optimization',
      'M365 Security Score Review & Hardening',
      'Email & Account Onboarding / Offboarding',
      'M365 Audit Log Review & Alert Policy Setup',
      'Exchange Hybrid & Mail Migration',
      'M365 Backup & eDiscovery Configuration',
      'Helpdesk L1/L2 IT Support Ticket Resolution',
      'IT Asset Inventory & CMDB Maintenance'
    ]
  },

  // ─────────────────────────────────────────────
  // 13. DATA ENGINEERING & BI
  // ─────────────────────────────────────────────
  {
    name: 'Data Engineering & BI',
    tasks: [
      'Data Pipeline Architecture & Design',
      'ETL / ELT Development (Apache Spark / dbt / SSIS)',
      'Data Warehouse Design (Snowflake / BigQuery / Redshift / Synapse)',
      'Data Lake Setup & Governance (Delta Lake / Iceberg)',
      'Real-time Streaming Pipeline (Kafka / Kinesis / Pub/Sub)',
      'Data Quality Monitoring & Lineage Tracking',
      'Power BI Report & Dashboard Development',
      'DAX Measure & Data Model Optimization',
      'Power BI Dataflow & Dataset Management',
      'Tableau / Looker Dashboard Development',
      'KPI Definition & Metric Framework Design',
      'Automated Scheduled Report Generation',
      'Master Data Management (MDM)',
      'Data Governance & Cataloguing (Apache Atlas / Purview)',
      'ML Model Integration & Feature Store Management',
      'Stakeholder Data Requirement Gathering'
    ]
  },

  // ─────────────────────────────────────────────
  // 14. ANALYSIS & PROJECT MANAGEMENT
  // ─────────────────────────────────────────────
  {
    name: 'Analysis & Project Management',
    tasks: [
      'Business Requirement Gathering & Stakeholder Interviews',
      'Functional Specification Document (FSD) Creation',
      'Use Case & User Story Writing (BDD / Gherkin)',
      'Process Gap Analysis & As-Is / To-Be Mapping',
      'Sprint Planning & Backlog Grooming (Agile / Scrum)',
      'Project Timeline & Milestone Tracking (Jira / Azure DevOps)',
      'Risk Register & Mitigation Planning',
      'Change Request Impact Analysis',
      'Vendor Evaluation & RFP / RFQ Preparation',
      'SLA Definition & KPI Tracking',
      'Project Status Reporting (Weekly / Monthly)',
      'Resource Allocation & Capacity Planning',
      'Budget Tracking & Cost Variance Analysis',
      'Retrospective Facilitation & Process Improvement',
      'Stakeholder Communication & Escalation Management'
    ]
  },

  // ─────────────────────────────────────────────
  // 15. TECHNICAL DOCUMENTATION
  // ─────────────────────────────────────────────
  {
    name: 'Technical Documentation',
    tasks: [
      // Architecture & Design Docs
      'System Architecture Document (SAD) Creation',
      'High-level Design (HLD) Document',
      'Low-level Design (LLD) Document',
      'Infrastructure & Network Topology Diagram (Draw.io / Lucidchart / Mermaid)',
      'Database ERD & Data Dictionary Documentation',
      'Microservices Interaction & Dependency Map',
      'Data Flow Diagram (DFD) & Sequence Diagram Creation',
      'Decision Log & Architecture Decision Record (ADR) Maintenance',
      'Technology Radar & Standards Catalogue',

      // API & Developer Docs
      'API Reference Documentation (OpenAPI 3.x / Swagger)',
      'Postman Collection & Environment File Documentation',
      'GraphQL Schema Documentation (GraphDoc / SpectaQL)',
      'SDK & Client Library Usage Guide',
      'Webhook Event Catalogue & Payload Reference',
      'Developer Onboarding Guide & Local Setup Runbook',
      'Code Comment & Inline Documentation Standards (JSDoc / TSDoc / Docstring)',
      'Changelog & Release Notes Authoring',
      'Third-party Integration Guide',
      'Error Code & Troubleshooting Reference',

      // Operations & Infrastructure Docs
      'Incident Response & Escalation Runbook',
      'Post-mortem / Root Cause Analysis (RCA) Report',
      'Disaster Recovery Plan (DRP) & Business Continuity Plan (BCP)',
      'Backup & Restore Procedure Documentation',
      'Deployment Checklist & Go-live Runbook',
      'Rollback Procedure Documentation',
      'SLA & SLO Definition Document',
      'Monitoring & Alerting Playbook',
      'On-call Rotation & Escalation Matrix',
      'Infrastructure Cost & Sizing Document',

      // Security & Compliance Docs
      'Security Policy & Acceptable Use Policy (AUP)',
      'Threat Model Document (STRIDE / PASTA)',
      'VAPT Report Review & Remediation Tracking',
      'Compliance Checklist (ISO 27001 / GDPR / SOC2 / HIPAA / DPDP)',
      'Data Classification & Handling Policy',
      'Access Control Matrix Documentation',
      'Audit Evidence Package Preparation',
      'Privacy Impact Assessment (PIA) Documentation',

      // Process & Standard Docs
      'SOP (Standard Operating Procedure) Writing',
      'QA Test Plan & Test Case Documentation',
      'Code Review Guideline & PR Template',
      'Git Branching Strategy & Workflow Documentation',
      'SDLC Process Documentation',
      'Agile / Scrum Ceremony Templates & Guides',
      'Onboarding Handbook for New Developers',
      'Team Coding Standards & Best Practices Guide',
      'Dependency & Third-party Library Inventory',

      // End-user & Stakeholder Docs
      'User Manual & End-user Help Guide',
      'Admin Panel Usage Guide',
      'Feature Specification & Functional Requirement Document (FRD)',
      'Technical Proposal & Scope of Work (SOW)',
      'Project Closure & Handover Document',
      'Training Material & Workshop Presentation',
      'Executive Summary & Technical Overview Deck',

      // Knowledge Management
      'Internal Wiki Setup & Governance (Confluence / Notion / Outline)',
      'Knowledge Base Article Writing & Maintenance',
      'FAQ & Common Issues Repository',
      'Documentation Review & Audit (Currency, Accuracy, Completeness)',
      'Documentation Version Control & Archiving Strategy',
      'Docs-as-Code Pipeline Setup (MkDocs / Docusaurus / VitePress)'
    ]
  },

  // ─────────────────────────────────────────────
  // 16. CRM / ERP INTEGRATION
  // ─────────────────────────────────────────────
  {
    name: 'CRM / ERP Integration',
    tasks: [
      'CRM Platform Administration (Salesforce / HubSpot / Zoho)',
      'CRM Customization & Workflow Automation',
      'ERP Module Configuration (SAP / Odoo / Microsoft Dynamics)',
      'CRM-ERP Data Sync & Integration',
      'Lead, Opportunity & Pipeline Management Setup',
      'Custom Report & Dashboard Creation',
      'Third-party API & Webhook Integration',
      'User Role & Permission Configuration',
      'Data Import, Cleansing & Deduplication',
      'CRM / ERP User Training & Adoption',
      'Subscription & License Lifecycle Management',
      'Escalation Workflow & SLA Automation',
      'Audit Trail & Compliance Reporting'
    ]
  }
];


const tasksData = [
  { account: 'GA', roles: itRoles },
  { account: 'ICEM', roles: itRoles },
  { account: 'External', roles: itRoles }
];

export default tasksData  ;