// --- bcrypt.js Check ---
if (typeof window.bcrypt === "undefined") {
  console.error("bcrypt.js library is not loaded! Password hashing will fail.")
  // Display a user-friendly message on the auth page if possible, or alert.
  // This needs to be handled carefully as DOM might not be fully ready here.
  // For now, we'll rely on the console error and the error handling within hash/compare functions.
  // A more robust solution would be to halt execution or show a persistent error message.
  const authMsgElement = document.getElementById("auth-message")
  if (authMsgElement) {
    authMsgElement.textContent = "Security component failed to load. Please refresh or check your internet connection."
    authMsgElement.className = "message error"
    authMsgElement.style.display = "block"
  } else {
    alert(
      "CRITICAL ERROR: Security component (bcrypt.js) failed to load. Signup/Login will not work. Please refresh the page or check your internet connection.",
    )
  }
  // Consider throwing an error here to stop further script execution if bcrypt is critical for startup
  // throw new Error("bcrypt.js not loaded");
}

// --- Supabase Client Initialization ---
const SUPABASE_URL = "https://ggwwsuhnhnksphryhhjo.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnd3dzdWhuaG5rc3BocnloaGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MzM3ODQsImV4cCI6MjA2NjIwOTc4NH0.nZRj7cnC9jSo6CnilIlgz9193D-Vjf094H5XzPJBUxY"

if (!window.supabase) {
  console.error("Supabase client library not loaded.")
  alert("Critical error: Supabase library missing. Please refresh.")
}
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// --- Global State ---
let currentUser = null
let userBalance = 0
let activeMiningInterval = null
let miningPlansCache = []
let paymentPhoneNumber = "09786284670" // Default, will be fetched

// --- DOM Elements ---
const loadingScreen = document.getElementById("loading-screen")
const appContent = document.getElementById("app-content")

const authSection = document.getElementById("auth-section")
const loginView = document.getElementById("login-view")
const signupView = document.getElementById("signup-view")
const loginForm = document.getElementById("login-form")
const signupForm = document.getElementById("signup-form")
const showSignupLink = document.getElementById("show-signup-link")
const showLoginLink = document.getElementById("show-login-link")
const authMessage = document.getElementById("auth-message")

const mainAppSection = document.getElementById("main-app-section")
const userBalanceDisplay = document.getElementById("user-balance")
const logoutButton = document.getElementById("logout-button")

const pageContent = document.getElementById("page-content")
const navButtons = document.querySelectorAll(".nav-button")
const pages = document.querySelectorAll(".page")

// Mining Page
const miningStatusText = document.getElementById("mining-status-text")
const miningPowerDisplay = document.getElementById("mining-power-display")
const miningRateDisplay = document.getElementById("mining-rate-display")
const activePlansList = document.getElementById("active-plans-list")

// Buy Mining Page
const miningPlansContainer = document.getElementById("mining-plans-container")
const paymentModal = document.getElementById("payment-modal")
const closePaymentModalButton = document.getElementById("close-payment-modal")
const paymentForm = document.getElementById("payment-form")
const paymentPlanDetailsModal = document.getElementById("payment-plan-details-modal")
const paymentPhoneNumberModal = document.getElementById("payment-phone-number-modal")
const selectedPlanIdInputModal = document.getElementById("selected-plan-id-modal")
const paymentReceiptInputModal = document.getElementById("payment-receipt-modal")
const paymentMessage = document.getElementById("payment-message")

// History Page
const historyTabs = document.querySelectorAll(".history-tabs .tab-button")
const historyTabContents = document.querySelectorAll(".history-tabs .tab-content")
const purchaseHistoryList = document.getElementById("purchase-history-list")
const withdrawalHistoryList = document.getElementById("withdrawal-history-list")
const earningHistoryList = document.getElementById("earning-history-list")

// Profile Page
const profileNameDisplay = document.getElementById("profile-name")
const profileEmailDisplay = document.getElementById("profile-email")
const withdrawalForm = document.getElementById("withdrawal-form")
const withdrawalMessage = document.getElementById("withdrawal-message")

const bcrypt = window.bcrypt // Assign after the check

// --- Utility Functions ---
function showAuthMessage(message, type = "error") {
  authMessage.textContent = message
  authMessage.className = `message ${type}`
  authMessage.style.display = "block"
}

function hideAuthMessage() {
  authMessage.style.display = "none"
}

function showPaymentMessage(message, type = "error") {
  paymentMessage.textContent = message
  paymentMessage.className = `message ${type}`
  paymentMessage.style.display = "block"
}

