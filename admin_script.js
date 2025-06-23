// --- Supabase Client Initialization (Admin) ---
// IMPORTANT: For admin operations that require elevated privileges (like updating any user's record,
// creating plans, etc.), you should use the Supabase service_role key.
// This key should NEVER be exposed on the client-side directly in a public app.
// For a web-based admin panel like this, this script would typically run in a protected environment,
// or these operations would be proxied through secure Supabase Edge Functions called by an authenticated admin.

// For this example, we'll assume this admin panel is run in a somewhat trusted environment
// or you are using an admin user with specific RLS policies.
// If you use the anon key here, RLS policies must grant necessary permissions to an admin role.
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Same as user app
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Same as user app, or a specific admin user's token

// It's STRONGLY recommended to handle admin authentication and privileged operations
// via Supabase Edge Functions to keep your service_role key secure.
// The code below assumes RLS is set up for an 'admin' role or you're careful with anon key permissions.

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Admin State ---
let currentAdmin = null; // Or some admin session management

// --- DOM Elements (Admin) ---
const adminLoginSection = document.getElementById('admin-login-section');
const adminLoginForm = document.getElementById('admin-login-form');
const adminMainContent = document.getElementById('admin-main-content');
const adminLogoutButton = document.getElementById('admin-logout-button');

const adminNavButtons = document.querySelectorAll('#admin-main-content nav button');
const adminContentSections = document.querySelectorAll('#admin-main-content .content-section');

// Dashboard Stats
const totalUsersStat = document.getElementById('total-users-stat');
const pendingPurchasesStat = document.getElementById('pending-purchases-stat');
const pendingWithdrawalsStat = document.getElementById('pending-withdrawals-stat');

// Users Table
const usersTableBody = document.querySelector('#users-table tbody');
const searchUserInput = document.getElementById('search-user-input');

// Purchases Table
const purchasesTableBody = document.querySelector('#purchases-table tbody');

// Withdrawals Table
const withdrawalsTableBody = document.querySelector('#withdrawals-table tbody');

// Mining Plans
const addNewPlanButton = document.getElementById('add-new-plan-button');
const addEditPlanForm = document.getElementById('add-edit-plan-form');
const miningPlansListAdmin = document.getElementById('mining-plans-list-admin');
const planIdAdminInput = document.getElementById('plan-id-admin');
const savePlanButton = document.getElementById('save-plan-button');
const cancelPlanButton = document.getElementById('cancel-plan-button');

// Admin Settings
const adminSettingsForm = document.getElementById('admin-settings-form');
const settingPaymentPhoneInput = document.getElementById('setting-payment-phone');

// --- Admin Utility Functions ---
function showAdminSection(sectionId) {
    adminContentSections.forEach(section => section.style.display = 'none');
    adminNavButtons.forEach(btn => btn.classList.remove('active'));

    const targetSection = document.getElementById(sectionId + '-section');
    const targetButton = document.querySelector(`#admin-main-content nav button[data-section="${sectionId}"]`);

    if (targetSection) targetSection.style.display = 'block';
    if (targetButton) targetButton.classList.add('active');

    // Load data for the section
    if (sectionId === 'dashboard-summary') loadDashboardSummary();
    if (sectionId === 'manage-users') loadUsersAdmin();
    if (sectionId === 'manage-purchases') loadPurchasesAdmin();
    if (sectionId === 'manage-withdrawals') loadWithdrawalsAdmin();
    if (sectionId === 'manage-plans') loadMiningPlansAdmin();
    if (sectionId === 'admin-settings') loadCurrentAdminSettings();
    
    if (window.lucide) window.lucide.createIcons();
}

// --- Admin Authentication (Simplified) ---
// In a real app, use Supabase Auth with a specific admin user role or a custom auth system.
adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    // Replace with actual admin authentication logic
    // This is a placeholder and insecure.
    if (email === "admin@example.com" && password === "adminpassword") { // DO NOT USE THIS IN PRODUCTION
        currentAdmin = { email: email, role: 'admin' }; // Simulate admin session
        localStorage.setItem('mmk_admin_session', JSON.stringify(currentAdmin));
        adminLoginSection.style.display = 'none';
        adminMainContent.style.display = 'flex';
        adminLogoutButton.style.display = 'block';
        showAdminSection('dashboard-summary'); // Default section
    } else {
        alert("Invalid admin credentials.");
    }
});

