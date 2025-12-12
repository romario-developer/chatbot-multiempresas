import { env } from './config/env';
<<<<<<< HEAD
import { app } from './app.ts';
=======
import app from './app.ts';
>>>>>>> e55016d (Atualizacao automatica)

const port = env.port;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
