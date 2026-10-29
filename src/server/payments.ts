import crypto from 'crypto';
import { db } from './db.js';

export interface JazzCashInitiateParams {
  orderId: string;
  amount: number; // in PKR
  billReference: string;
  description: string;
  returnUrl: string;
}

export interface EasypaisaInitiateParams {
  orderId: string;
  amount: number;
  email?: string;
  mobile?: string;
  returnUrl: string;
}

/**
 * JazzCash API Integration Helper
 * Follows JazzCash HTTP POST (Merchant Hosted / Redirection Checkout) Specification.
 * Calculates pp_SecureHash using HMAC-SHA256 over sorted parameters + Integrity Salt.
 */
export class JazzCashGateway {
  static getCredentials() {
    const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'jazzcash_%'").all() as { key: string; value: string }[];
    const map: Record<string, string> = {};
    rows.forEach(r => { map[r.key] = r.value; });

    return {
      merchantId: process.env.JAZZCASH_MERCHANT_ID || map['jazzcash_merchant_id'] || 'MC12345_TEST',
      password: process.env.JAZZCASH_PASSWORD || map['jazzcash_password'] || 'TestPassword123',
      integritySalt: process.env.JAZZCASH_INTEGRITY_SALT || map['jazzcash_integrity_salt'] || 'SALT_ATAL_2026',
      isSandbox: map['jazzcash_sandbox'] !== 'false',
    };
  }

  static generateSecureHash(params: Record<string, string>, salt: string): string {
    // Sort keys alphabetically (excluding pp_SecureHash)
    const sortedKeys = Object.keys(params)
      .filter(k => k !== 'pp_SecureHash' && params[k] !== '' && params[k] !== undefined && params[k] !== null)
      .sort();

    const hashString = sortedKeys.map(k => params[k]).join('&');
    const stringToHash = `${salt}&${hashString}`;

    return crypto.createHmac('sha256', salt).update(stringToHash).digest('hex').toUpperCase();
  }

  static initiatePayment(params: JazzCashInitiateParams) {
    const creds = this.getCredentials();
    const now = new Date();
    const formattedDate = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const expiryDate = new Date(now.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:T.]/g, '').slice(0, 14);

    // Format amount in paisa (multiply by 100) or as standard integer string depending on merchant contract
    const amountInPaisa = Math.round(params.amount * 100).toString();
    const txnRef = `JC_${params.orderId}_${Date.now()}`;

    const payload: Record<string, string> = {
      pp_Version: '1.1',
      pp_TxnType: 'MWALLET',
      pp_Language: 'EN',
      pp_MerchantID: creds.merchantId,
      pp_SubMerchantID: '',
      pp_Password: creds.password,
      pp_BankID: 'TBANK',
      pp_ProductID: 'RETAIL',
      pp_TxnRefNo: txnRef,
      pp_Amount: amountInPaisa,
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: formattedDate,
      pp_BillReference: params.billReference.slice(0, 20),
      pp_Description: params.description.slice(0, 50),
      pp_TxnExpiryDateTime: expiryDate,
      pp_ReturnURL: params.returnUrl,
      pp_SecureHash: '',
      ppmpf_1: params.orderId,
      ppmpf_2: 'ATAL_STORE'
    };

    payload.pp_SecureHash = this.generateSecureHash(payload, creds.integritySalt);

    const endpoint = creds.isSandbox
      ? 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/'
      : 'https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/';

    return {
      endpoint,
      payload,
      isSandbox: creds.isSandbox,
      transactionRef: txnRef
    };
  }

  static verifyCallback(responseParams: Record<string, string>): { isValid: boolean; responseCode: string; responseMessage: string; txnRef: string; orderId: string } {
    const creds = this.getCredentials();
    const receivedHash = responseParams['pp_SecureHash'];
    const calculatedHash = this.generateSecureHash(responseParams, creds.integritySalt);

    const isSandbox = creds.isSandbox;
    // In sandbox test mode, accept simulated responses if flag set or if hash matches
    const isValid = (receivedHash && receivedHash.toUpperCase() === calculatedHash) || (isSandbox && responseParams['simulated'] === 'true');

    return {
      isValid: !!isValid,
      responseCode: responseParams['pp_ResponseCode'] || '',
      responseMessage: responseParams['pp_ResponseMessage'] || '',
      txnRef: responseParams['pp_TxnRefNo'] || '',
      orderId: responseParams['ppmpf_1'] || responseParams['pp_BillReference'] || ''
    };
  }
}

/**
 * Easypaisa API Integration Helper
 * Follows Easypaisa Merchant Hosted API Integration (MA) Specification.
 */
export class EasypaisaGateway {
  static getCredentials() {
    const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'easypaisa_%'").all() as { key: string; value: string }[];
    const map: Record<string, string> = {};
    rows.forEach(r => { map[r.key] = r.value; });

    return {
      storeId: process.env.EASYPAISA_STORE_ID || map['easypaisa_store_id'] || 'EP_STORE_9981',
      hashKey: process.env.EASYPAISA_HASH_KEY || map['easypaisa_hash_key'] || 'EASYPAISA_TEST_HASH_KEY',
      isSandbox: map['easypaisa_sandbox'] !== 'false',
    };
  }

  static generateHash(params: Record<string, string>, hashKey: string): string {
    // Easypaisa requires sorting specific keys or concatenating storeId + orderId + amount + key
    const raw = `${params.storeId || ''}&${params.orderId || ''}&${params.amount || ''}&${hashKey}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  static initiatePayment(params: EasypaisaInitiateParams) {
    const creds = this.getCredentials();
    const txnRef = `EP_${params.orderId}_${Date.now()}`;
    const formattedAmount = params.amount.toFixed(2);

    const payload: Record<string, string> = {
      storeId: creds.storeId,
      orderId: params.orderId,
      transactionAmount: formattedAmount,
      transactionType: 'MA',
      mobileAccountNo: params.mobile || '',
      emailAddress: params.email || '',
      postBackURL: params.returnUrl,
      paymentMethod: 'MA_PAYMENT_METHOD',
      tokenExpiryInSeconds: '3600',
      merchantHashedReq: ''
    };

    payload.merchantHashedReq = this.generateHash({
      storeId: creds.storeId,
      orderId: params.orderId,
      amount: formattedAmount
    }, creds.hashKey);

    const endpoint = creds.isSandbox
      ? 'https://easypaystg.easypaisa.com.pk/easypay/Index.jsf'
      : 'https://easypay.easypaisa.com.pk/easypay/Index.jsf';

    return {
      endpoint,
      payload,
      isSandbox: creds.isSandbox,
      transactionRef: txnRef
    };
  }

  static verifyCallback(responseParams: Record<string, string>): { isValid: boolean; responseCode: string; txnRef: string; orderId: string } {
    const creds = this.getCredentials();
    const status = responseParams['auth_status'] || responseParams['response_code'];
    const isSandbox = creds.isSandbox;

    // Easypaisa auth_status "0000" means Success
    const isSuccess = status === '0000' || (isSandbox && responseParams['simulated'] === 'true');

    return {
      isValid: isSuccess,
      responseCode: status || 'FAILED',
      txnRef: responseParams['transaction_id'] || `EP_TXN_${Date.now()}`,
      orderId: responseParams['order_id'] || responseParams['orderRefNum'] || ''
    };
  }
}
