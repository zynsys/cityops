import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { v5 as uuidv5 } from 'uuid';
import bcrypt from 'bcryptjs';

// ---------------------------------------------------------------------------
// Prisma client
// ---------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Deterministic UUID helper
// ---------------------------------------------------------------------------

const NAMESPACE = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

function id(name: string): string {
  return uuidv5(name, NAMESPACE);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PASSWORD = 'Password123!';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 10);

// ---------------------------------------------------------------------------
// 1. Platform Roles
// ---------------------------------------------------------------------------

const PLATFORM_ROLES = [
  { name: 'citizen', description: 'Reports reports, tracks progress, earns rewards' },
  { name: 'authority_user', description: 'Reviews, manages, and resolves reports' },
  { name: 'tenant_admin', description: 'Configures tenant settings, manages local users' },
  { name: 'platform_admin', description: 'Manages tenants and platform-wide operations' },
];

async function seedRoles() {
  console.log('Seeding platform roles...');
  for (const role of PLATFORM_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { id: id(`role:${role.name}`), ...role },
    });
    console.log(`  Role "${role.name}" seeded`);
  }
}

// ---------------------------------------------------------------------------
// 2. Tenants
// ---------------------------------------------------------------------------

const TENANTS = [
  { slug: 'platform', name: 'CityOps Platform', status: 'active' as const },
  { slug: 'hackney', name: 'London Borough of Hackney', status: 'active' as const },
  { slug: 'manchester', name: 'Manchester City Council', status: 'active' as const },
  { slug: 'glasgow', name: 'Glasgow City Council', status: 'active' as const },
  { slug: 'bournemouth', name: 'BCP Council', status: 'active' as const },
];

async function seedTenants() {
  console.log('Seeding tenants...');
  for (const t of TENANTS) {
    await prisma.tenant.upsert({
      where: { slug: t.slug },
      update: { name: t.name, status: t.status },
      create: { id: id(`tenant:${t.slug}`), ...t },
    });
    console.log(`  Tenant "${t.name}" seeded`);
  }
}

// ---------------------------------------------------------------------------
// 3. Tenant Configs
// ---------------------------------------------------------------------------

const TENANT_BRANDING: Record<string, { primaryColor: string; logoUrl: string }> = {
  hackney: { primaryColor: '#00857C', logoUrl: '/branding/hackney-logo.svg' },
  manchester: { primaryColor: '#E03C31', logoUrl: '/branding/manchester-logo.svg' },
  glasgow: { primaryColor: '#005EB8', logoUrl: '/branding/glasgow-logo.svg' },
  bournemouth: { primaryColor: '#6B2D5B', logoUrl: '/branding/bournemouth-logo.svg' },
};

async function seedTenantConfigs() {
  console.log('Seeding tenant configs...');
  for (const [slug, config] of Object.entries(TENANT_BRANDING)) {
    const tenantId = id(`tenant:${slug}`);
    await prisma.tenantConfig.upsert({
      where: { tenantId_namespace: { tenantId, namespace: 'branding' } },
      update: { config },
      create: { id: id(`config:${slug}:branding`), tenantId, namespace: 'branding', config },
    });
    console.log(`  Config for "${slug}" seeded`);
  }
}

// ---------------------------------------------------------------------------
// 3b. Tenant Boundaries
// ---------------------------------------------------------------------------

// Approximate bounding polygons — sufficient for dev/test council detection.
// Replace with official ONS boundary GeoJSON for production.
const TENANT_BOUNDARIES: Record<string, string> = {
  hackney: 'POLYGON((-0.107 51.513, -0.014 51.513, -0.014 51.579, -0.107 51.579, -0.107 51.513))',
  manchester: 'POLYGON((-2.339 53.367, -2.141 53.367, -2.141 53.547, -2.339 53.547, -2.339 53.367))',
  glasgow: 'POLYGON((-4.356 55.789, -4.064 55.789, -4.064 55.906, -4.356 55.906, -4.356 55.789))',
  bournemouth: 'POLYGON((-2.065 50.691, -1.747 50.691, -1.747 50.787, -2.065 50.787, -2.065 50.691))',
};

async function seedTenantBoundaries() {
  console.log('Seeding tenant boundaries...');
  for (const [slug, wkt] of Object.entries(TENANT_BOUNDARIES)) {
    const tenantId = id(`tenant:${slug}`);
    const boundaryId = id(`boundary:${slug}`);
    await prisma.$executeRaw`
      INSERT INTO tenant_boundary (id, tenant_id, boundary, source, imported_at)
      VALUES (
        ${boundaryId}::uuid,
        ${tenantId}::uuid,
        ST_GeogFromText(${wkt}),
        ${'seed'}::text,
        NOW()
      )
      ON CONFLICT (tenant_id)
      DO UPDATE SET
        boundary   = EXCLUDED.boundary,
        source     = EXCLUDED.source,
        imported_at = EXCLUDED.imported_at
    `;
    console.log(`  Boundary for "${slug}" seeded`);
  }
}

// ---------------------------------------------------------------------------
// 4. Users
// ---------------------------------------------------------------------------

interface UserDef {
  key: string;
  email: string;
  displayName: string;
  role: string;
  tenantSlug: string;
}

