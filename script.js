import { dbData as initialDbData } from "./database.js"

// Make a deep copy of initialDbData to prevent direct modification of the imported module's data
// This localDbData will be what the client interacts with.
// For global persistence, database.js itself must be manually updated and redeployed by an admin.
const localDbData = JSON.parse(JSON.stringify(initialDbData))
console.log("SCRIPT.JS: Initial localDbData (cloned from database.js):", localDbData)

// Global variables for bcrypt instance
let bcryptInstance // Will be assigned after bcrypt.js loads and is confirmed

// DOM Element variables
let loadingScreen,
  appContent,
  authSection,
  loginView,
  signupView,
  loginForm,
  signupForm,
  showSignupLink,
  showLoginLink,
  authMessage,
  mainAppSection,
  userBalanceDisplay,
  logoutButton,
  pageContent,
  navButtons,
  pages,
  miningStatusText,
  miningPowerDisplay,
  miningRateDisplay,
  activePlansList,
  miningPlansContainer,
  paymentModal,
  closePaymentModalButton,
  paymentForm,
  paymentPlanDetailsModal,
  paymentPhoneNumberModal,
  selectedPlanIdInputModal,
  paymentReceiptInputModal,
  paymentMessageEl,
  historyTabs,
  historyTabContents,
  purchaseHistoryList,
  withdrawalHistoryList,
  earningHistoryList,
  profileNameDisplay,
  profileEmailDisplay,
  withdrawalForm,
  withdrawalMessageEl

// Global State
let currentUser = null // Will store the currently logged-in user object from localDbData.users
let userBalance = 0 // Local cache of user balance, primarily from localDbData and localStorage
let activeMiningInterval = null
// miningPlansCache is now directly from localDbData.mining_plans
// paymentPhoneNumber is now from localDbData.admin_settings.payment_phone_number

// --- Utility Functions ---
function generateSimpleId(prefix = "item-") {
  return prefix + Date.now() + Math.random().toString(16).slice(2)
}

function showAuthMessage(message, type = "error") {
  if (authMessage) {
    authMessage.textContent = message
    authMessage.className = `message ${type}`
    authMessage.style.display = "block"
  } else {
    console.error("authMessage element not ready. Message:", message)
    alert(`Auth: ${message}`)
  }
}

function hideAuthMessage() {
  if (authMessage) authMessage.style.display = "none"
}

function showPaymentMessage(message, type = "error") {
  if (paymentMessageEl) {
    paymentMessageEl.textContent = message
    paymentMessageEl.className = `message ${type}`
    paymentMessageEl.style.display = "block"
  } else {
    alert(`Payment: ${message}`)
  }
}
function hidePaymentMessage() {
  if (paymentMessageEl) paymentMessageEl.style.display = "none"
}

function showWithdrawalMessage(message, type = "error") {
  if (withdrawalMessageEl) {
    withdrawalMessageEl.textContent = message
    withdrawalMessageEl.className = `message ${type}`
    withdrawalMessageEl.style.display = "block"
  } else {
    alert(`Withdrawal: ${message}`)
  }
}

function showLoadingScreen(show = true) {
  if (loadingScreen) {
    loadingScreen.style.opacity = show ? "1" : "0"
    loadingScreen.style.pointerEvents = show ? "auto" : "none"
    loadingScreen.style.display = show ? "flex" : "none" // Ensure it's visible
  }
}

function navigateToView(viewId) {
  document.querySelectorAll(".view").forEach((view) => (view.style.display = "none"))
  const targetView = document.getElementById(viewId)
  if (targetView) {
    targetView.style.display = viewId === "main-app-section" ? "flex" : "block"
  } else console.error(`View with id ${viewId} not found.`)
}

async function hashDataClient(data) {
  if (!bcryptInstance) {
    console.error("bcrypt.js (bcryptInstance) not available for hashing!")
    showAuthMessage("Security component error. Please refresh or check console.")
    return null
  }
  try {
    const salt = bcryptInstance.genSaltSync(10)
    return bcryptInstance.hashSync(data, salt)
  } catch (err) {
    console.error("Hashing error:", err)
    showAuthMessage("Error processing security data. Please try again.")
    return null
  }
}

