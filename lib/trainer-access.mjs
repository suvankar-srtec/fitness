export const isTrainer=user=>user?.role==='supervisor'&&String(user.employee_role_name||user.employeeRoleName||'').trim().toLowerCase()==='trainer';
