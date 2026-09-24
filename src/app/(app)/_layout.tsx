import AppTabs from '@/components/app-tabs';

// The tab navigator for the main app. Guests see these tabs too;
// only protected actions push the (auth) modal.
export default function AppLayout() {
  return <AppTabs />;
}
