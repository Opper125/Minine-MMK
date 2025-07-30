import { createClient } from "@supabase/supabase-js"
import feather from "feather-icons"
import lottie from "lottie-web"
const SUPABASE_URL = "https://vuecdeskfiiblejwqxfz.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1ZWNkZXNrZmlpYmxlandxeGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNzc1MjksImV4cCI6MjA2ODg1MzUyOX0.CPqX0xQHNp-UzAf0t5rXSP6LQeQdffqTTx9LWJLFQ9c"

const {} = supabase
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const app = {
  user: null,
  currentPage: "auth",
  session: null,
  lottieAnimation: null,
  miningInterval: null,
  taskVisitTimers: {},
  globalChatChannel: null,
  supportChatChannel: null,
  currentSupportThreadId: null,
  isBanned: false,
  lastMiningUpdate: Date.now(),
  realtimeChannels: [],
}

document.addEventListener("DOMContentLoaded", () => {
  feather.replace()
  app.lottieAnimation = lottie.loadAnimation({
    container: document.getElementById("lottie-animation"),
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: "https://assets1.lottiefiles.com/packages/lf20_xwmj0hsk.json",
  })

  setupGlobalRealtimeListeners()
  checkSession()
  setupNavMenu()
})

async function checkSession() {
  const { data, error } = await db.auth.getSession()
  if (error) {
    console.error("Error getting session:", error)
    showAuthPage()
    return
  }
  if (data.session) {
    app.session = data.session
    app.user = data.session.user
    await fetchUserProfile()
    if (app.isBanned) {
      showBannedOverlay()
    } else {
      showAppContent()
      navigateTo("mining")
      subscribeToUserSpecificRealtimeChannels(app.user.id)
    }
  } else {
    showAuthPage()
  }
}

async function fetchUserProfile() {
  if (!app.user) return
  const { data, error } = await db.from("users").select("*").eq("id", app.user.id).single()
  if (error) {
    console.error("Error fetching user profile:", error)
    return
  }
  app.user = { ...app.user, ...data }
  app.isBanned = data.is_banned
}

function toggleAuthForm() {
  const loginForm = document.getElementById("login-form")
  const signupForm = document.getElementById("signup-form")
  if (loginForm.style.display === "none") {
    loginForm.style.display = "block"
    signupForm.style.display = "none"
  } else {
    loginForm.style.display = "none"
    signupForm.style.display = "block"
  }
}

async function handleSignUp(event) {
  event.preventDefault()
  const name = document.getElementById("signup-name").value
  const username = document.getElementById("signup-username").value
  const email = document.getElementById("signup-email").value
  const password = document.getElementById("signup-password").value
  const pin = document.getElementById("signup-pin").value

  if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    showToast("error", "PIN must be 6 digits.")
    return
  }

  showLoading("Creating Account...")

  const { data: authData, error: authError } = await db.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        name: name,
        username: username,
      },
    },
  })

  if (authError) {
    hideOverlay()
    showToast("error", `Sign Up Error: ${authError.message}`)
    return
  }

  if (!authData.user) {
    hideOverlay()
    showToast("error", "Could not create user. Please try again.")
    return
  }

  const { error: profileError } = await db
    .from("users")
    .update({ password: password, withdraw_pin: pin })
    .eq("id", authData.user.id)

  if (profileError) {
    hideOverlay()
    showToast("error", `Profile Update Error: ${profileError.message}`)
    return
  }

  showSuccess("Account Created!", () => {
    toggleAuthForm()
    document.getElementById("login-username").value = username
    document.getElementById("login-password").value = password
  })
}

async function handleLogin(event) {
  event.preventDefault()
  const username = document.getElementById("login-username").value
  const password = document.getElementById("login-password").value

  showLoading("Logging In...")

  const { data: userProfile, error: userError } = await db
    .from("users")
    .select("id, email, password, is_banned")
    .eq("username", username)
    .single()

  if (userError || !userProfile || userProfile.password !== password) {
    hideOverlay()
    showToast("error", "Invalid username or password.")
    return
  }

  if (userProfile.is_banned) {
    hideOverlay()
    showToast("error", "Your account has been banned. Please contact support.")
    return
  }

  const { data, error } = await db.auth.signInWithPassword({
    email: userProfile.email,
    password: password,
  })

  if (error) {
    hideOverlay()
    showToast("error", `Login Error: ${error.message}`)
    return
  }

  app.session = data.session
  app.user = data.user
  app.isBanned = false

  showSuccess("Login Successful!", () => {
    showAppContent()
    navigateTo("mining")
    subscribeToUserSpecificRealtimeChannels(app.user.id)
  })
}

async function handleLogout() {
  showLoading("Logging out...")
  const { error } = await db.auth.signOut()
  if (error) {
    console.error("Logout Error:", error)
    showToast("error", "Failed to logout.")
  } else {
    app.user = null
    app.session = null
    app.isBanned = false
    clearInterval(app.miningInterval)
    unsubscribeFromRealtimeChannels()
    hideBannedOverlay()
    showAuthPage()
    showToast("success", "Logged out successfully!")
  }
  hideOverlay()
}

function showBannedOverlay() {
  document.getElementById("banned-overlay").style.display = "flex"
  document.getElementById("app-content").style.display = "none"
  document.getElementById("page-auth").style.display = "none"
  clearInterval(app.miningInterval)
}

function hideBannedOverlay() {
  document.getElementById("banned-overlay").style.display = "none"
}

function showAuthPage() {
  document.getElementById("page-auth").style.display = "flex"
  document.getElementById("app-content").style.display = "none"
  hideBannedOverlay()
}

function showAppContent() {
  document.getElementById("page-auth").style.display = "none"
  document.getElementById("app-content").style.display = "flex"
  hideBannedOverlay()
}

function setupNavMenu() {
  const menuContainer = document.getElementById("bottom-nav-menu")
  const menuItems = [
    { id: "mining", icon: "activity", label: "Mining" },
    { id: "history", icon: "clock", label: "History" },
    { id: "buy-plan", icon: "shopping-cart", label: "Buy Plan" },
    { id: "tasks", icon: "check-square", label: "Tasks" },
    { id: "profile", icon: "user", label: "Profile" },
    { id: "global-chat", icon: "message-square", label: "Global Chat" },
    { id: "support-admin", icon: "shield", label: "Support" },
    { id: "news", icon: "book-open", label: "News" },
    { id: "feed", icon: "layout", label: "Feed" },
    { id: "social-video", icon: "youtube", label: "Social" },
    { id: "about", icon: "info", label: "About" },
  ]

  menuContainer.innerHTML = menuItems
    .map(
      (item) => `
        <div class="nav-item" id="nav-${item.id}" onclick="navigateTo('${item.id}')">
            <i data-feather="${item.icon}"></i>
            <span>${item.label}</span>
        </div>
    `,
    )
    .join("")
  feather.replace()
}