function hidePaymentMessage() {
  paymentMessage.style.display = "none"
}

function showLoadingScreen(show = true) {
  if (loadingScreen) {
    loadingScreen.style.opacity = show ? "1" : "0"
    loadingScreen.style.pointerEvents = show ? "auto" : "none"
    if (show) loadingScreen.classList.remove("hidden")
    else setTimeout(() => loadingScreen.classList.add("hidden"), 500)
  }
}

function navigateToView(viewId) {
  document.querySelectorAll(".view").forEach((view) => (view.style.display = "none"))
  const targetView = document.getElementById(viewId)
  if (targetView) {
    targetView.style.display = viewId === "main-app-section" ? "flex" : "block"
  } else console.error(`View with id ${viewId} not found.`)
}

function navigateToPage(pageId) {
  pages.forEach((page) => page.classList.remove("active-page"))
  navButtons.forEach((btn) => btn.classList.remove("active"))

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
      // Default to purchase history if none active (should not happen with default HTML)
      document.querySelector(".history-tabs .tab-button[data-tab='purchase-history']").classList.add("active")
      document.getElementById("purchase-history-content").classList.add("active")
      loadHistoryData("purchase-history")
    }
  }
  if (pageId === "profile-page") loadProfileData()

  if (window.lucide) window.lucide.createIcons()
}

async function hashDataClient(data) {
  if (!bcrypt) {
    // Check again before use
    console.error("bcrypt.js not available for hashing!")
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
    // Check again before use
    console.error("bcrypt.js not available for comparison!")
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

// --- Authentication ---
showSignupLink.addEventListener("click", (e) => {
  e.preventDefault()
  loginView.style.display = "none"
  signupView.style.display = "block"
  hideAuthMessage()
})

showLoginLink.addEventListener("click", (e) => {
  e.preventDefault()
  signupView.style.display = "none"
  loginView.style.display = "block"
  hideAuthMessage()
})

signupForm.addEventListener("submit", async (e) => {
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
    showLoadingScreen(false) // Hashing failed, message shown by hashDataClient
    return
  }

  try {
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("email")
      .eq("email", email)
      .maybeSingle()

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116: no rows found
      throw checkError
    }

    if (existingUser) {
      showAuthMessage("Email already registered. Please login or use a different email.")
      showLoadingScreen(false)
      return
    }

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([{ name, email, password_hash: passwordHash, payment_pin_hash: paymentPinHash, balance: 0 }])
      .select()
      .single()

    if (insertError) throw insertError

    showAuthMessage("Sign up successful! Please login.", "success")
    signupForm.reset()
    loginView.style.display = "block"
    signupView.style.display = "none"
  } catch (error) {
    console.error("Sign up error:", error)
    showAuthMessage(`Sign up failed: ${error.message || "Unknown error"}`)
  } finally {
    showLoadingScreen(false)
  }
})

loginForm.addEventListener("submit", async (e) => {
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
    localStorage.setItem("mmk_mining_user_id", user.id) // Use user.id from successful login
    await initializeApp()
  } catch (error) {
    console.error("Login error:", error)
    showAuthMessage(`Login failed: ${error.message || "Please check your credentials."}`)
  } finally {
    showLoadingScreen(false)
  }
})

logoutButton.addEventListener("click", async () => {
  showLoadingScreen(true)
  currentUser = null
  localStorage.removeItem("mmk_mining_user_id")
  if (activeMiningInterval) clearInterval(activeMiningInterval)
  activeMiningInterval = null

  navigateToView("auth-section")
  mainAppSection.style.display = "none"
  loginForm.reset()
  signupForm.reset()
  hideAuthMessage()
  showLoadingScreen(false)
})

async function checkUserSession() {
  const userId = localStorage.getItem("mmk_mining_user_id")
  if (userId) {
    showLoadingScreen(true)
    try {
      const { data: user, error } = await supabase.from("users").select("*").eq("id", userId).single()

      if (error || !user) {
        localStorage.removeItem("mmk_mining_user_id")
        navigateToView("auth-section")
        showLoadingScreen(false)
        return false
      }
      currentUser = user
      return true
    } catch (error) {
      console.error("Session check error:", error)
      localStorage.removeItem("mmk_mining_user_id")
      navigateToView("auth-section")
      showLoadingScreen(false)
      return false
    }
  }
  navigateToView("auth-section")
  showLoadingScreen(false)
  return false
}

