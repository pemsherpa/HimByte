import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { sendGuestEmail } from '../src/lib/mailer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const to = process.argv[2];
if (!to) {
  console.error('Usage: node scripts/test-email.mjs <toEmail>');
  process.exit(1);
}

const r = await sendGuestEmail({
  to,
  subject: 'Himbyte SMTP test',
  text: 'If you received this email, SMTP is configured correctly.',
  html: '<p>If you received this email, SMTP is configured correctly.</p>',
});

console.log(r);
