const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@elocalpass.com' },
    update: {},
    create: {
      email: 'admin@elocalpass.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  // Create seller user
  const sellerPassword = await bcrypt.hash('seller123', 12)
  const seller = await prisma.user.upsert({
    where: { email: 'seller@elocalpass.com' },
    update: {},
    create: {
      email: 'seller@elocalpass.com',
      name: 'Seller User',
      password: sellerPassword,
      role: 'SELLER',
    },
  })

  // Create Pedrita Gomez seller
  const pedritaPassword = await bcrypt.hash('pedrita123', 12)
  const pedrita = await prisma.user.upsert({
    where: { email: 'seller@riucancun.com' },
    update: {},
    create: {
      email: 'seller@riucancun.com',
      name: 'Pedrita Gomez',
      password: pedritaPassword,
      role: 'SELLER',
    },
  })

  console.log('✅ Test users created:')
  console.log('📧 Admin: admin@elocalpass.com / password: admin123')
  console.log('📧 Seller: seller@elocalpass.com / password: seller123')
  console.log('📧 Pedrita: seller@riucancun.com / password: pedrita123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
