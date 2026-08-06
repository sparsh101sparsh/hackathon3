export interface SendVerificationEmailOptions {
  email: string;
  code: string;
  purpose: 'SIGNUP' | 'LOGIN' | 'RESET_PASSWORD';
  name?: string;
}

export interface SendVerificationEmailResult {
  success: boolean;
  error?: string;
  /** Only populated when a real email could not be sent (dev mode or missing API key) */
  devCode?: string;
}

const RESEND_DEFAULT_FROM = 'CodeForge <onboarding@resend.dev>';
const RESEND_FROM_PLACEHOLDER = 'CodeForge <auth@yourdomain.com>';

export function hasConfiguredEmailSender(): boolean {
  const fromAddress = process.env.RESEND_FROM_EMAIL || RESEND_DEFAULT_FROM;
  return (
    Boolean(process.env.RESEND_FROM_EMAIL) &&
    fromAddress !== RESEND_DEFAULT_FROM &&
    fromAddress !== RESEND_FROM_PLACEHOLDER &&
    !fromAddress.includes('yourdomain.com')
  );
}

export function hasConfiguredEmailVerification(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim()) && hasConfiguredEmailSender();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

/**
 * Sends a 6-digit Email Verification OTP code via Resend API or Dev Fallback Logger.
 */
export async function sendVerificationEmail(
  options: SendVerificationEmailOptions
): Promise<SendVerificationEmailResult> {
  const { email, code, purpose, name } = options;
  const safeName = name ? escapeHtml(name) : '';
  const resendApiKey = process.env.RESEND_API_KEY || '';
  const fromAddress = process.env.RESEND_FROM_EMAIL || RESEND_DEFAULT_FROM;
  const isProduction = process.env.NODE_ENV === 'production';
  const hasConfiguredSender = hasConfiguredEmailSender();

  let subject = `${code} is your CodeForge Verification Code`;
  let purposeDescription = 'verification';

  if (purpose === 'SIGNUP') {
    subject = `${code} is your CodeForge Sign-Up Verification Code`;
    purposeDescription = 'account creation';
  } else if (purpose === 'LOGIN') {
    subject = `${code} is your CodeForge Sign-In Verification Code`;
    purposeDescription = 'sign-in';
  } else if (purpose === 'RESET_PASSWORD') {
    subject = `${code} is your CodeForge Password Reset Code`;
    purposeDescription = 'password reset';
  }

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 540px; margin: 0 auto; background-color: #020817; color: #f8fafc; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 24px; font-weight: 800; color: #38bdf8; margin: 0;">CodeForge</h1>
        <p style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Enterprise Competitive Programming & Interview Prep</p>
      </div>

      <div style="background-color: #0f172a; padding: 24px; border-radius: 12px; border: 1px solid #1e293b; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 14px; color: #cbd5e1; margin-top: 0;">
          ${safeName ? `Hello <strong>${safeName}</strong>,`: 'Hello,'}
        </p>
        <p style="font-size: 13px; color: #94a3b8;">
          Your 6-digit verification code for CodeForge <strong>${purposeDescription}</strong> is:
        </p>
        <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #38bdf8; margin: 20px 0; padding: 12px; background-color: #020817; border-radius: 8px; border: 1px dashed #0284c7;">
          ${code}
        </div>
        <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
          This verification code will expire in <strong>10 minutes</strong>. If you did not request this, please ignore this email.
        </p>
      </div>

      <div style="text-align: center; border-top: 1px solid #1e293b; padding-top: 16px;">
        <p style="font-size: 11px; color: #475569; margin: 0;">
          CodeForge Team
        </p>
      </div>
    </div>
  `;

  if (isProduction && !resendApiKey) {
    return { success: false, error: 'Email verification is not configured yet. Missing RESEND_API_KEY.' };
  }

  if (isProduction && !hasConfiguredSender) {
    return { success: false, error: 'Email verification is not configured yet. Set RESEND_FROM_EMAIL to a verified sender.' };
  }

  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          from: fromAddress,
          to: [email],
          subject,
          html: htmlContent,
          text: `Your CodeForge ${purposeDescription} verification code is ${code}. This code expires in 10 minutes.`,
        }),
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errText = await response.text();
        console.warn('[Resend API Warning]:', errText);
        if (isProduction) {
          return { success: false, error: 'Email provider rejected the verification email.' };
        }
      }
    } catch (err: unknown) {
      console.warn('[Email Transport Notice]: Error sending email via Resend:', err instanceof Error ? err.message : err);
      if (isProduction) {
        return { success: false, error: 'Email provider could not be reached.' };
      }
    }
  }

  if (isProduction) {
    return { success: false, error: 'Email verification is not configured yet.' };
  }

  // Development Fallback Logging
  console.log('\n=============================================================');
  console.log(` [DEV EMAIL OTP GENERATED FOR ${email.toUpperCase()}]`);
  console.log(` Verification Code: ${code}`);
  console.log(` Purpose: ${purpose}`);
  console.log('=============================================================\n');

  // Return the code so the API layer can surface it in development / when email is unavailable
  return { success: true, devCode: code };
}
