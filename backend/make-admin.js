const mongoose = require('mongoose');
const User = require('./src/models/User');

const email = process.argv[2];

if (!email) {
  console.error('\n❌ Please provide an email address.');
  console.error('Usage: node make-admin.js <user-email>\n');
  process.exit(1);
}

mongoose.connect('mongodb://localhost:27017/goldy-mobiles', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const user = await User.findOneAndUpdate(
      { email }, 
      { 
        role: 'admin',
        permissions: {
          canViewCostPrice: true,
          canEditPrice: true,
          canViewReports: true,
          canManageStaff: true,
        }
      }, 
      { new: true }
    );
    
    if (user) {
      console.log(`\n✅ Success! User ${user.email} is now an admin with full permissions.\n`);
    } else {
      console.log(`\n❌ User ${email} not found in the database. Make sure you sign up first.\n`);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