async function compareDataClient(plainData, hash) {
  if (!bcryptInstance) {
    console.error("bcrypt.js (bcryptInstance) not available for comparison!")
    showAuthMessage("Security component error. Please refresh or check console.")
    return false
  }
  try {
    return bcryptInstance.compareSync(plainData, hash)
  } catch (err) {
    console.error("Comparison error:", err)
    showAuthMessage("Error verifying security data. Please try again.")
    return false
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Assign DOM elements
  loadingScreen = document.getElementById("loading-screen")
  appContent = document.getElementById("app-content")
  authSection = document.getElementById("auth-section")
  loginView = document.getElementById("login-view")
  signupView = document.getElementById("signup-view")
  loginForm = document.getElementById("login-form")
  signupForm = document.getElementById("signup-form")
  showSignupLink = document.getElementById("show-signup-link")
  showLoginLink = document.getElementById("show-login-link")
  authMessage = document.getElementById("auth-message")
  mainAppSection = document.getElementById("main-app-section")
  userBalanceDisplay = document.getElementById("user-balance")
  logoutButton = document.getElementById("logout-button")
  pageContent = document.getElementById("page-content")
  navButtons = document.querySelectorAll(".nav-button")
  pages = document.querySelectorAll(".page")
  miningStatusText = document.getElementById("mining-status-text")
  miningPowerDisplay = document.getElementById("mining-power-display")
  miningRateDisplay = document.getElementById("mining-rate-display")
  activePlansList = document.getElementById("active-plans-list")
  miningPlansContainer = document.getElementById("mining-plans-container")
  paymentModal = document.getElementById("payment-modal")
  closePaymentModalButton = document.getElementById("close-payment-modal")
  paymentForm = document.getElementById("payment-form")
  paymentPlanDetailsModal = document.getElementById("payment-plan-details-modal")
  paymentPhoneNumberModal = document.getElementById("payment-phone-number-modal")
  selectedPlanIdInputModal = document.getElementById("selected-plan-id-modal")
  paymentReceiptInputModal = document.getElementById("payment-receipt-modal")
  paymentMessageEl = document.getElementById("payment-message")
  historyTabs = document.querySelectorAll(".history-tabs .tab-button")
  historyTabContents = document.querySelectorAll(".history-tabs .tab-content")
  purchaseHistoryList = document.getElementById("purchase-history-list")
  withdrawalHistoryList = document.getElementById("withdrawal-history-list")
  earningHistoryList = document.getElementById("earning-history-list")
  profileNameDisplay = document.getElementById("profile-name")
  profileEmailDisplay = document.getElementById("profile-email")
  withdrawalForm = document.getElementById("withdrawal-form")
  withdrawalMessageEl = document.getElementById("withdrawal-message")

  console.log("SCRIPT.JS: DOMContentLoaded event fired.")

  if (typeof window.bcrypt !== "undefined") {
    bcryptInstance = window.bcrypt
    console.log("SCRIPT.JS: bcrypt.js library confirmed and assigned to bcryptInstance.")
  } else {
    console.error(
      "SCRIPT.JS: CRITICAL - bcrypt.js library is NOT available on window object at DOMContentLoaded. Signup/Login will fail.",
    )
    showAuthMessage(
      "Critical security component failed to load. Please refresh. If the problem persists, contact support.",
    )
    // Optionally, hide the app or show a persistent error message
    if (appContent) appContent.style.display = "none"
    if (loadingScreen) loadingScreen.style.display = "none"
    const errorDiv = document.createElement("div")
    errorDiv.innerHTML =
      '<p style="color:red; text-align:center; padding:20px;">A critical security component (bcrypt.js) failed to load. The application cannot start securely. Please check your internet connection and try refreshing. If the issue continues, please contact support.</p>'
    document.body.prepend(errorDiv)
    return // Halt further execution
  }

  setupEventListeners()
  if (appContent) appContent.style.display = "block" // Show app content container
  showLoadingScreen(true)

  setTimeout(async () => {
    const loggedInUserId = localStorage.getItem("mmk_current_user_id")
    if (loggedInUserId) {
      currentUser = localDbData.users.find((u) => u.id === loggedInUserId)
      if (currentUser) {
        await initializeApp()
      } else {
        // User ID in localStorage but not in dbData, treat as logged out
        localStorage.removeItem("mmk_current_user_id")
        navigateToView("auth-section")
        showLoadingScreen(false)
      }
    } else {
      navigateToView("auth-section")
      showLoadingScreen(false)
    }
    if (window.lucide) window.lucide.createIcons()
  }, 1000) // Reduced timeout for faster perceived load
})

