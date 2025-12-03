import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create a demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@devorbit.dev' },
    update: {},
    create: {
      email: 'demo@devorbit.dev',
      name: 'Demo Developer',
      provider: 'email',
      role: 'USER',
      theme: 'DARK',
    },
  });

  console.log(`✅ Created demo user: ${demoUser.email}`);

  // Create tags
  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { userId_name: { userId: demoUser.id, name: 'Frontend' } },
      update: {},
      create: { userId: demoUser.id, name: 'Frontend', color: '#3b82f6' },
    }),
    prisma.tag.upsert({
      where: { userId_name: { userId: demoUser.id, name: 'Backend' } },
      update: {},
      create: { userId: demoUser.id, name: 'Backend', color: '#10b981' },
    }),
    prisma.tag.upsert({
      where: { userId_name: { userId: demoUser.id, name: 'DevOps' } },
      update: {},
      create: { userId: demoUser.id, name: 'DevOps', color: '#f59e0b' },
    }),
    prisma.tag.upsert({
      where: { userId_name: { userId: demoUser.id, name: 'AI/ML' } },
      update: {},
      create: { userId: demoUser.id, name: 'AI/ML', color: '#ec4899' },
    }),
    prisma.tag.upsert({
      where: { userId_name: { userId: demoUser.id, name: 'Priority' } },
      update: {},
      create: { userId: demoUser.id, name: 'Priority', color: '#ef4444' },
    }),
  ]);

  console.log(`✅ Created ${tags.length} tags`);

  // Create skills
  const skillsData = [
    { name: 'JavaScript', category: 'LANGUAGE' as const, status: 'MASTERED' as const, icon: '🟨' },
    { name: 'TypeScript', category: 'LANGUAGE' as const, status: 'LEARNING' as const, icon: '🔷' },
    { name: 'React', category: 'FRAMEWORK' as const, status: 'MASTERED' as const, icon: '⚛️' },
    { name: 'Node.js', category: 'RUNTIME' as const, status: 'LEARNING' as const, icon: '🟩' },
    { name: 'Python', category: 'LANGUAGE' as const, status: 'WANT_TO_LEARN' as const, icon: '🐍' },
    { name: 'Rust', category: 'LANGUAGE' as const, status: 'WANT_TO_LEARN' as const, icon: '🦀' },
    { name: 'Docker', category: 'DEVOPS' as const, status: 'LEARNING' as const, icon: '🐳' },
    { name: 'PostgreSQL', category: 'DATABASE' as const, status: 'MASTERED' as const, icon: '🐘' },
  ];

  const skills = await Promise.all(
    skillsData.map(skill =>
      prisma.skill.upsert({
        where: { userId_name: { userId: demoUser.id, name: skill.name } },
        update: {},
        create: {
          userId: demoUser.id,
          ...skill,
        },
      })
    )
  );

  console.log(`✅ Created ${skills.length} skills`);

  // Assign tags to skills
  const frontendTag = tags.find(t => t.name === 'Frontend')!;
  const backendTag = tags.find(t => t.name === 'Backend')!;
  
  const reactSkill = skills.find(s => s.name === 'React')!;
  const nodeSkill = skills.find(s => s.name === 'Node.js')!;

  await prisma.skillTag.upsert({
    where: { skillId_tagId: { skillId: reactSkill.id, tagId: frontendTag.id } },
    update: {},
    create: { skillId: reactSkill.id, tagId: frontendTag.id },
  });

  await prisma.skillTag.upsert({
    where: { skillId_tagId: { skillId: nodeSkill.id, tagId: backendTag.id } },
    update: {},
    create: { skillId: nodeSkill.id, tagId: backendTag.id },
  });

  // Create projects
  const projectsData = [
    {
      name: 'Portfolio Website',
      description: 'Personal portfolio showcasing my work',
      status: 'COMPLETED' as const,
      githubUrl: 'https://github.com/user/portfolio',
      demoUrl: 'https://myportfolio.dev',
      techStack: ['React', 'TailwindCSS', 'Vite'],
    },
    {
      name: 'Task Manager API',
      description: 'RESTful API for task management',
      status: 'ACTIVE' as const,
      githubUrl: 'https://github.com/user/task-api',
      techStack: ['Node.js', 'Express', 'PostgreSQL'],
    },
    {
      name: 'AI Chat Bot',
      description: 'Conversational AI assistant',
      status: 'IDEA' as const,
      techStack: ['Python', 'OpenAI', 'FastAPI'],
    },
  ];

  const projects = await Promise.all(
    projectsData.map(project =>
      prisma.project.upsert({
        where: { userId_name: { userId: demoUser.id, name: project.name } },
        update: {},
        create: {
          userId: demoUser.id,
          ...project,
        },
      })
    )
  );

  console.log(`✅ Created ${projects.length} projects`);

  // Create resources
  const resourcesData = [
    {
      title: 'React Documentation',
      url: 'https://react.dev',
      type: 'DOCUMENTATION' as const,
      notes: 'Official React docs',
    },
    {
      title: 'JavaScript: The Good Parts',
      url: 'https://www.youtube.com/watch?v=hQVTIJBZook',
      type: 'VIDEO' as const,
      notes: 'Classic talk by Douglas Crockford',
    },
    {
      title: 'Node.js Crash Course',
      url: 'https://www.youtube.com/watch?v=fBNz5xF-Kx4',
      type: 'VIDEO' as const,
      notes: 'Traversy Media tutorial',
    },
  ];

  const resources = await Promise.all(
    resourcesData.map((resource, index) =>
      prisma.resource.create({
        data: {
          userId: demoUser.id,
          skillId: skills[index % skills.length]?.id,
          ...resource,
        },
      })
    )
  );

  console.log(`✅ Created ${resources.length} resources`);

  // Create activities for the last 90 days
  const activityTypes = ['LEARNING', 'CODING', 'READING', 'PROJECT'] as const;
  const today = new Date();
  const activities = [];

  for (let i = 0; i < 90; i++) {
    if (Math.random() > 0.4) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const numActivities = Math.floor(Math.random() * 4) + 1;
      for (let j = 0; j < numActivities; j++) {
        const type = activityTypes[Math.floor(Math.random() * activityTypes.length)]!;
        activities.push({
          userId: demoUser.id,
          date,
          type,
          description: `${type.toLowerCase()} session`,
          durationMinutes: Math.floor(Math.random() * 120) + 15,
        });
      }
    }
  }

  await prisma.activity.createMany({
    data: activities,
    skipDuplicates: true,
  });

  console.log(`✅ Created ${activities.length} activities`);

  // Create some time entries
  const timeEntriesData = [
    {
      description: 'Working on React components',
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date(),
      durationSeconds: 3600,
      isRunning: false,
      skillId: reactSkill.id,
    },
    {
      description: 'Building API endpoints',
      startTime: new Date(Date.now() - 7200000),
      endTime: new Date(Date.now() - 3600000),
      durationSeconds: 3600,
      isRunning: false,
      skillId: nodeSkill.id,
      projectId: projects[1]?.id,
    },
  ];

  const timeEntries = await Promise.all(
    timeEntriesData.map(entry =>
      prisma.timeEntry.create({
        data: {
          userId: demoUser.id,
          ...entry,
        },
      })
    )
  );

  console.log(`✅ Created ${timeEntries.length} time entries`);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
