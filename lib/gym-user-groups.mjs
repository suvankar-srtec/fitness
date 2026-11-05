import {matchesUserSearch} from './user-search.mjs';
export function groupGymUsers(users, search = '') {
 const gyms = new Map();
 const superadmins = [], unassigned = [];
 for (const user of users) {
  if (user.role === 'admin') gyms.set(String(user.id), {id:user.id,name:user.gymName,logo:user.gymLogo||'',users:[user]});
  else if (user.role === 'superadmin'&&user.userId==='sp00') superadmins.push(user);
 }
 for (const user of users) {
  if (user.role !== 'supervisor') continue;
  const gym = gyms.get(String(user.gymId));
  if (gym) gym.users.push(user);
  else unassigned.push(user);
 }
 const query = search.trim().toLowerCase();
 const matches = user => matchesUserSearch(user,query);
 return {
  gyms:[...gyms.values()].filter(gym=>gym.name?.toLowerCase().includes(query)||gym.users.some(matches)),
  superadmins:superadmins.filter(matches),
  unassigned:unassigned.filter(matches),
 };
}
