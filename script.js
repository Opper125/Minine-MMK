// Constants for Supabase URL and Key
const SUPABASE_URL = "https://ggwwsuhnhnksphryhhjo.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnd3dzdWhuaG5rc3BocnloaGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MzM3ODQsImV4cCI6MjA2NjIwOTc4NH0.nZRj7cnC9jSo6CnilIlgz9193D-Vjf094H5XzPJBUxY"

// Global variables for Supabase and bcrypt instances
let supabase
let bcrypt // This will be assigned after bcrypt.js loads

// DOM Element variables - will be assigned in DOMContentLoaded
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
let currentUser = null
let userBalance = 0
let activeMiningInterval = null
let miningPlansCache = []
let paymentPhoneNumber = "09786284670" // Default, will be fetched

// --- Utility Functions ---
function showAuthMessage(message, type = "error") {
  if (authMessage) {
    authMessage.textContent = message
    authMessage.className = `message ${type}`
    authMessage.style.display = "block"
  } else {
    console.error("authMessage element not ready. Message:", message)
    alert(`Auth: ${message}`) // Fallback
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
    if (show) {
      loadingScreen.classList.remove("hidden")
    } else {
      setTimeout(() => loadingScreen.classList.add("hidden"), 300)
    }
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
  if (!bcrypt) {
    // Check if bcrypt is available
    console.error("bcrypt.js not available for hashing! This should have been caught earlier.")
    showAuthMessage("Security component error. Please refresh.")
    return null
  }
  try {
    const salt = bcrypt.genSaltSync(10)
    return bcrypt.hashSync(data, salt)
  } catch (err) {
    console.error("Hashing error:", err)
    showAuthMessage("Error processing security data. Please try again.")
    return null
  }
}

async function compareDataClient(plainData, hash) {
  if (!bcrypt) {
    // Check if bcrypt is available
    console.error("bcrypt.js not available for comparison! This should have been caught earlier.")
    showAuthMessage("Security component error. Please refresh.")
    return false
  }
  try {
    return bcrypt.compareSync(plainData, hash)
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

  console.log("DOMContentLoaded event fired. Checking libraries...")

  // CRITICAL LIBRARY CHECKS
  if (typeof window.supabase === "undefined") {
    console.error("Supabase client library is NOT LOADED! (Checked in DOMContentLoaded)")
    if (loadingScreen) loadingScreen.style.display = "none"
    if (appContent) appContent.style.display = "block"
    showAuthMessage("Critical Error: Supabase library failed to load. Application cannot start.")
    return // Halt execution
  }
  console.log("Supabase client library found in window object (Checked in DOMContentLoaded).")
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  if (typeof window.bcrypt === "undefined") {
    console.error("bcrypt.js library is NOT LOADED! (Checked in DOMContentLoaded)")
    if (loadingScreen) loadingScreen.style.display = "none"
    if (appContent) appContent.style.display = "block"
    showAuthMessage("Security component (bcrypt.js) failed to load. Signup and Login will not work. Please refresh.")
    return // Halt execution
  }
  console.log("bcrypt.js library found in window object (Checked in DOMContentLoaded).")
  bcrypt = window.bcrypt // Assign to global variable for use in functions

  // Setup event listeners now that DOM is ready and elements are assigned
  setupEventListeners()

  // Proceed with app initialization
  if (appContent) appContent.style.display = "block"
  showLoadingScreen(true)

  setTimeout(async () => {
    const loggedIn = await checkUserSession()
    if (loggedIn) {
      await initializeApp()
    } else {
      showLoadingScreen(false) // checkUserSession handles navigation
    }
    if (window.lucide) window.lucide.createIcons()
  }, 2000)
})

function setupEventListeners() {
  if (showSignupLink) {
    showSignupLink.addEventListener("click", (e) => {
      e.preventDefault()
      if (loginView) loginView.style.display = "none"
      if (signupView) signupView.style.display = "block"
      hideAuthMessage()
    })
  }
  if (showLoginLink) {
    showLoginLink.addEventListener("click", (e) => {
      e.preventDefault()
      if (signupView) signupView.style.display = "none"
      if (loginView) loginView.style.display = "block"
      hideAuthMessage()
    })
  }
  if (signupForm) signupForm.addEventListener("submit", handleSignupSubmit)
  if (loginForm) loginForm.addEventListener("submit", handleLoginSubmit)
  if (logoutButton) logoutButton.addEventListener("click", handleLogout)

  if (navButtons) {
    navButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const pageId = button.getAttribute("data-page")
        navigateToPage(pageId)
      })
    })
  }
  if (paymentForm) paymentForm.addEventListener("submit", handlePaymentFormSubmit)
  if (closePaymentModalButton) {
    closePaymentModalButton.addEventListener("click", () => {
      if (paymentModal) paymentModal.style.display = "none"
      if (paymentForm) paymentForm.reset()
      hidePaymentMessage()
    })
  }
  if (historyTabs) {
    historyTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        historyTabs.forEach((t) => t.classList.remove("active"))
        if (historyTabContents) historyTabContents.forEach((c) => c.classList.remove("active"))

        tab.classList.add("active")
        const activeTabContentId = tab.dataset.tab + "-content"
        const activeContentEl = document.getElementById(activeTabContentId)
        if (activeContentEl) activeContentEl.classList.add("active")
        loadHistoryData(tab.dataset.tab)
      })
    })
  }
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
    showAuthMessage("All fields are required.")
    showLoadingScreen(false)
    return
  }
  if (paymentPin.length !== 6 || !/^\d+$/.test(paymentPin)) {
    showAuthMessage("Payment PIN must be exactly 6 digits.")
    showLoadingScreen(false)
    return
  }
  if (password.length < 6) {
    showAuthMessage("Password must be at least 6 characters long.")
    showLoadingScreen(false)
    return
  }

  const passwordHash = await hashDataClient(password)
  const paymentPinHash = await hashDataClient(paymentPin)

  if (!passwordHash || !paymentPinHash) {
    showLoadingScreen(false)
    return
  }

  try {
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("email")
      .eq("email", email)
      .maybeSingle()

    if (checkError && checkError.code !== "PGRST116") throw checkError
    if (existingUser) {
      showAuthMessage("Email already registered. Please login or use a different email.")
      showLoadingScreen(false)
      return
    }

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([
        { name, email, password_hash: passwordHash, payment_pin_hash: paymentPinHash, balance: 0, is_admin: false },
      ])
      .select()
      .single()

    if (insertError) throw insertError

    showAuthMessage("Sign up successful! Please login.", "success")
    if (signupForm) signupForm.reset()
    if (loginView) loginView.style.display = "block"
    if (signupView) signupView.style.display = "none"
  } catch (error) {
    console.error("Sign up error:", error)
    showAuthMessage(`Sign up failed: ${error.message || "Unknown error"}`)
  } finally {
    showLoadingScreen(false)
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault()
  showLoadingScreen(true)
  hideAuthMessage()
  const email = document.getElementById("login-email").value.trim().toLowerCase()
  const password = document.getElementById("login-password").value

  if (!email || !password) {
    showAuthMessage("Email and password are required.")
    showLoadingScreen(false)
    return
  }

  try {
    const { data: user, error } = await supabase.from("users").select("*").eq("email", email).single()

    if (error || !user) {
      showAuthMessage("Invalid email or password.")
      showLoadingScreen(false)
      return
    }

    const passwordMatch = await compareDataClient(password, user.password_hash)
    if (!passwordMatch) {
      showAuthMessage("Invalid email or password.")
      showLoadingScreen(false)
      return
    }

    await supabase.from("users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id)

    currentUser = user
    localStorage.setItem("mmk_mining_user_id", user.id)
    await initializeApp()
  } catch (error) {
    console.error("Login error:", error)
    showAuthMessage(`Login failed: ${error.message || "Please check your credentials."}`)
    showLoadingScreen(false)
  }
}

async function handleLogout() {
  showLoadingScreen(true)
  currentUser = null
  localStorage.removeItem("mmk_mining_user_id")
  if (activeMiningInterval) clearInterval(activeMiningInterval)
  activeMiningInterval = null

  navigateToView("auth-section")
  if (mainAppSection) mainAppSection.style.display = "none"
  if (loginForm) loginForm.reset()
  if (signupForm) signupForm.reset()
  hideAuthMessage()
  showLoadingScreen(false)
}

async function handlePaymentFormSubmit(e) {
  e.preventDefault()
  showLoadingScreen(true)
  hidePaymentMessage()

  const planId = selectedPlanIdInputModal.value
  const paymentMethodVal = document.getElementById("payment-method-modal").value
  const receiptFile = paymentReceiptInputModal.files[0]

  if (!paymentMethodVal) {
    showPaymentMessage("Please select a payment method.")
    showLoadingScreen(false)
    return
  }
  if (!receiptFile) {
    showPaymentMessage("Please upload a payment receipt screenshot.")
    showLoadingScreen(false)
    return
  }
  if (!currentUser) {
    showPaymentMessage("User not logged in. Please re-login.")
    showLoadingScreen(false)
    return
  }

  const plan = miningPlansCache.find((p) => p.id === planId)
  if (!plan) {
    showPaymentMessage("Selected plan details not found. Please refresh.")
    showLoadingScreen(false)
    return
  }

  try {
    const fileExt = receiptFile.name.split(".").pop()
    const fileName = `receipts/${currentUser.id}/${Date.now()}_${planId}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("payment_receipts")
      .upload(fileName, receiptFile, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage.from("payment_receipts").getPublicUrl(fileName)
    const receiptUrl = urlData.publicUrl

    const { error: insertError } = await supabase.from("user_purchased_plans").insert([
      {
        user_id: currentUser.id,
        plan_id: planId,
        purchase_price: plan.price,
        status: "pending_payment",
        payment_method: paymentMethodVal,
        payment_receipt_url: receiptUrl,
      },
    ])

    if (insertError) throw insertError

    showPaymentMessage("Purchase request submitted! It will be reviewed by an admin shortly.", "success")
    setTimeout(() => {
      if (paymentModal) paymentModal.style.display = "none"
      if (paymentForm) paymentForm.reset()
      navigateToPage("history-page")
    }, 2000)
  } catch (error) {
    console.error("Payment submission error:", error)
    showPaymentMessage(`Error submitting payment: ${error.message || "Unknown error"}`)
  } finally {
    showLoadingScreen(false)
  }
}

async function handleWithdrawalFormSubmit(e) {
  e.preventDefault()
  showLoadingScreen(true)
  if (withdrawalMessageEl) withdrawalMessageEl.style.display = "none"

  const amount = Number.parseFloat(document.getElementById("withdrawal-amount").value)
  const paymentMethodVal = document.getElementById("withdrawal-method").value
  const recipientPhone = document.getElementById("recipient-phone").value.trim()
  const paymentPin = document.getElementById("payment-pin-withdraw").value

  if (!paymentMethodVal) {
    showWithdrawalMessage("Please select a withdrawal method.")
    showLoadingScreen(false)
    return
  }
  if (amount < 100000) {
    showWithdrawalMessage("Minimum withdrawal amount is 100,000 MMK.")
    showLoadingScreen(false)
    return
  }
  if (amount > userBalance) {
    showWithdrawalMessage("Insufficient balance for this withdrawal amount.")
    showLoadingScreen(false)
    return
  }
  if (!recipientPhone) {
    showWithdrawalMessage("Recipient phone number is required.")
    showLoadingScreen(false)
    return
  }

  const pinMatch = await compareDataClient(paymentPin, currentUser.payment_pin_hash)
  if (!pinMatch) {
    showWithdrawalMessage("Incorrect Payment PIN.")
    showLoadingScreen(false)
    return
  }

  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const {
      data: recentWithdrawals,
      error: checkError,
      count,
    } = await supabase
      .from("withdrawal_requests")
      .select("id", { count: "exact" })
      .eq("user_id", currentUser.id)
      .gte("requested_at", todayStart.toISOString())

    if (checkError) throw checkError
    if (count > 0) {
      showWithdrawalMessage("You have already made a withdrawal request today. Please try again tomorrow.")
      showLoadingScreen(false)
      return
    }

    const { error: insertError } = await supabase.from("withdrawal_requests").insert([
      {
        user_id: currentUser.id,
        amount,
        payment_method: paymentMethodVal,
        recipient_phone: recipientPhone,
        status: "pending_approval",
      },
    ])

    if (insertError) throw insertError

    showWithdrawalMessage("Withdrawal request submitted successfully. It will be processed by an admin.", "success")
    if (withdrawalForm) withdrawalForm.reset()
    setTimeout(() => navigateToPage("history-page"), 2000)
  } catch (error) {
    console.error("Withdrawal error:", error)
    showWithdrawalMessage(`Withdrawal failed: ${error.message || "Unknown error"}`)
  } finally {
    showLoadingScreen(false)
  }
}

async function initializeApp() {
  if (!currentUser) {
    navigateToView("auth-section")
    if (mainAppSection) mainAppSection.style.display = "none"
    showLoadingScreen(false)
    return
  }
  navigateToView("main-app-section")
  if (authSection) authSection.style.display = "none"

  await fetchAdminSettings()
  await fetchUserBalance()
  navigateToPage("mining-page")
  showLoadingScreen(false)
}

async function checkUserSession() {
  const userId = localStorage.getItem("mmk_mining_user_id")
  if (userId) {
    try {
      const { data: user, error } = await supabase.from("users").select("*").eq("id", userId).single()
      if (error || !user) {
        localStorage.removeItem("mmk_mining_user_id")
        navigateToView("auth-section")
        return false
      }
      currentUser = user
      return true
    } catch (error) {
      console.error("Session check error:", error)
      localStorage.removeItem("mmk_mining_user_id")
      navigateToView("auth-section")
      return false
    }
  }
  navigateToView("auth-section")
  return false
}

async function fetchAdminSettings() {
  try {
    const { data, error } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "payment_phone_number")
      .maybeSingle()
    if (error && error.code !== "PGRST116") throw error
    if (data && data.value) {
      paymentPhoneNumber = data.value
      if (paymentPhoneNumberModal) paymentPhoneNumberModal.textContent = paymentPhoneNumber
    } else {
      if (paymentPhoneNumberModal) paymentPhoneNumberModal.textContent = "N/A (Admin setup needed)"
    }
  } catch (error) {
    console.error("Error fetching admin settings:", error)
    if (paymentPhoneNumberModal) paymentPhoneNumberModal.textContent = "Error loading"
  }
}

async function fetchUserBalance() {
  if (!currentUser) return
  try {
    const { data, error } = await supabase.from("users").select("balance").eq("id", currentUser.id).single()
    if (error) throw error
    userBalance = Number.parseFloat(data.balance) || 0
    if (userBalanceDisplay)
      userBalanceDisplay.textContent = userBalance.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
  } catch (error) {
    console.error("Error fetching balance:", error)
    if (userBalanceDisplay) userBalanceDisplay.textContent = "Error"
  }
}

function navigateToPage(pageId) {
  if (pages) pages.forEach((page) => page.classList.remove("active-page"))
  if (navButtons) navButtons.forEach((btn) => btn.classList.remove("active"))

  const targetPage = document.getElementById(pageId)
  const targetButton = document.querySelector(`.nav-button[data-page="${pageId}"]`)

  if (targetPage) targetPage.classList.add("active-page")
  if (targetButton) targetButton.classList.add("active")

  if (pageId === "mining-page") loadMiningData()
  if (pageId === "buy-mining-page") loadMiningPlans()
  if (pageId === "history-page") {
    const activeHistoryTab = document.querySelector(".history-tabs .tab-button.active")
    if (activeHistoryTab) {
      loadHistoryData(activeHistoryTab.dataset.tab)
    } else {
      const purchaseTab = document.querySelector(".history-tabs .tab-button[data-tab='purchase-history']")
      const purchaseContent = document.getElementById("purchase-history-content")
      if (purchaseTab) purchaseTab.classList.add("active")
      if (purchaseContent) purchaseContent.classList.add("active")
      loadHistoryData("purchase-history")
    }
  }
  if (pageId === "profile-page") loadProfileData()

  if (window.lucide) window.lucide.createIcons()
}

async function loadMiningData() {
  if (!currentUser) return
  showLoadingScreen(true)
  await fetchUserBalance()

  try {
    const { data: purchasedPlans, error } = await supabase
      .from("user_purchased_plans")
      .select(`
                id, status, start_date, end_date,
                mining_plans (name, power_output_per_second, duration_days)
            `)
      .eq("user_id", currentUser.id)
      .in("status", ["active"])

    if (error) throw error

    if (activePlansList) activePlansList.innerHTML = ""
    let totalEffectivePower = 0

    if (!purchasedPlans || purchasedPlans.length === 0) {
      if (activePlansList) activePlansList.innerHTML = '<li>No active mining plans. Visit "Buy" to get started.</li>'
      if (miningStatusText) miningStatusText.textContent = "Idle"
    } else {
      purchasedPlans.forEach((plan) => {
        const planDetails = plan.mining_plans
        if (!planDetails) {
          console.warn(`Plan details missing for purchased plan ID: ${plan.id}`)
          return
        }
        const now = new Date()
        const endDate = new Date(plan.end_date)
        const startDate = new Date(plan.start_date)

        if (plan.status === "active" && now >= startDate && now <= endDate) {
          totalEffectivePower += Number.parseFloat(planDetails.power_output_per_second)
          if (activePlansList) {
            const listItem = document.createElement("li")
            listItem.innerHTML = `<strong>${planDetails.name}</strong> - Ends: ${endDate.toLocaleDateString()} ${endDate.toLocaleTimeString()} <br>Power: ${planDetails.power_output_per_second} P/s`
            activePlansList.appendChild(listItem)
          }
        } else if (plan.status === "active" && now > endDate) {
          console.warn(`Plan ${planDetails.name} (ID: ${plan.id}) is marked active but past end_date.`)
        }
      })
      if (miningStatusText) miningStatusText.textContent = totalEffectivePower > 0 ? "Mining Active" : "No Active Plans"
      if (activePlansList && activePlansList.children.length === 0 && purchasedPlans.length > 0) {
        activePlansList.innerHTML =
          "<li>You have plans, but none are currently active or within their mining period.</li>"
      } else if (activePlansList && activePlansList.children.length === 0) {
        activePlansList.innerHTML = '<li>No active mining plans. Visit "Buy" to get started.</li>'
      }
    }

    if (miningPowerDisplay) miningPowerDisplay.textContent = `Total Power: ${totalEffectivePower.toFixed(5)} P/s`
    if (miningRateDisplay) miningRateDisplay.textContent = `Est. Rate: ${totalEffectivePower.toFixed(5)} MMK/s`

    if (activeMiningInterval) clearInterval(activeMiningInterval)

    if (totalEffectivePower > 0) {
      activeMiningInterval = setInterval(async () => {
        const earningsThisSecond = totalEffectivePower
        userBalance += earningsThisSecond
        if (userBalanceDisplay)
          userBalanceDisplay.textContent = userBalance.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })

        try {
          const { error: rpcError } = await supabase.rpc("increment_balance_and_log_earning", {
            p_user_id: currentUser.id,
            p_amount: earningsThisSecond,
            p_description: `Mining earning for 1 sec at ${totalEffectivePower.toFixed(5)} P/s`,
          })
          if (rpcError) {
            console.warn("Failed to update balance and log earning in DB via RPC:", rpcError.message)
          }
        } catch (dbError) {
          console.warn("DB Error during earning RPC call:", dbError.message)
        }
      }, 1000)
    }
  } catch (error) {
    console.error("Error loading mining data:", error)
    if (activePlansList) activePlansList.innerHTML = "<li>Error loading mining data.</li>"
  } finally {
    showLoadingScreen(false)
  }
}

async function loadMiningPlans() {
  showLoadingScreen(true)
  if (miningPlansContainer) miningPlansContainer.innerHTML = "<p>Loading available plans...</p>"
  try {
    const { data, error } = await supabase
      .from("mining_plans")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true })

    if (error) throw error
    miningPlansCache = data

    if (miningPlansContainer) miningPlansContainer.innerHTML = ""
    if (!data || data.length === 0) {
      if (miningPlansContainer)
        miningPlansContainer.innerHTML = "<p>No mining plans available at the moment. Please check back later.</p>"
      showLoadingScreen(false)
      return
    }

    data.forEach((plan) => {
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
                <p class="details"><strong>Total Return (incl. capital):</strong> <span>${(plan.price * plan.total_return_multiplier).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MMK</span></p>
                ${plan.description ? `<p style="font-size:0.85em; margin-top:10px;">${plan.description}</p>` : ""}
                <button class="button-primary buy-plan-button" data-plan-id="${plan.id}">Buy This Plan</button>
            `
      if (miningPlansContainer) miningPlansContainer.appendChild(planCard)
    })

    document.querySelectorAll(".buy-plan-button").forEach((button) => {
      button.addEventListener("click", (e) => {
        const planId = e.target.getAttribute("data-plan-id")
        openPaymentModal(planId)
      })
    })
  } catch (error) {
    console.error("Error loading mining plans:", error)
    if (miningPlansContainer) miningPlansContainer.innerHTML = "<p>Error loading plans. Please try again.</p>"
  } finally {
    showLoadingScreen(false)
  }
}