function setupEventListeners() {
  if (showSignupLink)
    showSignupLink.addEventListener("click", (e) => {
      e.preventDefault()
      loginView.style.display = "none"
      signupView.style.display = "block"
      hideAuthMessage()
    })
  if (showLoginLink)
    showLoginLink.addEventListener("click", (e) => {
      e.preventDefault()
      signupView.style.display = "none"
      loginView.style.display = "block"
      hideAuthMessage()
    })
  if (signupForm) signupForm.addEventListener("submit", handleSignupSubmit)
  if (loginForm) loginForm.addEventListener("submit", handleLoginSubmit)
  if (logoutButton) logoutButton.addEventListener("click", handleLogout)
  if (navButtons)
    navButtons.forEach((button) => button.addEventListener("click", () => navigateToPage(button.dataset.page)))
  if (paymentForm) paymentForm.addEventListener("submit", handlePaymentFormSubmit)
  if (closePaymentModalButton)
    closePaymentModalButton.addEventListener("click", () => {
      paymentModal.style.display = "none"
      paymentForm.reset()
      hidePaymentMessage()
    })
  if (historyTabs)
    historyTabs.forEach((tab) =>
      tab.addEventListener("click", () => {
        historyTabs.forEach((t) => t.classList.remove("active"))
        historyTabContents.forEach((c) => c.classList.remove("active"))
        tab.classList.add("active")
        document.getElementById(tab.dataset.tab + "-content").classList.add("active")
        loadHistoryData(tab.dataset.tab)
      }),
    )
  if (withdrawalForm) withdrawalForm.addEventListener("submit", handleWithdrawalFormSubmit)
}

async function handleSignupSubmit(e) {
  e.preventDefault()
  showLoadingScreen(true)
  hideAuthMessage()

  const name = document.getElementById("signup-name").value.trim()
  const email = document.getElementById("signup-email").value.trim().toLowerCase()
  const password = document.getElementById("signup-password").value
  const paymentPin = document.getElementById("signup-pin").value

  if (!name || !email || !password || !paymentPin) {
    return showAuthMessage("All fields are required."), showLoadingScreen(false)
  }
  if (paymentPin.length !== 6 || !/^\d+$/.test(paymentPin)) {
    return showAuthMessage("Payment PIN must be exactly 6 digits."), showLoadingScreen(false)
  }
  if (password.length < 6) {
    return showAuthMessage("Password must be at least 6 characters long."), showLoadingScreen(false)
  }

  if (localDbData.users.find((user) => user.email === email)) {
    return showAuthMessage("Email already registered. Please login."), showLoadingScreen(false)
  }

  const passwordHash = await hashDataClient(password)
  const paymentPinHash = await hashDataClient(paymentPin)

  if (!passwordHash || !paymentPinHash) {
    return showLoadingScreen(false) /* Message shown by hashDataClient */
  }

  const newUser = {
    id: generateSimpleId("user-"),
    name,
    email,
    password_hash: passwordHash,
    payment_pin_hash: paymentPinHash,
    balance: 0,
    is_admin: false,
    created_at: new Date().toISOString(),
    last_login_at: null,
  }

  // IMPORTANT: This adds the user to the *local* copy of the data.
  // For this user to exist globally, database.js needs to be manually updated by an admin and redeployed.
  localDbData.users.push(newUser)
  console.log("User signed up (locally):", newUser)
  console.log("Current localDbData.users:", localDbData.users)
  alert(
    "Signup successful (locally)! \nIMPORTANT: For this account to be permanent, an admin needs to update the main database file and redeploy the site.",
  )

  showAuthMessage("Sign up successful! Please login.", "success")
  signupForm.reset()
  loginView.style.display = "block"
  signupView.style.display = "none"
  showLoadingScreen(false)
}

