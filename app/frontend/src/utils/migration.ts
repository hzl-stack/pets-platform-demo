import { createClient } from '@metagptx/web-sdk';

const client = createClient();

export async function runMigration() {
  try {
    const response = await client.apiCall.invoke({
      url: '/api/v1/migration/add_shop_id_column',
      method: 'POST',
      data: {},
    });
    
    console.log('Migration result:', response.data);
    return response.data;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}