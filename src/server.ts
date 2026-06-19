import { app } from "./app.js";
import { env } from "./infrastructure/config/env.js";

const port = env.PORT || 3000;

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