async function handleLoginSubmit(e) {
  e.preventDefault()
  showLoadingScreen(true)
  hideAuthMessage()
  const email = document.getElementById("login-email").value.trim().toLowerCase()
  const password = document.getElementById("login-password").value

  if (!email || !password) {
    return showAuthMessage("Email and password are required."), showLoadingScreen(false)
  }

  const user = localDbData.users.find((u) => u.email === email)

  if (!user) {
    return showAuthMessage("Invalid email or password."), showLoadingScreen(false)
  }

  const passwordMatch = await compareDataClient(password, user.password_hash)
  if (!passwordMatch) {
    return showAuthMessage("Invalid email or password."), showLoadingScreen(false)
  }

  currentUser = user
  currentUser.last_login_at = new Date().toISOString() // Update last login for local copy
  localStorage.setItem("mmk_current_user_id", currentUser.id)

  // Update user balance from localStorage if available (from previous mining sessions)
  const storedBalance = localStorage.getItem(`mmk_balance_${currentUser.id}`)
  if (storedBalance !== null) {
    currentUser.balance = Number.parseFloat(storedBalance)
    userBalance = currentUser.balance // Sync global userBalance
  } else {
    userBalance = currentUser.balance // Use balance from dbData
  }

  console.log("User logged in:", currentUser)
  await initializeApp()
  showLoadingScreen(false)
}

async function handleLogout() {
  showLoadingScreen(true)
  if (currentUser && activeMiningInterval) {
    // Save current balance before logging out
    localStorage.setItem(`mmk_balance_${currentUser.id}`, userBalance.toString())
  }
  currentUser = null
  localStorage.removeItem("mmk_current_user_id")
  if (activeMiningInterval) clearInterval(activeMiningInterval)
  activeMiningInterval = null

  navigateToView("auth-section")
  mainAppSection.style.display = "none"
  loginForm.reset()
  signupForm.reset()
  hideAuthMessage()
  showLoadingScreen(false)
}

async function initializeApp() {
  if (!currentUser) {
    navigateToView("auth-section")
    mainAppSection.style.display = "none"
    showLoadingScreen(false)
    return
  }
  navigateToView("main-app-section")
  authSection.style.display = "none"

  fetchUserBalance() // This will now use localDbData and localStorage
  fetchAdminSettings() // For payment phone number
  navigateToPage("mining-page")
  showLoadingScreen(false)
}

function fetchAdminSettings() {
  const paymentPhone = localDbData.admin_settings.payment_phone_number
  if (paymentPhoneNumberModal) {
    paymentPhoneNumberModal.textContent = paymentPhone || "N/A (Admin setup needed)"
  }
}

