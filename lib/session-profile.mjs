import {publicUser} from './user-profile.mjs';
export const sessionProfile=user=>({...publicUser(user),requiresLocationSelection:false});
