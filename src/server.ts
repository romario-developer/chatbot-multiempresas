import { env } from './config/env';
import { app } from './app.ts';

const port = env.port;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
