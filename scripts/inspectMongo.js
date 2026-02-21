require('dotenv').config({ path: './.env.local' });
const mongoose = require('mongoose');
const models = require('../src/lib/models');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI in .env.local');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { bufferCommands: false });
    console.log('Connected to MongoDB');
    const Course = models.Course;
    const courses = await Course.find().lean();
    console.log('Courses from MongoDB:');
    console.log(JSON.stringify(courses, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error('Mongo error:', err.message || err);
    process.exit(1);
  }
}

run();