const USERS: UserDef[] = [
  // Platform admin (housed in platform pseudo-tenant)
  {
    key: 'admin',
    email: 'admin@cityops.dev',
    displayName: 'Platform Admin',
    role: 'platform_admin',
    tenantSlug: 'platform',
  },

  // Hackney
  {
    key: 'hackney:oliver',
    email: 'oliver.hughes@hackney.cityops.dev',
    displayName: 'Oliver Hughes',
    role: 'tenant_admin',
    tenantSlug: 'hackney',
  },
  {
    key: 'hackney:yasmin',
    email: 'yasmin.osei@hackney.cityops.dev',
    displayName: 'Yasmin Osei',
    role: 'authority_user',
    tenantSlug: 'hackney',
  },
  {
    key: 'hackney:connor',
    email: 'connor.walsh@hackney.cityops.dev',
    displayName: 'Connor Walsh',
    role: 'authority_user',
    tenantSlug: 'hackney',
  },
  {
    key: 'hackney:fatima',
    email: 'fatima.rashid@hackney.cityops.dev',
    displayName: 'Fatima Rashid',
    role: 'citizen',
    tenantSlug: 'hackney',
  },
  {
    key: 'hackney:ravi',
    email: 'ravi.sharma@hackney.cityops.dev',
    displayName: 'Ravi Sharma',
    role: 'citizen',
    tenantSlug: 'hackney',
  },
  {
    key: 'hackney:emily',
    email: 'emily.blackwood@hackney.cityops.dev',
    displayName: 'Emily Blackwood',
    role: 'citizen',
    tenantSlug: 'hackney',
  },
  {
    key: 'hackney:jakub',
    email: 'jakub.novak@hackney.cityops.dev',
    displayName: 'Jakub Novak',
    role: 'citizen',
    tenantSlug: 'hackney',
  },
  {
    key: 'hackney:adaeze',
    email: 'adaeze.okonkwo@hackney.cityops.dev',
    displayName: 'Adaeze Okonkwo',
    role: 'citizen',
    tenantSlug: 'hackney',
  },

  // Manchester
  {
    key: 'manchester:alice',
    email: 'alice.thornton@manchester.cityops.dev',
    displayName: 'Alice Thornton',
    role: 'tenant_admin',
    tenantSlug: 'manchester',
  },
  {
    key: 'manchester:ben',
    email: 'ben.harris@manchester.cityops.dev',
    displayName: 'Ben Harris',
    role: 'authority_user',
    tenantSlug: 'manchester',
  },
  {
    key: 'manchester:carol',
    email: 'carol.webb@manchester.cityops.dev',
    displayName: 'Carol Webb',
    role: 'authority_user',
    tenantSlug: 'manchester',
  },
  {
    key: 'manchester:david',
    email: 'david.okafor@manchester.cityops.dev',
    displayName: 'David Okafor',
    role: 'citizen',
    tenantSlug: 'manchester',
  },
  {
    key: 'manchester:priya',
    email: 'priya.nair@manchester.cityops.dev',
    displayName: 'Priya Nair',
    role: 'citizen',
    tenantSlug: 'manchester',
  },
  {
    key: 'manchester:sophie',
    email: 'sophie.clarke@manchester.cityops.dev',
    displayName: 'Sophie Clarke',
    role: 'citizen',
    tenantSlug: 'manchester',
  },
  {
    key: 'manchester:tom',
    email: 'tom.byrne@manchester.cityops.dev',
    displayName: 'Tom Byrne',
    role: 'citizen',
    tenantSlug: 'manchester',
  },
  {
    key: 'manchester:mei',
    email: 'mei.zhang@manchester.cityops.dev',
    displayName: 'Mei Zhang',
    role: 'citizen',
    tenantSlug: 'manchester',
  },

  // Glasgow
  {
    key: 'glasgow:callum',
    email: 'callum.macleod@glasgow.cityops.dev',
    displayName: 'Callum MacLeod',
    role: 'tenant_admin',
    tenantSlug: 'glasgow',
  },
  {
    key: 'glasgow:siobhan',
    email: 'siobhan.murray@glasgow.cityops.dev',
    displayName: 'Siobhan Murray',
    role: 'authority_user',
    tenantSlug: 'glasgow',
  },
  {
    key: 'glasgow:fraser',
    email: 'fraser.anderson@glasgow.cityops.dev',
    displayName: 'Fraser Anderson',
    role: 'authority_user',
    tenantSlug: 'glasgow',
  },
  {
    key: 'glasgow:isla',
    email: 'isla.campbell@glasgow.cityops.dev',
    displayName: 'Isla Campbell',
    role: 'citizen',
    tenantSlug: 'glasgow',
  },
  {
    key: 'glasgow:hamish',
    email: 'hamish.reid@glasgow.cityops.dev',
    displayName: 'Hamish Reid',
    role: 'citizen',
    tenantSlug: 'glasgow',
  },
  {
    key: 'glasgow:ailsa',
    email: 'ailsa.morrison@glasgow.cityops.dev',
    displayName: 'Ailsa Morrison',
    role: 'citizen',
    tenantSlug: 'glasgow',
  },
  {
    key: 'glasgow:declan',
    email: 'declan.burns@glasgow.cityops.dev',
    displayName: 'Declan Burns',
    role: 'citizen',
    tenantSlug: 'glasgow',
  },
  {
    key: 'glasgow:niamh',
    email: 'niamh.stewart@glasgow.cityops.dev',
    displayName: 'Niamh Stewart',
    role: 'citizen',
    tenantSlug: 'glasgow',
  },

  // Bournemouth
  {
    key: 'bournemouth:fiona',
    email: 'fiona.grant@bournemouth.cityops.dev',
    displayName: 'Fiona Grant',
    role: 'tenant_admin',
    tenantSlug: 'bournemouth',
  },
  {
    key: 'bournemouth:james',
    email: 'james.patel@bournemouth.cityops.dev',
    displayName: 'James Patel',
    role: 'authority_user',
    tenantSlug: 'bournemouth',
  },
  {
    key: 'bournemouth:laura',
    email: 'laura.santos@bournemouth.cityops.dev',
    displayName: 'Laura Santos',
    role: 'authority_user',
    tenantSlug: 'bournemouth',
  },
  {
    key: 'bournemouth:noah',
    email: 'noah.evans@bournemouth.cityops.dev',
    displayName: 'Noah Evans',
    role: 'citizen',
    tenantSlug: 'bournemouth',
  },
  {
    key: 'bournemouth:amara',
    email: 'amara.diallo@bournemouth.cityops.dev',
    displayName: 'Amara Diallo',
    role: 'citizen',
    tenantSlug: 'bournemouth',
  },
  {
    key: 'bournemouth:ryan',
    email: 'ryan.mcdonald@bournemouth.cityops.dev',
    displayName: 'Ryan McDonald',
    role: 'citizen',
    tenantSlug: 'bournemouth',
  },
  {
    key: 'bournemouth:ingrid',
    email: 'ingrid.holm@bournemouth.cityops.dev',
    displayName: 'Ingrid Holm',
    role: 'citizen',
    tenantSlug: 'bournemouth',
  },
  {
    key: 'bournemouth:kwame',
    email: 'kwame.asante@bournemouth.cityops.dev',
    displayName: 'Kwame Asante',
    role: 'citizen',
    tenantSlug: 'bournemouth',
  },
  {
    key: 'bournemouth:debs',
    email: 'debs.shakespear@bournemouth.cityops.dev',
    displayName: 'Debs Shakespeare',
    role: 'authority_user',
    tenantSlug: 'bournemouth',
  },
  {
    key: 'bournemouth:santosh',
    email: 'santosh.takoor@bournemouth.cityops.dev',
    displayName: 'Santosh Takoor',
    role: 'citizen',
    tenantSlug: 'bournemouth',
  },
  {
    key: 'bournemouth:prasad',
    email: 'prasad.honrao@bournemouth.cityops.dev',
    displayName: 'Prasad Honrao',
    role: 'citizen',
    tenantSlug: 'bournemouth',
  },
];

