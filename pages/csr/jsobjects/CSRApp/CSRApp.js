export default {
	async onPageLoad() {
		if(appsmith.mode=="edit"){
			return;
		}
		// 1. PAGE GUARD: Verify user session
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
			if (typeof Get_Skills_List !== 'undefined' && Get_Skills_List.run) {
				await Get_Skills_List.run();
			}
			if (typeof Get_Request_Metrics !== 'undefined' && Get_Request_Metrics.run) {
				await Get_Request_Metrics.run();
			}
		} catch (err) {
			console.error('Error refreshing CSR dashboard data:', err);
		}
	},

	// INTERACTIVE CHART FILTER: Clicking status chart filters the table
	async onChartStatusClick() {
		const selected = (typeof Chart_Status !== 'undefined') ? Chart_Status.selectedDataPoint : null;
		if (selected && selected.x) {
			const statusVal = selected.x.toLowerCase().replace(/\s+/g, '_');
			await storeValue('selectedStatusFilter', statusVal);
			showAlert(`Filtered table by status: "${selected.x}"`, 'info');
		}
	},

	// INTERACTIVE CHART FILTER: Clicking type chart filters the table
	async onChartTypeClick() {
		const selected = (typeof Chart_Type !== 'undefined') ? Chart_Type.selectedDataPoint : null;
		if (selected && selected.x) {
			const typeVal = selected.x.toLowerCase();
			await storeValue('selectedTypeFilter', typeVal);
			showAlert(`Filtered table by type: "${selected.x}"`, 'info');
		}
	},

	// Reset any chart or dropdown filters
	async clearFilters() {
		await removeValue('selectedStatusFilter');
		await removeValue('selectedTypeFilter');
		if (typeof resetWidget === 'function') {
			resetWidget('select_filter_status', true);
			resetWidget('input_search', true);
		}
		showAlert('All table filters reset.', 'info');
	},

	// Filtered requests source for the Table
	getFilteredRequests() {
		const requests = (typeof Get_All_Service_Requests !== 'undefined' && Get_All_Service_Requests.data) 
		? Get_All_Service_Requests.data 
		: [];

		const statusFilter = appsmith.store.selectedStatusFilter || 
					((typeof select_filter_status !== 'undefined') ? select_filter_status.selectedOptionValue : 'all');
		const typeFilter = appsmith.store.selectedTypeFilter || 'all';
		const searchKeyword = (typeof input_search !== 'undefined' && input_search.text) 
		? input_search.text.trim().toLowerCase() 
		: '';

		return requests.filter(r => {
			const matchesStatus = (!statusFilter || statusFilter === 'all' || (r.status || '').toLowerCase() === statusFilter.toLowerCase());
			const matchesType = (!typeFilter || typeFilter === 'all' || (r.type || '').toLowerCase() === typeFilter.toLowerCase());
			const matchesSearch = (!searchKeyword || 
														 (r.subject || '').toLowerCase().includes(searchKeyword) || 
														 (r.client_name || '').toLowerCase().includes(searchKeyword) ||
														 String(r.service_request_id).includes(searchKeyword)
														);
			return matchesStatus && matchesType && matchesSearch;
		});
	},

	// MATCHING ALGORITHM: Filter and highlight technicians applicable for the selected service request
	getApplicableTechnicians() {
		const selectedReq = (typeof Table_Requests !== 'undefined') ? Table_Requests.selectedRow : null;
		const allTechs = (typeof Get_Technicians_List !== 'undefined' && Get_Technicians_List.data) 
		? Get_Technicians_List.data 
		: [
			{ user_id: 2, name: 'Alex Turner', skills_list: 'Hardware Repair, Electrical Maintenance', skill_ids: '1,3' },
			{ user_id: 3, name: 'Sarah Connor', skills_list: 'System Diagnostics, Network Diagnostics', skill_ids: '2,4' },
			{ user_id: 4, name: 'Mike Ross', skills_list: 'Hardware Repair, System Diagnostics', skill_ids: '1,2' }
		];

		if (!selectedReq || !selectedReq.service_request_id) {
			return allTechs.map(t => ({
				label: `${t.name} [Skills: ${t.skills_list || 'None'}]`,
				value: t.user_id
			}));
		}

		const reqSkillId = selectedReq.skill_id ? String(selectedReq.skill_id) : null;
		const reqType = (selectedReq.type || '').toLowerCase();
		const reqSkillName = (selectedReq.required_skill || '').toLowerCase();

		const applicable = [];
		const nonApplicable = [];

		allTechs.forEach(tech => {
			const techSkillIds = (tech.skill_ids ? String(tech.skill_ids).split(',') : []);
			const techSkills = (tech.skills_list || '').toLowerCase();

			const hasExactSkill = reqSkillId && techSkillIds.includes(reqSkillId);
			const hasSkillNameMatch = reqSkillName && reqSkillName !== 'general' && techSkills.includes(reqSkillName);
			const hasTypeMatch = reqType && techSkills.includes(reqType);

			if (hasExactSkill || hasSkillNameMatch || hasTypeMatch) {
				applicable.push({
					label: `⭐ APPLICABLE: ${tech.name} (Matches: ${tech.skills_list})`,
					value: tech.user_id
				});
			} else {
				nonApplicable.push({
					label: `⚠️ Other: ${tech.name} (${tech.skills_list})`,
					value: tech.user_id
				});
			}
		});

		return [...applicable, ...nonApplicable];
	},

	// Helper for Appsmith Chart Widget: Requests by Status
	getStatusChartData() {
		const requests = (typeof Get_All_Service_Requests !== 'undefined' && Get_All_Service_Requests.data) 
		? Get_All_Service_Requests.data 
		: [];

		const counts = { pending: 0, assigned: 0, in_progress: 0, completed: 0, cancelled: 0 };
		requests.forEach(r => {
			const st = (r.status || 'pending').toLowerCase();
			if (counts[st] !== undefined) counts[st]++;
		});

		return [
			{ x: 'Pending', y: counts.pending },
			{ x: 'Assigned', y: counts.assigned },
			{ x: 'In Progress', y: counts.in_progress },
			{ x: 'Completed', y: counts.completed },
			{ x: 'Cancelled', y: counts.cancelled }
		];
	},

	// Helper for Appsmith Chart Widget: Requests by Type
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
			showAlert('Please select an applicable technician to assign.', 'warning');
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

			showAlert(`Technician successfully assigned to Request #${selectedReq.service_request_id}!`, 'success');

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
