import { db } from './lib/db/drizzle.ts';
import { teams } from './lib/db/schema.ts';
import { eq } from 'drizzle-orm';

async function testConnection() {
  try {
    // Test basic query
    const result = await db.select().from(teams).limit(1);
    console.log('✅ Database connection works!');
    console.log(`✅ Found ${result.length} team(s) in database`);
    
    // Test update (on first team if exists)
    if (result.length > 0) {
      const testTeam = result[0];
      const originalPlan = testTeam.planName;
      
      // Try to update and verify
      await db.update(teams)
        .set({ planName: 'pro' })
        .where(eq(teams.id, testTeam.id));
      
      const [updated] = await db.select()
        .from(teams)
        .where(eq(teams.id, testTeam.id))
        .limit(1);
      
      if (updated.planName === 'pro') {
        console.log('✅ Database updates work!');
        // Restore original
        await db.update(teams)
          .set({ planName: originalPlan })
          .where(eq(teams.id, testTeam.id));
        console.log('✅ Restored original plan');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
