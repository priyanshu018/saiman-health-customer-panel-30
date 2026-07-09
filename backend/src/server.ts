import app from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Admin API running on port ${env.PORT}`);
});
