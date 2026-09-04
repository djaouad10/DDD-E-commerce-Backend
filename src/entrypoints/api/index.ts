import { buildApiContainer } from "#/composition/roots/api.composition.js";
import { env } from "#/infrastructure/config/env.js";
import { createServer } from "#/infrastructure/http/server/index.js";

async function bootstrap() {
  const container = buildApiContainer();
  const app = await createServer(container);

  const port = env.PORT || 3000;

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

bootstrap();
