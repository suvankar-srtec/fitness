export const isMainSuperadmin = user => user?.role === 'superadmin' && user?.userId === 'sp00';
export const canCreateGymAdmin = isMainSuperadmin;
