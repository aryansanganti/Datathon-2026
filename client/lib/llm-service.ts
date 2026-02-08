import { EmployeeData, FeatureRequest, LLMAllocationResponse, TaskData } from './types';
import { fetchEmployees } from './api-service';

const FEATHERLESS_API_URL = 'https://api.featherless.ai/v1/chat/completions';

// Cache for employees from MongoDB
let cachedEmployees: EmployeeData[] | null = null;

// Get employees - always from MongoDB, fallback to mock only on error
export const getEmployees = async (): Promise<EmployeeData[]> => {
  if (!cachedEmployees) {
    try {
      console.log('📡 Fetching employees from MongoDB...');
      const data = await fetchEmployees();
      if (data && data.length > 0) {
        cachedEmployees = data;
        console.log('✅ Loaded employees from MongoDB:', cachedEmployees.length, cachedEmployees.map(e => e.name));
      } else {
        console.warn('⚠️ MongoDB returned empty data, using mock data as fallback');
        return syntheticEmployees;
      }
    } catch (error) {
      console.error('❌ Failed to fetch from MongoDB, using mock data as fallback:', error);
      return syntheticEmployees;
    }
  }
  return cachedEmployees;
};

// Clear cache (call after updates)
export const clearEmployeeCache = () => {
  cachedEmployees = null;
};

// Tech stack domain mapping for finding similar technologies
const TECH_DOMAINS: Record<string, string[]> = {
  frontend: ['React', 'Vue', 'Angular', 'Svelte', 'TypeScript', 'JavaScript', 'CSS', 'Tailwind', 'HTML', 'Next.js', 'Nuxt'],
  backend: ['Node.js', 'Express', 'Python', 'Django', 'Flask', 'FastAPI', 'Go', 'Rust', 'Java', 'Spring', 'Ruby', 'Rails', '.NET', 'PHP', 'Laravel'],
  database: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cassandra', 'DynamoDB', 'SQLite', 'Oracle', 'SQL Server', 'Firebase'],
  cloud: ['AWS', 'Azure', 'GCP', 'Google Cloud', 'Heroku', 'Vercel', 'Netlify', 'DigitalOcean', 'Cloudflare'],
  devops: ['Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Jenkins', 'GitHub Actions', 'GitLab CI', 'Ansible', 'Helm'],
  mobile: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'iOS', 'Android', 'Xamarin', 'Ionic'],
  ml: ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'ML', 'Machine Learning', 'Data Science', 'Pandas', 'NumPy'],
  security: ['Security', 'OWASP', 'Penetration Testing', 'OAuth', 'JWT', 'Encryption', 'Compliance'],
  testing: ['Jest', 'Cypress', 'Selenium', 'Testing', 'Pytest', 'Mocha', 'QA', 'Unit Testing'],
  design: ['Figma', 'Sketch', 'Adobe XD', 'Prototyping', 'UI/UX', 'Design Systems', 'CSS']
};

// Synthetic employee data - 12 engineers (fallback/mock data)
export const syntheticEmployees: EmployeeData[] = [
  {
    id: "1",
    name: "Sarah Chen",
    role: "Senior Frontend",
    avatar: "SC",
    availability: true,
    hours_per_week: 40,
    workload: { active_tickets: 3, ticket_weights: [3, 5, 2], computed_score: 0.45 },
    tech_stack: ["React", "TypeScript", "Vue", "CSS", "Tailwind"],
    seniority: "Senior",
    efficiency: 0.92,
    stress: 0.25,
    cost_per_hour: 45,
    experience: 8
  },
  {
    id: "2",
    name: "Marcus Johnson",
    role: "Backend Lead",
    avatar: "MJ",
    availability: true,
    hours_per_week: 40,
    workload: { active_tickets: 2, ticket_weights: [2, 3], computed_score: 0.30 },
    tech_stack: ["Node.js", "Python", "Go", "PostgreSQL", "Redis"],
    seniority: "Lead",
    efficiency: 0.95,
    stress: 0.45,
    cost_per_hour: 55,
    experience: 12
  },
  {
    id: "3",
    name: "Elena Rodriguez",
    role: "Full Stack Dev",
    avatar: "ER",
    availability: true,
    hours_per_week: 40,
    workload: { active_tickets: 2, ticket_weights: [2, 3], computed_score: 0.30 },
    tech_stack: ["React", "Node.js", "AWS", "MongoDB", "TypeScript"],
    seniority: "Mid",
    efficiency: 0.85,
    stress: 0.15,
    cost_per_hour: 38,
    experience: 5
  },
  {
    id: "4",
    name: "David Kim",
    role: "DevOps Engineer",
    avatar: "DK",
    availability: true,
    hours_per_week: 40,
    workload: { active_tickets: 6, ticket_weights: [5, 4, 5, 3, 4, 5], computed_score: 0.88 },
    tech_stack: ["Kubernetes", "Docker", "AWS", "Terraform", "CI/CD"],
    seniority: "Senior",
    efficiency: 0.88,
    stress: 0.65,
    cost_per_hour: 48,
    experience: 9
  },
  {
    id: "5",
    name: "Anna Petrova",
    role: "UI/UX Designer",
    avatar: "AP",
    availability: true,
    hours_per_week: 35,
    workload: { active_tickets: 4, ticket_weights: [3, 4, 2, 3], computed_score: 0.55 },
    tech_stack: ["Figma", "CSS", "React", "Adobe XD", "Prototyping"],
    seniority: "Mid",
    efficiency: 0.90,
    stress: 0.30,
    cost_per_hour: 35,
    experience: 6
  },
  {
    id: "6",
    name: "James Wilson",
    role: "Security Specialist",
    avatar: "JW",
    availability: true,
    hours_per_week: 40,
    workload: { active_tickets: 2, ticket_weights: [4, 3], computed_score: 0.40 },
    tech_stack: ["Python", "Security", "AWS", "OAuth", "JWT", "OWASP"],
    seniority: "Senior",
    efficiency: 0.93,
    stress: 0.20,
    cost_per_hour: 52,
    experience: 11
  },
  {
    id: "7",
    name: "Lisa Thompson",
    role: "QA Engineer",
    avatar: "LT",
    availability: true,
    hours_per_week: 40,
    workload: { active_tickets: 3, ticket_weights: [3, 2, 4], computed_score: 0.48 },
    tech_stack: ["Selenium", "Jest", "Cypress", "Testing", "Python"],
    seniority: "Mid",
    efficiency: 0.87,
    stress: 0.25,
    cost_per_hour: 32,
    experience: 4
  },
  {
    id: "8",
    name: "Alex Kumar",
    role: "ML Engineer",
    avatar: "AK",
    availability: true,
    hours_per_week: 40,
    workload: { active_tickets: 4, ticket_weights: [5, 5, 4, 5], computed_score: 0.82 },
    tech_stack: ["Python", "TensorFlow", "PyTorch", "ML", "Data Science"],
    seniority: "Senior",
    efficiency: 0.91,
    stress: 0.50,
    cost_per_hour: 58,
    experience: 7
  },
  {
    id: "9",
    name: "Michael Brown",
    role: "Junior Frontend",
    avatar: "MB",
    availability: true,
    hours_per_week: 40,
    workload: { active_tickets: 2, ticket_weights: [2, 2], computed_score: 0.20 },
    tech_stack: ["React", "JavaScript", "HTML", "CSS", "Tailwind"],
    seniority: "Junior",
    efficiency: 0.72,
    stress: 0.10,
    cost_per_hour: 25,
    experience: 1
  },
  {
    id: "10",
    name: "Jessica Lee",
    role: "Backend Developer",
    avatar: "JL",
    availability: true,
    hours_per_week: 40,
    workload: { active_tickets: 3, ticket_weights: [3, 4, 3], computed_score: 0.42 },
    tech_stack: ["Node.js", "Express", "PostgreSQL", "GraphQL", "TypeScript"],
    seniority: "Mid",
    efficiency: 0.84,
    stress: 0.28,
    cost_per_hour: 36,
    experience: 4
  },
  {
    id: "11",
    name: "Robert Taylor",
    role: "Mobile Developer",
    avatar: "RT",
    availability: true,
    hours_per_week: 40,
    workload: { active_tickets: 4, ticket_weights: [4, 3, 4, 3], computed_score: 0.58 },
    tech_stack: ["React Native", "Swift", "Kotlin", "Flutter", "TypeScript"],
    seniority: "Senior",
    efficiency: 0.89,
    stress: 0.35,
    cost_per_hour: 46,
    experience: 8
  },
  {
    id: "12",
    name: "Sophia Anderson",
    role: "Tech Lead",
    avatar: "SA",
    availability: true,
    hours_per_week: 35,
    workload: { active_tickets: 5, ticket_weights: [5, 5, 4, 5, 4], computed_score: 0.78 },
    tech_stack: ["React", "Node.js", "AWS", "System Design", "TypeScript", "Architecture"],
    seniority: "Lead",
    efficiency: 0.96,
    stress: 0.55,
    cost_per_hour: 65,
    experience: 14
  }
];

