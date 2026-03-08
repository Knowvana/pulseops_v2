// Quick diagnostic: check if moduleGateway has any routes registered
import { moduleGateway } from './api/src/core/modules/moduleGateway.js';
console.log('Gateway stack length:', moduleGateway.stack?.length || 0);
console.log('Gateway stack:', JSON.stringify(moduleGateway.stack?.map(l => ({
  route: l.route?.path,
  regexp: l.regexp?.toString(),
  name: l.name
})), null, 2));
