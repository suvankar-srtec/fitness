const aliases={employee:'employees',plan:'plans',dashboard:'home',overview:'home',scanner:'scan',pass:'qr',box:'supplements',users:'admins',notifications:'announcements',supervisors:'supervisor',payment:'payments'};
const shapes={
  home:<><path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/></>,
  members:<><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3"/></>,
  lead:<><circle cx="8" cy="7" r="3"/><path d="M2 21v-3a6 6 0 0 1 12 0v3M16 9h6m-3-3v6"/></>,
  managers:<><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12a25 25 0 0 0 18 0M10 12v3h4v-3"/></>,
  employees:<><rect x="4" y="4" width="16" height="18" rx="2"/><path d="M9 2h6v4H9Z"/><circle cx="12" cy="11" r="2"/><path d="M8 18a4 4 0 0 1 8 0"/></>,
  admins:<><path d="m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5Z"/><circle cx="12" cy="9" r="2"/><path d="M8 16a4 4 0 0 1 8 0"/></>,
  organization:<><path d="M3 22V3h12v19M15 9h6v13M1 22h22M7 7h1m3 0h1M7 11h1m3 0h1M7 15h1m3 0h1M8 22v-4h3v4M18 13h1m-1 4h1"/></>,
  supervisor:<><path d="M12 2 4 5v6c0 5 8 10 8 10s8-5 8-10V5Z"/><path d="m8 11 3 3 5-6"/></>,
  reports:<><path d="M5 3h10l4 4v14H5Zm10 0v5h4M9 17v-3m3 3v-5m3 5v-7"/></>,
  audit:<><path d="M14 21H5V5h3m8 0h3v7M8 2h8v5H8ZM8 11h5m-5 4h3"/><circle cx="17" cy="17" r="3"/><path d="m19 19 3 3"/></>,
  videos:<><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 8 6 4-6 4z"/></>,
  plans:<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8m-8 4h8m-8 4h5"/></>,
  announcements:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  attendance:<><rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4m8-4v4M4 9h16m-12 6 3 3 5-6"/></>,
  'scan-report':<><path d="M6 3h12v18H6Z M9 7h6M9 11h1m4 0h1M9 15h1m4 0h1M9 18h6"/></>,
  scan:<><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M2 12h20"/><path d="M8 8h3v3H8zm5 5h3v3h-3z"/></>,
  qr:<><path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6M7 7h3v3H7zm7 0h3v3h-3zM7 14h3v3H7zm7 0h3v3h-3z"/></>,
  supplements:<><path d="m3 7 9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10M7.5 5l9 4"/></>,
  payments:<><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h3"/></>,
  orders:<><path d="M7 3h10v3h3v15H4V6h3zM9 3v4h6V3M8 12h8M8 16h5"/></>,
  membership:<><rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5 17a3 3 0 0 1 6 0m3-7h4m-4 4h4"/></>,
  support:<><path d="M3 14v-3a9 9 0 0 1 18 0v3M3 11h4v7H3Zm14 0h4v7h-4Zm4 6c0 4-5 4-7 4"/></>,
  help:<><path d="M4 4h16v13h-9l-7 4Z"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 4m0 2v.2"/></>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
  add:<path d="M12 4v16M4 12h16"/>,
  menu:<path d="M4 6h16M4 12h16M4 18h16"/>,
  joined:<><path d="m9 15 6-6M8 16l-2 2a4 4 0 0 1-6-6l4-4m12 0 2-2a4 4 0 0 1 6 6l-4 4" transform="translate(1 0) scale(.9)"/></>,
  income:<><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-7 6h4M8 2v4M7 12v5m-2-2 2 2 2-2"/></>,
  expenses:<><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-7 6h4M8 2v4M7 17v-5m-2 2 2-2 2 2"/></>
 };
export default function NavigationIcon({name,size=22}){
 const key=aliases[name]||name;
 return <svg data-navigation-icon={key} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[key]||shapes.members}</svg>;
}
