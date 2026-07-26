// Your real Supabase project values go here (Settings → API in the
// Supabase dashboard). index.html loads this file directly.
// If you don't want these committed to a public repo, add config.js to
// .gitignore and keep config.example.js as the checked-in template instead.
window.TETHER_CONFIG = {
  SUPABASE_URL: 'https://fvsenkqyrnkmhfvmqkap.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_IBad3ywf6jorxCSHRVTzbQ_5rfSEBdu',
  // Web Push public key — run `npx web-push generate-vapid-keys` and paste the
  // PUBLIC key here (the private key goes in the `push` Edge Function secrets).
  // Leave empty to disable the notifications feature in the You tab.
  VAPID_PUBLIC_KEY: 'BNf6d4rZavFEwIzoRUsRTTHHWJT4Ee5oLUJlHCMIwNI5gHrNzAfYQNfgM3Ai7sLQbvnhZHzpYTMsSNu-RZ8zR-8'
};
