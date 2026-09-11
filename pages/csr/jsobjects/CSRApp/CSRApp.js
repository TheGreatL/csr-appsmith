export default {
	async onPageLoad() {
		const user = appsmith.store.currentUser;
		if (!user) {
			showAlert('Please login first', 'warning');
			navigateTo('login');
			return;
		}

		if (user.user_role === 'client') {
			showAlert('Unauthorized: Client accounts cannot access CSR portal', 'error');
			navigateTo('client');
			return;
		}

		// Load requests and technicians
		await this.refreshData();
	},

	async refreshData() {
		try {
			if (typeof Get_All_Service_Requests !== 'undefined' && Get_All_Service_Requests.run) {
				await Get_All_Service_Requests.run();
			}
			if (typeof Get_Technicians_List !== 'undefined' && Get_Technicians_List.run) {
				await Get_Technicians_List.run();
			}
			if (typeof Get_Request_Metrics !== 'undefined' && Get_Request_Metrics.run) {
				await Get_Request_Metrics.run();
			}
		} catch (err) {
			console.error('Failed to load CSR data:', err);
		}
	},

	async assignTechnician() {
		const selectedRequest = Table_Requests ? Table_Requests.selectedRow : null;
		const techId = select_technician ? select_technician.selectedOptionValue : null;
		const notes = input_assign_notes ? input_assign_notes.text : '';

		if (!selectedRequest || !selectedRequest.service_request_id) {
			showAlert('Please select a service request from the table first', 'warning');
			return;
		}
		if (!techId) {
			showAlert('Please choose a technician to assign', 'warning');
			return;
		}

		try {
			if (typeof Assign_Technician_To_Request !== 'undefined' && Assign_Technician_To_Request.run) {
				await Assign_Technician_To_Request.run({
					service_request_id: selectedRequest.service_request_id,
					tech_id: techId,
					notes: notes || 'Assigned via CSR Portal'
				});
			}

			showAlert(`Technician successfully assigned to Request #${selectedRequest.service_request_id}!`, 'success');

			if (typeof closeModal === 'function') {
				closeModal('modal_assign_tech');
			}

			await this.refreshData();
		} catch (error) {
			showAlert('Assignment failed: ' + (error.message || error), 'error');
		}
	},

	async updateStatus(newStatus) {
		const selectedRequest = Table_Requests ? Table_Requests.selectedRow : null;
		const statusToSet = newStatus || (select_update_status ? select_update_status.selectedOptionValue : null);

		if (!selectedRequest || !selectedRequest.service_request_id) {
			showAlert('Please select a service request first', 'warning');
			return;
		}
		if (!statusToSet) {
			showAlert('Please select a status', 'warning');
			return;
		}

		try {
			if (typeof Update_Request_Status !== 'undefined' && Update_Request_Status.run) {
				await Update_Request_Status.run({
					service_request_id: selectedRequest.service_request_id,
					status: statusToSet
				});
			}

			showAlert(`Status updated to "${statusToSet}"`, 'success');
			await this.refreshData();
		} catch (error) {
			showAlert('Status update failed: ' + (error.message || error), 'error');
		}
	},

	async logout() {
		await removeValue('currentUser');
		showAlert('Logged out successfully', 'info');
		navigateTo('login');
	}
};

