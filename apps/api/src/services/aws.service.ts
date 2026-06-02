import {
  SESv2Client,
  CreateEmailIdentityCommand,
  GetEmailIdentityCommand,
  DeleteEmailIdentityCommand,
  PutEmailIdentityMailFromAttributesCommand
} from "@aws-sdk/client-sesv2";

const ses = new SESv2Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function addDomainToSes(domain: string): Promise<string[]> {
  try {
    const cmd = new CreateEmailIdentityCommand({
      EmailIdentity: domain,
    });
    const res = await ses.send(cmd);
    
    try {
      const mailFromCmd = new PutEmailIdentityMailFromAttributesCommand({
        EmailIdentity: domain,
        BehaviorOnMxFailure: "USE_DEFAULT_VALUE",
        MailFromDomain: `bounces.${domain}`,
      });
      await ses.send(mailFromCmd);
    } catch (e) {
      console.error(`[SES] Failed to set MAIL FROM for ${domain}:`, e);
    }
    
    if (res.DkimAttributes && res.DkimAttributes.Tokens) {
      return res.DkimAttributes.Tokens;
    }
    return [];
  } catch (error) {
    console.error(`[SES] Failed to add domain ${domain} to SES:`, error);
    throw error;
  }
}

export async function getDomainSesStatus(domain: string): Promise<{ dkimVerified: boolean, mailFromVerified: boolean }> {
  try {
    const cmd = new GetEmailIdentityCommand({
      EmailIdentity: domain,
    });
    const res = await ses.send(cmd);
    
    const dkimVerified = res.DkimAttributes?.Status === "SUCCESS";
    const mailFromVerified = res.MailFromAttributes?.MailFromDomainStatus === "SUCCESS";
    
    return { dkimVerified, mailFromVerified };
  } catch (error) {
    console.error(`[SES] Failed to get status for domain ${domain}:`, error);
    return { dkimVerified: false, mailFromVerified: false };
  }
}

export async function removeDomainFromSes(domain: string): Promise<void> {
  try {
    const cmd = new DeleteEmailIdentityCommand({
      EmailIdentity: domain,
    });
    await ses.send(cmd);
  } catch (error) {
    console.error(`[SES] Failed to delete domain ${domain} from SES:`, error);
  }
}
