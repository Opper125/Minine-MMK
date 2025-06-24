// MMK Mining - In-Website Database
// WARNING: This method of storing data is NOT secure or scalable for production use.
// All data, including potentially sensitive user information, is exposed in client-side code.
// Admin must manually update this file and redeploy the entire site for any data changes to take effect globally.

export const dbData = {
  users: [
    // Example:
    // {
    //   id: "user-" + Date.now() + Math.random().toString(16).slice(2), // Simple unique ID
    //   name: "Test User",
    //   email: "user@example.com",
    //   password_hash: "$2a$10$...", // Bcrypt hash generated on client during signup
    //   payment_pin_hash: "$2a$10$...", // Bcrypt hash for PIN
    //   balance: 0,
    //   is_admin: false,
    //   created_at: new Date().toISOString(),
    //   last_login_at: null
    // },
    // {
    //   id: "admin-" + Date.now() + Math.random().toString(16).slice(2),
    //   name: "Admin",
    //   email: "admin@example.com", // For admin login reference
    //   // Admin password check will be simpler, not relying on this user entry's password_hash for panel access
    //   password_hash: "ADMIN_DO_NOT_USE_FOR_PANEL_LOGIN",
    //   payment_pin_hash: "ADMIN_PIN_HASH_EXAMPLE",
    //   balance: 0,
    //   is_admin: true,
    //   created_at: new Date().toISOString()
    // }
  ],
  mining_plans: [
    // Example:
    // {
    //   id: "plan-" + Date.now() + Math.random().toString(16).slice(2),
    //   name: "Starter Plan",
    //   price: 50000,
    //   duration_days: 30,
    //   total_return_multiplier: 1.5, // 150% total return
    //   power_output_per_second: 0.0005, // MMK per second
    //   description: "A good plan to get started.",
    //   is_active: true,
    //   created_at: new Date().toISOString(),
    //   updated_at: new Date().toISOString()
    // }
  ],
  user_purchased_plans: [
    // Example:
    // {
    //   id: "purchase-" + Date.now() + Math.random().toString(16).slice(2),
    //   user_id: "user-xxxx", // Link to user id
    //   plan_id: "plan-yyyy", // Link to plan id
    //   purchase_price: 50000,
    //   start_date: null, // Set by admin upon approval
    //   end_date: null,   // Set by admin upon approval
    //   status: "pending_payment", // 'pending_payment', 'active', 'completed', 'rejected_payment', 'expired'
    //   payment_receipt_url: "https://example.com/receipt.jpg", // User uploaded (simulated)
    //   payment_method: "kpay", // 'kpay', 'wavepay'
    //   admin_notes: "",
    //   created_at: new Date().toISOString(),
    //   updated_at: new Date().toISOString()
    // }
  ],
  withdrawal_requests: [
    // Example:
    // {
    //   id: "withdraw-" + Date.now() + Math.random().toString(16).slice(2),
    //   user_id: "user-xxxx",
    //   amount: 100000,
    //   payment_method: "wavepay",
    //   recipient_phone: "09123456789",
    //   status: "pending_approval", // 'pending_approval', 'approved', 'rejected', 'processing', 'completed'
    //   admin_notes: "",
    //   requested_at: new Date().toISOString(),
    //   processed_at: null
    // }
  ],
  admin_settings: {
    payment_phone_number: "09xxxxxxxxx", // Admin sets this
    admin_panel_password: "verysecurepassword123", // Extremely insecure, for demo only.
    // Admin will type this into server.html prompt.
  },
  _meta: {
    version: 1.0,
    last_manual_update: new Date().toISOString(),
    description: "This data is manually updated by the admin by editing this file and redeploying the site.",
  },
}

// Function to help admin export the current state of dbData from server.html
// This function will be attached to the window object in server.html's script
// so the admin can call it from the console or a button.
function exportDbDataForUpdate() {
  const dataString = JSON.stringify(dbData, null, 2)
  console.log("--- COPY THE DATA BELOW AND PASTE INTO database.js ---")
  console.log(dataString)

  // Create a temporary textarea to copy to clipboard
  const textarea = document.createElement("textarea")
  textarea.value = `export let dbData = ${dataString};`
  document.body.appendChild(textarea)
  textarea.select()
  try {
    document.execCommand("copy")
    alert(
      "Data to update database.js has been copied to your clipboard and logged to console. \n\nIMPORTANT: Paste this into your database.js file, save, and then redeploy your website to Netlify.",
    )
  } catch (err) {
    alert(
      "Failed to copy data automatically. Please copy it manually from the console. \n\nIMPORTANT: Paste this into your database.js file, save, and then redeploy your website to Netlify.",
    )
    console.error("Failed to copy data to clipboard: ", err)
  }
  document.body.removeChild(textarea)
}

// If this script is loaded in server.html, attach the export function to window
if (typeof window !== "undefined" && window.location.pathname.includes("server.html")) {
  window.adminUtils = { exportDbDataForUpdate }
}

console.log("database.js loaded. Initial dbData:", JSON.parse(JSON.stringify(dbData))) // Log a clone