function navigateTo(pageId) {
  if (app.isBanned) {
    showBannedOverlay()
    return
  }

  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"))
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"))

  const targetPage = document.getElementById(`page-${pageId}`)
  const targetNav = document.getElementById(`nav-${pageId}`)
  if (targetPage) targetPage.classList.add("active")
  if (targetNav) targetNav.classList.add("active")

  app.currentPage = pageId

  loadPageContent(pageId)
}

async function loadPageContent(pageId) {
  showLoading("Loading...")
  try {
    switch (pageId) {
      case "mining":
        await renderMiningPage()
        break
      case "history":
        await renderHistoryPage()
        break
      case "buy-plan":
        await renderBuyPlanPage()
        break
      case "tasks":
        await renderTasksPage()
        break
      case "profile":
        await renderProfilePage()
        break
      case "global-chat":
        await renderGlobalChatPage()
        break
      case "support-admin":
        await renderSupportPage()
        break
      case "news":
        await renderNewsPage()
        break
      case "feed":
        await renderFeedPage()
        break
      case "social-video":
        await renderSocialVideoPage()
        break
      case "about":
        await renderAboutPage()
        break
      default:
        console.log(`Page ${pageId} not implemented yet.`)
    }
  } catch (error) {
    console.error(`Error loading ${pageId} page:`, error)
    showToast("error", `Failed to load ${pageId} page.`)
  } finally {
    hideOverlay()
  }
}

function showLoading(message) {
  const overlay = document.getElementById("overlay")
  const msgEl = document.getElementById("overlay-message")
  msgEl.textContent = message
  overlay.classList.add("visible")
  app.lottieAnimation.stop()
}

function showSuccess(message, callback) {
  const overlay = document.getElementById("overlay")
  const msgEl = document.getElementById("overlay-message")
  msgEl.textContent = message
  overlay.classList.add("visible")

  app.lottieAnimation.play()

  setTimeout(() => {
    hideOverlay()
    if (callback) callback()
  }, 2000)
}

function hideOverlay() {
  document.getElementById("overlay").classList.remove("visible")
}

function showToast(type, message) {
  const toastEl = document.getElementById("toast")
  const toastIcon = document.getElementById("toast-icon")
  const toastText = document.getElementById("toast-text")

  toastEl.className = "toast-message show " + type
  toastText.textContent = message

  let iconName = ""
  if (type === "success") iconName = "check-circle"
  else if (type === "error") iconName = "x-circle"
  else if (type === "info") iconName = "info"
  else if (type === "warning") iconName = "alert-triangle"
  toastIcon.innerHTML = `<i data-feather="${iconName}"></i>`
  feather.replace()

  setTimeout(() => {
    toastEl.classList.remove("show")
  }, 3000)
}

async function renderMiningPage() {
  if (!app.user) return
  await fetchMiningData()
  clearInterval(app.miningInterval)
  app.miningInterval = setInterval(fetchMiningData, 5000)
  await renderLiveWithdrawalFeed()
  await renderTopWithdrawalFeed()
}

async function fetchMiningData() {
  if (!app.user || app.isBanned) return

  const { data: userData, error: userError } = await db.from("users").select("*").eq("id", app.user.id).single()
  if (userError) {
    console.error("Error fetching user mining data:", userError)
    return
  }
  app.user = { ...app.user, ...userData }

  const { data: miningRate, error: rateError } = await db.rpc("get_total_mining_rate", { p_user_id: app.user.id })
  if (rateError) {
    console.error("Error fetching mining rate:", rateError)
    return
  }

  document.getElementById("lifetime-earnings").textContent = `${(app.user.lifetime_earnings || 0).toFixed(6)} MMK`
  document.getElementById("mining-balance").textContent = `${(app.user.mining_balance || 0).toFixed(6)} MMK`
  document.getElementById("mining-rate").textContent = (miningRate || 0).toFixed(8)

  const { data: activePlans } = await db
    .from("user_purchases")
    .select("expires_at")
    .eq("user_id", app.user.id)
    .eq("status", "active")
    .order("expires_at", { ascending: true })
    .limit(1)
  const soonestExpiry = activePlans && activePlans.length > 0 ? activePlans[0].expires_at : null
  updateCountdownTimer(soonestExpiry)
}

function updateCountdownTimer(expiryTimestamp) {
  const daysEl = document.getElementById("days")
  const hoursEl = document.getElementById("hours")
  const minutesEl = document.getElementById("minutes")
  const secondsEl = document.getElementById("seconds")

  if (!expiryTimestamp) {
    daysEl.textContent = "00"
    hoursEl.textContent = "00"
    minutesEl.textContent = "00"
    secondsEl.textContent = "00"
    return
  }

  const countdown = new Date(expiryTimestamp).getTime()
  const now = new Date().getTime()
  const distance = countdown - now

  if (distance < 0) {
    daysEl.textContent = "00"
    hoursEl.textContent = "00"
    minutesEl.textContent = "00"
    secondsEl.textContent = "00"
    return
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24))
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((distance % (1000 * 60)) / 1000)

  daysEl.textContent = String(days).padStart(2, "0")
  hoursEl.textContent = String(hours).padStart(2, "0")
  minutesEl.textContent = String(minutes).padStart(2, "0")
  secondsEl.textContent = String(seconds).padStart(2, "0")
}

document.getElementById("collect-mining-btn").addEventListener("click", async () => {
  if (!app.user || app.isBanned) {
    showToast("error", "Please login or your account is banned.")
    return
  }
  if (app.user.mining_balance <= 0.000001) {
    showToast("warning", "Your mining balance is too low to collect.")
    return
  }

  document.getElementById("collect-mining-btn").disabled = true
  showLoading("Collecting...")

  const { data: transferredAmount, error } = await db.rpc("transfer_mining_to_main", { p_user_id: app.user.id })

  if (error) {
    showToast("error", `Transfer Failed: ${error.message}`)
  } else if (transferredAmount && transferredAmount > 0) {
    showToast("success", `${transferredAmount.toFixed(6)} MMK moved to main balance!`)
    await fetchMiningData()
  } else {
    showToast("info", "No balance was transferred.")
  }
  document.getElementById("collect-mining-btn").disabled = false
  hideOverlay()
})

