import "dotenv/config";
import { verifyEmailConnection } from "../utils/email.js";

try {
  await verifyEmailConnection();
  console.log("Email connection verified. No email was sent.");
} catch (error) {
  console.error("Email connection failed:", error.message);
  process.exitCode = 1;
}