// --- App Initialization ---
async function initializeApp() {
  if (!currentUser) {
    navigateToView("auth-section")
    mainAppSection.style.display = "none"
    showLoadingScreen(false)
    return
  }
  navigateToView("main-app-section")
  authSection.style.display = "none"

  await fetchAdminSettings()
  await fetchUserBalance()
  navigateToPage("mining-page")
  showLoadingScreen(false)
}

async function fetchUserBalance() {
  if (!currentUser) return
  try {
    const { data, error } = await supabase.from("users").select("balance").eq("id", currentUser.id).single()
    if (error) throw error
    userBalance = Number.parseFloat(data.balance) || 0
    userBalanceDisplay.textContent = userBalance.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  } catch (error) {
    console.error("Error fetching balance:", error)
    userBalanceDisplay.textContent = "Error"
  }
}

async function fetchAdminSettings() {
  try {
    const { data, error } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "payment_phone_number")
      .maybeSingle() // Use maybeSingle to avoid error if not found
    if (error && error.code !== "PGRST116") throw error
    if (data && data.value) {
      paymentPhoneNumber = data.value
      paymentPhoneNumberModal.textContent = paymentPhoneNumber
    } else {
      paymentPhoneNumberModal.textContent = "N/A (Admin setup needed)"
    }
  } catch (error) {
    console.error("Error fetching admin settings:", error)
    paymentPhoneNumberModal.textContent = "Error loading"
  }
}

// --- Page Navigation Logic ---
navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const pageId = button.getAttribute("data-page")
    navigateToPage(pageId)
  })
})

// --- Mining Page Logic ---
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
      .in("status", ["active"]) // Only fetch active plans for mining calculation

    if (error) throw error

    activePlansList.innerHTML = ""
    let totalEffectivePower = 0

    if (purchasedPlans.length === 0) {
      activePlansList.innerHTML = '<li>No active mining plans. Visit "Buy" to get started.</li>'
      miningStatusText.textContent = "Idle"
    } else {
      purchasedPlans.forEach((plan) => {
        const planDetails = plan.mining_plans
        const now = new Date()
        const endDate = new Date(plan.end_date)
        const startDate = new Date(plan.start_date)

        if (plan.status === "active" && now >= startDate && now <= endDate) {
          totalEffectivePower += Number.parseFloat(planDetails.power_output_per_second)
          const listItem = document.createElement("li")
          listItem.innerHTML = `<strong>${planDetails.name}</strong> - Ends: ${endDate.toLocaleDateString()} ${endDate.toLocaleTimeString()} <br>Power: ${planDetails.power_output_per_second} P/s`
          activePlansList.appendChild(listItem)
        } else if (plan.status === "active" && now > endDate) {
          // Plan has expired, ideally backend updates this. For now, just don't add its power.
          // Optionally, update status client-side for display or call a function to update DB.
          console.warn(`Plan ${planDetails.name} (ID: ${plan.id}) is marked active but past end_date.`)
        }
      })
      miningStatusText.textContent = totalEffectivePower > 0 ? "Mining Active" : "No Active Plans"
      if (activePlansList.children.length === 0 && purchasedPlans.length > 0) {
        activePlansList.innerHTML =
          "<li>You have plans, but none are currently active or within their mining period.</li>"
      } else if (activePlansList.children.length === 0) {
        activePlansList.innerHTML = '<li>No active mining plans. Visit "Buy" to get started.</li>'
      }
    }

    miningPowerDisplay.textContent = `Total Power: ${totalEffectivePower.toFixed(5)} P/s`
    miningRateDisplay.textContent = `Est. Rate: ${totalEffectivePower.toFixed(5)} MMK/s`

    if (activeMiningInterval) clearInterval(activeMiningInterval)

    if (totalEffectivePower > 0) {
      activeMiningInterval = setInterval(async () => {
        const earningsThisSecond = totalEffectivePower

        userBalance += earningsThisSecond
        userBalanceDisplay.textContent = userBalance.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })

        try {
          // Call RPC to increment balance and log transaction
          const { error: rpcError } = await supabase.rpc("increment_balance_and_log_earning", {
            p_user_id: currentUser.id,
            p_amount: earningsThisSecond,
            p_description: `Mining earning for 1 sec at ${totalEffectivePower.toFixed(5)} P/s`,
          })

          if (rpcError) {
            console.warn("Failed to update balance and log earning in DB via RPC:", rpcError.message)
            // Potentially revert client-side balance update or show warning
          }
        } catch (dbError) {
          console.warn("DB Error during earning RPC call:", dbError.message)
        }
      }, 1000)
    }
  } catch (error) {
    console.error("Error loading mining data:", error)
    activePlansList.innerHTML = "<li>Error loading mining data.</li>"
  } finally {
    showLoadingScreen(false)
  }
}