adminLogoutButton.addEventListener('click', () => {
    currentAdmin = null;
    localStorage.removeItem('mmk_admin_session');
    adminMainContent.style.display = 'none';
    adminLogoutButton.style.display = 'none';
    adminLoginSection.style.display = 'block';
});

function checkAdminSession() {
    const adminSession = localStorage.getItem('mmk_admin_session');
    if (adminSession) {
        currentAdmin = JSON.parse(adminSession);
        if (currentAdmin && currentAdmin.role === 'admin') {
            adminLoginSection.style.display = 'none';
            adminMainContent.style.display = 'flex';
            adminLogoutButton.style.display = 'block';
            showAdminSection('dashboard-summary');
            return true;
        }
    }
    adminMainContent.style.display = 'none';
    adminLoginSection.style.display = 'block';
    return false;
}

// --- Admin Navigation ---
adminNavButtons.forEach(button => {
    button.addEventListener('click', () => {
        const sectionId = button.dataset.section;
        showAdminSection(sectionId);
    });
});

// --- Admin Data Loading Functions ---
async function loadDashboardSummary() {
    try {
        const { count: userCount, error: userError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        if (userError) throw userError;
        totalUsersStat.textContent = userCount;

        const { count: purchaseCount, error: purchaseError } = await supabase
            .from('user_purchased_plans')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending_payment');
        if (purchaseError) throw purchaseError;
        pendingPurchasesStat.textContent = purchaseCount;

        const { count: withdrawalCount, error: withdrawalError } = await supabase
            .from('withdrawal_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending_approval');
        if (withdrawalError) throw withdrawalError;
        pendingWithdrawalsStat.textContent = withdrawalCount;

    } catch (error) {
        console.error("Error loading dashboard summary:", error);
        alert("Failed to load dashboard summary.");
    }
}

async function loadUsersAdmin(searchTerm = '') {
    usersTableBody.innerHTML = '<tr><td colspan="5">Loading users...</td></tr>';
    try {
        let query = supabase.from('users').select('id, name, email, balance, created_at').order('created_at', { ascending: false });
        if (searchTerm) {
            query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        }
        const { data: users, error } = await query;
        if (error) throw error;

        usersTableBody.innerHTML = '';
        if (users.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="5">No users found.</td></tr>';
            return;
        }
        users.forEach(user => {
            const row = usersTableBody.insertRow();
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${parseFloat(user.balance).toFixed(2)} MMK</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="view-button" data-user-id="${user.id}"><i data-lucide="eye"></i> View</button>
                    <!-- Add more actions like edit balance, suspend, etc. -->
                </td>
            `;
        });
        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        console.error("Error loading users for admin:", error);
        usersTableBody.innerHTML = '<tr><td colspan="5">Error loading users.</td></tr>';
    }
}
searchUserInput.addEventListener('input', (e) => loadUsersAdmin(e.target.value));

async function loadPurchasesAdmin() {
    purchasesTableBody.innerHTML = '<tr><td colspan="7">Loading purchases...</td></tr>';
    try {
        const { data: purchases, error } = await supabase
            .from('user_purchased_plans')
            .select(`
                id, purchase_price, status, created_at, payment_receipt_url,
                users (email),
                mining_plans (name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        purchasesTableBody.innerHTML = '';
        if (purchases.length === 0) {
            purchasesTableBody.innerHTML = '<tr><td colspan="7">No purchases found.</td></tr>';
            return;
        }
        purchases.forEach(purchase => {
            const row = purchasesTableBody.insertRow();
            row.innerHTML = `
                <td>${purchase.users.email}</td>
                <td>${purchase.mining_plans.name}</td>
                <td>${parseFloat(purchase.purchase_price).toFixed(2)} MMK</td>
                <td><a href="${purchase.payment_receipt_url}" target="_blank">View Receipt</a></td>
                <td>${purchase.status}</td>
                <td>${new Date(purchase.created_at).toLocaleDateString()}</td>
                <td>
                    ${purchase.status === 'pending_payment' ? `
                        <button class="approve-button" data-id="${purchase.id}" data-action="approve_purchase"><i data-lucide="check-circle"></i> Approve</button>
                        <button class="reject-button" data-id="${purchase.id}" data-action="reject_purchase"><i data-lucide="x-circle"></i> Reject</button>
                    ` : purchase.status === 'active' ? 'Approved & Active' : purchase.status}
                </td>
            `;
        });
        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        console.error("Error loading purchases for admin:", error);
        purchasesTableBody.innerHTML = '<tr><td colspan="7">Error loading purchases.</td></tr>';
    }
}

async function loadWithdrawalsAdmin() {
    withdrawalsTableBody.innerHTML = '<tr><td colspan="7">Loading withdrawals...</td></tr>';
    try {
        const { data: withdrawals, error } = await supabase
            .from('withdrawal_requests')
            .select(`
                id, amount, payment_method, recipient_phone, status, requested_at,
                users (email)
            `)
            .order('requested_at', { ascending: false });

        if (error) throw error;
        withdrawalsTableBody.innerHTML = '';
        if (withdrawals.length === 0) {
            withdrawalsTableBody.innerHTML = '<tr><td colspan="7">No withdrawal requests found.</td></tr>';
            return;
        }
        withdrawals.forEach(withdrawal => {
            const row = withdrawalsTableBody.insertRow();
            row.innerHTML = `
                <td>${withdrawal.users.email}</td>
                <td>${parseFloat(withdrawal.amount).toFixed(2)} MMK</td>
                <td>${withdrawal.payment_method}</td>
                <td>${withdrawal.recipient_phone}</td>
                <td>${withdrawal.status}</td>
                <td>${new Date(withdrawal.requested_at).toLocaleDateString()}</td>
                <td>
                    ${withdrawal.status === 'pending_approval' ? `
                        <button class="approve-button" data-id="${withdrawal.id}" data-user-id="${withdrawal.users.id}" data-amount="${withdrawal.amount}" data-action="approve_withdrawal"><i data-lucide="check-circle"></i> Approve</button>
                        <button class="reject-button" data-id="${withdrawal.id}" data-action="reject_withdrawal"><i data-lucide="x-circle"></i> Reject</button>
                    ` : withdrawal.status}
                </td>
            `;
        });
        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        console.error("Error loading withdrawals for admin:", error);
        withdrawalsTableBody.innerHTML = '<tr><td colspan="7">Error loading withdrawals.</td></tr>';
    }
}

// --- Admin Action Handlers (Approve/Reject etc.) ---
document.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target || !target.dataset.action) return;

    const id = target.dataset.id;
    const action = target.dataset.action;

    if (action === 'approve_purchase') {
        if (!confirm("Are you sure you want to approve this purchase?")) return;
        try {
            // Fetch plan details to set start/end dates
            const { data: purchaseData, error: fetchError } = await supabase
                .from('user_purchased_plans')
                .select('plan_id, mining_plans(duration_days)')
                .eq('id', id)
                .single();
            if (fetchError || !purchaseData) throw fetchError || new Error("Purchase or plan details not found.");

            const durationDays = purchaseData.mining_plans.duration_days;
            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + durationDays);

            const { error } = await supabase
                .from('user_purchased_plans')
                .update({ status: 'active', start_date: startDate.toISOString(), end_date: endDate.toISOString() })
                .eq('id', id);
            if (error) throw error;
            alert("Purchase approved and activated.");
            loadPurchasesAdmin(); // Refresh list
        } catch (error) {
            console.error("Error approving purchase:", error);
            alert("Failed to approve purchase: " + error.message);
        }
    } else if (action === 'reject_purchase') {
        if (!confirm("Are you sure you want to reject this purchase?")) return;
        try {
            const { error } = await supabase
                .from('user_purchased_plans')
                .update({ status: 'rejected_payment' }) // Or 'payment_issue' etc.
                .eq('id', id);
            if (error) throw error;
            alert("Purchase rejected.");
            loadPurchasesAdmin();
        } catch (error) {
            console.error("Error rejecting purchase:", error);
            alert("Failed to reject purchase: " + error.message);
        }
    } else if (action === 'approve_withdrawal') {
        if (!confirm("Are you sure you want to approve this withdrawal? This will deduct from user balance.")) return;
        const userId = target.dataset.userId; // This should be on the withdrawal record itself, not passed via button if possible
        const amount = parseFloat(target.dataset.amount);

        // This should be a transaction in Supabase Edge Function for atomicity
        try {
            // 1. Fetch user's current balance
            const { data: userData, error: userFetchError } = await supabase
                .from('users')
                .select('balance')
                .eq('id', userId) // Assuming withdrawal record has user_id
                .single();
            if (userFetchError || !userData) throw userFetchError || new Error("User not found for withdrawal.");

            const currentBalance = parseFloat(userData.balance);
            if (currentBalance < amount) {
                alert("User has insufficient balance for this withdrawal.");
                // Optionally mark as rejected due to insufficient funds
                await supabase.from('withdrawal_requests').update({ status: 'rejected', admin_notes: 'Insufficient funds at time of approval.' }).eq('id', id);
                loadWithdrawalsAdmin();
                return;
            }

            // 2. Deduct balance
            const newBalance = currentBalance - amount;
            const { error: balanceUpdateError } = await supabase
                .from('users')
                .update({ balance: newBalance })
                .eq('id', userId);
            if (balanceUpdateError) throw balanceUpdateError;

            // 3. Update withdrawal status
            const { error: withdrawalUpdateError } = await supabase
                .from('withdrawal_requests')
                .update({ status: 'approved', processed_at: new Date().toISOString() }) // Or 'processing' then 'completed'
                .eq('id', id);
            if (withdrawalUpdateError) throw withdrawalUpdateError;

            // 4. (Optional) Create a transaction record
            await supabase.from('transactions').insert({
                user_id: userId,
                type: 'withdrawal_debit',
                amount: -amount, // Negative for debit
                description: `Withdrawal approved: ${amount} MMK`,
                related_withdrawal_id: id
            });

            alert("Withdrawal approved and user balance updated.");
            loadWithdrawalsAdmin();
            loadUsersAdmin(); // Refresh user list to show updated balance
        } catch (error) {
            console.error("Error approving withdrawal:", error);
            alert("Failed to approve withdrawal: " + error.message);
            // Potentially rollback changes if part of transaction failed
        }
    } else if (action === 'reject_withdrawal') {
        if (!confirm("Are you sure you want to reject this withdrawal?")) return;
        try {
            const { error } = await supabase
                .from('withdrawal_requests')
                .update({ status: 'rejected', processed_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            alert("Withdrawal rejected.");
            loadWithdrawalsAdmin();
        } catch (error) {
            console.error("Error rejecting withdrawal:", error);
            alert("Failed to reject withdrawal: " + error.message);
        }
    }
});

// --- Manage Mining Plans (Admin) ---
async function loadMiningPlansAdmin() {
    miningPlansListAdmin.innerHTML = '<p>Loading plans...</p>';
    try {
        const { data: plans, error } = await supabase
            .from('mining_plans')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;

        miningPlansListAdmin.innerHTML = '';
        if (plans.length === 0) {
            miningPlansListAdmin.innerHTML = '<p>No mining plans created yet.</p>';
            return;
        }
        const ul = document.createElement('ul');
        plans.forEach(plan => {
            const li = document.createElement('li');
            li.style.padding = '10px';
            li.style.borderBottom = '1px solid #eee';
            li.innerHTML = `
                <strong>${plan.name}</strong> (Price: ${plan.price} MMK, Duration: ${plan.duration_days} days, Active: ${plan.is_active})
                <button class="edit-button" data-plan='${JSON.stringify(plan)}'><i data-lucide="edit"></i> Edit</button>
                <button class="reject-button" data-plan-id-delete="${plan.id}"><i data-lucide="trash-2"></i> Delete</button>
            `;
            ul.appendChild(li);
        });
        miningPlansListAdmin.appendChild(ul);
        if (window.lucide) window.lucide.createIcons();

        // Add event listeners for edit/delete
        ul.querySelectorAll('.edit-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const planData = JSON.parse(btn.dataset.plan);
                populatePlanForm(planData);
            });
        });
        ul.querySelectorAll('.reject-button[data-plan-id-delete]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const planIdToDelete = btn.dataset.planIdDelete;
                if (confirm(`Are you sure you want to delete plan ID: ${planIdToDelete}? This cannot be undone.`)) {
                    try {
                        const { error: deleteError } = await supabase.from('mining_plans').delete().eq('id', planIdToDelete);
                        if (deleteError) throw deleteError;
                        alert('Plan deleted successfully.');
                        loadMiningPlansAdmin(); // Refresh list
                    } catch (err) {
                        alert('Error deleting plan: ' + err.message + '\n(Ensure no active user purchases are linked, or handle cascades.)');
                    }
                }
            });
        });

    } catch (error) {
        console.error("Error loading mining plans for admin:", error);
        miningPlansListAdmin.innerHTML = '<p>Error loading plans.</p>';
    }
}

