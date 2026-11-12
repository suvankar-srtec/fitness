import './globals.css';
import './theme.css';
import './gym-theme.css';
import './navigation.css';
export const metadata = { title: 'Gym Management', description: 'Manage your gym team and members' };
export default function Layout({ children }) {
  return (
    <html lang="en" data-gym-theme="true">
      {/* Browser extensions can add attributes to body before hydration. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
