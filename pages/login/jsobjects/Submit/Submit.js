export default {
	async login() {
		const userEmail = email.text ? email.text.trim().toLowerCase() : '';
		const userPass = password.text ? password.text.trim() : '';

		if (!userEmail || !userPass) {
			showAlert('Please enter both email and password', 'warning');
			return;
		}

		try {
			let user = null;

			// 1. Attempt executing the database query if configured on Appsmith
			if (typeof Login_Query !== 'undefined' && Login_Query.run) {
				const response = await Login_Query.run();
				if (response && response.length > 0) {
					user = response[0];
				}
			}

			// 2. Prototype / Demo credentials fallback for immediate testing
			if (!user) {
				if (userEmail === 'admin@service.com' && userPass === 'admin123') {
					user = { user_id: 1, name: 'Admin / CSR Specialist', email: userEmail, user_role: 'admin' };
				} else if (userEmail === 'john.doe@company.com' && userPass === 'client123') {
					user = { user_id: 5, name: 'John Doe', email: userEmail, user_role: 'client' };
				} else if (userEmail === 'alex.tech@service.com' && userPass === 'tech123') {
					user = { user_id: 2, name: 'Alex Turner', email: userEmail, user_role: 'technician' };
				}
			}

			// 3. Process login result
			if (user) {
				await storeValue('currentUser', {
					user_id: user.user_id,
					name: user.name,
					email: user.email,
					user_role: user.user_role
				});

				showAlert(`Welcome, ${user.name}!`, 'success');

				if (user.user_role === 'client') {
					navigateTo('client');
				} else if (user.user_role === 'admin' || user.user_role === 'technician') {
					navigateTo('csr');
				} else {
					showAlert(`Unknown role: ${user.user_role}`, 'error');
				}
			} else {
				showAlert('Invalid email or password', 'error');
			}
		} catch (err) {
			showAlert('Login error: ' + (err.message || err), 'error');
		}
	},

	async logout() {
		await removeValue('currentUser');
		showAlert('Logged out successfully', 'info');
		navigateTo('login');
	},

	checkAuth(allowedRoles = []) {
		const currentUser = appsmith.store.currentUser;
		if (!currentUser) {
			showAlert('Session expired. Please log in.', 'warning');
			navigateTo('login');
			return false;
		}
		if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.user_role)) {
			showAlert('Unauthorized access for your role', 'error');
			navigateTo(currentUser.user_role === 'client' ? 'client' : 'csr');
			return false;
		}
		return true;
	}
};