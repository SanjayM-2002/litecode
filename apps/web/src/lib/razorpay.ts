// Razorpay Checkout script loader + thin wrapper.
//
// The Checkout script registers a global `window.Razorpay` constructor. We
// load it lazily on first use so the script doesn't tax every page.

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

interface RazorpayCheckoutOptions {
  key: string
  subscription_id: string
  name?: string
  description?: string
  image?: string
  prefill?: { name?: string; email?: string; contact?: string }
  notes?: Record<string, string>
  theme?: { color?: string }
  handler?: (response: RazorpaySuccessResponse) => void
  modal?: { ondismiss?: () => void }
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
}

interface RazorpayConstructor {
  new (options: RazorpayCheckoutOptions): { open(): void }
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor
  }
}

let loadPromise: Promise<void> | null = null

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  if (loadPromise) return loadPromise
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      loadPromise = null
      reject(new Error('Failed to load Razorpay Checkout'))
    }
    document.body.appendChild(script)
  })
  return loadPromise
}

export async function openRazorpayCheckout(
  options: RazorpayCheckoutOptions,
): Promise<void> {
  await loadCheckoutScript()
  if (!window.Razorpay) throw new Error('Razorpay unavailable')
  const checkout = new window.Razorpay(options)
  checkout.open()
}
