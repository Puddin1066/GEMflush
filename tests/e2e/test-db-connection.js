/**
 * Database Connection Test Script
 * Tests connection to Supabase PostgreSQL database
 */

require('dotenv').config();
const postgres = require('postgres');

async function testConnection() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('=== Database Connection Test ===');
  console.log('Connection URL (masked):', dbUrl.replace(/:[^:@]+@/, ':****@'));
  console.log('Host:', dbUrl.match(/@([^:]+)/)?.[1] || 'unknown');
  console.log('Port:', dbUrl.match(/:(\d+)\//)?.[1] || 'unknown');
  console.log('Database:', dbUrl.match(/\/([^?]+)/)?.[1] || 'unknown');
  console.log('');

  // Check for URL encoding in password
  if (dbUrl.includes('%')) {
    console.log('⚠️  Warning: Connection string contains URL encoding (%40, etc.)');
    console.log('   This might need to be decoded or connection string reformatted');
    console.log('');
  }

  console.log('Attempting connection...');
  
  const sql = postgres(dbUrl, {
    max: 1,
    timeout: 20,
    connect_timeout: 20,
    idle_timeout: 10,
    ssl: 'require', // Supabase requires SSL
  });

  try {
    const result = await sql`SELECT 1 as test, version() as pg_version, current_database() as db_name`;
    console.log('✅ Connection successful!');
    console.log('');
    console.log('Query result:', result[0]?.test);
    console.log('Database name:', result[0]?.db_name);
    console.log('PostgreSQL version:', result[0]?.pg_version?.split(',')[0] || 'Unknown');
    console.log('');
    
    // Test if we can query a table
    try {
      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        LIMIT 5
      `;
      console.log('✅ Can query tables');
      console.log('Sample tables:', tables.map(t => t.table_name).join(', '));
    } catch (err) {
      console.log('⚠️  Could not query tables (this might be normal):', err.message);
    }
    
    await sql.end();
    console.log('');
    console.log('✅ All tests passed!');
    process.exit(0);
    
  } catch (err) {
    console.error('');
    console.error('❌ Connection failed!');
    console.error('');
    console.error('Error details:');
    console.error('  Type:', err.constructor.name);
    console.error('  Message:', err.message);
    console.error('  Code:', err.code || 'N/A');
    
    if (err.detail) console.error('  Detail:', err.detail);
    if (err.hint) console.error('  Hint:', err.hint);
    if (err.position) console.error('  Position:', err.position);
    
    console.error('');
    console.error('Common issues:');
    console.error('  1. Check if Supabase database is active');
    console.error('  2. Verify connection string format');
    console.error('  3. Check firewall/IP restrictions');
    console.error('  4. Try connection pooler port (6543) vs direct port (5432)');
    console.error('  5. Verify SSL/TLS settings');
    
    await sql.end().catch(() => {});
    process.exit(1);
  }
}

testConnection();