async function seedUsers() {
  console.log('Seeding users...');
  for (const u of USERS) {
    const tenantId = id(`tenant:${u.tenantSlug}`);
    const userId = id(`user:${u.key}`);
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId, email: u.email } },
      update: { displayName: u.displayName },
      create: {
        id: userId,
        tenantId,
        email: u.email,
        passwordHash: PASSWORD_HASH,
        displayName: u.displayName,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`  User "${u.displayName}" seeded`);
  }
}

// ---------------------------------------------------------------------------
// 5. User Roles
// ---------------------------------------------------------------------------

// Lookup map populated after roles are seeded
const roleIdByName: Record<string, string> = {};

async function loadRoleIds() {
  const roles = await prisma.role.findMany();
  for (const r of roles) {
    roleIdByName[r.name] = r.id;
  }
}

async function seedUserRoles() {
  console.log('Seeding user roles...');
  await loadRoleIds();

  for (const u of USERS) {
    const tenantId = id(`tenant:${u.tenantSlug}`);
    const userId = id(`user:${u.key}`);
    const roleId = roleIdByName[u.role];
    if (!roleId) throw new Error(`Role "${u.role}" not found in database`);
    const urId = id(`userrole:${u.key}:${u.role}`);

    await prisma.userRole.upsert({
      where: { tenantId_userId_roleId: { tenantId, userId, roleId } },
      update: {},
      create: { id: urId, tenantId, userId, roleId },
    });
  }
  console.log('  User roles seeded');
}

const CIVIC_TENANT_SLUGS = ['hackney', 'manchester', 'glasgow', 'bournemouth'];

// ---------------------------------------------------------------------------
// 6. Report Categories
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { name: 'Road & Pavement', slug: 'road-pavement', icon: '🛣️', color: '#EF4444' },
  { name: 'Street Lighting', slug: 'street-lighting', icon: '💡', color: '#F59E0B' },
  { name: 'Drainage & Flooding', slug: 'drainage-flooding', icon: '🌊', color: '#3B82F6' },
  { name: 'Waste & Recycling', slug: 'waste-recycling', icon: '♻️', color: '#10B981' },
  { name: 'Parks & Green Spaces', slug: 'parks-green-spaces', icon: '🌳', color: '#22C55E' },
  { name: 'Graffiti & Vandalism', slug: 'graffiti-vandalism', icon: '🎨', color: '#8B5CF6' },
];

async function seedCategories() {
  console.log('Seeding platform report categories...');
  for (const [i, cat] of CATEGORIES.entries()) {
    await prisma.reportCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, color: cat.color },
      create: {
        id: id(`category:${cat.slug}`),
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        color: cat.color,
        sortOrder: i,
      },
    });
    console.log(`  Category "${cat.name}" seeded`);
  }
}

// ---------------------------------------------------------------------------
// 7. Reports
// ---------------------------------------------------------------------------

interface ReportDef {
  num: number;
  title: string;
  categorySlug: string;
  status: string;
  priority: string | null;
  hasLocation: boolean;
}

const REPORT_TEMPLATES: ReportDef[] = [
  { num: 1, title: '', categorySlug: 'road-pavement', status: 'created', priority: null, hasLocation: true },
  { num: 2, title: '', categorySlug: 'street-lighting', status: 'under_validation', priority: null, hasLocation: true },
  { num: 3, title: '', categorySlug: 'drainage-flooding', status: 'validated', priority: 'high', hasLocation: true },
  { num: 4, title: '', categorySlug: 'waste-recycling', status: 'invalid', priority: null, hasLocation: true },
  { num: 5, title: '', categorySlug: 'graffiti-vandalism', status: 'assigned', priority: 'medium', hasLocation: true },
  {
    num: 6,
    title: '',
    categorySlug: 'parks-green-spaces',
    status: 'in_progress',
    priority: 'critical',
    hasLocation: true,
  },
  { num: 7, title: '', categorySlug: 'road-pavement', status: 'resolved', priority: 'low', hasLocation: true },
  { num: 8, title: '', categorySlug: 'parks-green-spaces', status: 'closed', priority: 'medium', hasLocation: true },
];

interface TenantReports {
  tenantSlug: string;
  titles: string[];
  descriptions: string[];
  locations: string[];
  coords: [number, number][]; // [lng, lat] for reports 3 and 6
}

