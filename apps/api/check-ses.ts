import { SESv2Client, GetEmailIdentityCommand } from "@aws-sdk/client-sesv2";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

const ses = new SESv2Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function main() {
  const cmd = new GetEmailIdentityCommand({ EmailIdentity: "libraryy.in" });
  const res = await ses.send(cmd);
  console.log(JSON.stringify(res.MailFromAttributes, null, 2));
}
main();
