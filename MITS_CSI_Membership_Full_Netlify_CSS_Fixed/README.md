# MITS Professional Society Membership — Netlify + Razorpay + Google Form

This project is ready for GitHub -> Netlify deployment.

## Workflow

1. Student enters membership details on the website.
2. Netlify Function creates a Razorpay order server-side.
3. Razorpay Checkout opens.
4. After payment, the server verifies the Razorpay signature and fetches the payment from Razorpay.
5. The student is redirected to your Google Form with student/payment details pre-filled.
6. The student uploads the photograph (if your Google Form contains a File Upload field) and submits.
7. The linked Google Sheet stores the final response.

## IMPORTANT SECURITY

Never commit `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` to GitHub.
Add secrets in Netlify: Project configuration -> Environment variables.

If a Razorpay secret was shared in chat/email/publicly, regenerate it before production use.

## Deploy

1. Extract this ZIP.
2. Create a GitHub repository.
3. Upload all project files.
4. In Netlify choose "Add new project" -> "Import an existing project" -> GitHub.
5. Select the repository. Netlify reads `netlify.toml` automatically.
6. Add all required values from `.env.example` in Netlify Environment Variables.
7. Deploy.
8. Test with Razorpay Test Mode.
9. When approved, replace Test Key ID/Secret with Live credentials in Netlify only.

## Google Form mapping — one remaining configuration

Your Google Form URL is already included in `.env.example`.

Google does not expose field `entry.xxxxx` IDs through the short `forms.gle` link in a reliable deployment API. To pre-fill the correct fields, obtain a pre-filled link:

Google Form editor -> three dots -> Pre-fill form -> fill sample values -> Get link.

The generated URL contains values such as:

`entry.123456789=TEST`

Set the matching numeric IDs in Netlify:
`GOOGLE_ENTRY_NAME`, `GOOGLE_ENTRY_BRANCH`, etc.

If an entry ID is left blank, that field is simply not pre-filled. The website still works and opens your Google Form after verified payment.

## Photograph

Google Forms File Upload questions cannot be uploaded by this static website through a pre-filled URL. Keep the photo as a File Upload question in Google Form. After successful payment, the student is sent to the Google Form, uploads the photograph, and submits.

## Razorpay webhook

After deployment, configure the webhook URL in Razorpay as:

`https://YOUR-SITE.netlify.app/api/webhook`

Set the same webhook secret in Netlify as `RAZORPAY_WEBHOOK_SECRET`.

The webhook verifies the `X-Razorpay-Signature` header and acknowledges valid events.

## Recommended Google Form columns

- Student Name
- Roll Number
- Branch
- Year
- Phone Number
- Email ID
- CSI Membership ID
- CSI Membership Validity
- Amount Paid
- Payment Status
- Razorpay Payment ID
- Razorpay Order ID
- Payment Date
- Payment Method
- Digital Photograph

## Later updates

College name, department, address, society name, membership fee, society URL, validity, contact details and form field IDs can all be changed through Netlify Environment Variables without changing the application logic.