function fetchUserBalance() {
  if (!currentUser) return
  // Prioritize localStorage balance for continuity of client-side mining
  const storedBalance = localStorage.getItem(`mmk_balance_${currentUser.id}`)
  if (storedBalance !== null) {
    userBalance = Number.parseFloat(storedBalance)
  } else {
    // Fallback to balance from localDbData (which is from database.js initially)
    const userInData = localDbData.users.find((u) => u.id === currentUser.id)
    userBalance = userInData ? Number.parseFloat(userInData.balance) : 0
  }

  currentUser.balance = userBalance // Keep currentUser object in sync

  if (userBalanceDisplay) {
    userBalanceDisplay.textContent = userBalance.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
}

function navigateToPage(pageId) {
  pages.forEach((page) => page.classList.remove("active-page"))
  navButtons.forEach((btn) => btn.classList.remove("active"))
  document.getElementById(pageId).classList.add("active-page")
  document.querySelector(`.nav-button[data-page="${pageId}"]`).classList.add("active")

  if (pageId === "mining-page") loadMiningData()
  if (pageId === "buy-mining-page") loadMiningPlans()
  if (pageId === "history-page") {
    const activeHistoryTab = document.querySelector(".history-tabs .tab-button.active")
    loadHistoryData(activeHistoryTab ? activeHistoryTab.dataset.tab : "purchase-history")
  }
  if (pageId === "profile-page") loadProfileData()
  if (window.lucide) window.lucide.createIcons()
}

function loadMiningData() {
  if (!currentUser) return
  showLoadingScreen(true)
  fetchUserBalance()

  const userPurchases = localDbData.user_purchased_plans.filter(
    (p) => p.user_id === currentUser.id && p.status === "active",
  )
  activePlansList.innerHTML = ""
  let totalEffectivePower = 0

  if (userPurchases.length === 0) {
    activePlansList.innerHTML = '<li>No active mining plans. Visit "Buy" to get started.</li>'
    miningStatusText.textContent = "Idle"
  } else {
    userPurchases.forEach((purchase) => {
      const planDetails = localDbData.mining_plans.find((mp) => mp.id === purchase.plan_id)
      if (!planDetails || !purchase.start_date || !purchase.end_date) return

      const now = new Date()
      const startDate = new Date(purchase.start_date)
      const endDate = new Date(purchase.end_date)

      if (now >= startDate && now <= endDate) {
        totalEffectivePower += Number.parseFloat(planDetails.power_output_per_second)
        const listItem = document.createElement("li")
        listItem.innerHTML = `<strong>${planDetails.name}</strong> - Ends: ${endDate.toLocaleDateString()} <br>Power: ${planDetails.power_output_per_second} P/s`
        activePlansList.appendChild(listItem)
      }
    })
    miningStatusText.textContent = totalEffectivePower > 0 ? "Mining Active" : "No Active Plans"
    if (activePlansList.children.length === 0 && userPurchases.length > 0) {
      activePlansList.innerHTML =
        "<li>You have plans, but none are currently active or within their mining period (Admin might need to activate them).</li>"
    } else if (activePlansList.children.length === 0) {
      activePlansList.innerHTML = '<li>No active mining plans. Visit "Buy" to get started.</li>'
    }
  }

  miningPowerDisplay.textContent = `Total Power: ${totalEffectivePower.toFixed(5)} P/s`
  miningRateDisplay.textContent = `Est. Rate: ${totalEffectivePower.toFixed(5)} MMK/s`

  if (activeMiningInterval) clearInterval(activeMiningInterval)
  if (totalEffectivePower > 0) {
    activeMiningInterval = setInterval(() => {
      const earningsThisSecond = totalEffectivePower
      userBalance += earningsThisSecond
      currentUser.balance = userBalance // Update currentUser object
      if (userBalanceDisplay)
        userBalanceDisplay.textContent = userBalance.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 5,
        }) // Show more precision for earnings

      // Persist to localStorage frequently for client-side mining continuity
      localStorage.setItem(`mmk_balance_${currentUser.id}`, userBalance.toString())

      // Log earning locally (not to global dbData unless admin updates)
      const earningRecord = {
        id: generateSimpleId("earn-"),
        user_id: currentUser.id,
        type: "mining_earning",
        amount: earningsThisSecond,
        description: `Mining: ${totalEffectivePower.toFixed(5)} P/s`,
        created_at: new Date().toISOString(),
      }
      // This transaction history is also local to this session unless admin merges.
      // For simplicity, we might not even store it in localDbData.transactions here,
      // but rather just update balance and rely on admin to reconcile.
      // Let's add it to a temporary local array for the history page.
      if (!localDbData.transactions) localDbData.transactions = [] // Ensure transactions array exists
      localDbData.transactions.push(earningRecord)
    }, 1000)
  }
  showLoadingScreen(false)
}

function loadMiningPlans() {
  showLoadingScreen(true)
  miningPlansContainer.innerHTML = "<p>Loading available plans...</p>"
  const activePlans = localDbData.mining_plans.filter((p) => p.is_active)

  miningPlansContainer.innerHTML = ""
  if (activePlans.length === 0) {
    miningPlansContainer.innerHTML = "<p>No mining plans available. Admin needs to add them.</p>"
    showLoadingScreen(false)
    return
  }
  activePlans.forEach((plan) => {
    const planCard = document.createElement("div")
    planCard.className = "plan-card"
    const dailyReturn = (plan.price * plan.total_return_multiplier - plan.price) / plan.duration_days
    const totalProfit = plan.price * plan.total_return_multiplier - plan.price
    planCard.innerHTML = `
            <h4>${plan.name}</h4>
            <p class="price">${Number.parseFloat(plan.price).toLocaleString()} MMK</p>
            <p class="details"><strong>Duration:</strong> <span>${plan.duration_days} days</span></p>
            <p class="details"><strong>Power:</strong> <span>${plan.power_output_per_second} P/s</span></p>
            <p class="details"><strong>Est. Daily Profit:</strong> <span style="color:var(--success-color)">${dailyReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MMK</span></p>
            <p class="details"><strong>Total Est. Profit:</strong> <span style="color:var(--success-color)">${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MMK</span></p>
            <button class="button-primary buy-plan-button" data-plan-id="${plan.id}">Buy This Plan</button>`
    miningPlansContainer.appendChild(planCard)
  })
  document
    .querySelectorAll(".buy-plan-button")
    .forEach((button) => button.addEventListener("click", (e) => openPaymentModal(e.target.dataset.planId)))
  showLoadingScreen(false)
}

