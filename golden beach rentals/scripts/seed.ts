import { PrismaClient, LodgingType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.booking.deleteMany();
  await prisma.room.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.lodging.deleteMany();

  const hostal = await prisma.lodging.create({
    data: {
      slug: 'mi-hostal-fuengirola',
      title: 'Mi Hostal en Fuengirola',
      type: 'HOSTAL',
      isOwned: true,
      description: 'Hostal acogedor cerca de la playa, ideal para parejas y familias.',
      city: 'Fuengirola',
      lat: 36.5396,
      lng: -4.6250,
      images: ['/images/hostal/room1.svg'],
      amenities: ['wifi', 'ac', 'cocina compartida'],
      rating: 4.7,
      reviewCount: 128,
    }
  });

  const roomData = [
    { name: 'Habitación Doble 1', capacity: 2, basePriceCents: 6500 },
    { name: 'Habitación Doble 2', capacity: 2, basePriceCents: 6500 },
    { name: 'Habitación Triple', capacity: 3, basePriceCents: 8500 },
    { name: 'Suite Familiar', capacity: 4, basePriceCents: 12000 },
    { name: 'Habitación Económica 1', capacity: 2, basePriceCents: 5000 },
    { name: 'Habitación Económica 2', capacity: 2, basePriceCents: 5000 },
  ];

  for (const r of roomData) {
    await prisma.room.create({ data: { lodgingId: hostal.id, name: r.name, capacity: r.capacity, basePriceCents: r.basePriceCents, images: ['/images/hostal/room1.svg'] } });
  }

  const affiliates = [
    {
      slug: 'hotel-sol-torrox',
      title: 'Hotel Sol Torrox',
      type: 'HOTEL' as LodgingType,
      affiliateLink: 'https://www.expedia.com/aff?pid=YOUR_ID&hotelId=XXXX&utm_source=site&utm_medium=aff&utm_campaign=hotel-sol-torrox',
      city: 'Torrox',
      images: ['/images/aff/sol1.svg'],
      amenities: ['wifi', 'ac', 'pool'],
      rating: 4.3, reviewCount: 212
    },
    {
      slug: 'hotel-malaga-center',
      title: 'Hotel Málaga Center',
      type: 'HOTEL' as LodgingType,
      affiliateLink: 'https://www.expedia.com/aff?pid=YOUR_ID&hotelId=YYYY&utm_source=site&utm_medium=aff&utm_campaign=hotel-malaga-center',
      city: 'Málaga',
      images: ['/images/aff/sol1.svg'],
      amenities: ['wifi', 'ac'],
      rating: 4.1, reviewCount: 145
    },
    {
      slug: 'hotel-fuengirola-beach',
      title: 'Hotel Fuengirola Beach',
      type: 'HOTEL' as LodgingType,
      affiliateLink: 'https://www.expedia.com/aff?pid=YOUR_ID&hotelId=ZZZZ&utm_source=site&utm_medium=aff&utm_campaign=hotel-fuengirola-beach',
      city: 'Fuengirola',
      images: ['/images/aff/sol1.svg'],
      amenities: ['wifi', 'ac', 'gym'],
      rating: 4.4, reviewCount: 367
    },
    {
      slug: 'hotel-mijas-sierra',
      title: 'Hotel Mijas Sierra',
      type: 'HOTEL' as LodgingType,
      affiliateLink: 'https://www.expedia.com/aff?pid=YOUR_ID&hotelId=AAAA&utm_source=site&utm_medium=aff&utm_campaign=hotel-mijas-sierra',
      city: 'Mijas',
      images: ['/images/aff/sol1.svg'],
      amenities: ['wifi', 'breakfast'],
      rating: 4.0, reviewCount: 98
    },
    {
      slug: 'apto-playa-fuengirola',
      title: 'Apartamento Playa Fuengirola',
      type: 'APARTAMENTO' as LodgingType,
      affiliateLink: 'https://www.expedia.com/aff?pid=YOUR_ID&apartmentId=1111&utm_source=site&utm_medium=aff&utm_campaign=apto-playa-fuengirola',
      city: 'Fuengirola',
      images: ['/images/aff/sol1.svg'],
      amenities: ['wifi', 'ac'],
      rating: 4.6, reviewCount: 65
    },
    {
      slug: 'apto-malaga-centro',
      title: 'Apartamento Málaga Centro',
      type: 'APARTAMENTO' as LodgingType,
      affiliateLink: 'https://www.expedia.com/aff?pid=YOUR_ID&apartmentId=2222&utm_source=site&utm_medium=aff&utm_campaign=apto-malaga-centro',
      city: 'Málaga',
      images: ['/images/aff/sol1.svg'],
      amenities: ['wifi'],
      rating: 4.2, reviewCount: 41
    },
    {
      slug: 'apto-mijas-golf',
      title: 'Apartamento Mijas Golf',
      type: 'APARTAMENTO' as LodgingType,
      affiliateLink: 'https://www.expedia.com/aff?pid=YOUR_ID&apartmentId=3333&utm_source=site&utm_medium=aff&utm_campaign=apto-mijas-golf',
      city: 'Mijas',
      images: ['/images/aff/sol1.svg'],
      amenities: ['parking'],
      rating: 4.1, reviewCount: 23
    },
    {
      slug: 'apto-torrox-pueblo',
      title: 'Apartamento Torrox Pueblo',
      type: 'APARTAMENTO' as LodgingType,
      affiliateLink: 'https://www.expedia.com/aff?pid=YOUR_ID&apartmentId=4444&utm_source=site&utm_medium=aff&utm_campaign=apto-torrox-pueblo',
      city: 'Torrox',
      images: ['/images/aff/sol1.svg'],
      amenities: ['wifi', 'ac'],
      rating: 4.0, reviewCount: 19
    },
  ];

  for (const a of affiliates) {
    await prisma.lodging.create({
      data: {
        slug: a.slug,
        title: a.title,
        type: a.type,
        isOwned: false,
        description: a.title,
        city: a.city,
        images: a.images,
        amenities: a.amenities,
        rating: a.rating,
        reviewCount: a.reviewCount,
        affiliateLink: a.affiliateLink,
      }
    });
  }

  const activities = [
    { slug: 'paseo-barco', title: 'Paseo en barco', description: 'Ruta por la costa de Fuengirola', lat: 36.54, lng: -4.62 },
    { slug: 'visita-biotop', title: 'Bioparc Fuengirola', description: 'Parque de animales', lat: 36.544, lng: -4.623 },
    { slug: 'clase-paddle', title: 'Clases de paddle surf', description: 'Aprende en la playa', lat: 36.535, lng: -4.625 },
    { slug: 'ruta-mijas', title: 'Ruta por Mijas Pueblo', description: 'Tour panorámico', lat: 36.596, lng: -4.637 },
    { slug: 'tour-malaga', title: 'Tour Málaga Centro', description: 'Historia y tapas', lat: 36.721, lng: -4.421 },
    { slug: 'sendero-torrox', title: 'Sendero en Torrox', description: 'Naturaleza y miradores', lat: 36.758, lng: -3.952 },
  ];

  for (const act of activities) {
    await prisma.activity.create({ data: { ...act, images: ['/images/activities/act1.svg'] } });
  }
}

main().then(async () => {
  await prisma.$disconnect();
}).catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