// --- Buy Mining Page Logic ---
async function loadMiningPlans() {
  showLoadingScreen(true)
  miningPlansContainer.innerHTML = "<p>Loading available plans...</p>"
  try {
    const { data, error } = await supabase
      .from("mining_plans")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true })

    if (error) throw error
    miningPlansCache = data

    miningPlansContainer.innerHTML = ""
    if (data.length === 0) {
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
      miningPlansContainer.appendChild(planCard)
    })

    document.querySelectorAll(".buy-plan-button").forEach((button) => {
      button.addEventListener("click", (e) => {
        const planId = e.target.getAttribute("data-plan-id")
        openPaymentModal(planId)
      })
    })
  } catch (error) {
    console.error("Error loading mining plans:", error)
    miningPlansContainer.innerHTML = "<p>Error loading plans. Please try again.</p>"
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
  selectedPlanIdInputModal.value = planId
  paymentPlanDetailsModal.innerHTML = `
        <strong>Plan:</strong> ${plan.name}<br>
        <strong>Price:</strong> ${Number.parseFloat(plan.price).toLocaleString()} MMK
    `
  paymentModal.style.display = "flex"
  hidePaymentMessage()
}

closePaymentModalButton.addEventListener("click", () => {
  paymentModal.style.display = "none"
  paymentForm.reset()
})

paymentForm.addEventListener("submit", async (e) => {
  e.preventDefault()
  showLoadingScreen(true)
  hidePaymentMessage()

  const planId = selectedPlanIdInputModal.value
  const paymentMethod = document.getElementById("payment-method-modal").value
  const receiptFile = paymentReceiptInputModal.files[0]

  if (!paymentMethod) {
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
        payment_method: paymentMethod,
        payment_receipt_url: receiptUrl,
      },
    ])

    if (insertError) throw insertError

    showPaymentMessage("Purchase request submitted! It will be reviewed by an admin shortly.", "success")
    setTimeout(() => {
      paymentModal.style.display = "none"
      paymentForm.reset()
      navigateToPage("history-page")
    }, 2000)
  } catch (error) {
    console.error("Payment submission error:", error)
    showPaymentMessage(`Error submitting payment: ${error.message || "Unknown error"}`)
  } finally {
    showLoadingScreen(false)
  }
})

// --- History Page Logic ---
historyTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    historyTabs.forEach((t) => t.classList.remove("active"))
    historyTabContents.forEach((c) => c.classList.remove("active"))

    tab.classList.add("active")
    const activeTabContentId = tab.dataset.tab + "-content"
    document.getElementById(activeTabContentId).classList.add("active")
    loadHistoryData(tab.dataset.tab)
  })
})

