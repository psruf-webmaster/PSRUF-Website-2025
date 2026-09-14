require('dotenv').config();
const mongoose = require('mongoose');

const LEGACY_COLLECTION_NAMES = [
  'PositionsHistory',
  'positionsHistory',
  'positionHistory',
  'positionshistories',
  'positionhistories',
];

async function dropLegacyCollections(db) {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const existingNames = new Set(collections.map((collection) => collection.name));

  for (const name of LEGACY_COLLECTION_NAMES) {
    if (!existingNames.has(name)) {
      continue;
    }

    await db.collection(name).drop();
    console.log(`Dropped legacy collection: ${name}`);
  }
}

async function removeEmbeddedHistory(db) {
  const result = await db.collection('users').updateMany(
    {
      $or: [
        { positionsHistory: { $exists: true } },
        { roleHistory: { $exists: true } },
        { memberStatusHistory: { $exists: true } },
      ],
    },
    {
      $unset: {
        positionsHistory: '',
        roleHistory: '',
        memberStatusHistory: '',
      },
    }
  );

  console.log(`Removed embedded history fields from ${result.modifiedCount} user document(s)`);
}

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(process.env.MONGO_URI);

  try {
    const db = mongoose.connection.db;
    await dropLegacyCollections(db);
    await removeEmbeddedHistory(db);
    console.log('Member history removal migration completed');
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Member history removal migration failed:', error);
  process.exit(1);
});