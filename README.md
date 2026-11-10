# Twyn — Capacitor MVP

A two-person comparison app. No registration form: it uses Supabase anonymous guest sessions.

## 1. Requirements
- Node.js LTS
- VS Code
- A Supabase project
- For Android packaging later: Android SDK/Gradle. Android Studio is not needed for browser development.

## 2. Install and run
Open this folder in VS Code, then in the terminal:

```powershell
npm install
npm run dev
```

Open the local URL shown by Vite (usually http://localhost:5173).

## 3. Configure Supabase
1. Create a project at https://supabase.com.
2. In Authentication > Providers, enable **Anonymous Sign-Ins**.
3. Open SQL Editor, paste all of `supabase/schema.sql`, and run it.
4. Open Project Settings > API. Copy the Project URL and anon/publishable key.
5. Paste them into `SUPABASE_URL` and `SUPABASE_ANON_KEY` at the top of `src/main.js`.
6. Restart `npm run dev`.

Do not put a `service_role` key in the app. Only use the anon/publishable key.

## 4. Test the two-person flow
For a first local test, open the app in two different browser profiles (for example Chrome normal + Incognito). Create a match in one, copy its code, then join from the other. Both participants answer all 10 questions. The results appear when both submit.

## 5. Important: invitation links need a public URL
A link using `localhost` only works on the device running the development server. To invite someone on another phone:
1. Build the web app: `npm run build`.
2. Deploy the `dist` folder to a static host such as Netlify or Vercel.
3. Use the deployed HTTPS URL to create/share invitations.

The first MVP shares a web invitation link. Opening the link in a browser works; automatic opening inside an installed Android app (Android App Links/deep links) is a separate setup.

## 6. Capacitor
After the web app builds successfully:

```powershell
npm run build
npx cap add android
npx cap sync android
```

To refresh Android web assets after changing code:

```powershell
npm run build
npx cap sync android
```

Android Studio/SDK is required to build and install the APK. Continue browser-first if disk space is limited.

## MVP limitations
- Guest identity is stored by Supabase Auth on that browser/device. Clearing app data can lose the guest identity.
- There is no account recovery.
- Matches do not currently expire automatically.
- Share actions use WhatsApp/Telegram web share links and the native share sheet for Viber/other apps.
- This is a prototype. Before public launch, add rate limits, expiry/cleanup, stronger abuse controls, and privacy/consent copy.
