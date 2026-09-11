export default {
	async onPageLoad() {
		// 1. PAGE GUARD: Verify user session
		if(appsmith.mode =="edit"){
			return;
		}
		const user = appsmith.store.currentUser;
		if (!user || !user.email) {
			showAlert('Access Denied: Please log in first.', 'warning');
			navigateTo('login');
			return;
		}

		// 2. ROLE GUARD: Client page is only for 'client' role
		if (user.user_role !== 'client') {
			showAlert(`Access Denied: Your role (${user.user_role}) cannot access the Client portal. Redirecting to CSR dashboard...`, 'info');
			navigateTo('csr');
			return;
		}

		// 3. Load skills catalog and client requests
		await this.loadInitialData();
	},

	async loadInitialData() {
		try {
			if (typeof Get_Skills_List !== 'undefined' && Get_Skills_List.run) {
				await Get_Skills_List.run();
			}
			await this.refreshRequests();
		} catch (err) {
			console.error('Error loading initial client data:', err);
		}
	},

	async submitRequest() {
		const user = appsmith.store.currentUser;
		if (!user) {
			showAlert('Session expired. Please log in again.', 'error');
			navigateTo('login');
			return;
		}

		// Gather form inputs
		const subject = (typeof input_subject !== 'undefined' && input_subject.text) ? input_subject.text.trim() : '';
		const type = (typeof select_type !== 'undefined' && select_type.selectedOptionValue) ? select_type.selectedOptionValue : '';
		const skillId = (typeof select_skill !== 'undefined' && select_skill.selectedOptionValue) ? select_skill.selectedOptionValue : null;
		const priority = (typeof select_priority !== 'undefined' && select_priority.selectedOptionValue) ? select_priority.selectedOptionValue : 'medium';
		const description = (typeof input_description !== 'undefined' && input_description.text) ? input_description.text.trim() : '';
		const location = (typeof input_location !== 'undefined' && input_location.text) ? input_location.text.trim() : '';

		// Validation
		if (!subject) {
			showAlert('Please enter a Subject for the service request.', 'warning');
			return;
		}
		if (!type) {
			showAlert('Please select a Request Type (Repair or Diagnose).', 'warning');
			return;
		}

		try {
			if (typeof Create_Service_Request !== 'undefined' && Create_Service_Request.run) {
				await Create_Service_Request.run({
					client_id: user.user_id,
					skill_id: skillId,
					subject,
					type,
					priority,
					description,
					location
				});
			}

			showAlert('Service request created! An applicable technician will be assigned by CSR.', 'success');

			// Reset input fields
			if (typeof resetWidget === 'function') {
				resetWidget('form_create_request', true);
				resetWidget('input_subject', true);
				resetWidget('input_description', true);
				resetWidget('input_location', true);
			}

			await this.refreshRequests();
		} catch (error) {
			showAlert('Failed to submit request: ' + (error.message || error), 'error');
		}
	},

	async refreshRequests() {
		try {
			if (typeof Get_Client_Requests !== 'undefined' && Get_Client_Requests.run) {
				await Get_Client_Requests.run();
			}
		} catch (err) {
			console.error('Error fetching client requests:', err);
		}
	},

	async logout() {
		await removeValue('currentUser');
		showAlert('Logged out successfully.', 'info');
		navigateTo('login');
	}
};