const buildChainOfThoughtPrompt = (
  featureName: string,
  details: string,
  employees: EmployeeData[],
  deadlineWeeks: number,
  budget: number | null,
  techStack: string[],
  autoGenerateTech: boolean,
  priority: "low" | "medium" | "high" = "medium"
): string => {
  // Pre-calculate employee availability scores for the prompt
  const employeeSummary = employees.map(emp => ({
    id: emp.id,
    name: emp.name,
    role: emp.role,
    seniority: emp.seniority,
    skills: emp.tech_stack.join(', '),
    workload_percent: Math.round(emp.workload.computed_score * 100),
    available_capacity: Math.round((1 - emp.workload.computed_score) * 100),
    efficiency: Math.round(emp.efficiency * 100),
    stress_level: Math.round(emp.stress * 100),
    hourly_rate: emp.cost_per_hour,
    experience: emp.experience,
    available: emp.availability
  }));

  // Priority-specific allocation guidance
  const priorityGuidance = {
    low: `PRIORITY: LOW
- WORKLOAD IS MOST IMPORTANT: Always prefer employees with lowest workload
- Experience is secondary - any qualified employee can handle this
- Prefer cost efficiency over speed
- Ideal for: routine tasks, learning opportunities, non-urgent work`,
    medium: `PRIORITY: MEDIUM
- BALANCED APPROACH: Consider both workload AND experience equally
- If two employees have similar skills, prefer the one with better balance of availability and experience
- Standard project timeline expectations
- Ideal for: regular sprints, feature work, improvements`,
    high: `PRIORITY: HIGH (CRITICAL)
- AVAILABILITY FIRST, THEN EXPERIENCE: First try to find qualified employees with good availability
- Less experienced employees CAN be assigned to high priority tasks if they have the skills and capacity
- FALLBACK ONLY: Only assign busy experienced employees if NO available employees can handle it
- Experience requirement: minimum 50% skill match required for high priority tasks
- AVOID overloading anyone - a junior with 70% free capacity is BETTER than a senior with 20% free
- Only use busy seniors (>75% workload) as LAST RESORT when no one else is available
- Ideal for: critical bugs, important features, time-sensitive deliverables`
  };

  return `You are an expert resource allocation AI. Use CHAIN-OF-THOUGHT reasoning to analyze and allocate resources.

═══════════════════════════════════════════════════════════════════════════════
STEP 1: UNDERSTAND THE REQUEST
═══════════════════════════════════════════════════════════════════════════════

FEATURE: ${featureName}
DESCRIPTION: ${details || 'No additional details provided'}
DEADLINE: ${deadlineWeeks} weeks
BUDGET: ${budget ? `$${budget.toLocaleString()} (HARD LIMIT - DO NOT EXCEED)` : 'No constraint'}
${autoGenerateTech ? 'TECH STACK: Auto-generate based on feature requirements and team expertise' : `REQUESTED TECH: ${techStack.length > 0 ? techStack.join(', ') : 'Not specified'}`}

${priorityGuidance[priority]}

═══════════════════════════════════════════════════════════════════════════════
STEP 2: ANALYZE TEAM CAPABILITIES (CRITICAL - READ CAREFULLY)
═══════════════════════════════════════════════════════════════════════════════

TEAM ROSTER (sorted by available capacity - PREFER EMPLOYEES WITH LOWER WORKLOAD):
${employeeSummary
  .sort((a, b) => b.available_capacity - a.available_capacity)
  .map(emp => `
[${emp.id}] ${emp.name} | ROLE: ${emp.role} | ${emp.seniority}
    PRIMARY DOMAIN: ${emp.role.toLowerCase().includes('mobile') ? 'MOBILE' : emp.role.toLowerCase().includes('frontend') || emp.role.toLowerCase().includes('ui') ? 'WEB FRONTEND' : emp.role.toLowerCase().includes('backend') ? 'BACKEND' : emp.role.toLowerCase().includes('devops') ? 'DEVOPS' : emp.role.toLowerCase().includes('security') ? 'SECURITY' : emp.role.toLowerCase().includes('data') ? 'DATA' : emp.role.toLowerCase().includes('ml') ? 'ML/AI' : emp.role.toLowerCase().includes('qa') || emp.role.toLowerCase().includes('test') ? 'QA' : emp.role.toLowerCase().includes('design') ? 'DESIGN' : 'FULLSTACK'}
    Skills: ${emp.skills}
    Workload: ${emp.workload_percent}% busy | ${emp.available_capacity}% AVAILABLE
    Rate: $${emp.hourly_rate}/hr | Status: ${emp.available ? '✓ Available' : '✗ Unavailable'}
`).join('')}

═══════════════════════════════════════════════════════════════════════════════
STEP 3: MATCHING RULES (CRITICAL - FOLLOW EXACTLY OR ALLOCATION WILL FAIL)
═══════════════════════════════════════════════════════════════════════════════

⚠️⚠️⚠️ MOST IMPORTANT RULE - READ THIS FIRST ⚠️⚠️⚠️
MOBILE and WEB are COMPLETELY DIFFERENT domains. NEVER mix them:
- "Mobile Developer" with React Native → ONLY mobile app tasks (iOS, Android apps)
- "Frontend Developer" with React → ONLY web browser tasks (websites, web apps)
- React Native ≠ React. They are different frameworks for different platforms!

A) STRICT ROLE-TO-TASK MATCHING (MUST FOLLOW):

   📱 MOBILE APP tasks (iOS app, Android app, mobile app):
      ✅ ONLY assign to: Mobile Developer, iOS Developer, Android Developer
      ✅ Skills: React Native, Flutter, Swift, Kotlin
      ❌ NEVER assign to: Frontend Developer (they do WEB, not mobile)
   
   🌐 WEB FRONTEND tasks (website UI, web dashboard, web components, browser UI):
      ✅ ONLY assign to: Frontend Developer, UI Developer, Full Stack Developer
      ✅ Skills: React (web), Vue, Angular, CSS, HTML, Tailwind
      ❌ NEVER assign to: Mobile Developer (they do APPS, not websites)
   
   ⚙️ BACKEND/API tasks (API, server, database, endpoints):
      ✅ ONLY assign to: Backend Developer, Backend Lead, Full Stack Developer
      ✅ Skills: Node.js, Python, Go, Java, PostgreSQL, MongoDB
      ❌ NEVER assign to: Frontend or Mobile Developers
   
   🔧 DEVOPS tasks (deployment, CI/CD, infrastructure):
      ✅ ONLY assign to: DevOps Engineer
      ❌ NEVER assign to: Frontend, Mobile, or Backend Developers
   
   🔒 SECURITY tasks:
      ✅ ONLY assign to: Security Engineer
   
   🧪 QA/TESTING tasks:
      ✅ ONLY assign to: QA Engineer
   
   🤖 ML/AI tasks:
      ✅ ONLY assign to: ML Engineer, Data Scientist

B) EXAMPLE - CORRECT vs WRONG:
   Task: "Frontend dashboard implementation"
   ✅ CORRECT: Assign to "Sarah Chen - Senior Frontend Developer" (has React web skills)
   ❌ WRONG: Assign to "Alex Thompson - Mobile Developer" (has React Native, but that's for APPS not WEB)

C) FOR EACH TASK:
   1. First, identify if it's MOBILE, WEB, BACKEND, DEVOPS, etc.
   2. Filter to ONLY employees whose ROLE matches that domain
   3. From those, pick the one with best availability + skills
   4. Reject others in that domain with clear reasons

D) REJECTION RULES:
   - Include 2-4 rejections per task from employees IN THE SAME DOMAIN
   - Rejection reasons must be SHORT (under 40 chars): "55% workload", "No Vue skills", "Over budget"
   - Do NOT reject employees from unrelated domains (don't reject DevOps for frontend task)
   - Split hours evenly among assigned employees

D) BUDGET CALCULATION:
   - For each assignment: (estimated_hours / num_assignees) × hourly_rate
   - Running total MUST stay under budget limit
   - If budget is tight, prioritize essential tasks

═══════════════════════════════════════════════════════════════════════════════
STEP 4: GENERATE OUTPUT
═══════════════════════════════════════════════════════════════════════════════

FIRST AND MOST IMPORTANT: Determine if this is a valid, actionable software development task.
You MUST reject invalid input - do NOT try to be helpful by guessing what they meant.

INVALID/JUNK TASKS (return error JSON immediately - DO NOT generate tasks):
- Random letters or gibberish (e.g., "xyz", "abc", "asdfghjkl", "qwerty", "test123", "aaa", "xxx")
- Single words that are not clear features (e.g., "thing", "stuff", "hello", "hi", "test", "app")
- Very short input under 3 meaningful words that doesn't describe a real feature
- Non-software requests (e.g., "make me a sandwich", "what's the weather", "hello world")
- Vague/undecidable requests with no clear deliverable (e.g., "do something cool", "improve stuff", "make it better")
- Generic words that could mean anything (e.g., "system", "feature", "module", "component")
- Requests that are impossible or nonsensical (e.g., "divide by zero feature")
- Single letters/numbers or extremely short input with no meaning
- Offensive, harmful, or inappropriate content

VALID tasks must:
- Clearly describe a SPECIFIC software feature or functionality
- Be at least 3+ descriptive words explaining what should be built
- Have a concrete, implementable goal (e.g., "user authentication with OAuth", "real-time chat system", "payment checkout with Stripe")

If the request is INVALID, you MUST respond with ONLY this JSON (no tasks, no allocations):
{
  "error": {
    "type": "invalid_task",
    "message": "This input doesn't describe a valid software feature",
    "suggestion": "Try something like 'user authentication system' or 'dashboard with analytics charts'"
  }
}

If the request is VALID, respond with ONLY this JSON (no markdown, no explanation):

{
  "thinking": {
    "task_analysis": "Brief explanation of how you broke down the feature",
    "tech_stack_reasoning": "Why you chose these technologies (especially if substituting similar ones)",
    "assignment_logic": "Key decisions in employee assignments, especially workload considerations"
  },
  "tasks": [
    {
      "id": "t1",
      "title": "Task Title",
      "description": "What this task accomplishes",
      "required_skills": ["Skill1", "Skill2"],
      "estimated_hours": 24,
      "priority": "high|medium|low",
      "deadline_weeks": 2
    }
  ],
  "allocations": [
    {
      "task_id": "t1",
      "employee_id": "1",
      "reasoning": "Why this employee was selected",
      "confidence": 0.92,
      "estimated_completion_hours": 22,
      "risk_factors": ["Risk1"]
    }
  ],
  "rejections": [
    {
      "task_id": "t1", 
      "employee_id": "4",
      "rejection_reason": "2-3 words ONLY: '75% workload', 'Over budget', 'No React', 'High stress', 'Wrong domain'"
    }
  ],
  "timeline": [
    { "week": 1, "tasks_in_progress": ["t1"], "milestones": ["Setup & planning complete"] },
    { "week": 2, "tasks_in_progress": ["t2"], "milestones": ["Core feature implemented"] }
  ],
  "business_analytics": {
    "total_estimated_cost": 5000,
    "projected_savings": 1500,
    "savings_percentage": 23,
    "time_efficiency_gain": 15,
    "risk_assessment": "Assessment based on workloads and deadlines",
    "roi_estimate": 2.5
  }${autoGenerateTech ? ',\n  "auto_generated_stack": ["Tech1", "Tech2"]' : ''}
}

CRITICAL RULES:
1. Generate 3-6 tasks based on feature complexity
2. MATCH BY ROLE FIRST: Mobile tasks → Mobile devs, Web tasks → Frontend devs, API tasks → Backend devs
3. React Native ≠ React Web! Do NOT assign mobile devs to web tasks or vice versa
4. rejection_reason MUST be 2-3 words MAX. Examples: "75% workload", "Over budget", "No React", "Wrong domain"
5. ${budget ? `Total cost MUST be under $${budget.toLocaleString()}` : 'Optimize for quality and speed'}
6. All employee IDs must be strings ("1", "2", not 1, 2)
7. For multi-person tasks, use employee_ids array AND set employee_id to first person
8. Timeline MUST have a milestone for EVERY week - no empty weeks allowed. Distribute work across all ${deadlineWeeks} weeks.
9. ONLY include employees in allocations/rejections if they are RELEVANT to the task domain`;
};