function openPaymentModal(planId) {
  const plan = localDbData.mining_plans.find((p) => p.id === planId)
  if (!plan) {
    return alert("Plan not found.")
  }
  selectedPlanIdInputModal.value = planId
  paymentPlanDetailsModal.innerHTML = `<strong>Plan:</strong> ${plan.name}<br><strong>Price:</strong> ${Number.parseFloat(plan.price).toLocaleString()} MMK`
  paymentModal.style.display = "flex"
  hidePaymentMessage()
}

async function handlePaymentFormSubmit(e) {
  e.preventDefault()
  showLoadingScreen(true)
  hidePaymentMessage()

  const planId = selectedPlanIdInputModal.value
  const paymentMethodVal = document.getElementById("payment-method-modal").value
  const receiptFile = paymentReceiptInputModal.files[0] // File object

  if (!paymentMethodVal || !receiptFile) {
    return showPaymentMessage("Please select method and upload receipt."), showLoadingScreen(false)
  }
  if (!currentUser) {
    return showPaymentMessage("User not logged in."), showLoadingScreen(false)
  }

  const plan = localDbData.mining_plans.find((p) => p.id === planId)
  if (!plan) {
    return showPaymentMessage("Selected plan not found."), showLoadingScreen(false)
  }

  // Simulate receipt upload by just using its name for now.
  // In a real scenario without a backend, you can't really "upload".
  // You could use FileReader to display it or store as base64 in localStorage if small.
  const simulatedReceiptUrl = `simulated_receipt_for_${receiptFile.name}`

  const newPurchaseRequest = {
    id: generateSimpleId("purchase-"),
    user_id: currentUser.id,
    plan_id: planId,
    purchase_price: plan.price,
    status: "pending_payment", // Admin needs to change this to 'active'
    payment_method: paymentMethodVal,
    payment_receipt_url: simulatedReceiptUrl, // Store file name or a placeholder
    admin_notes: "User submitted payment proof. Awaiting admin approval.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    start_date: null, // Admin will set these
    end_date: null,
  }

  // Add to localDbData.user_purchased_plans. This is a LOCAL change.
  localDbData.user_purchased_plans.push(newPurchaseRequest)
  console.log("New purchase request (local):", newPurchaseRequest)
  alert(
    "Purchase request submitted (locally). An admin needs to review this, update the main database.js file, and redeploy the site to make this purchase active globally.",
  )

  showPaymentMessage("Purchase request submitted for admin review!", "success")
  setTimeout(() => {
    paymentModal.style.display = "none"
    paymentForm.reset()
    navigateToPage("history-page")
  }, 2000)
  showLoadingScreen(false)
}

