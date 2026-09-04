import { Container } from "#/composition/utils/container.js";
import { env } from "#/infrastructure/config/env.js";
import { createServer } from "#/infrastructure/http/server/index.js";

async function bootstrap() {
  const container = new Container();
  const app = createServer(container);

  const port = env.PORT || 3000;

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

bootstrap();