function openPaymentModal(planId) {
  const plan = miningPlansCache.find((p) => p.id === planId)
  if (!plan) {
    alert("Plan not found. Please refresh.")
    return
  }
  if (selectedPlanIdInputModal) selectedPlanIdInputModal.value = planId
  if (paymentPlanDetailsModal)
    paymentPlanDetailsModal.innerHTML = `
        <strong>Plan:</strong> ${plan.name}<br>
        <strong>Price:</strong> ${Number.parseFloat(plan.price).toLocaleString()} MMK
    `
  if (paymentModal) paymentModal.style.display = "flex"
  hidePaymentMessage()
}

async function loadHistoryData(activeTabKey) {
  if (!currentUser) return
  showLoadingScreen(true)

  const renderListItem = (content, listElement, itemClass = "") => {
    if (!listElement) return
    const li = document.createElement("li")
    if (itemClass) li.className = itemClass
    li.innerHTML = content
    listElement.appendChild(li)
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
  }

  if (activeTabKey === "purchase-history") {
    if (purchaseHistoryList) purchaseHistoryList.innerHTML = "<li>Loading purchase history...</li>"
    try {
      const { data, error } = await supabase
        .from("user_purchased_plans")
        .select(`*, mining_plans (name)`)
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      if (purchaseHistoryList) purchaseHistoryList.innerHTML = ""
      if (!data || data.length === 0) {
        if (purchaseHistoryList) purchaseHistoryList.innerHTML = "<li>No purchase history found.</li>"
      } else {
        data.forEach((item) => {
          renderListItem(
            `
                        <strong class="history-item-title">${item.mining_plans ? item.mining_plans.name : "Unknown Plan"}</strong>
                        <span class="history-item-meta">Price: <strong>${Number.parseFloat(item.purchase_price).toLocaleString()} MMK</strong> | Status: <span class="status-badge status-${item.status.replace("_", "-")}">${item.status.replace("_", " ")}</span></span>
                        <span class="history-item-meta">Date: ${formatDate(item.created_at)}</span>
                        ${item.payment_receipt_url ? `<a href="${item.payment_receipt_url}" target="_blank" rel="noopener noreferrer" style="font-size:0.85em; color:var(--accent-color);">View Receipt</a>` : ""}
                        ${item.admin_notes ? `<p style="font-size:0.8em; color:var(--text-muted-color); margin-top:5px;">Admin Note: ${item.admin_notes}</p>` : ""}
                    `,
            purchaseHistoryList,
            `history-item status-item-${item.status.replace("_", "-")}`,
          )
        })
      }
    } catch (error) {
      console.error("Error loading purchase history:", error)
      if (purchaseHistoryList) purchaseHistoryList.innerHTML = "<li>Error loading purchase history.</li>"
    }
  } else if (activeTabKey === "withdrawal-history") {
    if (withdrawalHistoryList) withdrawalHistoryList.innerHTML = "<li>Loading withdrawal history...</li>"
    try {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("requested_at", { ascending: false })

      if (error) throw error
      if (withdrawalHistoryList) withdrawalHistoryList.innerHTML = ""
      if (!data || data.length === 0) {
        if (withdrawalHistoryList) withdrawalHistoryList.innerHTML = "<li>No withdrawal history found.</li>"
      } else {
        data.forEach((item) => {
          renderListItem(
            `
                        <strong class="history-item-title">Withdrawal Request</strong>
                        <span class="history-item-meta">Amount: <strong class="history-item-amount debit">${Number.parseFloat(item.amount).toLocaleString()} MMK</strong> | To: ${item.recipient_phone} (${item.payment_method})</span>
                        <span class="history-item-meta">Status: <span class="status-badge status-${item.status.replace("_", "-")}">${item.status.replace("_", " ")}</span> | Date: ${formatDate(item.requested_at)}</span>
                        ${item.admin_notes ? `<p style="font-size:0.8em; color:var(--text-muted-color); margin-top:5px;">Admin Note: ${item.admin_notes}</p>` : ""}
                    `,
            withdrawalHistoryList,
            `history-item status-item-${item.status.replace("_", "-")}`,
          )
        })
      }
    } catch (error) {
      console.error("Error loading withdrawal history:", error)
      if (withdrawalHistoryList) withdrawalHistoryList.innerHTML = "<li>Error loading withdrawal history.</li>"
    }
  } else if (activeTabKey === "earning-history") {
    if (earningHistoryList) earningHistoryList.innerHTML = "<li>Loading earning history...</li>"
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("type", "mining_earning")
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) throw error
      if (earningHistoryList) earningHistoryList.innerHTML = ""
      if (!data || data.length === 0) {
        if (earningHistoryList) earningHistoryList.innerHTML = "<li>No earning records found yet.</li>"
      } else {
        data.forEach((item) => {
          renderListItem(
            `
                        <strong class="history-item-title">Mining Earning</strong>
                        <span class="history-item-meta">Amount: <strong class="history-item-amount credit">+${Number.parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })} MMK</strong></span>
                        <span class="history-item-meta">Description: ${item.description || "Mining activity"}</span>
                        <span class="history-item-meta">Date: ${formatDate(item.created_at)}</span>
                    `,
            earningHistoryList,
            "history-item earning-item",
          )
        })
      }
    } catch (error) {
      console.error("Error loading earning history:", error)
      if (earningHistoryList) earningHistoryList.innerHTML = "<li>Error loading earning history.</li>"
    }
  }
  showLoadingScreen(false)
}

function loadProfileData() {
  if (!currentUser) return
  if (profileNameDisplay) profileNameDisplay.textContent = currentUser.name
  if (profileEmailDisplay) profileEmailDisplay.textContent = currentUser.email
  if (withdrawalForm) withdrawalForm.reset()
  if (withdrawalMessageEl) {
    withdrawalMessageEl.textContent = ""
    withdrawalMessageEl.style.display = "none"
  }
}