const TENANT_REPORTS: TenantReports[] = [
  {
    tenantSlug: 'hackney',
    titles: [
      'Pothole on Mare Street',
      'Broken streetlight near London Fields',
      'Flooded subway at Hackney Central',
      'Missed bin collection on Kingsland Road',
      'Graffiti on Hackney Empire wall',
      'Tree fallen in Victoria Park',
      'Cracked pavement on Bethnal Green Road',
      'Broken glass in Haggerston Park',
    ],
    descriptions: [
      'Large pothole approximately 30cm wide causing danger to cyclists on Mare Street near the Town Hall.',
      'The streetlight outside 42 London Fields West Side has been out for over a week. Very dark at night.',
      'The pedestrian subway at Hackney Central station floods every time it rains. Ankle-deep water today.',
      'Bins on Kingsland Road between Dalston Lane and Shacklewell Lane were not collected on scheduled day.',
      'Offensive graffiti sprayed on the side wall of the Hackney Empire theatre. Appeared overnight.',
      'A large oak tree has fallen across the main path in Victoria Park near the lake. Blocking access.',
      'Multiple cracked paving slabs on Bethnal Green Road creating a trip hazard near the tube station.',
      'Smashed bottles and broken glass scattered across the playground area in Haggerston Park.',
    ],
    locations: [
      'Mare Street, Hackney, London E8',
      'London Fields West Side, London E8',
      'Hackney Central Station, London E8',
      'Kingsland Road, London E8',
      'Mare Street, Hackney Empire, London E8',
      'Victoria Park, London E9',
      'Bethnal Green Road, London E2',
      'Haggerston Park, London E2',
    ],
    coords: [
      [-0.0554, 51.5465],
      [-0.0615, 51.541],
      [-0.0567, 51.5468],
      [-0.0762, 51.5363],
      [-0.0554, 51.549],
      [-0.0385, 51.5366],
      [-0.07, 51.5255],
      [-0.0705, 51.532],
    ],
  },
  {
    tenantSlug: 'manchester',
    titles: [
      'Pothole on Oxford Road',
      'Broken streetlight near Piccadilly',
      'Flooded underpass on Deansgate',
      'Missed bin collection on Canal Street',
      'Graffiti on Arndale wall',
      'Tree fallen in Heaton Park',
      'Cracked pavement on Market Street',
      'Broken glass in Piccadilly Gardens',
    ],
    descriptions: [
      'Deep pothole on Oxford Road near the university campus, causing vehicles to swerve dangerously.',
      'Streetlight on the approach to Piccadilly Station has been flickering for days and is now completely out.',
      'The underpass on Deansgate near Castlefield floods regularly. Standing water making it impassable.',
      'Bins on Canal Street in the Village were skipped during the last two scheduled collections.',
      'Large graffiti tags sprayed on the Arndale Centre exterior wall facing Market Street.',
      'Storm damage has brought down a mature tree blocking the main entrance path to Heaton Park.',
      'Paving slabs on Market Street are cracked and uneven near the Arndale entrance. Trip hazard.',
      'Broken glass bottles strewn across the seating area in Piccadilly Gardens.',
    ],
    locations: [
      'Oxford Road, Manchester M1',
      'Piccadilly Station approach, Manchester M1',
      'Deansgate underpass, Manchester M3',
      'Canal Street, Manchester M1',
      'Arndale Centre, Manchester M4',
      'Heaton Park, Manchester M25',
      'Market Street, Manchester M1',
      'Piccadilly Gardens, Manchester M1',
    ],
    coords: [
      [-2.2451, 53.475],
      [-2.2368, 53.4773],
      [-2.251, 53.4769],
      [-2.2419, 53.4764],
      [-2.2417, 53.483],
      [-2.251, 53.5385],
      [-2.239, 53.4814],
      [-2.2365, 53.4816],
    ],
  },
  {
    tenantSlug: 'glasgow',
    titles: [
      'Pothole on Sauchiehall Street',
      'Broken streetlight near George Square',
      'Flooded underpass on Argyle Street',
      'Missed bin collection on Great Western Road',
      'Graffiti on Buchanan Street wall',
      'Tree fallen in Kelvingrove Park',
      'Cracked pavement on Byres Road',
      'Broken glass in Glasgow Green',
    ],
    descriptions: [
      'Pothole on Sauchiehall Street near the Pavilion Theatre causing problems for pedestrians and traffic.',
      'Streetlight on George Square near the cenotaph has been out for two weeks. Safety concern at night.',
      'Argyle Street underpass near Kelvinhaugh floods after every rainfall. Needs drainage improvement.',
      'Bins on Great Western Road between Byres Road and Kelvinbridge were not collected as scheduled.',
      'Graffiti tags covering the wall on Buchanan Street near the Royal Concert Hall.',
      'A large tree has fallen in Kelvingrove Park blocking the riverside path. Storm damage.',
      'Cracked and uneven paving on Byres Road near Ashton Lane creating a trip hazard.',
      "Broken glass and litter across the main green space in Glasgow Green near the People's Palace.",
    ],
    locations: [
      'Sauchiehall Street, Glasgow G2',
      'George Square, Glasgow G2',
      'Argyle Street underpass, Glasgow G3',
      'Great Western Road, Glasgow G12',
      'Buchanan Street, Glasgow G1',
      'Kelvingrove Park, Glasgow G3',
      'Byres Road, Glasgow G12',
      'Glasgow Green, Glasgow G40',
    ],
    coords: [
      [-4.268, 55.8642],
      [-4.2511, 55.8611],
      [-4.2501, 55.8571],
      [-4.27, 55.878],
      [-4.249, 55.8625],
      [-4.283, 55.8682],
      [-4.293, 55.8776],
      [-4.2558, 55.8492],
    ],
  },
  {
    tenantSlug: 'bournemouth',
    titles: [
      'Pothole on Old Christchurch Road',
      'Broken streetlight near Bournemouth Pier',
      'Flooded underpass near Lansdowne',
      'Missed bin collection on Charminster Road',
      'Graffiti on Lower Gardens wall',
      'Tree fallen in Meyrick Park',
      'Cracked pavement on Commercial Road',
      'Broken glass in East Cliff Gardens',
    ],
    descriptions: [
      'Large pothole on Old Christchurch Road near the Odeon. Causing damage to vehicle wheels.',
      'Streetlight near the entrance to Bournemouth Pier has stopped working. Dark and unsafe at night.',
      'Underpass near Lansdowne roundabout floods after rain. Standing water making it unusable.',
      'Bins on Charminster Road were not collected this week. Overflowing onto the pavement.',
      'Graffiti sprayed on the retaining wall along the Lower Gardens near the bandstand.',
      'Storm has brought down a tree in Meyrick Park blocking the path near the golf course entrance.',
      'Cracked paving slabs on Commercial Road near the Triangle. Pedestrian trip hazard.',
      'Broken glass scattered on the path in East Cliff Gardens near the zigzag walkway.',
    ],
    locations: [
      'Old Christchurch Road, Bournemouth BH1',
      'Bournemouth Pier, Bournemouth BH2',
      'Lansdowne, Bournemouth BH1',
      'Charminster Road, Bournemouth BH8',
      'Lower Gardens, Bournemouth BH1',
      'Meyrick Park, Bournemouth BH2',
      'Commercial Road, Bournemouth BH2',
      'East Cliff Gardens, Bournemouth BH1',
    ],
    coords: [
      [-1.8785, 50.721],
      [-1.87, 50.7172],
      [-1.8688, 50.7206],
      [-1.8928, 50.7372],
      [-1.8742, 50.7195],
      [-1.865, 50.718],
      [-1.8715, 50.719],
      [-1.868, 50.723],
    ],
  },
];

