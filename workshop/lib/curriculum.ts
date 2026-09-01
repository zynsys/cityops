export interface RawLessonDefinition {
  readonly id: string;
  readonly file: string;
  readonly title: string;
  readonly description: string;
  readonly duration: string;
  readonly preview?: boolean;
}

export interface RawModuleDefinition {
  readonly id: string;
  readonly sequence: number;
  readonly title: string;
  readonly platform: string;
  readonly summary: string;
  readonly description: string;
  readonly lessons: readonly RawLessonDefinition[];
}

export interface RawTrackDefinition {
  readonly id: string;
  readonly name: string;
  readonly logoUrl: string;
  readonly status: string;
  readonly description: string;
}

export interface RawCurriculum {
  readonly tracks: readonly RawTrackDefinition[];
  readonly modules: readonly RawModuleDefinition[];
}

const lesson = (
  id: string,
  file: string,
  title: string,
  description: string,
  duration: string,
  preview = false,
): RawLessonDefinition => ({ id, file, title, description, duration, ...(preview ? { preview: true } : {}) });

const tracks = [
  {
    id: 'github',
    name: 'GitHub',
    logoUrl: '/assets/logos/github.svg',
    status: '39 hands-on lessons and 1 curriculum preview available',
    description: 'Master GitHub Copilot, collaboration, secure delivery, and agentic workflows with CityOps on GitHub.',
  },
  {
    id: 'ado',
    name: 'Azure DevOps',
    logoUrl: '/assets/logos/azure-devops.svg',
    status: '6 curriculum previews available',
    description: 'Master Boards, Repos, Pipelines, Test Plans, Artifacts, security, and AI-powered Azure operations.',
  },
] as const satisfies readonly RawTrackDefinition[];