type Priority = "low" | "medium" | "high";

export const getAllocationFromLLM = async (
  featureName: string,
  details: string,
  apiKey: string,
  budget: number | null = 10000,
  techStack: string[] = [],
  deadlineWeeks: number = 4,
  autoGenerateTech: boolean = false,
  priority: Priority = "medium",
  customEmployees?: EmployeeData[] // Optional: use custom employees instead of default
): Promise<LLMAllocationResponse> => {
  // Use provided employees or fetch from cache/mock
  const employeesToUse = customEmployees || (await getEmployees());
  const availableEmployees = employeesToUse.filter(e => e.availability);
  
  // If no API key, use smart fallback immediately
  if (!apiKey || apiKey.trim() === '') {
    console.log('No API key provided, using smart fallback allocation');
    return generateSmartFallbackAllocation(
      featureName,
      details,
      availableEmployees,
      deadlineWeeks,
      budget,
      techStack,
      autoGenerateTech,
      priority
    );
  }
  
  // Build the Chain-of-Thought prompt (unified for both auto-generate and manual tech stack)
  const prompt = buildChainOfThoughtPrompt(
    featureName,
    details,
    employeesToUse,
    deadlineWeeks,
    budget,
    techStack,
    autoGenerateTech,
    priority
  );

  console.log('Calling LLM with feature:', featureName);

  // Priority-specific system prompt guidance
  const prioritySystemPrompt = {
    low: `Your primary objectives (in order of priority):
1. WORKLOAD BALANCE: MOST IMPORTANT - Always prefer employees with LOWER current workload
2. ROLE MATCHING: Match employee role to task domain (mobile dev for mobile, frontend dev for web UI)
3. SKILL MATCHING: Match required skills, using similar technologies if needed
4. COST EFFICIENCY: Prefer lower-cost employees for routine work`,
    medium: `Your primary objectives (in order of priority):
1. ROLE MATCHING: Match employee role to task domain (mobile dev for mobile, frontend dev for web UI)
2. BALANCED APPROACH: Consider both workload AND experience equally
3. SKILL MATCHING: Match required skills well
4. BUDGET COMPLIANCE: Stay within budget limits`,
    high: `Your primary objectives (in order of priority):
1. ROLE MATCHING: CRITICAL - Match employee role to task domain exactly
2. AVAILABILITY + SKILLS: Find employees with good availability (>25%) who have the required skills
3. SKILL THRESHOLD: Minimum 60% skill match required for high priority tasks
4. FALLBACK ONLY: Only use busy experienced devs if NO available employees can do it`
  };

  try {
    const response = await fetch(FEATHERLESS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
        messages: [
          {
            role: 'system',
            content: `You are an expert resource allocation AI for software development teams.

${prioritySystemPrompt[priority]}

CRITICAL MATCHING RULES:
- MOBILE tasks (iOS, Android, React Native, Flutter) → ONLY Mobile Developers
- WEB FRONTEND tasks (React web, Vue, Angular, CSS) → ONLY Frontend/UI Developers
- BACKEND/API tasks (Node.js, Python, databases) → ONLY Backend Developers
- React Native (mobile) is COMPLETELY DIFFERENT from React (web) - never confuse them!

When comparing employees:
- First filter by ROLE/DOMAIN match
- Then sort by skill match + availability
- Include rejections for other candidates in the same domain with clear reasons

IMPORTANT: Only include employees in allocations/rejections if they are relevant to the task.
- For a web frontend task: include Frontend devs, reject some with reasons, but DON'T include Mobile/DevOps/ML engineers
- For a mobile task: include Mobile devs, but DON'T include Frontend web devs

Always respond with valid JSON only, no markdown formatting.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 5000,
        temperature: 0.2,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLM API Error:', errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in LLM response');
    }

    // Parse the JSON response, handling potential markdown code blocks
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.slice(7);
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    const result: LLMAllocationResponse = JSON.parse(jsonContent);
    
    // Validate and fix any issues with the LLM response
    return validateAndFixAllocation(result, employeesToUse, budget);

  } catch (error) {
    console.error('Error calling LLM:', error);
    // Return fallback allocation if LLM fails
    return generateSmartFallbackAllocation(
      featureName,
      details,
      availableEmployees,
      deadlineWeeks,
      budget,
      techStack,
      autoGenerateTech,
      priority
    );
  }
};

// Helper function to determine task domain from task name/description
const getTaskDomain = (taskName: string): 'mobile' | 'web' | 'backend' | 'devops' | 'qa' | 'ml' | 'security' | 'other' => {
  const taskLower = taskName.toLowerCase();
  
  // MOBILE indicators - check FIRST as it's more specific
  if (taskLower.includes('ios') || 
      taskLower.includes('android') || 
      taskLower.includes('mobile app') || 
      taskLower.includes('mobile dev') ||
      taskLower.includes('react native') ||
      taskLower.includes('flutter') ||
      taskLower.includes('native app') ||
      taskLower.includes('swift') ||
      taskLower.includes('kotlin')) {
    return 'mobile';
  }
  
  // WEB FRONTEND indicators - "Frontend" alone means WEB frontend
  if (taskLower.includes('frontend') ||
      taskLower.includes('front-end') ||
      taskLower.includes('front end') ||
      taskLower.includes('ui design') ||
      taskLower.includes('ui component') ||
      taskLower.includes('ui implementation') ||
      taskLower.includes('web ui') ||
      taskLower.includes('dashboard') ||
      taskLower.includes('landing page') ||
      taskLower.includes('web interface') ||
      taskLower.includes('user interface') ||
      taskLower.includes('react component') ||
      taskLower.includes('vue') ||
      taskLower.includes('angular') ||
      (taskLower.includes('ui') && !taskLower.includes('mobile'))) {
    return 'web';
  }
  
  // BACKEND indicators  
  if (taskLower.includes('api') ||
      taskLower.includes('backend') ||
      taskLower.includes('back-end') ||
      taskLower.includes('back end') ||
      taskLower.includes('server') ||
      taskLower.includes('database') ||
      taskLower.includes('endpoint')) {
    return 'backend';
  }
  
  // DEVOPS indicators
  if (taskLower.includes('deploy') ||
      taskLower.includes('devops') ||
      taskLower.includes('ci/cd') ||
      taskLower.includes('infrastructure') ||
      taskLower.includes('docker') ||
      taskLower.includes('kubernetes')) {
    return 'devops';
  }
  
  // QA/Testing indicators
  if (taskLower.includes('test') ||
      taskLower.includes('qa') ||
      taskLower.includes('quality')) {
    return 'qa';
  }
  
  // ML/AI indicators
  if (taskLower.includes('ml') ||
      taskLower.includes('machine learning') ||
      taskLower.includes('ai') ||
      taskLower.includes('model')) {
    return 'ml';
  }
  
  // Security indicators
  if (taskLower.includes('security') ||
      taskLower.includes('auth')) {
    return 'security';
  }
  
  return 'other';
};

// Helper function to get employee's primary domain from their role AND skills
const getEmployeeDomain = (employee: EmployeeData): 'mobile' | 'web' | 'backend' | 'devops' | 'qa' | 'ml' | 'security' | 'other' => {
  const roleLower = employee.role.toLowerCase();
  const skillsLower = employee.tech_stack.map(s => s.toLowerCase());
  
  // Check role FIRST - role is the primary indicator
  if (roleLower.includes('mobile') || 
      roleLower.includes('ios') || 
      roleLower.includes('android')) {
    return 'mobile';
  }
  
  // Also check if they have ONLY mobile skills (React Native, Swift, Kotlin, Flutter)
  const mobileOnlySkills = ['react native', 'swift', 'kotlin', 'flutter', 'ios', 'android'];
  const webSkills = ['react', 'vue', 'angular', 'css', 'html', 'tailwind', 'next.js'];
  
  const hasMobileSkills = skillsLower.some(s => mobileOnlySkills.some(ms => s.includes(ms)));
  const hasWebSkills = skillsLower.some(s => webSkills.some(ws => s === ws || (s === 'react' && !s.includes('native'))));
  
  // If they have React Native but NOT React (web), they're mobile
  if (hasMobileSkills && !hasWebSkills) {
    return 'mobile';
  }
  
  if (roleLower.includes('frontend') || 
      roleLower.includes('front-end') ||
      roleLower.includes('ui ') ||
      roleLower.includes('ui/ux')) {
    return 'web';
  }
  
  if (roleLower.includes('backend') || 
      roleLower.includes('back-end') ||
      roleLower.includes('server')) {
    return 'backend';
  }
  
  if (roleLower.includes('devops') || 
      roleLower.includes('infrastructure') ||
      roleLower.includes('sre')) {
    return 'devops';
  }
  
  if (roleLower.includes('qa') || 
      roleLower.includes('test') ||
      roleLower.includes('quality')) {
    return 'qa';
  }
  
  if (roleLower.includes('ml') || 
      roleLower.includes('machine learning') ||
      roleLower.includes('data scientist')) {
    return 'ml';
  }
  
  if (roleLower.includes('security')) {
    return 'security';
  }
  
  // Full stack can do both web and backend
  if (roleLower.includes('full stack') || roleLower.includes('fullstack')) {
    return 'other'; // They can work on multiple domains
  }
  
  return 'other';
};

// Check if employee domain is compatible with task domain
const isDomainCompatible = (empDomain: string, taskDomain: string): boolean => {
  // Same domain is always compatible
  if (empDomain === taskDomain) return true;
  
  // 'other' (like full-stack) can work on web and backend
  if (empDomain === 'other' && (taskDomain === 'web' || taskDomain === 'backend' || taskDomain === 'other')) return true;
  
  // STRICT INCOMPATIBILITIES:
  // Mobile devs cannot do web frontend
  if (empDomain === 'mobile' && taskDomain === 'web') return false;
  // Web frontend devs cannot do mobile
  if (empDomain === 'web' && taskDomain === 'mobile') return false;
  // Backend devs shouldn't do frontend/mobile UI work
  if (empDomain === 'backend' && (taskDomain === 'web' || taskDomain === 'mobile')) return false;
  
  return true;
};

// Find best replacement employee for a task
const findReplacementEmployee = (
  task: TaskData,
  employees: EmployeeData[],
  excludeIds: string[]
): EmployeeData | null => {
  const taskDomain = getTaskDomain(task.title);
  
  // Filter to employees in the correct domain with good availability
  const candidates = employees.filter(emp => {
    if (excludeIds.includes(emp.id)) return false;
    if (!emp.availability) return false;
    
    const empDomain = getEmployeeDomain(emp);
    
    // Must match the task domain (or be 'other' which can flex)
    if (taskDomain === 'mobile') return empDomain === 'mobile';
    if (taskDomain === 'web') return empDomain === 'web' || empDomain === 'other';
    if (taskDomain === 'backend') return empDomain === 'backend' || empDomain === 'other';
    if (taskDomain === 'devops') return empDomain === 'devops';
    
    return true;
  });
  
  if (candidates.length === 0) return null;
  
  // Sort by availability (less busy first) and efficiency
  candidates.sort((a, b) => {
    const aScore = (1 - a.workload.computed_score) * a.efficiency;
    const bScore = (1 - b.workload.computed_score) * b.efficiency;
    return bScore - aScore;
  });
  
  return candidates[0];
};

// Validate LLM response and fix common issues
const validateAndFixAllocation = (
  response: LLMAllocationResponse,
  employees: EmployeeData[],
  budget: number | null
): LLMAllocationResponse => {
  // If this is an error response, return it as-is with empty arrays
  if (response.error) {
    return {
      ...response,
      tasks: [],
      allocations: [],
      rejections: [],
      timeline: [],
      business_analytics: {
        total_estimated_cost: 0,
        projected_savings: 0,
        savings_percentage: 0,
        time_efficiency_gain: 0,
        risk_assessment: 'N/A',
        roi_estimate: 0
      }
    };
  }
  
  // Ensure all employee IDs are strings
  response.allocations = response.allocations.map(alloc => ({
    ...alloc,
    employee_id: String(alloc.employee_id),
    employee_ids: alloc.employee_ids?.map(id => String(id)) || [String(alloc.employee_id)]
  }));
  
  response.rejections = response.rejections.map(rej => ({
    ...rej,
    employee_id: String(rej.employee_id)
  }));
  
  // 🔧 POST-PROCESSING: Validate and fix domain mismatches
  // This catches cases where the LLM assigns a mobile dev to a web task (or vice versa)
  response.allocations = response.allocations.map(alloc => {
    const task = response.tasks.find(t => t.id === alloc.task_id);
    if (!task) return alloc;
    
    const taskDomain = getTaskDomain(task.title);
    
    // Only validate for clear domain tasks
    if (taskDomain === 'other') return alloc;
    
    // Check each assigned employee
    const validEmployeeIds: string[] = [];
    const invalidEmployeeIds: string[] = [];
    
    const empIds = alloc.employee_ids || [alloc.employee_id];
    empIds.forEach(empId => {
      const emp = employees.find(e => e.id === empId);
      if (!emp) {
        invalidEmployeeIds.push(empId);
        return;
      }
      
      const empDomain = getEmployeeDomain(emp);
      
      // Check for domain mismatch
      let isMismatch = false;
      if (taskDomain === 'mobile' && empDomain === 'web') {
        console.warn(`⚠️ Domain mismatch: ${emp.name} (${emp.role}) assigned to mobile task "${task.title}"`);
        isMismatch = true;
      } else if (taskDomain === 'web' && empDomain === 'mobile') {
        console.warn(`⚠️ Domain mismatch: ${emp.name} (${emp.role}) assigned to web task "${task.title}"`);
        isMismatch = true;
      } else if (taskDomain === 'backend' && (empDomain === 'mobile' || empDomain === 'web')) {
        console.warn(`⚠️ Domain mismatch: ${emp.name} (${emp.role}) assigned to backend task "${task.title}"`);
        isMismatch = true;
      }
      
      if (isMismatch) {
        invalidEmployeeIds.push(empId);
        // Add to rejections with SHORT reason
        response.rejections.push({
          task_id: task.id,
          employee_id: empId,
          rejection_reason: `Wrong domain`
        });
      } else {
        validEmployeeIds.push(empId);
      }
    });
    
    // If we removed some employees, try to find replacements
    if (invalidEmployeeIds.length > 0 && validEmployeeIds.length === 0) {
      const replacement = findReplacementEmployee(
        task,
        employees,
        [...invalidEmployeeIds, ...validEmployeeIds]
      );
      
      if (replacement) {
        console.log(`✅ Found replacement: ${replacement.name} (${replacement.role}) for task "${task.title}"`);
        validEmployeeIds.push(replacement.id);
      }
    }
    
    // Update the allocation
    if (validEmployeeIds.length > 0) {
      return {
        ...alloc,
        employee_id: validEmployeeIds[0],
        employee_ids: validEmployeeIds
      };
    }
    
    // If no valid employees, keep original (better than nothing)
    return alloc;
  });
  
  // Verify budget compliance
  if (budget) {
    let totalCost = 0;
    response.allocations.forEach(alloc => {
      const task = response.tasks.find(t => t.id === alloc.task_id);
      const empIds = alloc.employee_ids || [alloc.employee_id];
      const hoursPerPerson = (task?.estimated_hours || 0) / empIds.length;
      
      empIds.forEach(empId => {
        const emp = employees.find(e => e.id === empId);
        if (emp) {
          totalCost += hoursPerPerson * emp.cost_per_hour;
        }
      });
    });
    
    // Update analytics with accurate cost
    response.business_analytics.total_estimated_cost = Math.round(totalCost);
  }
  
  return response;
};

// Extract potential tech requirements from description
const extractTechFromDescription = (description: string): string[] => {
  const techKeywords = [
    'React', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'Node.js', 'Python',
    'Go', 'Rust', 'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB',
    'Redis', 'GraphQL', 'REST', 'API', 'ML', 'AI', 'Security', 'Testing',
    'CI/CD', 'DevOps', 'Frontend', 'Backend', 'Full Stack', 'Mobile',
    'Authentication', 'Database', 'Cloud', 'Microservices'
  ];

  const found = techKeywords.filter(tech =>
    description.toLowerCase().includes(tech.toLowerCase())
  );

  return found.length > 0 ? found : ['React', 'Node.js', 'TypeScript'];
};

// Auto-generate tech stack based on feature description
const autoGenerateTechStack = (featureName: string, description: string, employees: EmployeeData[]): string[] => {
  const text = `${featureName} ${description}`.toLowerCase();
  const generatedStack: string[] = [];
  
  // Analyze feature keywords and generate appropriate tech stack
  if (text.includes('frontend') || text.includes('ui') || text.includes('interface') || text.includes('dashboard') || text.includes('web')) {
    generatedStack.push('React', 'TypeScript', 'Tailwind CSS');
  }
  if (text.includes('backend') || text.includes('api') || text.includes('server') || text.includes('endpoint')) {
    generatedStack.push('Node.js', 'Express.js', 'PostgreSQL');
  }
  if (text.includes('auth') || text.includes('login') || text.includes('security') || text.includes('user')) {
    generatedStack.push('JWT', 'OAuth 2.0', 'Security');
  }
  if (text.includes('deploy') || text.includes('cloud') || text.includes('infrastructure') || text.includes('devops')) {
    generatedStack.push('AWS', 'Docker', 'CI/CD');
  }
  if (text.includes('mobile') || text.includes('app') || text.includes('ios') || text.includes('android')) {
    generatedStack.push('React Native', 'TypeScript');
  }
  if (text.includes('ml') || text.includes('ai') || text.includes('machine learning') || text.includes('model')) {
    generatedStack.push('Python', 'TensorFlow', 'Machine Learning');
  }
  if (text.includes('test') || text.includes('qa') || text.includes('quality')) {
    generatedStack.push('Jest', 'Cypress', 'Testing');
  }
  if (text.includes('data') || text.includes('database') || text.includes('storage')) {
    generatedStack.push('PostgreSQL', 'Redis');
  }
  if (text.includes('real-time') || text.includes('realtime') || text.includes('websocket') || text.includes('chat')) {
    generatedStack.push('WebSockets', 'Socket.io', 'Redis');
  }

  // If nothing specific found, use general full-stack
  if (generatedStack.length === 0) {
    generatedStack.push('React', 'TypeScript', 'Node.js', 'PostgreSQL');
  }

  // Prefer technologies that team members know - add team's top skills
  const teamSkills = employees
    .filter(e => e.availability)
    .flatMap(e => e.tech_stack)
    .reduce((acc, skill) => {
      acc[skill] = (acc[skill] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const topTeamSkills = Object.entries(teamSkills)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([skill]) => skill);

  // Merge with team skills, removing duplicates
  const finalStack = [...new Set([...generatedStack, ...topTeamSkills])];
  
  return finalStack.slice(0, 6); // Limit to 6 technologies
};

// Find similar technology in the same domain
const findSimilarTech = (requiredSkill: string, employeeSkills: string[]): string | null => {
  const reqLower = requiredSkill.toLowerCase();
  
  // Check for exact match first
  const exactMatch = employeeSkills.find(skill => 
    skill.toLowerCase() === reqLower
  );
  if (exactMatch) return exactMatch;
  
  // Check for partial/fuzzy match (e.g., "Machine Learning" matches "ML")
  const fuzzyMatches: Record<string, string[]> = {
    'machine learning': ['ML', 'AI', 'Data Science', 'TensorFlow', 'PyTorch', 'Scikit-learn'],
    'ml': ['Machine Learning', 'AI', 'Data Science', 'TensorFlow', 'PyTorch', 'Scikit-learn'],
    'ai': ['Machine Learning', 'ML', 'Data Science', 'TensorFlow', 'PyTorch'],
    'tensorflow': ['PyTorch', 'ML', 'Machine Learning', 'Keras', 'Scikit-learn'],
    'pytorch': ['TensorFlow', 'ML', 'Machine Learning', 'Keras', 'Scikit-learn'],
    'react': ['Vue', 'Angular', 'Svelte', 'Frontend', 'JavaScript', 'TypeScript'],
    'node.js': ['Express', 'Backend', 'JavaScript', 'TypeScript', 'NestJS'],
    'python': ['Django', 'Flask', 'FastAPI', 'Data Science', 'ML'],
    'aws': ['Cloud', 'Azure', 'GCP', 'DevOps', 'Terraform', 'Kubernetes'],
    'docker': ['Kubernetes', 'DevOps', 'CI/CD', 'Containerization', 'AWS'],
    'kubernetes': ['Docker', 'DevOps', 'CI/CD', 'AWS', 'Terraform'],
    'ci/cd': ['DevOps', 'Docker', 'Kubernetes', 'Jenkins', 'GitHub Actions'],
    'terraform': ['AWS', 'DevOps', 'Kubernetes', 'Cloud', 'Infrastructure'],
    'security': ['OWASP', 'Penetration Testing', 'OAuth', 'JWT', 'Authentication', 'Encryption'],
    'jwt': ['Security', 'OAuth', 'Authentication', 'OWASP', 'Penetration Testing'],
    'oauth': ['Security', 'JWT', 'Authentication', 'OWASP', 'Penetration Testing'],
    'authentication': ['Security', 'JWT', 'OAuth', 'OWASP'],
    'testing': ['Jest', 'Cypress', 'QA', 'Unit Testing', 'Selenium'],
    'jest': ['Testing', 'Cypress', 'Mocha', 'Unit Testing'],
    'cypress': ['Testing', 'Jest', 'Selenium', 'QA'],
    // REST API - Backend developers should match this
    'rest api': ['Node.js', 'Express', 'Python', 'Django', 'Flask', 'FastAPI', 'Go', 'Java', 'Spring', 'Backend'],
    'api': ['Node.js', 'Express', 'Python', 'Django', 'Flask', 'FastAPI', 'Go', 'REST API', 'GraphQL'],
    'graphql': ['Node.js', 'Express', 'Python', 'Apollo', 'API'],
    'express': ['Node.js', 'JavaScript', 'TypeScript', 'REST API', 'Backend'],
    // Infrastructure
    'infrastructure': ['Terraform', 'AWS', 'DevOps', 'Kubernetes', 'Docker']
  };
  
  // Check fuzzy matches
  const fuzzyAlternatives = fuzzyMatches[reqLower] || [];
  for (const alt of fuzzyAlternatives) {
    const match = employeeSkills.find(skill => 
      skill.toLowerCase() === alt.toLowerCase()
    );
    if (match) return match;
  }
  
  // Find the domain of the required skill
  let skillDomain: string | null = null;
  for (const [domain, techs] of Object.entries(TECH_DOMAINS)) {
    if (techs.some(t => t.toLowerCase() === reqLower || t.toLowerCase().includes(reqLower) || reqLower.includes(t.toLowerCase()))) {
      skillDomain = domain;
      break;
    }
  }
  
  if (!skillDomain) return null;
  
  // Find if employee has any skill in the same domain
  const domainTechs = TECH_DOMAINS[skillDomain];
  return employeeSkills.find(empSkill => 
    domainTechs.some(dt => dt.toLowerCase() === empSkill.toLowerCase())
  ) || null;
};

// Smart fallback allocation when LLM is unavailable
const generateSmartFallbackAllocation = (
  featureName: string,
  details: string,
  employees: EmployeeData[],
  deadlineWeeks: number,
  budget: number | null,
  techStack: string[],
  autoGenerate: boolean,
  priority: "low" | "medium" | "high" = "medium"
): LLMAllocationResponse => {
  const text = `${featureName} ${details}`.toLowerCase();
  const tasks: TaskData[] = [];
  
  // ============================================
  // PROJECT TYPE INFERENCE - Understand context behind requests
  // This maps high-level project concepts to the work they require
  // ============================================
  
  // Chatbot/Conversational AI projects
  const isChatbotProject = text.includes('chatbot') || text.includes('chat bot') || 
    text.includes('conversational') || text.includes('virtual assistant') ||
    text.includes('support bot') || text.includes('customer service bot');
  
  // AI/ML powered projects (these need ML engineers)
  const isAIPowered = text.includes('ai') || text.includes('artificial intelligence') ||
    text.includes('smart') || text.includes('intelligent') || text.includes('automated') ||
    text.includes('recommendation') || text.includes('personalized') ||
    text.includes('predictive') || text.includes('nlp') || text.includes('gpt') ||
    text.includes('llm') || text.includes('language model');
  
  // E-commerce projects
  const isEcommerceProject = text.includes('ecommerce') || text.includes('e-commerce') ||
    text.includes('shop') || text.includes('store') || text.includes('cart') ||
    text.includes('checkout') || text.includes('payment') || text.includes('product catalog') ||
    text.includes('marketplace');
  
  // Social/Community projects
  const isSocialProject = text.includes('social') || text.includes('community') ||
    text.includes('forum') || text.includes('feed') || text.includes('post') ||
    text.includes('comment') || text.includes('like') || text.includes('share') ||
    text.includes('profile') || text.includes('follow') || text.includes('messaging');
  
  // Dashboard/Analytics projects
  const isDashboardProject = text.includes('dashboard') || text.includes('analytics') ||
    text.includes('reporting') || text.includes('metrics') || text.includes('visualization') ||
    text.includes('charts') || text.includes('graphs') || text.includes('insights');
  
  // Content Management projects
  const isCMSProject = text.includes('cms') || text.includes('content management') ||
    text.includes('blog') || text.includes('article') || text.includes('editor') ||
    text.includes('publishing') || text.includes('media library');
  
  // Booking/Scheduling projects
  const isBookingProject = text.includes('booking') || text.includes('reservation') ||
    text.includes('appointment') || text.includes('scheduling') || text.includes('calendar') ||
    text.includes('availability');
  
  // Real-time/Live features
  const isRealtimeProject = text.includes('real-time') || text.includes('realtime') ||
    text.includes('live') || text.includes('streaming') || text.includes('websocket') ||
    text.includes('notification') || text.includes('push') || text.includes('instant');
  
  // Search functionality
  const isSearchProject = text.includes('search') || text.includes('filter') ||
    text.includes('query') || text.includes('lookup') || text.includes('find');
  
  // File/Document management
  const isFileProject = text.includes('file') || text.includes('upload') ||
    text.includes('download') || text.includes('document') || text.includes('attachment') ||
    text.includes('storage') || text.includes('media');
  
  // Map inferred project types to required work
  const inferredNeeds = {
    needsUI: false,
    needsBackend: false,
    needsAuth: false,
    needsML: false,
    needsDevOps: false,
    needsMobile: false,
    needsSecurity: false,
    needsTesting: false
  };
  
  // Apply project-type inference rules
  if (isChatbotProject) {
    console.log(`🤖 Detected CHATBOT project - requires UI + Backend + WebSockets`);
    inferredNeeds.needsUI = true;      // Chat interface
    inferredNeeds.needsBackend = true; // Message handling, conversation state
    if (isAIPowered) {
      console.log(`   🧠 AI-powered chatbot - also needs ML/AI engineer`);
      inferredNeeds.needsML = true;    // NLP, intent recognition, response generation
    }
  }
  
  if (isEcommerceProject) {
    console.log(`🛒 Detected E-COMMERCE project - requires UI + Backend + Auth + Security`);
    inferredNeeds.needsUI = true;       // Product pages, cart, checkout UI
    inferredNeeds.needsBackend = true;  // Inventory, orders, payments API
    inferredNeeds.needsAuth = true;     // User accounts
    inferredNeeds.needsSecurity = true; // Payment security, PCI compliance
  }
  
  if (isSocialProject) {
    console.log(`👥 Detected SOCIAL project - requires UI + Backend + Auth`);
    inferredNeeds.needsUI = true;      // Feed, profiles, posts
    inferredNeeds.needsBackend = true; // Social graph, feeds, notifications
    inferredNeeds.needsAuth = true;    // User accounts, permissions
  }
  
  if (isDashboardProject) {
    console.log(`📊 Detected DASHBOARD project - requires UI + Backend`);
    inferredNeeds.needsUI = true;      // Charts, visualizations
    inferredNeeds.needsBackend = true; // Data aggregation, APIs
    if (isAIPowered) {
      inferredNeeds.needsML = true;    // Predictive analytics
    }
  }
  
  if (isCMSProject) {
    console.log(`📝 Detected CMS project - requires UI + Backend + Auth`);
    inferredNeeds.needsUI = true;      // Editor, content display
    inferredNeeds.needsBackend = true; // Content storage, versioning
    inferredNeeds.needsAuth = true;    // Author roles, permissions
  }
  
  if (isBookingProject) {
    console.log(`📅 Detected BOOKING project - requires UI + Backend + Auth`);
    inferredNeeds.needsUI = true;      // Calendar, booking forms
    inferredNeeds.needsBackend = true; // Availability, reservations
    inferredNeeds.needsAuth = true;    // User accounts
  }
  
  if (isRealtimeProject) {
    console.log(`⚡ Detected REALTIME project - requires Backend + DevOps`);
    inferredNeeds.needsBackend = true; // WebSocket server, event handling
    inferredNeeds.needsDevOps = true;  // Scalable infrastructure
  }
  
  if (isSearchProject) {
    console.log(`🔍 Detected SEARCH feature - requires Backend`);
    inferredNeeds.needsBackend = true; // Search indexing, query handling
    if (isAIPowered) {
      inferredNeeds.needsML = true;    // Semantic search, relevance
    }
  }
  
  if (isFileProject) {
    console.log(`📁 Detected FILE management - requires UI + Backend + Security`);
    inferredNeeds.needsUI = true;       // Upload interface, file browser
    inferredNeeds.needsBackend = true;  // Storage, file processing
    inferredNeeds.needsSecurity = true; // Access control, virus scanning
  }
  
  // Standalone AI projects
  if (isAIPowered && !isChatbotProject && !isDashboardProject && !isSearchProject) {
    console.log(`🧠 Detected AI/ML project - requires ML engineer`);
    inferredNeeds.needsML = true;
    inferredNeeds.needsBackend = true; // ML model serving
  }
  
  // ============================================
  // SCOPE & COMPLEXITY ANALYSIS
  // ============================================
  // Detect scope modifiers that affect time estimates
  const scopeMultiplier = (() => {
    let multiplier = 1.0;
    
    // Large scope indicators (2-4x time)
    if (text.includes('full') || text.includes('complete') || text.includes('entire') || 
        text.includes('whole') || text.includes('comprehensive')) multiplier *= 2.5;
    if (text.includes('makeover') || text.includes('overhaul') || text.includes('redesign') || 
        text.includes('rebuild') || text.includes('rewrite') || text.includes('revamp')) multiplier *= 2.0;
    if (text.includes('major') || text.includes('big') || text.includes('large') || 
        text.includes('significant') || text.includes('extensive')) multiplier *= 1.8;
    if (text.includes('all') || text.includes('every') || text.includes('across')) multiplier *= 1.5;
    
    // Medium scope indicators (1.3-1.5x time)
    if (text.includes('new') || text.includes('create') || text.includes('build')) multiplier *= 1.3;
    if (text.includes('multiple') || text.includes('several') || text.includes('various')) multiplier *= 1.4;
    if (text.includes('integration') || text.includes('integrate')) multiplier *= 1.3;
    
    // Small scope indicators (0.5-0.8x time)
    if (text.includes('small') || text.includes('minor') || text.includes('quick') || 
        text.includes('simple') || text.includes('basic')) multiplier *= 0.5;
    if (text.includes('fix') || text.includes('patch') || text.includes('tweak') || 
        text.includes('adjust')) multiplier *= 0.6;
    if (text.includes('single') || text.includes('one') || text.includes('only')) multiplier *= 0.7;
    
    // Cap the multiplier to reasonable bounds
    return Math.max(0.5, Math.min(4.0, multiplier));
  })();
  
  console.log(`Scope analysis for "${featureName}": multiplier = ${scopeMultiplier.toFixed(2)}x`);
  
  // ============================================
  // FEATURE TYPE DETECTION (explicit keywords)
  // Combined with inferredNeeds from project type inference above
  // ============================================
  const isUIRelated = inferredNeeds.needsUI || text.includes('ui') || text.includes('interface') || text.includes('design') || 
    text.includes('frontend') || text.includes('component') || text.includes('layout') || 
    text.includes('style') || text.includes('css') || text.includes('visual') || text.includes('button') ||
    text.includes('form') || text.includes('page') || text.includes('screen') || text.includes('responsive') ||
    text.includes('ux') || text.includes('user experience') || text.includes('dashboard') ||
    text.includes('makeover') || text.includes('theme') || text.includes('look');
    
  const isBackendRelated = inferredNeeds.needsBackend || text.includes('api') || text.includes('backend') || text.includes('server') || 
    text.includes('database') || text.includes('endpoint') || text.includes('rest') || text.includes('graphql') ||
    text.includes('crud') || text.includes('microservice') || text.includes('service');
    
  const isAuthRelated = inferredNeeds.needsAuth || text.includes('auth') || text.includes('login') || text.includes('signup') || 
    text.includes('password') || text.includes('session') || text.includes('oauth') || text.includes('jwt') ||
    text.includes('permission') || text.includes('role') || text.includes('access');
    
  const isMLRelated = inferredNeeds.needsML || text.includes('ml') || text.includes('machine learning') || 
    text.includes('model') || text.includes('prediction') || text.includes('neural') || text.includes('training') ||
    text.includes('deep learning') || text.includes('nlp') || text.includes('computer vision');
    
  const isDevOpsRelated = inferredNeeds.needsDevOps || text.includes('deploy') || text.includes('devops') || text.includes('ci/cd') || 
    text.includes('pipeline') || text.includes('kubernetes') || text.includes('docker') || text.includes('aws') ||
    text.includes('infrastructure') || text.includes('cloud');
    
  const isTestingRelated = inferredNeeds.needsTesting || text.includes('test') || text.includes('qa') || text.includes('quality') || 
    text.includes('bug') || text.includes('debug');
    
  const isMobileRelated = inferredNeeds.needsMobile || text.includes('mobile') || text.includes('ios') || 
    text.includes('android') || text.includes('react native') || text.includes('flutter');
    
  const isSecurityRelated = inferredNeeds.needsSecurity || text.includes('security') || text.includes('vulnerability') || text.includes('encrypt') ||
    text.includes('ssl') || text.includes('https') || text.includes('penetration');
  
  // NOTE: "fix" removed from testing - it's too generic and applies to many domains

  // ============================================
  // BASE HOUR ESTIMATES (before scope multiplier)
  // ============================================
  const baseHours = {
    design: 24,           // UI/UX Design base: 24h (3 days)
    frontend: 40,         // Frontend implementation base: 40h (1 week)
    backend: 48,          // Backend API base: 48h (6 days)
    auth: 32,             // Authentication: 32h (4 days)
    ml: 80,               // ML/AI: 80h (2 weeks)
    devops: 24,           // DevOps: 24h (3 days)
    mobile: 56,           // Mobile: 56h (7 days)
    security: 32,         // Security: 32h (4 days)
    testing: 24,          // Testing: 24h (3 days)
    generic: 32           // Generic task: 32h (4 days)
  };
  
  // Apply scope multiplier and deadline factor
  const getEstimatedHours = (baseType: keyof typeof baseHours): number => {
    const base = baseHours[baseType];
    const withScope = base * scopeMultiplier;
    const deadlineFactor = Math.max(0.8, deadlineWeeks / 4); // Scale with deadline
    return Math.round(withScope * deadlineFactor);
  };
  
  // ============================================
  // TASK GENERATION - ADDITIVE APPROACH
  // Each detected type adds its own tasks - supports "UI and QA" style requests
  // ============================================
  
  // Helper to get next task ID
  const getNextTaskId = () => `t${tasks.length + 1}`;
  
  // Track what we've detected for logging
  const detectedTypes: string[] = [];
  
  // UI/FRONTEND tasks
  if (isUIRelated) {
    detectedTypes.push('UI/Frontend');
    tasks.push({
      id: getNextTaskId(),
      title: 'UI/UX Design',
      description: `Design user interface mockups and prototypes for ${featureName}`,
      required_skills: ['Figma', 'UI/UX', 'Prototyping'],
      estimated_hours: getEstimatedHours('design'),
      priority: 'high',
      deadline_weeks: Math.ceil(deadlineWeeks * 0.3)
    });
    tasks.push({
      id: getNextTaskId(),
      title: 'Frontend Implementation',
      description: `Build React components and implement UI for ${featureName}`,
      required_skills: ['React', 'TypeScript', 'CSS'],
      estimated_hours: getEstimatedHours('frontend'),
      priority: 'high',
      deadline_weeks: Math.ceil(deadlineWeeks * 0.7)
    });
  }
  
  // QA/TESTING tasks - ALWAYS add if detected, regardless of other types
  if (isTestingRelated) {
    detectedTypes.push('QA/Testing');
    tasks.push({
      id: getNextTaskId(),
      title: 'QA Testing',
      description: `Plan and execute testing for ${featureName}`,
      required_skills: ['Testing', 'Jest', 'Cypress', 'QA'],
      estimated_hours: getEstimatedHours('testing'),
      priority: 'high',
      deadline_weeks: Math.ceil(deadlineWeeks * 0.8)
    });
  }
  
  // BACKEND tasks
  if (isBackendRelated) {
    detectedTypes.push('Backend');
    tasks.push({
      id: getNextTaskId(),
      title: 'Backend API Development',
      description: `Create API endpoints and business logic for ${featureName}`,
      required_skills: ['Node.js', 'PostgreSQL', 'REST API'],
      estimated_hours: getEstimatedHours('backend'),
      priority: 'high',
      deadline_weeks: Math.ceil(deadlineWeeks * 0.6)
    });
  }
  
  // AUTH tasks
  if (isAuthRelated) {
    detectedTypes.push('Auth');
    tasks.push({
      id: getNextTaskId(),
      title: 'Authentication System',
      description: `Implement secure authentication for ${featureName}`,
      required_skills: ['Security', 'JWT', 'OAuth'],
      estimated_hours: getEstimatedHours('auth'),
      priority: 'high',
      deadline_weeks: Math.ceil(deadlineWeeks * 0.5)
    });
  }
  
  // ML/AI tasks
  if (isMLRelated) {
    detectedTypes.push('ML/AI');
    tasks.push({
      id: getNextTaskId(),
      title: 'ML Model Development',
      description: `Develop and train ML models for ${featureName}`,
      required_skills: ['Python', 'TensorFlow', 'ML'],
      estimated_hours: getEstimatedHours('ml'),
      priority: 'high',
      deadline_weeks: Math.ceil(deadlineWeeks * 0.8)
    });
  }
  
  // DEVOPS tasks
  if (isDevOpsRelated) {
    detectedTypes.push('DevOps');
    tasks.push({
      id: getNextTaskId(),
      title: 'DevOps & Deployment',
      description: `Set up CI/CD and infrastructure for ${featureName}`,
      required_skills: ['AWS', 'Docker', 'CI/CD'],
      estimated_hours: getEstimatedHours('devops'),
      priority: 'medium',
      deadline_weeks: Math.ceil(deadlineWeeks * 0.4)
    });
  }
  
  // MOBILE tasks
  if (isMobileRelated) {
    detectedTypes.push('Mobile');
    tasks.push({
      id: getNextTaskId(),
      title: 'Mobile App Development',
      description: `Develop mobile application for ${featureName}`,
      required_skills: ['React Native', 'TypeScript', 'Mobile'],
      estimated_hours: getEstimatedHours('mobile'),
      priority: 'high',
      deadline_weeks: Math.ceil(deadlineWeeks * 0.7)
    });
  }
  
  // SECURITY tasks
  if (isSecurityRelated) {
    detectedTypes.push('Security');
    tasks.push({
      id: getNextTaskId(),
      title: 'Security Implementation',
      description: `Implement security measures for ${featureName}`,
      required_skills: ['Security', 'OWASP', 'Penetration Testing'],
      estimated_hours: getEstimatedHours('security'),
      priority: 'high',
      deadline_weeks: Math.ceil(deadlineWeeks * 0.5)
    });
  }
  
  console.log(`📋 Detected types for "${featureName}": [${detectedTypes.join(', ')}] → ${tasks.length} tasks`);

  // If no specific type detected, return an ERROR instead of guessing
  if (tasks.length === 0) {
    console.log(`Unable to determine task type for: "${featureName}"`);
    return {
      error: {
        type: "invalid_task",
        message: `Could not determine what kind of development work "${featureName}" requires`,
        suggestion: "Please be more specific. Try: 'user authentication system', 'QA testing for checkout', 'mobile app dashboard', 'API for user management'"
      },
      tasks: [],
      allocations: [],
      rejections: [],
      timeline: [],
      business_analytics: {
        total_estimated_cost: 0,
        projected_savings: 0,
        savings_percentage: 0,
        time_efficiency_gain: 0,
        risk_assessment: 'N/A',
        roi_estimate: 0
      }
    };
  }

  // SMART MATCHING ALGORITHM - DOMAIN FIRST, THEN SKILL MATCH
  // Step 1: Filter by domain compatibility (mobile devs can't do web tasks)
  // Step 2: Filter by minimum skill threshold
  // Step 3: Score remaining candidates
  const allocations: LLMAllocationResponse['allocations'] = [];
  const rejections: LLMAllocationResponse['rejections'] = [];
  let runningCost = 0;

  // MINIMUM skill threshold - employees below this are NOT considered
  const MIN_SKILL_MATCH_RATIO = 0.3; // Must match at least 30% of required skills

  tasks.forEach(task => {
    const taskDomain = getTaskDomain(task.title);
    console.log(`\n🔍 Task: "${task.title}" | Domain: ${taskDomain} | Needs: [${task.required_skills.join(', ')}]`);
    
    // Score all available employees for this task
    const scoreCandidates = (emps: EmployeeData[]) => emps
      .filter(emp => emp.availability)
      .map(emp => {
        const empDomain = getEmployeeDomain(emp);
        const domainCompatible = isDomainCompatible(empDomain, taskDomain);
        
        // Calculate EXACT skill matches first
        let exactMatches = 0;
        let similarMatches = 0;
        const matchedSkills: string[] = [];
        const missingSkills: string[] = [];
        
        task.required_skills.forEach(reqSkill => {
          // Check for exact match first (case-insensitive)
          const exactMatch = emp.tech_stack.some(
            skill => skill.toLowerCase() === reqSkill.toLowerCase()
          );
          
          if (exactMatch) {
            exactMatches++;
            matchedSkills.push(reqSkill);
          } else {
            // Check for similar technology
            const similarMatch = findSimilarTech(reqSkill, emp.tech_stack);
            if (similarMatch) {
              similarMatches++;
              matchedSkills.push(`${similarMatch}≈${reqSkill}`);
            } else {
              missingSkills.push(reqSkill);
            }
          }
        });
        
        // Skill match ratio (exact matches count more than similar)
        const totalRequired = task.required_skills.length;
        const skillMatchRatio = totalRequired > 0 
          ? (exactMatches + similarMatches * 0.7) / totalRequired 
          : 0;
        
        // Available capacity (0 = fully loaded, 1 = completely free)
        const availableCapacity = 1 - emp.workload.computed_score;
        
        // Experience score (normalize to 0-1)
        const experienceScore = Math.min((emp.experience || 5) / 15, 1);
        
        // ================================================
        // SCORING ALGORITHM:
        // 1. DOMAIN COMPATIBILITY is a HARD FILTER - incompatible = disqualified
        // 2. SKILL MATCH is the PRIMARY factor
        // 3. Among qualified candidates, balance availability + experience
        // ================================================
        
        // Domain incompatibility is an AUTOMATIC disqualification
        // Skill match below minimum is also disqualification
        const isQualified = domainCompatible && skillMatchRatio >= MIN_SKILL_MATCH_RATIO;
        
        // ================================================
        // ROLE MATCH BONUS
        // If employee's ROLE directly matches the task domain, give bonus
        // E.g., "Backend Lead" for "Backend API" task, "DevOps Engineer" for "DevOps" task
        // ================================================
        const roleMatchBonus = (() => {
          const roleLower = emp.role.toLowerCase();
          const titleLower = task.title.toLowerCase();
          
          // Perfect role match (role contains key task words)
          if (titleLower.includes('backend') && (roleLower.includes('backend') || roleLower.includes('back-end'))) return 0.15;
          if (titleLower.includes('frontend') && (roleLower.includes('frontend') || roleLower.includes('front-end') || roleLower.includes('ui'))) return 0.15;
          if (titleLower.includes('devops') && roleLower.includes('devops')) return 0.15;
          if (titleLower.includes('deploy') && roleLower.includes('devops')) return 0.15;
          if (titleLower.includes('qa') && (roleLower.includes('qa') || roleLower.includes('test'))) return 0.15;
          if (titleLower.includes('test') && (roleLower.includes('qa') || roleLower.includes('test'))) return 0.15;
          if (titleLower.includes('ml') && (roleLower.includes('ml') || roleLower.includes('data') || roleLower.includes('ai'))) return 0.15;
          if (titleLower.includes('security') && roleLower.includes('security')) return 0.15;
          if (titleLower.includes('mobile') && (roleLower.includes('mobile') || roleLower.includes('ios') || roleLower.includes('android'))) return 0.15;
          if (titleLower.includes('ui') && (roleLower.includes('ui') || roleLower.includes('designer'))) return 0.15;
          
          // Exact domain match bonus (smaller)
          if (empDomain === taskDomain && taskDomain !== 'other') return 0.08;
          
          return 0;
        })();
        
        // Calculate composite score (only meaningful for qualified candidates)
        // Now includes role match bonus!
        const score = isQualified 
          ? (skillMatchRatio * 0.40) + 
            (roleMatchBonus) +             // NEW: Role match bonus (up to 0.15)
            (availableCapacity * 0.25) + 
            (experienceScore * 0.12) + 
            (emp.efficiency * 0.08)
          : 0; // Unqualified = zero score
        
        console.log(`  ${emp.name} [${empDomain}]: domain=${domainCompatible ? '✓' : '✗'}, skills=${matchedSkills.length}/${totalRequired}, role_bonus=${roleMatchBonus.toFixed(2)}, qualified=${isQualified}`);
        
        return {
          employee: emp,
          empDomain,
          domainCompatible,
          score,
          skillMatchRatio,
          exactMatches,
          similarMatches,
          availableCapacity,
          matchedSkills,
          missingSkills,
          experienceScore,
          roleMatchBonus,  // NEW: Track role bonus
          isQualified
        };
      })
      // Sort by: qualified first, then by score
      .sort((a, b) => {
        // Qualified candidates ALWAYS come before unqualified
        if (a.isQualified && !b.isQualified) return -1;
        if (!a.isQualified && b.isQualified) return 1;
        // Among same qualification level, sort by score
        return b.score - a.score;
      });

    const candidates = scoreCandidates(employees);
    
    // Log top candidates
    console.log(`  📊 Top candidates: ${candidates.slice(0, 5).map(c => `${c.employee.name}(${c.isQualified ? '✓' : '✗'}${Math.round(c.skillMatchRatio*100)}%)`).join(', ')}`);

    // Determine team size needed
    const hoursPerWeek = 30;
    const availableHoursPerPerson = hoursPerWeek * task.deadline_weeks;
    let peopleNeeded = Math.ceil(task.estimated_hours / availableHoursPerPerson);
    peopleNeeded = Math.min(Math.max(peopleNeeded, 1), 3);
    
    const assignedToTask: string[] = [];
    const assignmentDetails: { id: string; name: string; capacity: number; skills: string[]; experience: number }[] = [];
    const skippedForCapacity: typeof candidates = [];
    
    // Track who we've already rejected to avoid duplicates
    const rejectedIds = new Set<string>();

    // ============================================
    // ASSIGNMENT PASS: Only consider QUALIFIED candidates
    // Unqualified candidates are NOT rejected here - they should be grayed out
    // ============================================
    for (const candidate of candidates) {
      if (assignedToTask.length >= peopleNeeded) break;
      
      // Skip unqualified candidates - they get grayed out, not rejected
      // Only add to rejections if they're ALMOST qualified (close miss)
      if (!candidate.isQualified) {
        // Only show rejection for domain mismatch or near-miss skill gaps
        if (!candidate.domainCompatible && !rejectedIds.has(candidate.employee.id)) {
          rejections.push({
            task_id: task.id,
            employee_id: candidate.employee.id,
            rejection_reason: `Wrong domain`
          });
          rejectedIds.add(candidate.employee.id);
        }
        continue;
      }
      
      // Check budget
      const hoursPerPerson = task.estimated_hours / (assignedToTask.length + 1);
      const additionalCost = hoursPerPerson * candidate.employee.cost_per_hour;
      
      if (budget !== null && (runningCost + additionalCost) > budget) {
        if (!rejectedIds.has(candidate.employee.id)) {
          rejections.push({
            task_id: task.id,
            employee_id: candidate.employee.id,
            rejection_reason: `Over budget`
          });
          rejectedIds.add(candidate.employee.id);
        }
        continue;
      }
      
      // Check capacity - employees with up to 75% workload can still take tasks
      // BUT: Specialists with high role bonus get MORE LENIENT capacity threshold
      // (e.g., the only DevOps engineer should still be assigned to DevOps tasks even if busy)
      const baseMaxWorkloadAllowed = 0.75;
      const roleBonusLeniency = (candidate.roleMatchBonus >= 0.15) ? 0.15 : 0; // Allow 90% workload for perfect role matches
      const maxWorkloadAllowed = Math.min(baseMaxWorkloadAllowed + roleBonusLeniency, 0.90);
      
      if (candidate.availableCapacity < (1 - maxWorkloadAllowed)) {
        skippedForCapacity.push(candidate);
        continue;
      }
      
      // Check stress - also more lenient for perfect role matches
      const stressThreshold = (candidate.roleMatchBonus >= 0.15) ? 0.75 : 0.65;
      if (candidate.employee.stress > stressThreshold) {
        if (!rejectedIds.has(candidate.employee.id)) {
          rejections.push({
            task_id: task.id,
            employee_id: candidate.employee.id,
            rejection_reason: `High stress`
          });
          rejectedIds.add(candidate.employee.id);
        }
        continue;
      }
      
      // ✅ Assign this employee
      assignedToTask.push(candidate.employee.id);
      assignmentDetails.push({
        id: candidate.employee.id,
        name: candidate.employee.name,
        capacity: Math.round(candidate.availableCapacity * 100),
        skills: candidate.matchedSkills,
        experience: candidate.experienceScore
      });
      runningCost += additionalCost;
      console.log(`  ✅ Assigned: ${candidate.employee.name} (${candidate.matchedSkills.length} skills, ${Math.round(candidate.availableCapacity*100)}% free)`);
    }
    
    // ============================================
    // FALLBACK: If no qualified candidates with good capacity, try busy qualified ones
    // ============================================
    if (assignedToTask.length < peopleNeeded && skippedForCapacity.length > 0) {
      console.log(`  ⚠️ Need fallback - checking busy but qualified candidates`);
      
      for (const candidate of skippedForCapacity) {
        if (assignedToTask.length >= peopleNeeded) break;
        
        // Must have at least 10% capacity
        if (candidate.availableCapacity < 0.10) {
          if (!rejectedIds.has(candidate.employee.id)) {
            rejections.push({
              task_id: task.id,
              employee_id: candidate.employee.id,
              rejection_reason: `Fully booked`
            });
            rejectedIds.add(candidate.employee.id);
          }
          continue;
        }
        
        // Budget check
        const hoursPerPerson = task.estimated_hours / (assignedToTask.length + 1);
        const additionalCost = hoursPerPerson * candidate.employee.cost_per_hour;
        
        if (budget !== null && (runningCost + additionalCost) > budget) {
          continue;
        }
        
        // Assign as fallback
        assignedToTask.push(candidate.employee.id);
        assignmentDetails.push({
          id: candidate.employee.id,
          name: candidate.employee.name,
          capacity: Math.round(candidate.availableCapacity * 100),
          skills: candidate.matchedSkills,
          experience: candidate.experienceScore
        });
        runningCost += additionalCost;
        console.log(`  ⚠️ Fallback assigned: ${candidate.employee.name}`);
      }
    }
    
    // Add SHORT rejections for capacity-skipped candidates (qualified but busy)
    skippedForCapacity
      .filter(c => !assignedToTask.includes(c.employee.id))
      .forEach(candidate => {
        if (!rejectedIds.has(candidate.employee.id)) {
          const workload = Math.round((1-candidate.availableCapacity)*100);
          rejections.push({
            task_id: task.id,
            employee_id: candidate.employee.id,
            rejection_reason: `${workload}% workload`
          });
          rejectedIds.add(candidate.employee.id);
        }
      });
    
    // Add SHORT rejections for other qualified candidates not selected
    // (These are candidates who were qualified but beaten by better matches)
    candidates
      .filter(c => c.isQualified && !assignedToTask.includes(c.employee.id) && !skippedForCapacity.includes(c))
      .slice(0, 3)
      .forEach(candidate => {
        if (!rejectedIds.has(candidate.employee.id)) {
          // Keep reasons SHORT - 2-3 words max
          let reason = 'Better match found';
          
          if (candidate.employee.stress > 0.6) {
            reason = 'High stress';
          } else if (candidate.skillMatchRatio < 0.5) {
            reason = 'Partial skills';
          }
          
          rejections.push({
            task_id: task.id,
            employee_id: candidate.employee.id,
            rejection_reason: reason
          });
          rejectedIds.add(candidate.employee.id);
        }
      });

    // Create allocation with detailed reasoning
    if (assignedToTask.length > 0) {
      const primaryAssignee = assignmentDetails[0];
      let reasoning = '';
      
      if (assignedToTask.length === 1) {
        reasoning = `${primaryAssignee.name} selected: ${primaryAssignee.capacity}% available capacity, ${Math.round((primaryAssignee.experience || 0.5) * 100)}% experience level, strong match for ${primaryAssignee.skills.join(', ')}`;
      } else {
        reasoning = `Team assigned: ${assignmentDetails.map(d => `${d.name} (${d.capacity}% avail, ${d.skills[0]})`).join(' + ')}`;
      }
      
      allocations.push({
        task_id: task.id,
        employee_id: assignedToTask[0],
        employee_ids: assignedToTask,
        reasoning: reasoning,
        confidence: candidates[0]?.score || 0.7,
        estimated_completion_hours: Math.round(task.estimated_hours / (assignedToTask.length * (candidates[0]?.employee.efficiency || 0.85))),
        risk_factors: assignedToTask.length > 2 ? ['Large team coordination needed'] : 
                     candidates[0]?.availableCapacity < 0.4 ? ['Primary assignee has limited capacity'] : []
      });
    }
  });

  // Calculate actual total cost
  const totalCost = allocations.reduce((sum, alloc) => {
    const task = tasks.find(t => t.id === alloc.task_id);
    if (!task) return sum;
    
    const empIds = alloc.employee_ids || [alloc.employee_id];
    const hoursPerPerson = task.estimated_hours / empIds.length;
    
    return sum + empIds.reduce((empSum, empId) => {
      const emp = employees.find(e => e.id === empId);
      return empSum + (emp ? hoursPerPerson * emp.cost_per_hour : 0);
    }, 0);
  }, 0);

  // Calculate savings (vs hiring at market rate ~$150/hr)
  const totalHours = tasks.reduce((sum, t) => sum + t.estimated_hours, 0);
  const marketCost = totalHours * 150;
  const savings = marketCost - totalCost;

  return {
    tasks,
    allocations,
    rejections,
    timeline: generateTimeline(tasks, deadlineWeeks),
    business_analytics: {
      total_estimated_cost: Math.round(totalCost),
      projected_savings: Math.round(savings),
      savings_percentage: Math.round((savings / marketCost) * 100),
      time_efficiency_gain: Math.round(15 + (allocations.filter(a => (a.employee_ids?.length || 1) > 1).length * 5)),
      risk_assessment: calculateRiskAssessment(allocations, employees, tasks),
      roi_estimate: Number((savings / totalCost).toFixed(1)) || 1.5
    }
  };
};

// Generate a realistic timeline
const generateTimeline = (tasks: TaskData[], deadlineWeeks: number): LLMAllocationResponse['timeline'] => {
  const timeline: LLMAllocationResponse['timeline'] = [];
  
  for (let week = 1; week <= deadlineWeeks; week++) {
    const tasksInProgress = tasks
      .filter(t => t.deadline_weeks >= week && (week <= Math.ceil(t.deadline_weeks * 0.8)))
      .map(t => t.id);
    
    const milestones: string[] = [];
    if (week === 1) milestones.push('Project kickoff', 'Initial setup');
    if (week === Math.ceil(deadlineWeeks * 0.5)) milestones.push('Mid-project review');
    if (week === deadlineWeeks) milestones.push('Final delivery', 'Deployment');
    
    timeline.push({ week, tasks_in_progress: tasksInProgress, milestones });
  }
  
  return timeline;
};

// Calculate risk assessment string
const calculateRiskAssessment = (
  allocations: LLMAllocationResponse['allocations'],
  employees: EmployeeData[],
  tasks: TaskData[]
): string => {
  const risks: string[] = [];
  let riskLevel = 'Low';
  
  // Check for unassigned tasks
  const unassignedTasks = tasks.filter(t => !allocations.find(a => a.task_id === t.id));
  if (unassignedTasks.length > 0) {
    risks.push(`${unassignedTasks.length} task(s) unassigned`);
    riskLevel = 'High';
  }
  
  // Check for overloaded employees
  const assignedIds = new Set(allocations.flatMap(a => a.employee_ids || [a.employee_id]));
  const overloadedCount = [...assignedIds].filter(id => {
    const emp = employees.find(e => e.id === id);
    return emp && emp.workload.computed_score > 0.7;
  }).length;
  
  if (overloadedCount > 0) {
    risks.push(`${overloadedCount} team member(s) with high workload`);
    if (riskLevel !== 'High') riskLevel = 'Medium';
  }
  
  // Check for tight deadlines
  const tightDeadlines = tasks.filter(t => {
    const hoursNeeded = t.estimated_hours;
    const hoursAvailable = t.deadline_weeks * 35;
    return hoursNeeded > hoursAvailable * 0.8;
  });
  
  if (tightDeadlines.length > 0) {
    risks.push(`${tightDeadlines.length} task(s) with tight deadlines`);
    if (riskLevel !== 'High') riskLevel = 'Medium';
  }
  
  if (risks.length === 0) {
    return 'Low risk - balanced workload and adequate timeline';
  }
  
  return `${riskLevel} risk: ${risks.join(', ')}`;
};

// Keep the old function name for backward compatibility but use the smart version
const generateFallbackAllocation = generateSmartFallbackAllocation;

// Storage key for API key
const API_KEY_STORAGE = 'featherless_api_key';

export const saveApiKey = (key: string): void => {
  localStorage.setItem(API_KEY_STORAGE, key);
};

export const getApiKey = (): string | null => {
  return localStorage.getItem(API_KEY_STORAGE);
};

export const clearApiKey = (): void => {
  localStorage.removeItem(API_KEY_STORAGE);
};