// Reporter rotation: citizens 1-5 round-robin for reports 1-8
function getReporterKey(tenantSlug: string, reportNum: number): string {
  const citizens: Record<string, string[]> = {
    hackney: ['hackney:fatima', 'hackney:ravi', 'hackney:emily', 'hackney:jakub', 'hackney:adaeze'],
    manchester: ['manchester:david', 'manchester:priya', 'manchester:sophie', 'manchester:tom', 'manchester:mei'],
    glasgow: ['glasgow:isla', 'glasgow:hamish', 'glasgow:ailsa', 'glasgow:declan', 'glasgow:niamh'],
    bournemouth: [
      'bournemouth:noah',
      'bournemouth:amara',
      'bournemouth:ryan',
      'bournemouth:ingrid',
      'bournemouth:kwame',
    ],
  };
  return citizens[tenantSlug][(reportNum - 1) % 5];
}

// Authority users for assignments (reports 5,6,7,8)
function getAuthorityKey(tenantSlug: string, idx: number): string {
  const authorities: Record<string, string[]> = {
    hackney: ['hackney:yasmin', 'hackney:connor'],
    manchester: ['manchester:ben', 'manchester:carol'],
    glasgow: ['glasgow:siobhan', 'glasgow:fraser'],
    bournemouth: ['bournemouth:james', 'bournemouth:laura'],
  };
  return authorities[tenantSlug][idx % 2];
}

function getTenantAdminKey(tenantSlug: string): string {
  const admins: Record<string, string> = {
    hackney: 'hackney:oliver',
    manchester: 'manchester:alice',
    glasgow: 'glasgow:callum',
    bournemouth: 'bournemouth:fiona',
  };
  return admins[tenantSlug];
}

// Removes reports (and their child rows) left behind by earlier non-idempotent
// seed runs. Report FKs have no ON DELETE CASCADE, so children go first.
async function deleteReportsWithChildren(reportIds: number[]) {
  if (reportIds.length === 0) return;
  await prisma.duplicateLink.deleteMany({
    where: {
      OR: [{ sourceReportId: { in: reportIds } }, { targetReportId: { in: reportIds } }],
    },
  });
  await prisma.aiValidationResult.deleteMany({ where: { reportId: { in: reportIds } } });
  await prisma.reportComment.deleteMany({ where: { reportId: { in: reportIds } } });
  await prisma.reportActivity.deleteMany({ where: { reportId: { in: reportIds } } });
  await prisma.reportAssignment.deleteMany({ where: { reportId: { in: reportIds } } });
  await prisma.reportAttachment.deleteMany({ where: { reportId: { in: reportIds } } });
  await prisma.report.deleteMany({ where: { id: { in: reportIds } } });
}