const githubModules = [
  {
    id: 'foundation',
    sequence: 1,
    title: 'CityOps & GitHub Foundations',
    platform: 'github',
    summary: 'Set up CityOps and understand its real-world architecture.',
    description:
      'Get oriented with the workshop, prepare your environment, walk through the citizen-to-council report lifecycle, and explore CityOps architecture, RBAC, multi-tenancy, and data model.',
    lessons: [
      lesson(
        'foundation-01-getting-started',
        'content/github/01-foundations/01-getting-started.md',
        'Getting Started',
        'Preview the module goals, prerequisites, and lesson sequence.',
        '5 min',
      ),
      lesson(
        'foundation-02-workshop-overview',
        'content/github/01-foundations/02-workshop-overview.md',
        'Workshop Overview',
        'Discover the workshop goals, lesson sequence, and CityOps domain.',
        '10 min',
      ),
      lesson(
        'foundation-03-prereqs',
        'content/github/01-foundations/03-prereqs.md',
        'Prerequisites',
        'Prepare the tools, accounts, services, and local environment.',
        '20 min',
      ),
      lesson(
        'foundation-04-project-walkthrough',
        'content/github/01-foundations/04-project-walkthrough.md',
        'Project Walkthrough',
        'Follow a report through the complete citizen and council workflow.',
        '20 min',
      ),
      lesson(
        'foundation-05-understanding-codebase',
        'content/github/01-foundations/05-understanding-codebase.md',
        'Understanding a Codebase',
        'Explore the architecture, schema, RBAC, and module boundaries.',
        '20 min',
      ),
    ],
  },
  {
    id: 'enterprise-administration',
    sequence: 2,
    title: 'Enterprise Administration',
    platform: 'github',
    summary: 'Govern identity, access, policy, Copilot, and adoption at enterprise scale.',
    description:
      'Establish a GitHub Enterprise administration baseline for identity, least privilege, Copilot policy, repository governance, auditing, licensing, and adoption.',
    lessons: [
      lesson(
        'enterprise-01-getting-started',
        'content/github/02-enterprise-administration/01-getting-started.md',
        'Getting Started',
        'Preview the enterprise administration outcomes and planned lessons.',
        '10 min',
        true,
      ),
    ],
  },
  {
    id: 'security',
    sequence: 3,
    title: 'Security',
    platform: 'github',
    summary: 'Identify, validate, prioritize, and remediate CityOps security risks.',
    description:
      'Review authentication, authorization, RBAC, tenant isolation, secrets, sensitive logging, and common application security weaknesses with Copilot-assisted analysis.',
    lessons: [
      lesson(
        'security-01-getting-started',
        'content/github/03-security/01-getting-started.md',
        'Getting Started',
        'Preview the security outcomes, safeguards, and lesson sequence.',
        '5 min',
      ),
      lesson(
        'security-02-review',
        'content/github/03-security/02-security-review.md',
        'Security Review with Copilot',
        'Review authentication, RBAC, tenant isolation, and secret-handling risks.',
        '25 min',
      ),
    ],
  },
  {
    id: 'code-quality',
    sequence: 4,
    title: 'Code Quality',
    platform: 'github',
    summary: 'Generate robust tests and strengthen engineering feedback.',
    description:
      'Generate unit and integration coverage, create Playwright tests for real user journeys, and evaluate generated assertions, fixtures, and regression evidence.',
    lessons: [
      lesson(
        'testing-01-getting-started',
        'content/github/04-code-quality/01-getting-started.md',
        'Getting Started',
        'Preview the module goals, prerequisites, and lesson sequence.',
        '5 min',
      ),
      lesson(
        'testing-02-unit',
        'content/github/04-code-quality/02-unit-testing.md',
        'Unit Testing with Copilot',
        'Generate meaningful unit and integration coverage.',
        '25 min',
      ),
      lesson(
        'testing-03-playwright',
        'content/github/04-code-quality/03-ui-testing-playwright.md',
        'UI Testing with Playwright',
        'Test complete citizen and council browser journeys.',
        '30 min',
      ),
    ],
  },
  {
    id: 'developer-productivity',
    sequence: 5,
    title: 'AI-Assisted Development',
    platform: 'github',
    summary: "Work faster with Copilot's core modes and approval controls.",
    description:
      'Use Ask, Inline Chat, Edit, Plan, and Agent modes to understand code, make focused changes, plan features, and implement full-stack work with the right level of autonomy.',
    lessons: [
      lesson(
        'dev-01-getting-started',
        'content/github/05-ai-assisted-development/01-getting-started.md',
        'Getting Started',
        'Preview the module goals, prerequisites, and lesson sequence.',
        '5 min',
      ),
      lesson(
        'dev-02-ask-mode',
        'content/github/05-ai-assisted-development/02-ask-mode.md',
        'Ask Mode',
        'Explore unfamiliar code with multi-file context and focused questions.',
        '20 min',
      ),
      lesson(
        'dev-03-inline-chat',
        'content/github/05-ai-assisted-development/03-inline-chat.md',
        'Inline Chat & Edit Mode',
        'Make targeted, context-aware edits directly in the editor.',
        '20 min',
      ),
      lesson(
        'dev-04-plan-mode',
        'content/github/05-ai-assisted-development/04-plan-mode.md',
        'Plan Mode',
        'Design a structured implementation plan before writing code.',
        '20 min',
      ),
      lesson(
        'dev-05-agent-mode',
        'content/github/05-ai-assisted-development/05-agent-mode.md',
        'Agent Mode',
        'Implement a full-stack feature through an autonomous agent session.',
        '30 min',
      ),
      lesson(
        'dev-06-approval-types',
        'content/github/05-ai-assisted-development/06-approval-types.md',
        'Approval Types',
        'Match agent autonomy and approval controls to the task risk.',
        '15 min',
      ),
    ],
  },
  {
    id: 'extending-copilot',
    sequence: 6,
    title: 'Extend & Govern Copilot',
    platform: 'github',
    summary: 'Tailor Copilot with reusable context, agents, skills, and tools.',
    description:
      'Configure instructions and prompts, create custom agents and skills, connect MCP servers, and apply guardrails to reusable Copilot workflows.',
    lessons: [
      lesson(
        'ext-01-getting-started',
        'content/github/06-extend-govern-copilot/01-getting-started.md',
        'Getting Started',
        'Preview the module goals, prerequisites, and lesson sequence.',
        '5 min',
      ),
      lesson(
        'ext-02-custom-instructions',
        'content/github/06-extend-govern-copilot/02-custom-instructions.md',
        'Custom Instructions',
        'Teach Copilot the project conventions and domain guardrails.',
        '20 min',
      ),
      lesson(
        'ext-03-prompt-files',
        'content/github/06-extend-govern-copilot/03-prompt-files.md',
        'Prompt Files',
        'Create reusable prompts for recurring development tasks.',
        '20 min',
      ),
      lesson(
        'ext-04-custom-agents',
        'content/github/06-extend-govern-copilot/04-custom-agents.md',
        'Custom Agents',
        'Build specialised agents with focused tools and instructions.',
        '25 min',
      ),
      lesson(
        'ext-05-agent-skills',
        'content/github/06-extend-govern-copilot/05-agent-skills.md',
        'Agent Skills',
        'Package reusable CityOps domain expertise in SKILL.md files.',
        '25 min',
      ),
      lesson(
        'ext-06-mcp-servers',
        'content/github/06-extend-govern-copilot/06-mcp-servers.md',
        'MCP Servers',
        'Connect GitHub and PostgreSQL tools for richer context.',
        '25 min',
      ),
      lesson(
        'ext-07-awesome-copilot',
        'content/github/06-extend-govern-copilot/07-awesome-copilot.md',
        'Awesome Copilot',
        'Discover and evaluate community-built Copilot customisations.',
        '15 min',
      ),
    ],
  },
  {
    id: 'copilot-cli',
    sequence: 7,
    title: 'GitHub Copilot CLI',
    platform: 'github',
    summary: 'Bring Copilot workflows into your terminal.',
    description:
      'Install and authenticate GitHub Copilot CLI, use common commands against CityOps, and combine terminal sessions with MCP servers and Agent Skills for richer context.',
    lessons: [
      lesson(
        'cli-01-getting-started',
        'content/github/07-copilot-cli/01-getting-started.md',
        'Getting Started',
        'Preview the module goals, prerequisites, and lesson sequence.',
        '5 min',
      ),
      lesson(
        'cli-02-installation',
        'content/github/07-copilot-cli/02-installation.md',
        'CLI Installation',
        'Install, authenticate, and configure GitHub Copilot CLI.',
        '15 min',
      ),
      lesson(
        'cli-03-commands',
        'content/github/07-copilot-cli/03-commands.md',
        'Commonly Used Commands',
        'Explore, explain, and modify CityOps from the terminal.',
        '25 min',
      ),
      lesson(
        'cli-04-mcp',
        'content/github/07-copilot-cli/04-mcp-integration.md',
        'CLI + MCP Servers',
        'Use MCP-powered tools inside terminal sessions.',
        '25 min',
      ),
      lesson(
        'cli-05-skills',
        'content/github/07-copilot-cli/05-skills-integration.md',
        'CLI + Agent Skills',
        'Bring reusable Agent Skills into command-line workflows.',
        '25 min',
      ),
    ],
  },
  {
    id: 'spec-driven-development',
    sequence: 8,
    title: 'Spec-Driven Development',
    platform: 'github',
    summary: 'Turn requirements into structured, traceable implementations.',
    description:
      'Install Spec Kit, transform feature requirements into a clear specification, and guide Agent Mode from an approved spec through implementation and validation.',
    lessons: [
      lesson(
        'sdd-01-getting-started',
        'content/github/08-spec-driven-development/01-getting-started.md',
        'Getting Started',
        'Preview the module goals, prerequisites, and lesson sequence.',
        '5 min',
      ),
      lesson(
        'sdd-02-speckit-installation',
        'content/github/08-spec-driven-development/02-speckit-installation.md',
        'Spec Kit Installation',
        'Set up Spec Kit and understand the development workflow.',
        '15 min',
      ),
      lesson(
        'sdd-03-generating-spec',
        'content/github/08-spec-driven-development/03-generating-spec.md',
        'Generating a Spec',
        'Transform a feature request into testable requirements.',
        '25 min',
      ),
      lesson(
        'sdd-04-implementation',
        'content/github/08-spec-driven-development/04-implementation.md',
        'Implementation from Spec',
        'Implement and validate a feature from its approved spec.',
        '30 min',
      ),
    ],
  },
  {
    id: 'agentic-development',
    sequence: 9,
    title: 'Agentic Delivery & Operations',
    platform: 'github',
    summary: 'Delegate, review, and orchestrate increasingly autonomous work.',
    description:
      'Assign issues to the Coding Agent, review generated pull requests, run background and multi-agent work, orchestrate full-stack workflows, and automate guardrails with agent hooks.',
    lessons: [
      lesson(
        'agentic-01-getting-started',
        'content/github/09-agentic-delivery-operations/01-getting-started.md',
        'Getting Started',
        'Preview the module goals, prerequisites, and lesson sequence.',
        '5 min',
      ),
      lesson(
        'agentic-02-coding-agent',
        'content/github/09-agentic-delivery-operations/02-coding-agent.md',
        'Copilot Coding Agent',
        'Delegate a GitHub issue and review the generated pull request.',
        '30 min',
      ),
      lesson(
        'agentic-03-pr-review',
        'content/github/09-agentic-delivery-operations/03-pr-review.md',
        'PR Descriptions & Review',
        'Generate useful PR context and conduct focused code review.',
        '20 min',
      ),
      lesson(
        'agentic-04-background',
        'content/github/09-agentic-delivery-operations/04-background-agents.md',
        'Background Agents',
        'Delegate long-running work while continuing locally.',
        '20 min',
      ),
      lesson(
        'agentic-05-workflows',
        'content/github/09-agentic-delivery-operations/05-agentic-workflows.md',
        'Agentic Workflows',
        'Chain migration, API, UI, and data tasks in one session.',
        '30 min',
      ),
      lesson(
        'agentic-06-multi-agent',
        'content/github/09-agentic-delivery-operations/06-multi-agent.md',
        'Multi-Agent Development',
        'Coordinate parallel agents across application layers.',
        '30 min',
      ),
      lesson(
        'agentic-07-hooks',
        'content/github/09-agentic-delivery-operations/07-agent-hooks.md',
        'Agent Hooks',
        'Automate policy checks and lifecycle actions around agents.',
        '25 min',
      ),
    ],
  },
] as const satisfies readonly RawModuleDefinition[];

