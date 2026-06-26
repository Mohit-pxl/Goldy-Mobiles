const fetch = require('node-fetch');

const API_URL = 'http://localhost:5000/api';
let token = '';
let customerId = '';
let productId = '';

async function testApi() {
  try {
    console.log('--- Starting API Integration Tests ---');

    // 1. Register
    console.log('1. Testing Register...');
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Admin',
        phone: '1234567890',
        email: `admin${Date.now()}@example.com`,
        password: 'password123'
      })
    });
    const regData = await regRes.json();
    if (!regRes.ok) throw new Error(`Register failed: ${JSON.stringify(regData)}`);
    console.log('✅ Register successful');
    token = regData.data.token;

    // Optional: make this user an admin using DB directly for the rest of tests
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldy-mobiles');
    const User = require('./src/models/User');
    await User.findByIdAndUpdate(regData.data.user._id, { role: 'admin' });
    console.log('✅ Made test user admin');

    // 2. Create Product
    console.log('2. Testing Create Product...');
    const prodRes = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Test Phone X',
        brand: 'TestBrand',
        category: 'Mobiles',
        costPrice: 500,
        sellingPrice: 1000,
        stock: 10,
        lowStockThreshold: 2
      })
    });
    const prodData = await prodRes.json();
    if (!prodRes.ok) throw new Error(`Create Product failed: ${JSON.stringify(prodData)}`);
    console.log('✅ Create Product successful');
    productId = prodData.data._id;

    // 3. Create Customer
    console.log('3. Testing Create Customer...');
    const custRes = await fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'John Doe',
        phone: '9876543210'
      })
    });
    const custData = await custRes.json();
    if (!custRes.ok) throw new Error(`Create Customer failed: ${JSON.stringify(custData)}`);
    console.log('✅ Create Customer successful');
    customerId = custData.data._id;

    // 4. Create Invoice (Credit Sale to increase Khata due)
    console.log('4. Testing Create Invoice...');
    const invRes = await fetch(`${API_URL}/billing/invoices`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customer: { _id: customerId, name: 'John Doe', phone: '9876543210' },
        items: [{
          product: { _id: productId, name: 'Test Phone X' },
          qty: 1,
          price: 1000
        }],
        subtotal: 1000,
        total: 1000,
        paymentMode: 'credit',
        paidAmount: 0
      })
    });
    const invData = await invRes.json();
    if (!invRes.ok) throw new Error(`Create Invoice failed: ${JSON.stringify(invData)}`);
    console.log('✅ Create Invoice successful');

    // 5. Verify Customer Due Balance
    console.log('5. Testing Khata Due Balance...');
    const custFetchRes = await fetch(`${API_URL}/customers/${customerId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const custFetchData = await custFetchRes.json();
    if (custFetchData.data.totalDue !== 1000) {
      throw new Error(`Expected totalDue to be 1000, got ${custFetchData.data.totalDue}`);
    }
    console.log('✅ Customer totalDue correctly updated to 1000');

    // 6. Record Khata Payment
    console.log('6. Testing Record Payment...');
    const payRes = await fetch(`${API_URL}/customers/${customerId}/payments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: 500,
        paymentMode: 'cash'
      })
    });
    const payData = await payRes.json();
    if (!payRes.ok) throw new Error(`Record Payment failed: ${JSON.stringify(payData)}`);
    console.log('✅ Record Payment successful');

    // 7. Verify Customer Due Balance again
    console.log('7. Testing Khata Due Balance after payment...');
    const custFetchRes2 = await fetch(`${API_URL}/customers/${customerId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const custFetchData2 = await custFetchRes2.json();
    if (custFetchData2.data.totalDue !== 500) {
      throw new Error(`Expected totalDue to be 500, got ${custFetchData2.data.totalDue}`);
    }
    console.log('✅ Customer totalDue correctly updated to 500');

    console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
  } finally {
    process.exit(0);
  }
}

testApi();
