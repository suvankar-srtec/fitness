export function publicUser(user) {
 return {
  id: user.id,
  name: user.name,
  role: user.role,
  phone: user.phone || '',
  gymName: user.role === 'superadmin' ? '' : user.gym_name || '',
  gymId: user.role === 'admin' ? user.id : user.role === 'supervisor' ? user.created_by || null : null,
  createdBy: user.created_by || null,
  gymAddress: user.role === 'admin' ? user.gym_address || '' : '',
  gymPhone: user.role === 'admin' ? user.gym_phone || '' : '',
  gymWebsite: user.role === 'admin' ? user.gym_website || '' : '',
  gymLogo: user.role === 'admin' ? user.gym_logo || '' : '',
  locationId: user.role === 'supervisor' ? user.location_id || null : null,
  locationName: user.role === 'supervisor' ? user.location_name || '' : '',
  userId: user.public_id,
 };
}