interface AdoDefinition {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly description: string;
  readonly file: string;
}

const adoDefinitions = [
  {
    id: 'ado-foundations',
    title: 'CityOps & Azure DevOps Foundations',
    summary: 'Set up CityOps and establish a governed Azure DevOps delivery flow.',
    description:
      'Configure the organization, project, teams, permissions, and repository while learning the CityOps architecture and delivery lifecycle.',
    file: 'content/ado/01-foundations/01-getting-started.md',
  },
  {
    id: 'ado-boards-repos',
    title: 'Plan & Collaborate with Boards and Repos',
    summary: 'Connect planning, code review, policy, and end-to-end traceability.',
    description:
      'Model CityOps work, manage backlogs and sprints, apply pull-request policies, and trace requirements through delivery evidence.',
    file: 'content/ado/02-boards-repos/01-getting-started.md',
  },
  {
    id: 'ado-pipelines',
    title: 'Build & Deploy with Azure Pipelines',
    summary: 'Create governed, reusable YAML delivery pipelines for CityOps.',
    description:
      'Build, test, package, and deploy CityOps with templates, environments, approvals, checks, and controlled promotion.',
    file: 'content/ado/03-pipelines/01-getting-started.md',
  },
  {
    id: 'ado-quality-artifacts',
    title: 'Quality & Packages with Test Plans and Artifacts',
    summary: 'Unify manual tests, automation evidence, and package management.',
    description:
      'Connect test plans and automated suites to CityOps requirements, publish diagnostics, and manage internal packages with Azure Artifacts.',
    file: 'content/ado/04-quality-artifacts/01-getting-started.md',
  },
  {
    id: 'ado-security',
    title: 'Secure & Govern Azure DevOps',
    summary: 'Apply least privilege, protected secrets, scanning, and audit controls.',
    description:
      'Govern permissions and service connections, protect secrets, and integrate dependency, code, and secret scanning into delivery.',
    file: 'content/ado/05-security/01-getting-started.md',
  },
  {
    id: 'ado-ai-operations',
    title: 'AI-Powered Delivery & Azure Operations',
    summary: 'Use governed AI assistance and operational evidence to improve delivery.',
    description:
      'Ground Copilot in Azure DevOps context, generate reviewed delivery assets, observe CityOps on Azure, and close the operations-to-backlog loop.',
    file: 'content/ado/06-ai-operations/01-getting-started.md',
  },
] as const satisfies readonly AdoDefinition[];

const adoModules: readonly RawModuleDefinition[] = adoDefinitions.map((definition, index) => ({
  id: definition.id,
  title: definition.title,
  summary: definition.summary,
  description: definition.description,
  platform: 'ado',
  sequence: index + 1,
  lessons: [
    lesson(
      `${definition.id}-01-getting-started`,
      definition.file,
      'Getting Started',
      'Preview the module outcomes, lesson plan, and planned hands-on scenario.',
      '10 min',
      true,
    ),
  ],
}));

const curriculum: RawCurriculum = { tracks, modules: [...githubModules, ...adoModules] };

export default curriculum;