async function renderLiveWithdrawalFeed() {
  const feedEl = document.getElementById("live-withdrawal-feed")
  feedEl.innerHTML = '<div class="loading-spinner"></div>'

  const { data, error } = await db
    .from("withdrawals")
    .select("*, user:users(username)")
    .order("created_at", { ascending: false })
    .limit(5)
  if (error) {
    console.error("Error fetching live withdrawals:", error)
    feedEl.innerHTML = '<p style="text-align: center; color: var(--error);">Failed to load live feed.</p>'
    return
  }

  if (data.length === 0) {
    feedEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No recent withdrawals.</p>'
    return
  }

  feedEl.innerHTML = data
    .map(
      (w) => `
        <div class="live-feed-item">
            <div>
                <span class="username">${w.user.username}</span> withdrew <span class="amount">${w.amount.toLocaleString()} MMK</span>
            </div>
            <div>
                <span class="status">${w.status}</span> via <span class="method">${w.payment_method}</span>
            </div>
        </div>
    `,
    )
    .join("")
}

async function renderTopWithdrawalFeed() {
  const feedEl = document.getElementById("top-withdrawal-feed")
  feedEl.innerHTML = '<div class="loading-spinner"></div>'

  const { data, error } = await db
    .from("users")
    .select("username, total_withdrawal_amount")
    .order("total_withdrawal_amount", { ascending: false })
    .limit(5)
  if (error) {
    console.error("Error fetching top withdrawals:", error)
    feedEl.innerHTML = '<p style="text-align: center; color: var(--error);">Failed to load top withdrawals.</p>'
    return
  }

  if (data.length === 0) {
    feedEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No top withdrawals yet.</p>'
    return
  }

  feedEl.innerHTML = data
    .map(
      (u, index) => `
        <div class="top-withdrawal-item">
            <span class="rank">#${index + 1}</span>
            <span class="username">${u.username}</span>
            <span class="amount">${u.total_withdrawal_amount.toLocaleString()} MMK</span>
        </div>
    `,
    )
    .join("")
}

async function renderHistoryPage() {
  if (!app.user) return
  await fetchPurchaseHistory()
  await fetchWithdrawalHistory()
}

async function fetchPurchaseHistory() {
  const listEl = document.getElementById("purchase-history-list")
  listEl.innerHTML = '<div class="loading-spinner"></div>'

  const { data, error } = await db
    .from("user_purchases")
    .select("*, mining_plans(name)")
    .eq("user_id", app.user.id)
    .order("purchased_at", { ascending: false })
  if (error) {
    console.error("Error fetching purchase history:", error)
    listEl.innerHTML = `<p style="color: var(--error);">Error loading purchase history: ${error.message}</p>`
    return
  }

  if (data.length === 0) {
    listEl.innerHTML = '<p style="color: var(--text-secondary);">No purchase history found.</p>'
    return
  }

  listEl.innerHTML = data
    .map(
      (p) => `
        <div class="history-item">
            <div>
                <p>${p.mining_plans?.name || "Task Reward"}: ${p.cost.toLocaleString()} MMK</p>
                <p style="font-size: 12px; color: var(--text-secondary);">${new Date(p.purchased_at).toLocaleString()}</p>
            </div>
            <span class="status-badge ${p.status}">${p.status}</span>
        </div>
    `,
    )
    .join("")
}

async function fetchWithdrawalHistory() {
  const listEl = document.getElementById("withdrawal-history-list")
  listEl.innerHTML = '<div class="loading-spinner"></div>'

  const { data, error } = await db
    .from("withdrawals")
    .select("*")
    .eq("user_id", app.user.id)
    .order("created_at", { ascending: false })
  if (error) {
    console.error("Error fetching withdrawal history:", error)
    listEl.innerHTML = `<p style="color: var(--error);">Error loading withdrawal history: ${error.message}</p>`
    return
  }

  if (data.length === 0) {
    listEl.innerHTML = '<p style="color: var(--text-secondary);">No withdrawal history found.</p>'
    return
  }

  listEl.innerHTML = data
    .map(
      (w) => `
        <div class="history-item">
            <div>
                <p>Withdrawal: ${w.amount.toLocaleString()} MMK</p>
                <p style="font-size: 12px; color: var(--text-secondary);">${new Date(w.created_at).toLocaleString()}</p>
                ${w.rejection_reason ? `<p style="font-size: 12px; color: var(--error);">Reason: ${w.rejection_reason}</p>` : ""}
            </div>
            <span class="status-badge ${w.status}">${w.status}</span>
        </div>
    `,
    )
    .join("")
}

async function renderBuyPlanPage() {
  const gridEl = document.getElementById("mining-plans-grid")
  gridEl.innerHTML = '<div class="loading-spinner"></div>'

  const { data, error } = await db.from("mining_plans").select("*").order("cost")
  if (error) {
    console.error("Error fetching mining plans:", error)
    gridEl.innerHTML = `<p style="color: var(--error);">Error loading plans: ${error.message}</p>`
    return
  }

  if (data.length === 0) {
    gridEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No mining plans available yet.</p>'
    return
  }

  gridEl.innerHTML = data
    .map(
      (plan) => `
        <div class="plan-card">
            <img src="${plan.icon_url || "/placeholder.svg"}" alt="${plan.name} Icon" class="plan-icon">
            <h3>${plan.name}</h3>
            <p class="cost">${plan.cost.toLocaleString()} MMK</p>
            <div class="details">
                <p>Duration: ${plan.duration_days} days</p>
                <p>Total Return: ${plan.total_return.toLocaleString()} MMK</p>
                <p style="font-size: 12px; color: var(--text-secondary);">Power: ${plan.power_per_second.toFixed(8)} MMK/sec</p>
            </div>
            <button class="buy-btn" onclick="openPurchaseDialog(${plan.id})">Buy Now</button>
        </div>
    `,
    )
    .join("")
}

let selectedPlan = null
let purchaseDialog = null

async function openPurchaseDialog(planId) {
  const { data: plan, error } = await db.from("mining_plans").select("*").eq("id", planId).single()
  if (error || !plan) {
    showToast("error", "Failed to load plan details.")
    console.error("Error fetching plan for dialog:", error)
    return
  }
  selectedPlan = plan

  const dialogHtml = `
        <div class="dialog-overlay visible" id="purchase-dialog-overlay">
            <div class="dialog-content">
                <div class="dialog-header">
                    <h3 class="dialog-title">Confirm Purchase: ${selectedPlan.name}</h3>
                </div>
                <div class="dialog-body">
                    <div class="payment-info">
                        <p>Please transfer <strong>${selectedPlan.cost.toLocaleString()} MMK</strong> to:</p>
                        <p>Method: <strong>${selectedPlan.payment_method}</strong></p>
                        <p>Phone: <strong>${selectedPlan.payment_phone}</strong></p>
                    </div>
                    <p>After payment, upload your transaction receipt below.</p>
                    <input type="file" id="receipt-upload-input" accept="image/*" required>
                </div>
                <div class="dialog-footer">
                    <button class="submit-btn" id="submit-purchase-btn">Submit for Approval</button>
                </div>
            </div>
        </div>
    `
  document.body.insertAdjacentHTML("beforeend", dialogHtml)
  purchaseDialog = document.getElementById("purchase-dialog-overlay")

  document.getElementById("submit-purchase-btn").addEventListener("click", handlePurchaseSubmission)
  purchaseDialog.addEventListener("click", (e) => {
    if (e.target === purchaseDialog) closePurchaseDialog()
  })
}