async function handleWithdrawalFormSubmit(e) {
  e.preventDefault()
  showLoadingScreen(true)
  withdrawalMessageEl.style.display = "none"

  const amount = Number.parseFloat(document.getElementById("withdrawal-amount").value)
  const paymentMethodVal = document.getElementById("withdrawal-method").value
  const recipientPhone = document.getElementById("recipient-phone").value.trim()
  const paymentPin = document.getElementById("payment-pin-withdraw").value

  if (!paymentMethodVal || !recipientPhone) {
    return showWithdrawalMessage("All fields except PIN are required."), showLoadingScreen(false)
  }
  if (amount < 100000) {
    return showWithdrawalMessage("Minimum withdrawal is 100,000 MMK."), showLoadingScreen(false)
  }
  if (amount > userBalance) {
    return showWithdrawalMessage("Insufficient balance."), showLoadingScreen(false)
  }

  const pinMatch = await compareDataClient(paymentPin, currentUser.payment_pin_hash)
  if (!pinMatch) {
    return showWithdrawalMessage("Incorrect Payment PIN."), showLoadingScreen(false)
  }

  // Check for existing pending withdrawal for the day (simplified check)
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const existingTodayRequest = localDbData.withdrawal_requests.find(
    (req) =>
      req.user_id === currentUser.id &&
      req.requested_at.startsWith(today) &&
      (req.status === "pending_approval" || req.status === "approved"), // Consider approved ones too for daily limit
  )
  if (existingTodayRequest) {
    return (
      showWithdrawalMessage(
        "You have already made a withdrawal request today or one is being processed. Please try again tomorrow.",
      ),
      showLoadingScreen(false)
    )
  }

  const newWithdrawalRequest = {
    id: generateSimpleId("withdraw-"),
    user_id: currentUser.id,
    amount,
    payment_method: paymentMethodVal,
    recipient_phone: recipientPhone,
    status: "pending_approval", // Admin needs to process this
    admin_notes: "User requested withdrawal. Awaiting admin approval.",
    requested_at: new Date().toISOString(),
    processed_at: null,
  }
  localDbData.withdrawal_requests.push(newWithdrawalRequest)
  console.log("New withdrawal request (local):", newWithdrawalRequest)
  alert(
    "Withdrawal request submitted (locally). An admin needs to review this, update the main database.js file, and redeploy the site to process this withdrawal.",
  )

  showWithdrawalMessage("Withdrawal request submitted for admin review!", "success")
  withdrawalForm.reset()
  setTimeout(() => navigateToPage("history-page"), 2000)
  showLoadingScreen(false)
}

function loadHistoryData(activeTabKey) {
  if (!currentUser) return
  showLoadingScreen(true)
  const formatDate = (ds) => (ds ? new Date(ds).toLocaleString() : "N/A")

  if (activeTabKey === "purchase-history") {
    purchaseHistoryList.innerHTML = "<li>Loading...</li>"
    const purchases = localDbData.user_purchased_plans
      .filter((p) => p.user_id === currentUser.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    purchaseHistoryList.innerHTML =
      purchases.length === 0
        ? "<li>No purchase history.</li>"
        : purchases
            .map((item) => {
              const plan = localDbData.mining_plans.find((p) => p.id === item.plan_id)
              return `<li><strong>${plan ? plan.name : "Unknown Plan"}</strong> - ${Number.parseFloat(item.purchase_price).toLocaleString()} MMK <br>Status: ${item.status} | Date: ${formatDate(item.created_at)} <br><small>${item.admin_notes || ""}</small></li>`
            })
            .join("")
  } else if (activeTabKey === "withdrawal-history") {
    withdrawalHistoryList.innerHTML = "<li>Loading...</li>"
    const withdrawals = localDbData.withdrawal_requests
      .filter((w) => w.user_id === currentUser.id)
      .sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at))
    withdrawalHistoryList.innerHTML =
      withdrawals.length === 0
        ? "<li>No withdrawal history.</li>"
        : withdrawals
            .map(
              (item) =>
                `<li><strong>${Number.parseFloat(item.amount).toLocaleString()} MMK</strong> to ${item.recipient_phone} (${item.payment_method}) <br>Status: ${item.status} | Date: ${formatDate(item.requested_at)} <br><small>${item.admin_notes || ""}</small></li>`,
            )
            .join("")
  } else if (activeTabKey === "earning-history") {
    earningHistoryList.innerHTML = "<li>Loading...</li>"
    // Assuming localDbData.transactions exists and is populated by mining interval
    const earnings = (localDbData.transactions || [])
      .filter((t) => t.user_id === currentUser.id && t.type === "mining_earning")
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 100) // Limit to 100 recent
    earningHistoryList.innerHTML =
      earnings.length === 0
        ? "<li>No earning records.</li>"
        : earnings
            .map(
              (item) =>
                `<li><strong>+${Number.parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })} MMK</strong> <br> ${item.description || "Mining"} | Date: ${formatDate(item.created_at)}</li>`,
            )
            .join("")
  }
  showLoadingScreen(false)
}

function loadProfileData() {
  if (!currentUser) return
  profileNameDisplay.textContent = currentUser.name
  profileEmailDisplay.textContent = currentUser.email
  withdrawalForm.reset()
  if (withdrawalMessageEl) withdrawalMessageEl.style.display = "none"
}
