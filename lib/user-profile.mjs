export function publicUser(user) {
 return {
  id: user.id,
  name: user.name,
  role: user.role,
  phone: user.phone || '',
  phoneNeedsUpdate:!!user.pending_phone,
  passwordReady:user.password_ready===true,
  gymName: user.role === 'superadmin' ? '' : user.gym_name || '',
  gymId: user.role === 'admin' ? user.id : ['manager','supervisor'].includes(user.role) ? user.created_by || null : null,
  createdBy: user.created_by || null,
  managerId: user.manager_id || null,
  gymAddress: user.role === 'admin' ? user.gym_address || '' : '',
  gymPhone: user.role === 'admin' ? user.gym_phone || '' : '',
  gymWebsite: user.role === 'admin' ? user.gym_website || '' : '',
  gymLogo: user.role === 'admin' ? user.gym_logo || '' : '',
  locationId: ['manager','supervisor'].includes(user.role) ? user.location_id || null : null,
  locationName: ['manager','supervisor'].includes(user.role) ? user.location_name || '' : '',
  userId: user.public_id,
 };
}
