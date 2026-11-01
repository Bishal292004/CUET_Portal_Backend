import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { startEmailWorker, stopEmailWorker } from "./jobs/emailWorker.js";

const PORT = process.env.PORT || 5000;

await connectDB();
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

startEmailWorker();

// Let the email being sent finish before the process exits (Ctrl+C or a hosting restart)
async function shutdown() {
  await stopEmailWorker();
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
