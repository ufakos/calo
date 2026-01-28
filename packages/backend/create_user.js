const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123456', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@securescope.io' },
    update: {},
    create: {
      email: 'admin@securescope.io',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });
  
  console.log('User created:', user.email);
  console.log('Password: admin123456');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