function closePurchaseDialog() {
  if (purchaseDialog) {
    purchaseDialog.classList.remove("visible")
    purchaseDialog.remove()
    purchaseDialog = null
    selectedPlan = null
  }
}

async function handlePurchaseSubmission() {
  if (!app.user || !selectedPlan) return

  const receiptInput = document.getElementById("receipt-upload-input")
  const receiptFile = receiptInput.files[0]

  if (!receiptFile) {
    showToast("warning", "Please select a receipt image.")
    return
  }

  document.getElementById("submit-purchase-btn").disabled = true
  showLoading("Submitting purchase...")

  const filePath = `${app.user.id}/receipts/${Date.now()}-${receiptFile.name}`
  const { error: uploadError } = await db.storage.from("receipts").upload(filePath, receiptFile)

  if (uploadError) {
    showToast("error", `Upload Failed: ${uploadError.message}`)
    document.getElementById("submit-purchase-btn").disabled = false
    hideOverlay()
    return
  }

  const { data: publicUrlData } = db.storage.from("receipts").getPublicUrl(filePath)
  const receiptUrl = publicUrlData.publicUrl

  const { error: insertError } = await db.from("user_purchases").insert({
    user_id: app.user.id,
    plan_id: selectedPlan.id,
    cost: selectedPlan.cost,
    power_per_second: selectedPlan.power_per_second,
    status: "pending",
    receipt_url: receiptUrl,
  })

  if (insertError) {
    showToast("error", `Purchase Failed: ${insertError.message}`)
  } else {
    showToast("info", "Your purchase is submitted for approval. Check your history.")
    closePurchaseDialog()
    await fetchPurchaseHistory()
  }
  document.getElementById("submit-purchase-btn").disabled = false
  hideOverlay()
}

async function renderTasksPage() {
  const listEl = document.getElementById("tasks-list")
  listEl.innerHTML = '<div class="loading-spinner"></div>'

  const { data: tasks, error: tasksError } = await db.from("tasks").select("*")
  if (tasksError) {
    console.error("Error fetching tasks:", tasksError)
    listEl.innerHTML = `<p style="color: var(--error);">Error loading tasks: ${tasksError.message}</p>`
    return
  }

  const { data: userTasks, error: userTasksError } = await db
    .from("user_tasks")
    .select("task_id")
    .eq("user_id", app.user.id)
  if (userTasksError) {
    console.error("Error fetching user tasks:", userTasksError)
  }
  const completedTaskIds = new Set(userTasks ? userTasks.map((ut) => ut.task_id) : [])

  const { data: userProfile } = await db.from("users").select("total_purchase_volume").eq("id", app.user.id).single()
  const totalPurchaseVolume = userProfile ? userProfile.total_purchase_volume : 0

  if (tasks.length === 0) {
    listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No tasks available yet.</p>'
    return
  }

  listEl.innerHTML = tasks
    .map((task) => {
      const isCompleted = completedTaskIds.has(task.id)
      const isVerifying = app.taskVisitTimers[task.id] && app.taskVisitTimers[task.id].status === "verifying"
      const isVerified = app.taskVisitTimers[task.id] && app.taskVisitTimers[task.id].status === "verified"

      let claimButtonHtml = ""
      let taskDescription = ""
      let rewardText = ""
      let canClaim = !isCompleted

      if (task.reward_type === "cash") {
        rewardText = `${task.cash_reward.toLocaleString()} MMK`
        taskDescription = `Complete this task to earn ${rewardText}.`
      } else if (task.reward_type === "mining_power") {
        rewardText = `${task.mining_power_reward.toFixed(8)} MMK/sec`
        taskDescription = `Gain ${rewardText} for ${task.mining_duration_hours} hours.`
      } else if (task.reward_type === "purchase_goal") {
        rewardText = `${task.goal_reward_amount.toLocaleString()} MMK`
        taskDescription = `Reach ${task.purchase_goal_amount.toLocaleString()} MMK in total purchases to earn ${rewardText}. Your current volume: ${totalPurchaseVolume.toLocaleString()} MMK.`
        if (totalPurchaseVolume < task.purchase_goal_amount) {
          canClaim = false
        }
      }

      if (isCompleted) {
        claimButtonHtml = `<span class="claimed-badge"><i data-feather="check-circle"></i> Claimed</span>`
      } else if (task.link && !isVerified) {
        claimButtonHtml = `<button class="claim-btn" onclick="handleTaskLinkVisit(${task.id}, '${task.link}')" ${isVerifying ? "disabled" : ""}>
                ${isVerifying ? `<i data-feather="loader" class="spin-animation"></i> Verifying...` : `<i data-feather="external-link"></i> Visit Link to Enable`}
            </button>`
        canClaim = false
      } else {
        claimButtonHtml = `<button class="claim-btn" onclick="handleClaimTask(${task.id})" ${!canClaim ? "disabled" : ""}>
                <i data-feather="gift"></i> Claim Reward
            </button>`
      }

      return `
            <div class="task-card">
                <div class="task-header">
                    <h3 class="task-title">${task.title}</h3>
                    <span class="task-reward">${rewardText}</span>
                </div>
                <p class="task-description">${taskDescription}</p>
                <div class="task-actions">
                    ${
                      task.link
                        ? `<a href="${task.link}" target="_blank" class="task-link" onclick="event.stopPropagation(); handleTaskLinkVisit(${task.id}, '${task.link}')">
                        View Task <i data-feather="external-link"></i>
                    </a>`
                        : "<span></span>"
                    }
                    ${claimButtonHtml}
                </div>
            </div>
        `
    })
    .join("")
  feather.replace()
}

function handleTaskLinkVisit(taskId, link) {
  if (app.taskVisitTimers[taskId] && app.taskVisitTimers[taskId].status === "verifying") {
    showToast("info", "Already verifying this task. Please wait.")
    return
  }

  showToast("info", "Visiting link... Please wait 5 seconds.")
  app.taskVisitTimers[taskId] = { status: "verifying", timer: null }
  renderTasksPage()

  app.taskVisitTimers[taskId].timer = setTimeout(() => {
    app.taskVisitTimers[taskId].status = "verified"
    showToast("success", "Link verified! You can now claim the reward.")
    renderTasksPage()
  }, 5000)
}

