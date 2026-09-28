import Login from './Login';

// /admin: the shared login screen (same design as the student and guard & staff logins), admins only
const AdminLogin = () => <Login portal="admin" />;

export default AdminLogin;