async function seedReports(): Promise<Map<string, number>> {
  console.log('Seeding reports...');

  // Maps reportKey (e.g. "report:glasgow:1") to auto-generated integer ID
  const reportIdMap = new Map<string, number>();

  for (const ti of TENANT_REPORTS) {
    const tenantId = id(`tenant:${ti.tenantSlug}`);
    let coordIdx = 0;

    for (const [i, tpl] of REPORT_TEMPLATES.entries()) {
      const reportKey = `report:${ti.tenantSlug}:${tpl.num}`;
      const reporterKey = getReporterKey(ti.tenantSlug, tpl.num);
      const reporterUserId = id(`user:${reporterKey}`);
      const categoryId = id(`category:${tpl.categorySlug}`);

      // Determine assigned user for reports 5-8
      const needsAssignment = tpl.num >= 5;
      const authorityKey = needsAssignment ? getAuthorityKey(ti.tenantSlug, tpl.num - 5) : null;
      const assignedUserId = authorityKey ? id(`user:${authorityKey}`) : null;

      const resolvedAt = tpl.status === 'resolved' || tpl.status === 'closed' ? new Date('2026-03-20T10:00:00Z') : null;
      const closedAt = tpl.status === 'closed' ? new Date('2026-03-21T14:00:00Z') : null;

      // Stagger created_at so recent reports span all tenants.
      // Tenants interleave: report 1 of each tenant is spaced 6h apart,
      // then report 2 of each tenant, etc. Most recent reports come from
      // a mix of councils rather than just the last-seeded tenant.
      const tenantIdx = TENANT_REPORTS.indexOf(ti);
      const baseDate = new Date('2026-03-15T08:00:00Z');
      const hoursOffset = i * (TENANT_REPORTS.length * 6) + tenantIdx * 6;
      const createdAt = new Date(baseDate.getTime() + hoursOffset * 60 * 60 * 1000);

      // Build location point expression
      let locationPointExpr = 'NULL';
      if (tpl.hasLocation) {
        const [lng, lat] = ti.coords[coordIdx];
        locationPointExpr = `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
        coordIdx++;
      }

      // Idempotent re-seed: reuse the earliest existing report (matched on its
      // stable natural key) and remove any duplicates left by earlier runs.
      const existingReports = await prisma.$queryRawUnsafe<{ id: number }[]>(
        `SELECT id FROM report WHERE tenant_id = $1::uuid AND reporter_user_id = $2::uuid AND title = $3 ORDER BY id ASC`,
        tenantId,
        reporterUserId,
        ti.titles[i],
      );

      let generatedId: number;
      if (existingReports.length > 0) {
        generatedId = existingReports[0].id;
        if (existingReports.length > 1) {
          await deleteReportsWithChildren(existingReports.slice(1).map((r) => r.id));
        }
      } else {
        const rows = await prisma.$queryRawUnsafe<{ id: number }[]>(
          `
          INSERT INTO report (
            tenant_id, category_id, reporter_user_id, assigned_user_id,
            title, description, status, priority,
            location_text, location_point,
            resolved_at, closed_at, created_at, updated_at
          ) VALUES (
            $1::uuid, $2::uuid, $3::uuid, $4::uuid,
            $5, $6, $7::"ReportStatus", $8::"ReportPriority",
            $9, ${locationPointExpr},
            $10::timestamptz, $11::timestamptz,
            $12::timestamptz, $12::timestamptz
          )
          RETURNING id
        `,
          tenantId, // $1
          categoryId, // $2
          reporterUserId, // $3
          assignedUserId, // $4  (null OK)
          ti.titles[i], // $5
          ti.descriptions[i], // $6
          tpl.status, // $7
          tpl.priority, // $8  (null OK)
          ti.locations[i], // $9
          resolvedAt, // $10 (null OK)
          closedAt, // $11 (null OK)
          createdAt, // $12
        );
        generatedId = rows[0].id;
      }
      reportIdMap.set(reportKey, generatedId);
    }
    console.log(`  Reports for "${ti.tenantSlug}" seeded`);
  }

  return reportIdMap;
}

// ---------------------------------------------------------------------------
// 8. Report Assignments (reports 5, 6, 7, 8)
// ---------------------------------------------------------------------------

async function seedReportAssignments(reportIdMap: Map<string, number>) {
  console.log('Seeding report assignments...');
  for (const ti of TENANT_REPORTS) {
    const tenantId = id(`tenant:${ti.tenantSlug}`);
    const adminKey = getTenantAdminKey(ti.tenantSlug);
    const adminUserId = id(`user:${adminKey}`);

    for (const num of [5, 6, 7, 8]) {
      const reportId = reportIdMap.get(`report:${ti.tenantSlug}:${num}`)!;
      const authorityKey = getAuthorityKey(ti.tenantSlug, num - 5);
      const assignedToUserId = id(`user:${authorityKey}`);
      const assignmentId = id(`assignment:${ti.tenantSlug}:${num}`);

      await prisma.$executeRawUnsafe(
        `
        INSERT INTO report_assignment (id, tenant_id, report_id, assigned_to_user_id, assigned_by_user_id, is_current, assigned_at)
        VALUES ($1::uuid, $2::uuid, $3, $4::uuid, $5::uuid, true, NOW())
        ON CONFLICT (id) DO NOTHING
      `,
        assignmentId,
        tenantId,
        reportId,
        assignedToUserId,
        adminUserId,
      );
    }
    console.log(`  Assignments for "${ti.tenantSlug}" seeded`);
  }
}

// ---------------------------------------------------------------------------
// 9. Report Activities
// ---------------------------------------------------------------------------

async function seedReportActivities(reportIdMap: Map<string, number>) {
  console.log('Seeding report activities...');

  // Status progression for each report status
  const STATUS_PROGRESSION: Record<string, string[]> = {
    created: [],
    under_validation: ['created', 'under_validation'],
    validated: ['created', 'under_validation', 'validated'],
    invalid: ['created', 'under_validation', 'invalid'],
    assigned: ['created', 'under_validation', 'validated', 'assigned'],
    in_progress: ['created', 'under_validation', 'validated', 'assigned', 'in_progress'],
    resolved: ['created', 'under_validation', 'validated', 'assigned', 'in_progress', 'resolved'],
    closed: ['created', 'under_validation', 'validated', 'assigned', 'in_progress', 'resolved', 'closed'],
  };

  for (const ti of TENANT_REPORTS) {
    const tenantId = id(`tenant:${ti.tenantSlug}`);
    const adminKey = getTenantAdminKey(ti.tenantSlug);
    const adminUserId = id(`user:${adminKey}`);

    for (const tpl of REPORT_TEMPLATES) {
      const reportId = reportIdMap.get(`report:${ti.tenantSlug}:${tpl.num}`)!;
      const reporterKey = getReporterKey(ti.tenantSlug, tpl.num);
      const reporterUserId = id(`user:${reporterKey}`);
      const transitions = STATUS_PROGRESSION[tpl.status] ?? [];

      for (let t = 0; t < transitions.length; t++) {
        const status = transitions[t];
        const activityId = id(`activity:${ti.tenantSlug}:${tpl.num}:${t}`);
        const userId = t === 0 ? reporterUserId : adminUserId;
        const action = t === 0 ? 'created' : 'status_changed';
        const oldValue = t > 0 ? transitions[t - 1] : null;

        await prisma.$executeRawUnsafe(
          `
          INSERT INTO report_activity (id, tenant_id, report_id, user_id, action, old_value, new_value, created_at)
          VALUES ($1::uuid, $2::uuid, $3, $4::uuid, $5::"ActivityAction", $6, $7, NOW() + interval '${t} minutes')
          ON CONFLICT (id) DO NOTHING
        `,
          activityId,
          tenantId,
          reportId,
          userId,
          action,
          oldValue,
          status,
        );
      }

      // Add assignment activity for reports 5-8
      if (tpl.num >= 5) {
        const authorityKey = getAuthorityKey(ti.tenantSlug, tpl.num - 5);
        const assignActivityId = id(`activity:${ti.tenantSlug}:${tpl.num}:assign`);
        await prisma.$executeRawUnsafe(
          `
          INSERT INTO report_activity (id, tenant_id, report_id, user_id, action, new_value, created_at)
          VALUES ($1::uuid, $2::uuid, $3, $4::uuid, 'assigned'::"ActivityAction", $5, NOW() + interval '${transitions.length} minutes')
          ON CONFLICT (id) DO NOTHING
        `,
          assignActivityId,
          tenantId,
          reportId,
          id(`user:${adminKey}`),
          id(`user:${authorityKey}`),
        );
      }

      // Add priority_changed activity where priority is set
      if (tpl.priority) {
        const priorityActivityId = id(`activity:${ti.tenantSlug}:${tpl.num}:priority`);
        await prisma.$executeRawUnsafe(
          `
          INSERT INTO report_activity (id, tenant_id, report_id, user_id, action, new_value, created_at)
          VALUES ($1::uuid, $2::uuid, $3, $4::uuid, 'priority_changed'::"ActivityAction", $5, NOW() + interval '${transitions.length + 1} minutes')
          ON CONFLICT (id) DO NOTHING
        `,
          priorityActivityId,
          tenantId,
          reportId,
          adminUserId,
          tpl.priority,
        );
      }
    }
    console.log(`  Activities for "${ti.tenantSlug}" seeded`);
  }
}

// ---------------------------------------------------------------------------
// 10. Duplicate Links (reports 1 and 5 per tenant)
// ---------------------------------------------------------------------------

async function seedDuplicateLinks(reportIdMap: Map<string, number>) {
  console.log('Seeding duplicate links...');
  for (const ti of TENANT_REPORTS) {
    const tenantId = id(`tenant:${ti.tenantSlug}`);
    const sourceReportId = reportIdMap.get(`report:${ti.tenantSlug}:1`)!;
    const targetReportId = reportIdMap.get(`report:${ti.tenantSlug}:5`)!;
    const adminKey = getTenantAdminKey(ti.tenantSlug);
    const linkedByUserId = id(`user:${adminKey}`);
    const linkId = id(`duplink:${ti.tenantSlug}:1-5`);

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO duplicate_link (id, tenant_id, source_report_id, target_report_id, linked_by_user_id, is_merged, created_at)
      VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, false, NOW())
      ON CONFLICT (source_report_id, target_report_id) DO NOTHING
    `,
      linkId,
      tenantId,
      sourceReportId,
      targetReportId,
      linkedByUserId,
    );
    console.log(`  Duplicate link for "${ti.tenantSlug}" seeded`);
  }
}

// ---------------------------------------------------------------------------
// 11. AI Validation Results (reports 2, 3, 4 per tenant)
// ---------------------------------------------------------------------------

async function seedAiValidationResults(reportIdMap: Map<string, number>) {
  console.log('Seeding AI validation results...');

  const AI_RESULTS: {
    reportNum: number;
    outcome: string;
    confidence: string;
    reasonCode: string;
    reasonText: string;
  }[] = [
    {
      reportNum: 2,
      outcome: 'review_required',
      confidence: '0.6500',
      reasonCode: 'image_unusable',
      reasonText: 'Image quality is too low for automated validation. Manual review recommended.',
    },
    {
      reportNum: 3,
      outcome: 'valid',
      confidence: '0.9500',
      reasonCode: '',
      reasonText: 'Report description and image match the selected category. Location data is consistent.',
    },
    {
      reportNum: 4,
      outcome: 'invalid',
      confidence: '0.8800',
      reasonCode: 'spam',
      reasonText: 'Submission flagged as potential spam based on content analysis.',
    },
  ];

  for (const ti of TENANT_REPORTS) {
    const tenantId = id(`tenant:${ti.tenantSlug}`);
    for (const r of AI_RESULTS) {
      const reportId = reportIdMap.get(`report:${ti.tenantSlug}:${r.reportNum}`)!;
      const resultId = id(`airesult:${ti.tenantSlug}:${r.reportNum}`);
      const reasonCodes = r.reasonCode ? `{${r.reasonCode}}` : '{}';

      await prisma.$executeRawUnsafe(
        `
        INSERT INTO ai_validation_result (id, tenant_id, report_id, outcome, confidence_score, reason_codes, reason_text, model_version, created_at)
        VALUES ($1::uuid, $2::uuid, $3, $4::"AiValidationOutcome", $5::decimal, $6::text[], $7, 'cityops-v1.0', NOW())
        ON CONFLICT (id) DO NOTHING
      `,
        resultId,
        tenantId,
        reportId,
        r.outcome,
        r.confidence,
        reasonCodes,
        r.reasonText,
      );
    }
    console.log(`  AI validation results for "${ti.tenantSlug}" seeded`);
  }
}

// ---------------------------------------------------------------------------
// 12. Report Comments (reports 5, 6, 7 — 2 comments each)
// ---------------------------------------------------------------------------

async function seedReportComments(reportIdMap: Map<string, number>) {
  console.log('Seeding report comments...');

  const COMMENT_TEMPLATES: {
    reportNum: number;
    comments: { fromCitizen: boolean; body: string; isInternal: boolean }[];
  }[] = [
    {
      reportNum: 5,
      comments: [
        {
          fromCitizen: true,
          body: "This graffiti appeared overnight. It's quite offensive and visible to school children passing by.",
          isInternal: false,
        },
        {
          fromCitizen: false,
          body: 'Internal note: Graffiti removal team scheduled for next week. Need to check if surface is listed.',
          isInternal: true,
        },
      ],
    },
    {
      reportNum: 6,
      comments: [
        {
          fromCitizen: true,
          body: 'The tree is completely blocking the path. Had to walk around through muddy grass with my pram.',
          isInternal: false,
        },
        {
          fromCitizen: false,
          body: 'Emergency tree crew dispatched. ETA 2 hours. Temporary barriers in place.',
          isInternal: true,
        },
      ],
    },
    {
      reportNum: 7,
      comments: [
        {
          fromCitizen: true,
          body: 'Thank you for fixing this so quickly! The pavement looks great now.',
          isInternal: false,
        },
        {
          fromCitizen: false,
          body: 'Repair completed by contractor. Invoice reference: INV-2026-0342.',
          isInternal: true,
        },
      ],
    },
  ];

  for (const ti of TENANT_REPORTS) {
    const tenantId = id(`tenant:${ti.tenantSlug}`);
    for (const ct of COMMENT_TEMPLATES) {
      const reportId = reportIdMap.get(`report:${ti.tenantSlug}:${ct.reportNum}`)!;
      const reporterKey = getReporterKey(ti.tenantSlug, ct.reportNum);
      const authorityKey = getAuthorityKey(ti.tenantSlug, ct.reportNum - 5);

      for (const [ci, c] of ct.comments.entries()) {
        const userId = c.fromCitizen ? id(`user:${reporterKey}`) : id(`user:${authorityKey}`);
        const commentId = id(`comment:${ti.tenantSlug}:${ct.reportNum}:${ci}`);

        await prisma.reportComment.upsert({
          where: { id: commentId },
          update: {},
          create: {
            id: commentId,
            tenantId,
            reportId,
            userId,
            body: c.body,
            isInternal: c.isInternal,
          },
        });
      }
    }
    console.log(`  Comments for "${ti.tenantSlug}" seeded`);
  }
}

// ---------------------------------------------------------------------------
// 13. Reward Point Ledger (citizens 1 & 2 per tenant)
// ---------------------------------------------------------------------------

async function seedRewardPoints() {
  console.log('Seeding reward points...');

  const TRANSACTIONS = [
    { type: 'earned' as const, points: 10, reason: 'First report submitted' },
    { type: 'earned' as const, points: 10, reason: 'Report resolved' },
    { type: 'redeemed' as const, points: -5, reason: 'Reward redemption' },
  ];

  for (const tenantSlug of CIVIC_TENANT_SLUGS) {
    const tenantId = id(`tenant:${tenantSlug}`);
    const citizenKeys = USERS.filter((u) => u.tenantSlug === tenantSlug && u.role === 'citizen').slice(0, 2);

    for (const citizen of citizenKeys) {
      const userId = id(`user:${citizen.key}`);
      for (const [ti, tx] of TRANSACTIONS.entries()) {
        const ledgerId = id(`reward:${citizen.key}:${ti}`);

        await prisma.rewardPointLedger.upsert({
          where: { id: ledgerId },
          update: {},
          create: {
            id: ledgerId,
            tenantId,
            userId,
            transactionType: tx.type,
            points: tx.points,
            reason: tx.reason,
          },
        });
      }
    }
    console.log(`  Reward points for "${tenantSlug}" seeded`);
  }
}

// ---------------------------------------------------------------------------
// 14. Badges (platform-wide)
// ---------------------------------------------------------------------------

const BADGES = [
  {
    slug: 'first-report',
    name: 'First Report',
    description: 'Submitted your first report',
    icon: 'award',
    criteria: { reports_submitted: 1 },
  },
  {
    slug: 'reporter-5',
    name: 'Regular Reporter',
    description: 'Submitted 5 reports',
    icon: 'star',
    criteria: { reports_submitted: 5 },
  },
  {
    slug: 'reporter-25',
    name: 'Community Champion',
    description: 'Submitted 25 reports',
    icon: 'trophy',
    criteria: { reports_submitted: 25 },
  },
  {
    slug: 'problem-solver',
    name: 'Problem Solver',
    description: 'Had a report resolved',
    icon: 'check-circle',
    criteria: { reports_resolved: 1 },
  },
  {
    slug: 'point-century',
    name: 'Century Club',
    description: 'Earned 100 points',
    icon: 'zap',
    criteria: { points_total: 100 },
  },
];

async function seedBadges() {
  console.log('Seeding badges...');
  for (const b of BADGES) {
    const badgeId = id(`badge:${b.slug}`);
    await prisma.badge.upsert({
      where: { id: badgeId },
      update: { name: b.name, description: b.description },
      create: {
        id: badgeId,
        tenantId: null,
        name: b.name,
        slug: b.slug,
        description: b.description,
        icon: b.icon,
        criteria: b.criteria,
      },
    });
    console.log(`  Badge "${b.name}" seeded`);
  }
}

// ---------------------------------------------------------------------------
// 15. User Badges
// ---------------------------------------------------------------------------

async function seedUserBadges() {
  console.log('Seeding user badges...');

  for (const tenantSlug of CIVIC_TENANT_SLUGS) {
    const tenantId = id(`tenant:${tenantSlug}`);
    const citizenKeys = USERS.filter((u) => u.tenantSlug === tenantSlug && u.role === 'citizen');

    // Citizen 1 gets all 3 badges
    const citizen1Id = id(`user:${citizenKeys[0].key}`);
    for (const b of BADGES) {
      const badgeId = id(`badge:${b.slug}`);
      const ubId = id(`userbadge:${citizenKeys[0].key}:${b.slug}`);
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO user_badge (id, tenant_id, user_id, badge_id, awarded_at)
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, NOW())
        ON CONFLICT (user_id, badge_id) DO NOTHING
      `,
        ubId,
        tenantId,
        citizen1Id,
        badgeId,
      );
    }

    // Citizen 2 gets first-report badge only
    const citizen2Id = id(`user:${citizenKeys[1].key}`);
    const firstReportBadgeId = id('badge:first-report');
    const ub2Id = id(`userbadge:${citizenKeys[1].key}:first-report`);
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO user_badge (id, tenant_id, user_id, badge_id, awarded_at)
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, NOW())
      ON CONFLICT (user_id, badge_id) DO NOTHING
    `,
      ub2Id,
      tenantId,
      citizen2Id,
      firstReportBadgeId,
    );

    console.log(`  User badges for "${tenantSlug}" seeded`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Starting seed...\n');

  await seedRoles();
  await seedTenants();
  await seedTenantConfigs();
  await seedTenantBoundaries();
  await seedUsers();
  await seedUserRoles();
  await seedCategories();
  const reportIdMap = await seedReports();
  await seedReportAssignments(reportIdMap);
  await seedReportActivities(reportIdMap);
  await seedDuplicateLinks(reportIdMap);
  await seedAiValidationResults(reportIdMap);
  await seedReportComments(reportIdMap);
  await seedRewardPoints();
  await seedBadges();
  await seedUserBadges();

  console.log('\n✅ Seed complete.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seeding failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