async function handleClaimTask(taskId) {
  if (!app.user || app.isBanned) {
    showToast("error", "Please login or your account is banned.")
    return
  }

  const task = (await db.from("tasks").select("*").eq("id", taskId).single()).data
  if (task.link && (!app.taskVisitTimers[taskId] || app.taskVisitTimers[taskId].status !== "verified")) {
    showToast("warning", "Please visit the task link first and wait for verification.")
    return
  }

  showLoading("Claiming reward...")
  const { data, error } = await db.rpc("claim_task", { p_user_id: app.user.id, p_task_id: taskId })

  if (error || (data && data.startsWith("Error"))) {
    showToast("error", error?.message || data)
  } else {
    showToast("success", data)
    delete app.taskVisitTimers[taskId]
    await renderTasksPage()
    await fetchMiningData()
    await renderProfilePage()
  }
  hideOverlay()
}

async function renderProfilePage() {
  if (!app.user) return

  const { data: userData, error: userError } = await db.from("users").select("*").eq("id", app.user.id).single()
  if (userError) {
    console.error("Error fetching profile:", userError)
    showToast("error", "Failed to load profile.")
    return
  }
  app.user = { ...app.user, ...userData }

  document.getElementById("profile-avatar").src =
    app.user.profile_image_url || "https://i.pravatar.cc/150?u=" + app.user.id
  document.getElementById("profile-name").textContent = app.user.name
  document.getElementById("profile-username").textContent = `@${app.user.username}`

  document.getElementById("main-balance").textContent = `${(app.user.balance || 0).toFixed(2)} MMK`
  document.getElementById("total-purchases").textContent = `${(app.user.total_purchase_volume || 0).toFixed(2)} MMK`
  document.getElementById("total-withdrawals").textContent = `${(app.user.total_withdrawal_amount || 0).toFixed(2)} MMK`
  document.getElementById("lifetime-mining").textContent = `${(app.user.lifetime_earnings || 0).toFixed(2)} MMK`

  const { data: levels, error: levelsError } = await db.from("levels").select("*").order("level_number")
  if (levelsError) {
    console.error("Error fetching levels:", levelsError)
    return
  }

  const currentLevel = levels.find((l) => l.level_number === app.user.current_level_number)
  const nextLevel = levels.find((l) => l.level_number === app.user.current_level_number + 1)

  document.getElementById("level-icon").src = currentLevel?.icon_url || "/placeholder.svg"
  document.getElementById("level-name").textContent = currentLevel?.name || "N/A"

  let progressText = ""
  let progressWidth = 0
  if (nextLevel) {
    const currentVolume = app.user.total_purchase_volume || 0
    const requiredVolume = nextLevel.required_volume
    progressText = `Next Level (${nextLevel.name}): ${currentVolume.toLocaleString()} / ${requiredVolume.toLocaleString()} MMK`
    progressWidth = (currentVolume / requiredVolume) * 100
    if (progressWidth > 100) progressWidth = 100
  } else {
    progressText = "Max Level Reached!"
    progressWidth = 100
  }
  document.getElementById("level-progress-text").textContent = progressText
  document.getElementById("level-progress-fill").style.width = `${progressWidth}%`

  document.getElementById("submit-withdraw-btn").onclick = handleSubmitWithdrawal
  document.getElementById("avatar-upload").onchange = handleProfileImageUpload
}

async function handleProfileImageUpload(event) {
  if (!event.target.files || event.target.files.length === 0 || !app.user) return
  const file = event.target.files[0]
  const filePath = `${app.user.id}/avatars/${Date.now()}-${file.name}`

  showLoading("Uploading avatar...")
  const { error: uploadError } = await db.storage.from("profile_avatars").upload(filePath, file, { upsert: true })
  if (uploadError) {
    showToast("error", `Upload Failed: ${uploadError.message}`)
    hideOverlay()
    return
  }

  const { data: urlData } = db.storage.from("profile_avatars").getPublicUrl(filePath)
  const publicUrl = urlData.publicUrl

  const { error: updateUserError } = await db
    .from("users")
    .update({ profile_image_url: publicUrl })
    .eq("id", app.user.id)

  if (updateUserError) {
    showToast("error", `Update Failed: ${updateUserError.message}`)
  } else {
    app.user.profile_image_url = publicUrl
    document.getElementById("profile-avatar").src = publicUrl
    showToast("success", "Profile picture updated.")
  }
  hideOverlay()
}

async function handleSubmitWithdrawal() {
  if (!app.user || app.isBanned) {
    showToast("error", "Please login or your account is banned.")
    return
  }

  const amount = Number.parseFloat(document.getElementById("withdraw-amount").value)
  const method = document.getElementById("withdraw-method").value
  const phone = document.getElementById("withdraw-phone").value
  const accountName = document.getElementById("withdraw-account-name").value
  const pin = document.getElementById("withdraw-pin").value

  if (isNaN(amount) || amount < 100000) {
    showToast("warning", "Minimum withdrawal amount is 100,000 MMK.")
    return
  }
  if (app.user.balance < amount) {
    showToast("error", "Insufficient balance.")
    return
  }
  if (!method || !phone || !accountName || !pin) {
    showToast("warning", "Please fill all withdrawal details.")
    return
  }
  if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    showToast("error", "Withdraw PIN must be 6 digits.")
    return
  }

  showLoading("Submitting withdrawal request...")
  document.getElementById("submit-withdraw-btn").disabled = true

  const { data, error } = await db.rpc("request_withdrawal", {
    p_user_id: app.user.id,
    p_amount: amount,
    p_payment_method: method,
    p_phone_number: phone,
    p_account_name: accountName,
    p_withdraw_pin: pin,
  })

  if (error || (data && data.startsWith("Error"))) {
    showToast("error", error?.message || data)
  } else {
    showToast("info", data)
    document.getElementById("withdraw-amount").value = ""
    document.getElementById("withdraw-method").value = ""
    document.getElementById("withdraw-phone").value = ""
    document.getElementById("withdraw-account-name").value = ""
    document.getElementById("withdraw-pin").value = ""
    await renderProfilePage()
    await fetchWithdrawalHistory()
  }
  document.getElementById("submit-withdraw-btn").disabled = false
  hideOverlay()
}

async function renderGlobalChatPage() {
  if (!app.user) return
  await fetchGlobalMessages()
  setupGlobalChatRealtime()
}

