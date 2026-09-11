export default {
	async onPageLoad() {
		const user = appsmith.store.currentUser;
		if (!user) {
			showAlert('Please login first', 'warning');
			navigateTo('login');
			return;
		}

		if (user.user_role !== 'client') {
			showAlert('Redirecting to your assigned dashboard...', 'info');
			navigateTo('csr');
			return;
		}

		// Refresh client requests
		await this.refreshRequests();
	},

	async submitRequest() {
		const user = appsmith.store.currentUser;
		const subject = input_subject ? input_subject.text.trim() : '';
		const type = select_type ? select_type.selectedOptionValue : '';
		const priority = select_priority ? select_priority.selectedOptionValue : 'medium';
		const description = input_description ? input_description.text.trim() : '';
		const location = input_location ? input_location.text.trim() : '';

		if (!subject) {
			showAlert('Please provide a subject for the service request', 'warning');
			return;
		}
		if (!type) {
			showAlert('Please select a request type (repair or diagnose)', 'warning');
			return;
		}

		try {
			// Trigger the Aiven MySQL query if available
			if (typeof Create_Service_Request !== 'undefined' && Create_Service_Request.run) {
				await Create_Service_Request.run({
					client_id: user ? user.user_id : 5,
					subject,
					type,
					priority,
					description,
					location
				});
			}

			showAlert('Service request submitted successfully!', 'success');

			// Reset input fields
			if (typeof resetWidget === 'function') {
				resetWidget('form_create_request', true);
			}

			// Reload list
			await this.refreshRequests();
		} catch (error) {
			showAlert('Error submitting request: ' + (error.message || error), 'error');
		}
	},

	async refreshRequests() {
		try {
			if (typeof Get_Client_Requests !== 'undefined' && Get_Client_Requests.run) {
				await Get_Client_Requests.run();
			}
		} catch (err) {
			console.error('Failed to fetch requests:', err);
		}
	},

	async logout() {
		await removeValue('currentUser');
		showAlert('Logged out successfully', 'info');
		navigateTo('login');
	}
};

