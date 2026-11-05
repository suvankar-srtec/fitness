import './globals.css';
import './theme.css';
export const metadata = { title: 'Gym Management', description: 'Manage your gym team and members' };
export default function Layout({ children }) {
  return (
    <html lang="en">
      {/* Browser extensions can add attributes to body before hydration. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
