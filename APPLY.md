# Foodbox — auth skeleton (apply these into your project)

Extract this zip at the PROJECT ROOT. It writes into `src/`.

## New files
- src/lib/supabase.ts               (Supabase client — you already have this)
- src/providers/session-provider.tsx
- src/app/(app)/_layout.tsx
- src/app/(app)/index.tsx            (temporary home stub with auth state)
- src/app/(app)/explore.tsx          (your existing explore, moved here)
- src/app/(auth)/_layout.tsx
- src/app/(auth)/sign-in.tsx
- src/app/(auth)/sign-up.tsx

## Replaced file
- src/app/_layout.tsx                (now wraps the app in SessionProvider +
                                      Stack with (app) and a modal (auth))

## DELETE these old files (they moved into (app)/)
- src/app/index.tsx      -> now src/app/(app)/index.tsx
- src/app/explore.tsx    -> now src/app/(app)/explore.tsx

## Notes
- components/app-tabs.tsx stays as-is. Its triggers name="index"/"explore"
  now resolve inside (app)/, so tabs keep working.
- Google button is wired but shows "coming soon" until the Supabase Google
  provider + first EAS build are set up.
- Email sign-up: Supabase confirms email by default, so you won't be signed in
  until you click the confirmation link. For faster local testing, turn OFF
  "Confirm email" in Supabase -> Authentication -> Providers -> Email.

## Run
  npx expo start -c
Then open on Android. Guest lands on Home -> "Sign in" opens the modal.
