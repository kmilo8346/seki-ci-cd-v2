import Subscriber from '@team_seki/subscriber-plugin';
import * as handlers from './handlers'
import secrets from './config/secrets';

type handlerKey = keyof typeof handlers;
const port = secrets.COMMIT_TO_TASK_SERVER_PORT;

Subscriber.boot({
  port,
  handlers: (Object
    .keys(handlers) as Array<handlerKey>)
    .map((key: handlerKey) => handlers[key])
}, () => {
  console.log('All handlers are ready');
  console.log(`🚀 Health is running on: http://localhost:${port}/health \n`);
})