// Test admin registration using fetch
async function testAdminRegistration() {
  try {
    console.log('Testing admin registration...');
    const API_URL = process.env.API_URL || 'http://localhost:5000/api';
    const ADMIN_CODE = process.env.ADMIN_CODE || 'replace-with-admin-code';

    const registerResponse = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin_test4',
        email: 'admin4@test.com',
        password: 'password123',
        adminCode: ADMIN_CODE
      })
    });
    console.log('Register response status:', registerResponse.status);
    const registerData = await registerResponse.json();
    console.log('Registration response:', JSON.stringify(registerData, null, 2));

    if (registerData.error) {
      console.error('Registration failed:', registerData.error);
      return;
    }

    // Test login
    console.log('Testing admin login...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin4@test.com',
        password: 'password123'
      })
    });
    const loginData = await loginResponse.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));

    if (!loginData.token) {
      console.error('No token received from login');
      return;
    }

    // Test admin endpoint
    console.log('Testing admin endpoint...');
    const adminResponse = await fetch(`${API_URL}/entries/admin/all`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    const adminData = await adminResponse.json();
    console.log('Admin entries response:', JSON.stringify(adminData, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAdminRegistration();
