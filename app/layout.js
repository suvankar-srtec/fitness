import MessagePopup from './components/MessagePopup';
import localFont from 'next/font/local';
import './globals.css';
import './theme.css';
import './gym-theme.css';
import './navigation.css';
import './login.css';
import './subscription.css';
import './close-buttons.css';
import './responsive.css';
import './mobile-navigation.css';
import './mobile-cards.css';
import './mobile-typography.css';
import './navigation-theme.css';
const systemTitleFont=localFont({src:[{path:'../assets/fonts/Oswald-Variable.ttf',weight:'200 700',style:'normal'}],variable:'--font-system-title',display:'swap'});
export const metadata = { title: 'Membership Management System', description: 'Manage your organization team and members' };
export default function Layout({ children }) {
  return (
    <html lang="en" data-gym-theme="true" className={systemTitleFont.variable}>
      {/* Browser extensions can add attributes to body before hydration. */}
      <body suppressHydrationWarning><MessagePopup/>{children}</body>
    </html>
  );
}