async function fetchGlobalMessages() {
  const chatMessagesEl = document.getElementById("global-chat-messages")
  chatMessagesEl.innerHTML = '<div class="loading-spinner"></div>'

  const { data, error } = await db
    .from("global_chat_messages")
    .select("*, user:users(username, profile_image_url, current_level_number), level:levels(name)")
    .order("created_at", { ascending: true })
    .limit(100)
  if (error) {
    console.error("Error fetching global chat messages:", error)
    chatMessagesEl.innerHTML = `<p style="color: var(--error);">Error loading chat: ${error.message}</p>`
    return
  }

  if (data.length === 0) {
    chatMessagesEl.innerHTML =
      '<p style="text-align: center; color: var(--text-secondary);">No messages yet. Be the first to say hi!</p>'
    return
  }

  chatMessagesEl.innerHTML = data
    .map(
      (msg) => `
        <div class="message-item ${msg.is_admin ? "admin" : ""}">
            <img src="${msg.user?.profile_image_url || "https://i.pravatar.cc/150?u=" + msg.user?.id}" alt="Avatar" class="message-avatar">
            <div class="message-content">
                <p class="message-sender">
                    ${msg.user?.username || "Unknown User"}
                    ${msg.is_admin ? '<span style="color: #FFD700; font-weight: bold;">(Admin)</span>' : `<span class="level-badge">Lv.${msg.user?.current_level_number || 0}</span>`}
                </p>
                <div class="message-bubble">${msg.content}</div>
            </div>
        </div>
    `,
    )
    .join("")
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight
}

function setupGlobalChatRealtime() {
  if (app.globalChatChannel) {
    db.removeChannel(app.globalChatChannel)
  }
  app.globalChatChannel = db
    .channel("global_chat_room")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "global_chat_messages" }, async (payload) => {
      const { data: newMessage, error } = await db
        .from("global_chat_messages")
        .select("*, user:users(username, profile_image_url, current_level_number), level:levels(name)")
        .eq("id", payload.new.id)
        .single()
      if (error) {
        console.error("Error fetching new global message:", error)
        return
      }
      const chatMessagesEl = document.getElementById("global-chat-messages")
      chatMessagesEl.insertAdjacentHTML(
        "beforeend",
        `
                <div class="message-item ${newMessage.is_admin ? "admin" : ""}">
                    <img src="${newMessage.user?.profile_image_url || "https://i.pravatar.cc/150?u=" + newMessage.user?.id}" alt="Avatar" class="message-avatar">
                    <div class="message-content">
                        <p class="message-sender">
                            ${newMessage.user?.username || "Unknown User"}
                            ${newMessage.is_admin ? '<span style="color: #FFD700; font-weight: bold;">(Admin)</span>' : `<span class="level-badge">Lv.${newMessage.user?.current_level_number || 0}</span>`}
                        </p>
                        <div class="message-bubble">${newMessage.content}</div>
                    </div>
                </div>
            `,
      )
      chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight
    })
    .subscribe()
}

async function sendGlobalMessage(event) {
  event.preventDefault()
  if (!app.user || app.isBanned) {
    showToast("error", "Please login or your account is banned.")
    return
  }
  const inputEl = document.getElementById("global-chat-input")
  const content = inputEl.value.trim()
  if (!content) return

  inputEl.value = ""

  const { error } = await db
    .from("global_chat_messages")
    .insert({ user_id: app.user.id, content: content, is_admin: false })
  if (error) {
    console.error("Error sending global message:", error)
    showToast("error", "Failed to send message.")
  }
}

async function renderSupportPage() {
  if (!app.user) return
  await fetchSupportMessages()
  setupSupportChatRealtime()
}

async function fetchSupportMessages() {
  const chatMessagesEl = document.getElementById("support-messages")
  chatMessagesEl.innerHTML = '<div class="loading-spinner"></div>'

  const { data: threadData, error: threadError } = await db
    .from("support_messages")
    .select("id")
    .eq("user_id", app.user.id)
    .limit(1)
  let threadId = threadData && threadData.length > 0 ? threadData[0].id : null

  if (!threadId) {
    const { data: newThread, error: createError } = await db
      .from("support_messages")
      .insert({ user_id: app.user.id, content: "Support chat started.", sent_by_admin: false })
      .select("id")
      .single()
    if (createError) {
      console.error("Error creating support thread:", createError)
      chatMessagesEl.innerHTML = `<p style="color: var(--error);">Error starting support chat.</p>`
      return
    }
    threadId = newThread.id
  }
  app.currentSupportThreadId = threadId

  const { data, error } = await db
    .from("support_messages")
    .select("*")
    .eq("user_id", app.user.id)
    .order("created_at", { ascending: true })
  if (error) {
    console.error("Error fetching support messages:", error)
    chatMessagesEl.innerHTML = `<p style="color: var(--error);">Error loading chat: ${error.message}</p>`
    return
  }

  if (data.length === 0) {
    chatMessagesEl.innerHTML =
      '<p style="text-align: center; color: var(--text-secondary);">Start a conversation with support!</p>'
    return
  }

  chatMessagesEl.innerHTML = data
    .map(
      (msg) => `
        <div class="message-item ${msg.sent_by_admin ? "admin-message" : "user-message"}">
            <div class="message-bubble ${msg.sent_by_admin ? "admin-message" : "user-message"}">${msg.content}</div>
        </div>
    `,
    )
    .join("")
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight
}