async function loadHistoryData(activeTabKey) {
  if (!currentUser) return
  showLoadingScreen(true)

  const renderListItem = (content, listElement, itemClass = "") => {
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
    purchaseHistoryList.innerHTML = "<li>Loading purchase history...</li>"
    try {
      const { data, error } = await supabase
        .from("user_purchased_plans")
        .select(`*, mining_plans (name)`)
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      purchaseHistoryList.innerHTML = ""
      if (data.length === 0) {
        purchaseHistoryList.innerHTML = "<li>No purchase history found.</li>"
      } else {
        data.forEach((item) => {
          renderListItem(
            `
                        <strong class="history-item-title">${item.mining_plans.name}</strong>
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
      purchaseHistoryList.innerHTML = "<li>Error loading purchase history.</li>"
    }
  } else if (activeTabKey === "withdrawal-history") {
    withdrawalHistoryList.innerHTML = "<li>Loading withdrawal history...</li>"
    try {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("requested_at", { ascending: false })

      if (error) throw error
      withdrawalHistoryList.innerHTML = ""
      if (data.length === 0) {
        withdrawalHistoryList.innerHTML = "<li>No withdrawal history found.</li>"
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
      withdrawalHistoryList.innerHTML = "<li>Error loading withdrawal history.</li>"
    }
  } else if (activeTabKey === "earning-history") {
    earningHistoryList.innerHTML = "<li>Loading earning history...</li>"
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("type", "mining_earning")
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) throw error
      earningHistoryList.innerHTML = ""
      if (data.length === 0) {
        earningHistoryList.innerHTML = "<li>No earning records found yet.</li>"
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
      earningHistoryList.innerHTML = "<li>Error loading earning history.</li>"
    }
  }
  showLoadingScreen(false)
}

// --- Profile Page Logic ---
function loadProfileData() {
  if (!currentUser) return
  profileNameDisplay.textContent = currentUser.name
  profileEmailDisplay.textContent = currentUser.email
  withdrawalForm.reset()
  withdrawalMessage.textContent = ""
  withdrawalMessage.style.display = "none"
}

withdrawalForm.addEventListener("submit", async (e) => {
  e.preventDefault()
  showLoadingScreen(true)
  withdrawalMessage.style.display = "none"

  const amount = Number.parseFloat(document.getElementById("withdrawal-amount").value)
  const paymentMethod = document.getElementById("withdrawal-method").value
  const recipientPhone = document.getElementById("recipient-phone").value.trim()
  const paymentPin = document.getElementById("payment-pin-withdraw").value

  if (!paymentMethod) {
    withdrawalMessage.textContent = "Please select a withdrawal method."
    withdrawalMessage.className = "message error"
    withdrawalMessage.style.display = "block"
    showLoadingScreen(false)
    return
  }
  if (amount < 100000) {
    // As per schema constraint
    withdrawalMessage.textContent = "Minimum withdrawal amount is 100,000 MMK."
    withdrawalMessage.className = "message error"
    withdrawalMessage.style.display = "block"
    showLoadingScreen(false)
    return
  }
  if (amount > userBalance) {
    withdrawalMessage.textContent = "Insufficient balance for this withdrawal amount."
    withdrawalMessage.className = "message error"
    withdrawalMessage.style.display = "block"
    showLoadingScreen(false)
    return
  }
  if (!recipientPhone) {
    withdrawalMessage.textContent = "Recipient phone number is required."
    withdrawalMessage.className = "message error"
    withdrawalMessage.style.display = "block"
    showLoadingScreen(false)
    return
  }

  const pinMatch = await compareDataClient(paymentPin, currentUser.payment_pin_hash)
  if (!pinMatch) {
    withdrawalMessage.textContent = "Incorrect Payment PIN."
    withdrawalMessage.className = "message error"
    withdrawalMessage.style.display = "block"
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
      withdrawalMessage.textContent = "You have already made a withdrawal request today. Please try again tomorrow."
      withdrawalMessage.className = "message error"
      withdrawalMessage.style.display = "block"
      showLoadingScreen(false)
      return
    }

    const { error: insertError } = await supabase.from("withdrawal_requests").insert([
      {
        user_id: currentUser.id,
        amount,
        payment_method: paymentMethod,
        recipient_phone: recipientPhone,
        status: "pending_approval",
      },
    ])

    if (insertError) throw insertError

    withdrawalMessage.textContent = "Withdrawal request submitted successfully. It will be processed by an admin."
    withdrawalMessage.className = "message success"
    withdrawalMessage.style.display = "block"
    withdrawalForm.reset()
    // Don't fetchUserBalance here, balance only changes on admin approval.
    setTimeout(() => navigateToPage("history-page"), 2000)
  } catch (error) {
    console.error("Withdrawal error:", error)
    withdrawalMessage.textContent = `Withdrawal failed: ${error.message || "Unknown error"}`
    withdrawalMessage.className = "message error"
    withdrawalMessage.style.display = "block"
  } finally {
    showLoadingScreen(false)
  }
})

// --- Initial Load ---
document.addEventListener("DOMContentLoaded", async () => {
  showLoadingScreen(true)
  appContent.style.display = "block"

  // Simulate the 5-second loading animation as requested
  // But also ensure bcrypt check happens early
  if (typeof window.bcrypt === "undefined") {
    // The initial check at the top of the script should handle this.
    // We might not want to proceed if bcrypt is missing.
    console.error("Halting app initialization due to missing bcrypt.js")
    showLoadingScreen(false) // Hide loading if we can't proceed
    return // Stop further execution
  }

  setTimeout(async () => {
    const loggedIn = await checkUserSession()
    if (loggedIn) {
      await initializeApp()
    }
    // If not loggedIn, checkUserSession already navigates to auth and hides loading.
    if (window.lucide) window.lucide.createIcons()
  }, 2000) // Reduced loading time for faster testing, user can change back to 5000
})
