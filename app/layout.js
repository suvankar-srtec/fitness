import MessagePopup from './components/MessagePopup';
import './globals.css';
import './theme.css';
import './gym-theme.css';
import './navigation.css';
import './login.css';
import './subscription.css';
import './close-buttons.css';
export const metadata = { title: 'Membership Management System', description: 'Manage your organization team and members' };
export default function Layout({ children }) {
  return (
    <html lang="en" data-gym-theme="true">
      {/* Browser extensions can add attributes to body before hydration. */}
      <body suppressHydrationWarning><MessagePopup/>{children}</body>
    </html>
  );
}
