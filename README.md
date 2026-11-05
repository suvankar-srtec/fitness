# Form - Next.js + Neon PostgreSQL

Requires Node.js 22.13+. Accounts, members, sessions and login rate limits use PostgreSQL. The old SQLite backup in `data/` is preserved locally and is not used by the app.

## Deployment files

Deploy `app/`, `lib/`, `scripts/`, `package.json`, and `package-lock.json`. Install with `npm ci` and build with `npm run build`. Configure `DATABASE_URL` and optional WhatsApp settings in your hosting provider's environment settings.

`.vercelignore` and `.dockerignore` exclude installed dependencies, local build output, caches, browser test profiles, tests and database backups from the upload/build context. `.gitignore` also prevents generated files and temporary browser profiles from being committed. Keep local `.env.local` private. The deployment host installs dependencies and generates its own build. Source tests remain available locally.

## Setup

1. In Neon, open Connect > Node.js > .env. Enable connection pooling and copy the full connection string with its password.
2. Paste the URL into the ignored .env.local file as DATABASE_URL="your-full-neon-url". Keep sslmode=require in the URL. Never use a NEXT_PUBLIC_ prefix for database credentials.
3. Run npm.cmd install, then npm.cmd run db:setup, then npm.cmd run dev.
4. Open http://localhost:3000. Initial main superadmin user ID: sp00; password: sp00. Existing accounts keep their passwords.

Setup is repeatable and preserves existing accounts. Until the connection and schema are ready, the login page shows a database configuration error.

## Existing records

After db:setup, optionally run npm.cmd run db:import-sqlite before creating records in Neon. Requires Node.js with built-in SQLite support (installed Node.js 26 works). Stop other app instances during import. The target must have no admins or members. Import preserves internal account/member keys, password hashes and ownership, and generates the current public ID format in one transaction; it does not delete the SQLite source.

## Commands

- npm.cmd run dev: development server.
- npm.cmd run build: production build.
- npm.cmd start: run the production build.
- npm.cmd test: password and token tests.

Superadmin creates admins with any nonempty password, without password length rules. Login uses the displayed user ID plus password. Admins add members with database-generated IDs and see only their own members. Members are records, not login accounts. Login and creation password fields have eye buttons.

Passwords use salted scrypt. Session token hashes persist in PostgreSQL, expire after eight hours and survive server restarts. Production cookies require HTTPS. On a production host, configure DATABASE_URL as a server-only variable and initialize its database before use. Replace the initial password before public deployment; password management UI is not included.

## WhatsApp and table actions

Phone fields use a country dropdown with flags, defaulting to India (+91). Staff credential sharing opens a prefilled WhatsApp message. Member Send Whatsapp generates a gate-pass PNG and submits it through WhatsApp Business Cloud API. The preview includes gym logo/initial, member photo/initial, member ID, name, plan, validity, QR and renewal notice. Gate passes can also be downloaded. Passwords for newly created staff remain only in page memory; after refresh the assigned password is verified before sharing. Admins manage their own gym records; superadmins manage across gyms.

Add Supervisor requires selecting Gym / Branch. Gym admins can select only their own gym; sp00 can select any existing gym owner. The assignment is shown in the supervisor directory. QR attendance checks the stored supervisor assignment against the member's gym on the server; a QR from another gym is rejected even if client-supplied gym fields are altered. This is gym/branch assignment, not GPS tracking.

### WhatsApp Business setup

Set these server-only variables in `.env.local`, then restart the server:

```dotenv
WHATSAPP_ACCESS_TOKEN=your-system-user-access-token
WHATSAPP_PHONE_NUMBER_ID=your-business-phone-number-id
WHATSAPP_GATE_PASS_TEMPLATE=gym_gate_pass
WHATSAPP_TEMPLATE_LANGUAGE=en
WHATSAPP_API_VERSION=v25.0
```

In Meta WhatsApp Manager, create and approve the `gym_gate_pass` template in English (`en`) with an **IMAGE header**. The uploaded header is the generated gate-pass image, including the gym logo and QR. The body has seven positional text parameters in this order: member name, gym name, member ID, plan, valid-from date, valid-to date, renewal message. Suggested body:

```text
Hello {{1}}, your {{2}} gate pass is attached.
Member ID: {{3}}
Plan: {{4}}
Valid from: {{5}}
Valid to: {{6}}
Show this QR code to your supervisor for attendance.
{{7}}
```

If Meta approves a different template name or English locale, set those exact values in the environment variables. Credentials are never sent to the browser. Without credentials the gate pass remains previewable/downloadable and the app explicitly reports that delivery is not configured. A successful send means Meta accepted the message; receipt/delivery is subject to Meta and the recipient's account. The app stores the Meta message ID and does not automatically repeat an ambiguous send. Separate, explicit Send Whatsapp clicks are new send requests.

Official reference: [Meta WhatsApp Business Platform: template media messages](https://www.postman.com/meta/whatsapp-business-platform/request/2qbotrb/send-message-template-media).

## Supervisor QR scanner

Supervisor login opens Dashboard with Total Members, Joined This Month and today's checked-in members. The live camera is available only on the separate Scan QR page; Dashboard does not request camera access. Dashboard, Scan QR and Attendance Sheet are available in the sidebar on desktop and bottom navigation on mobile. Scan QR shows today's Present and Absent counts. Counts update after a successful scan. The camera stops when navigating to the read-only attendance sheet. Supervisors cannot access the member directory or management actions. Camera access requests the rear camera and requires permission. Use HTTPS when accessing the app from Android; a plain HTTP LAN address cannot access the camera. Browser localhost is allowed only on the device hosting the browser. Android WebView packaging must grant camera permission and support getUserMedia.

A successful QR read stops the camera and submits the secure gate-pass token to the server. The server resolves current member data, checks the supervisor's gym, member status and today's validity in Asia/Kolkata, then marks Present. Repeated scans keep one attendance row per member/day. Expired, inactive, upcoming or unset memberships are not marked present and show the membership/renewal notice. QR names/dates are informational; the server trusts the stored member record and token. Plain member IDs and unrelated QR data cannot mark attendance. Scan QR Image supports saved gate-pass images. Stop, scan-next, logout and backgrounding release the camera. Physical Android camera verification remains required.

Attendance is read-only outside the QR scanner. The Attendance Sheet starts with today and lists every member registered by the selected date, including members with no scan. Only a supervisor QR scan makes a row Present; all other rows are Absent. Historical ranges show one member/day row, never multiple rows for repeated scans. Counts use those rows. The sheet refreshes every 10 seconds while visible, on focus, and immediately for scan notifications from another tab on the same browser. Manual attendance menus and write endpoints are removed. Existing supervisor scan records are retained as QR attendance; historical manual entries are not treated as scans.

## Membership plans

Admins use Add plan in the sidebar to create named plans. Plans persist in Neon and appear in that admin's Add member dropdown. Plan names must be unique within the admin account. Membership creation verifies plan ownership on the server. Existing member plan labels are backfilled into the plans table during db:setup; existing memberships keep their labels. New admins start without plans.

Plans now include name, duration in days, amount in INR (stored as decimal), and description. View Plan uses searchable cards with Edit and Delete actions. Deleting archives a plan so it cannot be selected for a new member, while existing member records remain intact. Historical name-only plans keep their data; edit them to supply missing duration and amount. Plan edits apply to future member selections; existing membership labels are preserved.

## Member registration

Add Member opens a full registration form: database-generated registration number, name, gender, age, phone with country selector, address, height in feet, weight in kilograms, interested area, Active/Inactive status, membership plan, valid-from/to dates and profile picture. Plan duration pre-fills the end date; it remains editable. Date-only values are returned as YYYY-MM-DD to avoid timezone shifts. Profile images (JPG/PNG/WebP, up to 2 MB) are validated, stripped of metadata and resized to JPEG up to 512 pixels. They are stored separately in Neon and served only to authorized accounts. Existing registrations are preserved.

Registration numbers are reserved from PostgreSQL when Add Member opens and displayed before submission. Reservations are private to the creating admin, expire after two hours and can be consumed only once. Cancellation can leave gaps in registration numbers; no draft member is created. Desktop registration uses three columns, tablet two and phone one. The desktop dashboard uses four summary cards and two content columns, while mobile remains stacked.

## Memberships, payments and reports

Membership contains Assign Membership and Membership Payments. Admins assign or renew plans for their own members; superadmin can review all memberships and payments. Assignments snapshot the plan name, fee and validity dates. New registrations create an initial unpaid assignment when the selected plan has a price; historical registrations are not retroactively billed.

Membership cards show registration number, name, plan, validity, amount, paid, due and payment status. Actions record manual payments (Cash/Online), open printable receipts and show payment history. These controls record payments already received; they do not process external charges. PostgreSQL updates balances atomically and prevents overpayment and duplicate request keys. Membership and payment records protect linked members from deletion.

Reports includes Member Information, Payment Transactions, Payment Due Report and Attendance. Member and payment reports use real scoped records. The attendance report lists all registered members per selected day, with Present derived only from supervisor QR scans and Absent for members without a scan.

## Gym name

Superadmin enters the gym name when creating an admin. Admin and supervisor sidebars and browser titles use that saved name; supervisors inherit it from their creating admin. Existing admin accounts without a gym-name field retain the name supplied when the admin was created. The superadmin platform and unauthenticated login use Gym Management.

## User management

The Users table shows Edit and Delete actions only to superadmin. Server-side PATCH/DELETE /api/users enforce this role. Editing supports name, phone, an admin's gym name and an optional password reset; IDs and roles are immutable. Password resets revoke the edited account's other sessions. Superadmin cannot be deleted. Linked member, supervisor or financial records prevent deleting their parent user.

Payment Transactions Report now provides inclusive from/to date filters and a payment-method filter, responsive transaction cards, the exact filtered total, CSV download, and a print layout. Export and print use only the currently filtered authorized records. CSV values are quoted and escaped, with spreadsheet formulas neutralized.

Payment modes are restricted to Cash and Online in forms, filters, API validation, and the PostgreSQL constraint. Existing non-cash payments are migrated to Online; amounts and balances are preserved. Attendance is recorded exclusively through supervisor gate-pass scans, once per member per day. The read-only sheet lists scanned members as Present and unscanned members as Absent, with member search, status filtering and date ranges. Admins access only their gym; superadmins can review attendance across gyms.

## Public ID format

The only superadmin is sp00, with no gym association. Additional superadmin creation is disabled in the UI, API and database. Setup seeds sp00 with password sp00 only when the account does not exist; existing passwords are preserved. Retired superadmin accounts are removed only after creator and audit references are reassigned to sp00; gym-owned data is preserved. Gym cards contain admins and supervisors only. Admin, supervisor and member IDs use independent PostgreSQL sequences (ad01, sup01 and mem01). Registration, memberships, attendance, reports, CSV, WhatsApp and QR matching use persisted IDs; cancelled creations can leave gaps.

Memberships enforce one active assignment per member, plan and validity period. Exact unpaid duplicates without payment history are retained as superseded audit records, while the paid assignment remains visible. Payment requests cannot target superseded assignments. New duplicate assignments return a clear conflict message; renewals for different dates remain allowed.

Gym locations: select a Gym, then select or type its Location when creating or editing a supervisor. New names are saved under that gym and reused in the dropdown. Members also have a Location. Supervisors can scan gate passes and view attendance only for their assigned gym location. Existing records start under Main location.

WapMonkey WhatsApp delivery (default provider): set WAPMONKEY_API_KEY and WAPMONKEY_DEVICE_TOKEN in .env.local, and APP_URL to the deployed public HTTPS app address. Restart the server after changing settings. The existing Send Whatsapp action sends the member message and an expiring signed QR image URL through /v1/sendmessage. Localhost images cannot be fetched by WapMonkey. No automatic retry is made after an ambiguous send response; check Show API Messages. A successful WapMonkey response example is still needed to confirm its message ID field. Set WHATSAPP_PROVIDER=meta to use the previous Meta Cloud configuration instead.
