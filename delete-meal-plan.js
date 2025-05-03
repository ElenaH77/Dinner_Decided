// Script to delete meal plan with ID 14
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import 'dotenv/config';
import ws from 'ws';

// Configure Neon to use WebSockets
neonConfig.webSocketConstructor = ws;

async function deleteMealPlan() {
  try {
    console.log('Connecting to database...');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Delete related grocery lists first
    console.log('Deleting related grocery lists...');
    const groceryResult = await pool.query(
      'DELETE FROM grocery_lists WHERE meal_plan_id = 14 RETURNING id'
    );
    console.log(`Deleted ${groceryResult.rowCount} grocery list(s) related to meal plan 14`);
    
    // Now delete the meal plan
    console.log('Deleting meal plan 14...');
    const result = await pool.query(
      'DELETE FROM meal_plans WHERE id = 14 RETURNING id'
    );
    
    if (result.rowCount > 0) {
      console.log(`Successfully deleted meal plan with ID 14`);
      
      // Now ensure only one meal plan is active
      console.log('Making sure only one meal plan is active...');
      const activeResult = await pool.query(
        'UPDATE meal_plans SET is_active = (id = 30) RETURNING id, is_active'
      );
      
      console.log(`Updated active status for ${activeResult.rowCount} meal plans`);
      console.log('Updated meal plans:', activeResult.rows);
    } else {
      console.log('No meal plan with ID 14 was found');
    }
    
    // Close the pool
    await pool.end();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error deleting meal plan:', error);
  }
}

deleteMealPlan();
