export default {
	async onPageLoad() {
		// 1. PAGE GUARD: Check if user is logged in
		const user = appsmith.store.currentUser;
		if (!user || !user.email) {
			showAlert('Access Denied: Please log in first.', 'warning');
			navigateTo('login');
			return;
		}

		// 2. ROLE GUARD: Only 'admin' or 'technician' can access CSR Dashboard
		if (user.user_role === 'client') {
			showAlert('Access Denied: Client accounts cannot access the CSR Operations portal.', 'error');
			navigateTo('client');
			return;
		}

		// 3. Load initial dashboard data
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
			console.error('Error refreshing CSR dashboard data:', err);
		}
	},

	// Helper for Appsmith Chart Widget: Requests by Status
	getStatusChartData() {
		const requests = (typeof Get_All_Service_Requests !== 'undefined' && Get_All_Service_Requests.data) 
			? Get_All_Service_Requests.data 
			: [];

		const counts = {
			pending: 0,
			assigned: 0,
			in_progress: 0,
			completed: 0,
			cancelled: 0
		};

		requests.forEach(r => {
			const st = (r.status || 'pending').toLowerCase();
			if (counts[st] !== undefined) {
				counts[st]++;
			}
		});

		// Return formatted data for Appsmith Chart Widget
		return [
			{ x: 'Pending', y: counts.pending },
			{ x: 'Assigned', y: counts.assigned },
			{ x: 'In Progress', y: counts.in_progress },
			{ x: 'Completed', y: counts.completed },
			{ x: 'Cancelled', y: counts.cancelled }
		];
	},

	// Helper for Appsmith Chart Widget: Requests by Type (Repair vs Diagnose)
	getTypeChartData() {
		const requests = (typeof Get_All_Service_Requests !== 'undefined' && Get_All_Service_Requests.data) 
			? Get_All_Service_Requests.data 
			: [];

		let repairCount = 0;
		let diagnoseCount = 0;

		requests.forEach(r => {
			if (r.type === 'repair') repairCount++;
			else if (r.type === 'diagnose') diagnoseCount++;
		});

		return [
			{ x: 'Repair', y: repairCount },
			{ x: 'Diagnose', y: diagnoseCount }
		];
	},

	async assignTechnician() {
		const selectedReq = (typeof Table_Requests !== 'undefined') ? Table_Requests.selectedRow : null;
		const techId = (typeof select_technician !== 'undefined') ? select_technician.selectedOptionValue : null;
		const notes = (typeof input_assign_notes !== 'undefined' && input_assign_notes.text) ? input_assign_notes.text.trim() : '';

		if (!selectedReq || !selectedReq.service_request_id) {
			showAlert('Please select a service request from the table first.', 'warning');
			return;
		}

		if (!techId) {
			showAlert('Please select a qualified technician to assign.', 'warning');
			return;
		}

		try {
			if (typeof Assign_Technician_To_Request !== 'undefined' && Assign_Technician_To_Request.run) {
				await Assign_Technician_To_Request.run({
					service_request_id: selectedReq.service_request_id,
					tech_id: techId,
					notes: notes || 'Assigned via CSR Operations Dashboard'
				});
			}

			showAlert(`Successfully assigned technician to Request #${selectedReq.service_request_id}!`, 'success');

			if (typeof closeModal === 'function') {
				closeModal('modal_assign_tech');
			}

			await this.refreshData();
		} catch (error) {
			showAlert('Technician assignment failed: ' + (error.message || error), 'error');
		}
	},

	async updateStatus(newStatus) {
		const selectedReq = (typeof Table_Requests !== 'undefined') ? Table_Requests.selectedRow : null;
		const statusValue = newStatus || ((typeof select_update_status !== 'undefined') ? select_update_status.selectedOptionValue : null);

		if (!selectedReq || !selectedReq.service_request_id) {
			showAlert('Please select a service request from the table first.', 'warning');
			return;
		}

		if (!statusValue) {
			showAlert('Please select a valid status to update to.', 'warning');
			return;
		}

		try {
			if (typeof Update_Request_Status !== 'undefined' && Update_Request_Status.run) {
				await Update_Request_Status.run({
					service_request_id: selectedReq.service_request_id,
					status: statusValue
				});
			}

			showAlert(`Request #${selectedReq.service_request_id} updated to "${statusValue}".`, 'success');
			await this.refreshData();
		} catch (error) {
			showAlert('Status update failed: ' + (error.message || error), 'error');
		}
	},

	async logout() {
		await removeValue('currentUser');
		showAlert('Logged out successfully.', 'info');
		navigateTo('login');
	}
};
