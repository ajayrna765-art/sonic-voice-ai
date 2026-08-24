import { useState, FormEvent } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  RefreshCw,
  Gift,
} from 'lucide-react';
import { PaymentTransaction, UserCreditsState } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCredits: UserCreditsState;
  onPaymentSuccess: (creditsAdded: number, transaction: PaymentTransaction) => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  userCredits,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [activeTab, setActiveTab] = useState<'instant' | 'utr'>('instant');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const PRICE_INR = 20;
  const CREDITS_TO_ADD = 100;

  const handleSimulatePayment = (method: 'UPI' | 'QR_CODE' | 'CARD' | 'TEST_SIMULATION') => {
    setIsProcessing(true);
    setTimeout(() => {
      const newTx: PaymentTransaction = {
        id: `TXN_${Date.now()}`,
        timestamp: Date.now(),
        amount: PRICE_INR,
        creditsAdded: CREDITS_TO_ADD,
        paymentMethod: method,
        status: 'SUCCESS',
        utrRef: utrNumber.trim() || `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      };

      onPaymentSuccess(CREDITS_TO_ADD, newTx);
      setIsProcessing(false);
      setSuccessNotice(`सफलतापूर्वक ₹20 का टॉप-अप हुआ! +${CREDITS_TO_ADD} वॉयस क्रेडिट्स तुरंत जुड़ गए हैं।`);
      setTimeout(() => {
        setSuccessNotice(null);
        onClose();
      }, 1600);
    }, 800);
  };

  const handleVerifyUTR = (e: FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim()) return;
    handleSimulatePayment('UPI');
  };

  return (
    <div
      id="payment-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="payment-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#0F0F0F] border border-[#2A2A2A] rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden text-[#E0E0E0]"
      >
        {/* Top Glowing Header Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#00FFCC] via-[#00B4D8] to-[#9D4EDD]"></div>

        {/* Modal Header */}
        <div className="p-6 border-b border-[#222] flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00221A] border border-[#00FFCC]/40 flex items-center justify-center text-[#00FFCC] shadow-[0_0_12px_rgba(0,255,204,0.2)]">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white">
                  Add Voice Credits
                </h3>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#11221C] text-[#00FFCC] border border-[#005544]">
                  ₹20 Top-Up
                </span>
              </div>
              <p className="text-xs text-[#888] font-mono mt-0.5">
                {userCredits.creditsRemaining === 0
                  ? 'आपके 100 मुफ्त उपयोग पूरे हो गए हैं।'
                  : `Remaining Credits: ${userCredits.creditsRemaining} Credits`}
              </p>
            </div>
          </div>

          <button
            id="close-payment-modal-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1A1A1A] border border-[#333] hover:border-[#555] flex items-center justify-center text-[#888] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Plan Spotlight Banner */}
        <div className="px-6 py-4 bg-[#141414] border-b border-[#222] flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-bold text-[#E0E0E0] uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-[#00FFCC]" />
              Super Creator Pack
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#00FFCC] font-mono">
                ₹{PRICE_INR}
              </span>
              <span className="text-xs text-[#777] line-through">₹199</span>
              <span className="text-[11px] text-[#00FFCC] font-bold font-mono">
                (+{CREDITS_TO_ADD} Credits)
              </span>
            </div>
            <div className="text-[11px] text-[#999]">
              केवल 20 पैसे प्रति वॉइस जनरेशन • लाइफटाइम वैलिडिटी
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-[10px] font-mono text-[#888] uppercase">Includes</div>
            <div className="text-xs text-white font-medium flex items-center gap-1 justify-end">
              <Sparkles className="w-3.5 h-3.5 text-[#00FFCC]" />
              Exact Hindi HD Audio
            </div>
            <div className="text-[10px] text-[#777] font-mono">24kHz WAV Export</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#222] bg-[#0A0A0A] text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('instant')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'instant'
                ? 'border-[#00FFCC] text-[#00FFCC] bg-[#141414] font-bold'
                : 'border-transparent text-[#777] hover:text-[#CCC]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Instant Top-Up (+100)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('utr')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'utr'
                ? 'border-[#00FFCC] text-[#00FFCC] bg-[#141414] font-bold'
                : 'border-transparent text-[#777] hover:text-[#CCC]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Enter UTR / Ref</span>
          </button>
        </div>

        {/* Success Banner */}
        {successNotice && (
          <div className="m-6 p-4 rounded-xl bg-[#00221A] border border-[#00FFCC] text-[#00FFCC] flex items-center gap-3 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div className="text-xs font-bold font-mono">{successNotice}</div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Tab 1: Instant Top-up Mode */}
          {activeTab === 'instant' && (
            <div className="p-5 rounded-xl bg-[#141414] border border-[#2A2A2A] space-y-4 text-center">
              <div className="space-y-1.5">
                <div className="text-sm font-bold text-white font-mono uppercase">
                  1-Click Instant Credit Recharge
                </div>
                <p className="text-xs text-[#AAA] leading-relaxed">
                  बिना किसी देरी के तुरंत 1 क्लिक में ₹20 का पैक सक्रिय करें और अपने खाते में 100 नए वॉयस क्रेडिट्स जोड़ें।
                </p>
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleSimulatePayment('TEST_SIMULATION')}
                className="w-full py-3.5 px-4 rounded-xl bg-[#00FFCC] hover:bg-[#00E6B8] text-black font-bold uppercase text-xs font-mono tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,255,204,0.3)] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Adding 100 Credits...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Instant Top-Up (+100 Credits)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Tab 2: UTR Reference Form */}
          {activeTab === 'utr' && (
            <form onSubmit={handleVerifyUTR} className="space-y-4">
              <div className="p-4 rounded-xl bg-[#141414] border border-[#2A2A2A] space-y-3">
                <label className="text-xs font-mono text-[#AAA] block">
                  12-Digit UPI Ref / UTR Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 423981729012"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="w-full text-sm font-mono p-3 rounded-lg border border-[#333] bg-[#0A0A0A] text-white focus:border-[#00FFCC] focus:outline-none"
                />
                <p className="text-[10px] text-[#777] font-mono leading-relaxed">
                  पेमेंट के बाद प्राप्त होने वाला 12-अंकों का ट्रांजैक्शन / UTR नंबर यहाँ दर्ज करके क्रेडिट्स प्राप्त करें।
                </p>
              </div>

              <button
                type="submit"
                disabled={isProcessing || !utrNumber.trim()}
                className="w-full py-3.5 px-4 rounded-xl bg-[#00FFCC] hover:bg-[#00E6B8] text-black font-bold uppercase text-xs font-mono tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validating UTR...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit UTR & Add 100 Credits</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Transaction History (if any) */}
          {userCredits.history && userCredits.history.length > 0 && (
            <div className="pt-2 border-t border-[#222]">
              <span className="text-[10px] font-mono text-[#666] uppercase block mb-2">
                Recent Recharges ({userCredits.history.length})
              </span>
              <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                {userCredits.history.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between text-[11px] font-mono p-2 rounded bg-[#111] border border-[#222]"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00FFCC]" />
                      <span className="text-white">₹{tx.amount} Top-Up</span>
                      <span className="text-[#666]">({tx.paymentMethod})</span>
                    </div>
                    <div className="text-[#00FFCC] font-bold">+{tx.creditsAdded} Credits</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Guarantee Footer */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-[#666] font-mono pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00FFCC]" />
            <span>Instant Credit Activation • 100% Secure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
