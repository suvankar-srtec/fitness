'use client';
export default function SidebarLogout({onSignOut}){
 return <button type="button" className="sidebar-logout" onClick={onSignOut} aria-label="Logout"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M16 17l5-5-5-5M21 12H9"/></svg><span>Logout</span></button>;
}