addNewPlanButton.addEventListener('click', () => {
    addEditPlanForm.reset();
    planIdAdminInput.value = ''; // Clear ID for new plan
    addEditPlanForm.style.display = 'block';
    savePlanButton.textContent = 'Create Plan';
});

cancelPlanButton.addEventListener('click', () => {
    addEditPlanForm.style.display = 'none';
    addEditPlanForm.reset();
});

function populatePlanForm(plan) {
    planIdAdminInput.value = plan.id;
    document.getElementById('plan-name-admin').value = plan.name;
    document.getElementById('plan-price-admin').value = plan.price;
    document.getElementById('plan-duration-admin').value = plan.duration_days;
    document.getElementById('plan-return-multiplier-admin').value = plan.total_return_multiplier;
    document.getElementById('plan-power-admin').value = plan.power_output_per_second;
    document.getElementById('plan-description-admin').value = plan.description || '';
    document.getElementById('plan-active-admin').checked = plan.is_active;
    addEditPlanForm.style.display = 'block';
    savePlanButton.textContent = 'Update Plan';
}

addEditPlanForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const planData = {
        name: document.getElementById('plan-name-admin').value,
        price: parseFloat(document.getElementById('plan-price-admin').value),
        duration_days: parseInt(document.getElementById('plan-duration-admin').value),
        total_return_multiplier: parseFloat(document.getElementById('plan-return-multiplier-admin').value),
        power_output_per_second: parseFloat(document.getElementById('plan-power-admin').value),
        description: document.getElementById('plan-description-admin').value,
        is_active: document.getElementById('plan-active-admin').checked,
        updated_at: new Date().toISOString()
    };

    const planId = planIdAdminInput.value;
    try {
        let error;
        if (planId) { // Update existing plan
            const { error: updateError } = await supabase.from('mining_plans').update(planData).eq('id', planId);
            error = updateError;
        } else { // Create new plan
            const { error: insertError } = await supabase.from('mining_plans').insert(planData);
            error = insertError;
        }
        if (error) throw error;
        alert(`Plan ${planId ? 'updated' : 'created'} successfully!`);
        addEditPlanForm.style.display = 'none';
        addEditPlanForm.reset();
        loadMiningPlansAdmin(); // Refresh list
    } catch (error) {
        console.error("Error saving plan:", error);
        alert("Failed to save plan: " + error.message);
    }
});

// Admin Settings
async function loadCurrentAdminSettings() {
    try {
        const { data, error } = await supabase
            .from('admin_settings')
            .select('key, value')
            .eq('key', 'payment_phone_number')
            .single(); // Assuming only one for now
        
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no row found, which is fine
        
        if (data) {
            settingPaymentPhoneInput.value = data.value || '';
        } else {
            settingPaymentPhoneInput.value = '';
        }
    } catch (error) {
        console.error("Error loading admin settings:", error);
        alert("Failed to load admin settings.");
    }
}

adminSettingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPhoneNumber = settingPaymentPhoneInput.value;
    try {
        // Upsert the setting
        const { error } = await supabase
            .from('admin_settings')
            .upsert({ key: 'payment_phone_number', value: newPhoneNumber, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        
        if (error) throw error;
        alert("Admin settings saved successfully!");
    } catch (error) {
        console.error("Error saving admin settings:", error);
        alert("Failed to save admin settings: " + error.message);
    }
});

// --- Initial Admin Load ---
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAdminSession()) {
        // Not logged in, login form is shown
    }
    // If checkAdminSession is true, it will call showAdminSection itself.
});