function setupSupportChatRealtime() {
  if (app.supportChatChannel) {
    db.removeChannel(app.supportChatChannel)
  }
  app.supportChatChannel = db
    .channel(`support_chat_${app.user.id}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "support_messages", filter: `user_id=eq.${app.user.id}` },
      (payload) => {
        const chatMessagesEl = document.getElementById("support-messages")
        chatMessagesEl.insertAdjacentHTML(
          "beforeend",
          `
                <div class="message-item ${payload.new.sent_by_admin ? "admin-message" : "user-message"}">
                    <div class="message-bubble ${payload.new.sent_by_admin ? "admin-message" : "user-message"}">${payload.new.content}</div>
                </div>
            `,
        )
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight
      },
    )
    .subscribe()
}

async function sendSupportMessage(event) {
  event.preventDefault()
  if (!app.user || app.isBanned) {
    showToast("error", "Please login or your account is banned.")
    return
  }
  const inputEl = document.getElementById("support-chat-input")
  const content = inputEl.value.trim()
  if (!content) return

  inputEl.value = ""

  const { error } = await db
    .from("support_messages")
    .insert({ user_id: app.user.id, content: content, sent_by_admin: false })
  if (error) {
    console.error("Error sending support message:", error)
    showToast("error", "Failed to send message.")
  }
}

async function renderNewsPage() {
  const listEl = document.getElementById("news-list")
  listEl.innerHTML = '<div class="loading-spinner"></div>'

  const { data, error } = await db.from("news").select("*").order("created_at", { ascending: false })
  if (error) {
    console.error("Error fetching news:", error)
    listEl.innerHTML = `<p style="color: var(--error);">Error loading news: ${error.message}</p>`
    return
  }

  if (data.length === 0) {
    listEl.innerHTML =
      '<p style="text-align: center; color: var(--text-secondary);">No news articles have been posted yet.</p>'
    return
  }

  listEl.innerHTML = data
    .map((article) => {
      const timeAgo = formatTimeAgo(new Date(article.created_at))
      const contentWithLinks = article.content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
      return `
            <div class="news-card">
                ${article.image_url ? `<img src="${article.image_url}" alt="${article.title}">` : ""}
                <div class="news-content">
                    <h3 class="news-title">${article.title}</h3>
                    <p class="news-meta">${timeAgo}</p>
                    <p class="news-text">${contentWithLinks}</p>
                </div>
            </div>
        `
    })
    .join("")
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000)
  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + "y ago"
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + "mo ago"
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + "d ago"
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + "h ago"
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + "m ago"
  return Math.floor(seconds) + "s ago"
}

async function renderFeedPage() {
  const listEl = document.getElementById("feed-posts")
  listEl.innerHTML = '<div class="loading-spinner"></div>'

  const { data, error } = await db
    .from("posts")
    .select("*, user:users(username, profile_image_url), likes(user_id)")
    .order("created_at", { ascending: false })
  if (error) {
    console.error("Error fetching posts:", error)
    listEl.innerHTML = `<p style="color: var(--error);">Error loading feed: ${error.message}</p>`
    return
  }

  if (data.length === 0) {
    listEl.innerHTML =
      '<p style="text-align: center; color: var(--text-secondary);">No posts yet. Be the first to share something!</p>'
    return
  }

  listEl.innerHTML = data
    .map((post) => {
      const timeAgo = formatTimeAgo(new Date(post.created_at))
      const likedByCurrentUser = post.likes.some((like) => like.user_id === app.user?.id)
      return `
            <div class="post-card" id="post-${post.id}">
                <div class="post-header">
                    <img src="${post.user?.profile_image_url || "https://i.pravatar.cc/150?u=" + post.user?.id}" alt="Avatar" class="post-avatar">
                    <div>
                        <p class="post-username">${post.user?.username || "Unknown User"}</p>
                        <p class="post-time">${timeAgo}</p>
                    </div>
                </div>
                ${post.content ? `<p class="post-content">${post.content}</p>` : ""}
                ${post.video_url ? `<video controls src="${post.video_url}"></video>` : ""}
                <div class="post-actions">
                    <button class="like-btn ${likedByCurrentUser ? "liked" : ""}" onclick="toggleLike(${post.id}, ${likedByCurrentUser})">
                        <i data-feather="heart"></i> <span id="likes-count-${post.id}">${post.likes.length}</span>
                    </button>
                    ${app.user && post.user_id === app.user.id ? `<button class="delete-btn" onclick="deletePost(${post.id})"><i data-feather="trash-2"></i> Delete</button>` : ""}
                </div>
            </div>
        `
    })
    .join("")
  feather.replace()
}

let selectedVideoFile = null
function handleVideoSelect(event) {
  selectedVideoFile = event.target.files[0]
  if (selectedVideoFile) {
    if (selectedVideoFile.size > 10 * 1024 * 1024) {
      showToast("error", "Video file too large (max 10MB).")
      selectedVideoFile = null
      event.target.value = ""
      return
    }
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src)
      if (video.duration > 60) {
        showToast("error", "Video too long (max 1 minute).")
        selectedVideoFile = null
        event.target.value = ""
      }
    }
    video.src = URL.createObjectURL(selectedVideoFile)
  }
}

async function createPost() {
  if (!app.user || app.isBanned) {
    showToast("error", "Please login or your account is banned.")
    return
  }

  const content = document.getElementById("post-content").value.trim()
  if (!content && !selectedVideoFile) {
    showToast("warning", "Please enter content or select a video.")
    return
  }

  showLoading("Posting...")
  document.getElementById("post-content").value = ""
  document.getElementById("post-video-upload").value = ""

  let videoUrl = null
  if (selectedVideoFile) {
    const uploadProgressEl = document.getElementById("upload-progress")
    uploadProgressEl.style.display = "block"

    const filePath = `${app.user.id}/posts/${Date.now()}-${selectedVideoFile.name}`
    const { data, error: uploadError } = await db.storage.from("post_videos").upload(filePath, selectedVideoFile, {
      onUploadProgress: (event) => {
        const percent = Math.round((event.loaded / event.total) * 100)
        uploadProgressEl.textContent = `Uploading: ${percent}%`
      },
    })

    if (uploadError) {
      showToast("error", `Video upload failed: ${uploadError.message}`)
      hideOverlay()
      uploadProgressEl.style.display = "none"
      return
    }
    const { data: publicUrlData } = db.storage.from("post_videos").getPublicUrl(filePath)
    videoUrl = publicUrlData.publicUrl
    uploadProgressEl.style.display = "none"
  }

  const { error: insertError } = await db.from("posts").insert({
    user_id: app.user.id,
    content: content,
    video_url: videoUrl,
  })

  if (insertError) {
    showToast("error", `Failed to create post: ${insertError.message}`)
  } else {
    showToast("success", "Post created successfully!")
    await renderFeedPage()
  }
  selectedVideoFile = null
  hideOverlay()
}

async function toggleLike(postId, isLiked) {
  if (!app.user || app.isBanned) {
    showToast("error", "Please login to like posts.")
    return
  }

  const likesCountEl = document.getElementById(`likes-count-${postId}`)
  const likeBtnEl = document.querySelector(`#post-${postId} .like-btn`)

  if (isLiked) {
    const { error } = await db.from("likes").delete().eq("user_id", app.user.id).eq("post_id", postId)
    if (!error) {
      likesCountEl.textContent = Number.parseInt(likesCountEl.textContent) - 1
      likeBtnEl.classList.remove("liked")
    } else {
      showToast("error", "Failed to unlike.")
    }
  } else {
    const { error } = await db.from("likes").insert({ user_id: app.user.id, post_id: postId })
    if (!error) {
      likesCountEl.textContent = Number.parseInt(likesCountEl.textContent) + 1
      likeBtnEl.classList.add("liked")
    } else {
      showToast("error", "Failed to like.")
    }
  }
}

async function deletePost(postId) {
  if (!app.user || app.isBanned) {
    showToast("error", "Please login.")
    return
  }
  if (!confirm("Are you sure you want to delete this post?")) return

  showLoading("Deleting post...")
  const { error } = await db.from("posts").delete().eq("id", postId).eq("user_id", app.user.id)
  if (error) {
    showToast("error", `Failed to delete post: ${error.message}`)
  } else {
    showToast("success", "Post deleted.")
    await renderFeedPage()
  }
  hideOverlay()
}

async function renderSocialVideoPage() {
  const gridEl = document.getElementById("social-videos-grid")
  gridEl.innerHTML = '<div class="loading-spinner"></div>'

  const { data, error } = await db.from("social_links").select("*").order("created_at", { ascending: false })
  if (error) {
    console.error("Error fetching social links:", error)
    gridEl.innerHTML = `<p style="color: var(--error);">Error loading social videos: ${error.message}</p>`
    return
  }

  if (data.length === 0) {
    gridEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No social videos posted yet.</p>'
    return
  }

  const listEl = document.getElementById("social-videos-grid")
  listEl.innerHTML = data
    .map((link) => {
      let embedHtml = ""
      if (link.video_url.includes("youtube.com") || link.video_url.includes("youtu.be")) {
        const videoId = link.video_url.split("v=")[1] || link.video_url.split("/").pop()
        embedHtml = `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
      } else if (link.video_url.includes("tiktok.com")) {
        embedHtml = `<iframe src="${link.video_url.replace("/video/", "/embed/video/")}" frameborder="0" allowfullscreen scrolling="no" allow="encrypted-media;"></iframe>`
      } else {
        embedHtml = `<p style="text-align: center; color: var(--text-secondary);">Unsupported video platform. <a href="${link.video_url}" target="_blank" style="color: var(--accent-secondary);">Open link directly</a></p>`
      }

      return `
            <div class="video-card">
                <h3 class="video-title">${link.platform}: ${link.video_url.substring(0, 50)}...</h3>
                <div class="video-embed">
                    ${embedHtml}
                </div>
            </div>
        `
    })
    .join("")
}

async function renderAboutPage() {
  const listEl = document.getElementById("about-info-list")
  listEl.innerHTML = '<div class="loading-spinner"></div>'

  const { data, error } = await db.from("about_info").select("*").order("created_at", { ascending: false })
  if (error) {
    console.error("Error fetching about info:", error)
    listEl.innerHTML = `<p style="color: var(--error);">Error loading about info: ${error.message}</p>`
    return
  }

  if (data.length === 0) {
    listEl.innerHTML =
      '<p style="text-align: center; color: var(--text-secondary);">No about information available yet.</p>'
    return
  }

  listEl.innerHTML = data
    .map((item) => {
      let icon = ""
      const displayValue = item.social_link_or_value
      let link = ""

      if (item.social_name.toLowerCase().includes("telegram")) {
        icon = "send"
        link = item.social_link_or_value
      } else if (item.social_name.toLowerCase().includes("phone")) {
        icon = "phone"
        link = `tel:${item.social_link_or_value}`
      } else if (item.social_name.toLowerCase().includes("youtube")) {
        icon = "youtube"
        link = item.social_link_or_value
      } else if (item.social_name.toLowerCase().includes("viber")) {
        icon = "message-circle"
        link = `viber://chat?number=${item.social_link_or_value}`
      } else if (item.social_name.toLowerCase().includes("address")) {
        icon = "map-pin"
        link = `https://maps.google.com/?q=${encodeURIComponent(item.social_link_or_value)}`
      } else {
        icon = "link"
        link = item.social_link_or_value
      }

      return `
            <div class="about-info-item">
                <i data-feather="${icon}" class="icon"></i>
                <p class="text">
                    ${item.social_name}:
                    ${link ? `<a href="${link}" target="_blank" rel="noopener noreferrer">${displayValue}</a>` : displayValue}
                </p>
            </div>
        `
    })
    .join("")
  feather.replace()
}

function setupGlobalRealtimeListeners() {
  db.channel("public:posts")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
      if (app.currentPage === "feed") {
        renderFeedPage()
      }
    })
    .subscribe()

  db.channel("public:likes")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "likes" }, (payload) => {
      if (app.currentPage === "feed") {
        const likesCountEl = document.getElementById(`likes-count-${payload.new.post_id}`)
        if (likesCountEl) {
          likesCountEl.textContent = Number.parseInt(likesCountEl.textContent) + 1
        }
      }
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "likes" }, (payload) => {
      if (app.currentPage === "feed") {
        const likesCountEl = document.getElementById(`likes-count-${payload.old.post_id}`)
        if (likesCountEl) {
          likesCountEl.textContent = Number.parseInt(likesCountEl.textContent) - 1
        }
      }
    })
    .subscribe()

  db.channel("public:news")
    .on("postgres_changes", { event: "*", schema: "public", table: "news" }, (payload) => {
      if (app.currentPage === "news") {
        renderNewsPage()
      }
    })
    .subscribe()

  db.channel("public:about_info")
    .on("postgres_changes", { event: "*", schema: "public", table: "about_info" }, (payload) => {
      if (app.currentPage === "about") {
        renderAboutPage()
      }
    })
    .subscribe()

  db.channel("public:social_links")
    .on("postgres_changes", { event: "*", schema: "public", table: "social_links" }, (payload) => {
      if (app.currentPage === "social-video") {
        renderSocialVideoPage()
      }
    })
    .subscribe()

  db.channel("public:tasks")
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
      if (app.currentPage === "tasks") {
        renderTasksPage()
      }
    })
    .subscribe()
}

function subscribeToUserSpecificRealtimeChannels(userId) {
  unsubscribeFromRealtimeChannels()

  const userChannel = db
    .channel(`user_updates_${userId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${userId}` },
      (payload) => {
        if (payload.new.is_banned !== app.isBanned) {
          app.isBanned = payload.new.is_banned
          if (app.isBanned) {
            showBannedOverlay()
          } else {
            hideBannedOverlay()
            loadPageContent(app.currentPage)
          }
        }
        if (app.currentPage === "profile" || app.currentPage === "mining") {
          fetchMiningData()
          renderProfilePage()
        }
      },
    )
    .subscribe()
  app.realtimeChannels.push(userChannel)

  const purchasesChannel = db
    .channel(`user_purchases_updates_${userId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "user_purchases", filter: `user_id=eq.${userId}` },
      (payload) => {
        if (app.currentPage === "history") {
          fetchPurchaseHistory()
        }
        if (payload.new.status === "active" && app.currentPage === "mining") {
          fetchMiningData()
        }
      },
    )
    .subscribe()
  app.realtimeChannels.push(purchasesChannel)

  const withdrawalsChannel = db
    .channel(`user_withdrawals_updates_${userId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "withdrawals", filter: `user_id=eq.${userId}` },
      (payload) => {
        if (app.currentPage === "history") {
          fetchWithdrawalHistory()
        }
        if (app.currentPage === "mining") {
          renderLiveWithdrawalFeed()
          renderTopWithdrawalFeed()
        }
        if (payload.new.status === "rejected" && payload.old.status === "pending") {
          showToast(
            "error",
            `Withdrawal of ${payload.new.amount.toLocaleString()} MMK rejected. Reason: ${payload.new.rejection_reason || "N/A"}. Funds refunded.`,
          )
          renderProfilePage()
        }
      },
    )
    .subscribe()
  app.realtimeChannels.push(withdrawalsChannel)
}

function unsubscribeFromRealtimeChannels() {
  app.realtimeChannels.forEach((channel) => {
    db.removeChannel(channel)
  })
  app.realtimeChannels = []
}
