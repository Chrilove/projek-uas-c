// app/lib/payments.js - IMPROVED VERSION
import { 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    getDoc, 
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp 
  } from 'firebase/firestore';
  import { db } from './firebase';
  
  // Generate transaction number
  export const generateTransactionNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `TXN${new Date().getFullYear()}${timestamp}${random}`;
  };
  
  // Create new payment transaction
  export const createPaymentTransaction = async (paymentData) => {
    try {
      console.log('Creating payment transaction with data:', paymentData);
      
      // Validate required fields
      const requiredFields = ['orderId', 'orderNumber', 'resellerId', 'amount', 'method'];
      for (const field of requiredFields) {
        if (!paymentData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      const transactionNumber = generateTransactionNumber();
      
      const payment = {
        transactionId: transactionNumber,
        orderId: paymentData.orderId,
        orderNumber: paymentData.orderNumber,
        customer: paymentData.customer || '',
        customerEmail: paymentData.customerEmail || '',
        resellerId: paymentData.resellerId,
        amount: paymentData.amount,
        method: paymentData.method,
        reference: paymentData.reference || '',
        status: paymentData.status || 'processing',
        type: paymentData.type || 'payment',
        description: paymentData.description || '',
        adminNotes: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
  
      console.log('Attempting to create payment document:', payment);
      
      const docRef = await addDoc(collection(db, 'payments'), payment);
      console.log('Payment transaction created with ID:', docRef.id);
      return { success: true, paymentId: docRef.id, transactionNumber };
    } catch (error) {
      console.error('Error creating payment transaction:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      return { success: false, error: error.message, code: error.code };
    }
  };
  
  // Update payment status
  export const updatePaymentStatus = async (paymentId, status, adminNotes = '') => {
    try {
      console.log(`Updating payment ${paymentId} with status: ${status}`);
      
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }
      
      if (!status) {
        throw new Error('Payment status is required');
      }
      
      const paymentRef = doc(db, 'payments', paymentId);
      
      // Check if payment exists first
      const paymentSnap = await getDoc(paymentRef);
      if (!paymentSnap.exists()) {
        throw new Error('Payment not found');
      }
      
      const updateData = {
        status,
        updatedAt: serverTimestamp()
      };
      
      if (adminNotes) {
        updateData.adminNotes = adminNotes;
      }
      
      console.log('Update data:', updateData);
      
      await updateDoc(paymentRef, updateData);
      console.log('Payment status updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Error updating payment status:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      return { success: false, error: error.message, code: error.code };
    }
  };
  
  // Update payment with additional fields (for resellers)
  export const updatePayment = async (paymentId, updateData) => {
    try {
      console.log(`Updating payment ${paymentId} with data:`, updateData);
      
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }
      
      const paymentRef = doc(db, 'payments', paymentId);
      
      // Check if payment exists first
      const paymentSnap = await getDoc(paymentRef);
      if (!paymentSnap.exists()) {
        throw new Error('Payment not found');
      }
      
      const finalUpdateData = {
        ...updateData,
        updatedAt: serverTimestamp()
      };
      
      console.log('Final update data:', finalUpdateData);
      
      await updateDoc(paymentRef, finalUpdateData);
      console.log('Payment updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Error updating payment:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      return { success: false, error: error.message, code: error.code };
    }
  };
  
  // Get all payment transactions (for admin)
  export const getAllPayments = async (statusFilter = null) => {
    try {
      console.log('Getting all payments with filter:', statusFilter);
      
      const paymentsRef = collection(db, 'payments');
      let q;
      
      if (statusFilter && statusFilter !== 'all') {
        q = query(
          paymentsRef, 
          where('status', '==', statusFilter),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(paymentsRef, orderBy('createdAt', 'desc'));
      }
      
      const querySnapshot = await getDocs(q);
      const payments = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        payments.push({
          id: doc.id,
          ...data,
          // Format createdAt for display
          date: data.createdAt ? formatDate(data.createdAt.toDate()) : 'N/A',
          time: data.createdAt ? formatTime(data.createdAt.toDate()) : 'N/A'
        });
      });
      
      console.log(`Retrieved ${payments.length} payments`);
      return { success: true, payments };
    } catch (error) {
      console.error('Error getting all payments:', error);
      console.error('Error code:', error.code);
      return { success: false, error: error.message, code: error.code };
    }
  };
  
  // Get payments by reseller ID
  export const getPaymentsByReseller = async (resellerId) => {
    try {
      console.log('Getting payments for reseller:', resellerId);
      
      if (!resellerId) {
        throw new Error('Reseller ID is required');
      }
      
      const paymentsRef = collection(db, 'payments');
      const q = query(
        paymentsRef, 
        where('resellerId', '==', resellerId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const payments = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        payments.push({
          id: doc.id,
          ...data,
          date: data.createdAt ? formatDate(data.createdAt.toDate()) : 'N/A',
          time: data.createdAt ? formatTime(data.createdAt.toDate()) : 'N/A'
        });
      });
      
      console.log(`Retrieved ${payments.length} payments for reseller`);
      return { success: true, payments };
    } catch (error) {
      console.error('Error getting payments by reseller:', error);
      console.error('Error code:', error.code);
      return { success: false, error: error.message, code: error.code };
    }
  };
  
  // Get payment by ID
  export const getPaymentById = async (paymentId) => {
    try {
      console.log('Getting payment by ID:', paymentId);
      
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }
      
      const paymentRef = doc(db, 'payments', paymentId);
      const paymentSnap = await getDoc(paymentRef);
      
      if (paymentSnap.exists()) {
        const payment = { 
          id: paymentSnap.id, 
          ...paymentSnap.data() 
        };
        console.log('Payment found:', payment);
        return { success: true, payment };
      } else {
        console.log('Payment not found');
        return { success: false, error: 'Payment not found' };
      }
    } catch (error) {
      console.error('Error getting payment:', error);
      console.error('Error code:', error.code);
      return { success: false, error: error.message, code: error.code };
    }
  };
  
  // Get payment statistics (for admin dashboard)
  export const getPaymentStats = async () => {
    try {
      console.log('Getting payment statistics');
      
      const paymentsRef = collection(db, 'payments');
      const querySnapshot = await getDocs(paymentsRef);
      
      let totalRevenue = 0;
      let totalTransactions = 0;
      let successfulTransactions = 0;
      let failedTransactions = 0;
      let processingTransactions = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalTransactions += 1;
        
        // Only count successful payments for revenue
        if (data.status === 'success' && data.type === 'payment') {
          totalRevenue += parseFloat(data.amount.toString().replace(/[^\d]/g, '')) || 0;
          successfulTransactions += 1;
        } else if (data.status === 'failed') {
          failedTransactions += 1;
        } else if (data.status === 'processing') {
          processingTransactions += 1;
        }
      });
      
      const averageTransaction = totalTransactions > 0 ? totalRevenue / successfulTransactions : 0;
      const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;
      
      const stats = {
        totalRevenue,
        totalTransactions,
        averageTransaction,
        successRate: successRate.toFixed(1),
        successfulTransactions,
        failedTransactions,
        processingTransactions
      };
      
      console.log('Payment statistics:', stats);
      return { success: true, stats };
    } catch (error) {
      console.error('Error getting payment stats:', error);
      console.error('Error code:', error.code);
      return { success: false, error: error.message, code: error.code };
    }
  };
  
  // Retry failed payment
  export const retryPayment = async (paymentId) => {
    try {
      console.log('Retrying payment:', paymentId);
      
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }
      
      const paymentRef = doc(db, 'payments', paymentId);
      
      // Check if payment exists first
      const paymentSnap = await getDoc(paymentRef);
      if (!paymentSnap.exists()) {
        throw new Error('Payment not found');
      }
      
      await updateDoc(paymentRef, {
        status: 'processing',
        adminNotes: 'Payment retry initiated',
        updatedAt: serverTimestamp()
      });
      
      console.log('Payment retry initiated successfully');
      return { success: true };
    } catch (error) {
      console.error('Error retrying payment:', error);
      console.error('Error code:', error.code);
      return { success: false, error: error.message, code: error.code };
    }
  };
  
  // Helper functions for date formatting
  const formatDate = (date) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  };
  
  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  // Format currency to Indonesian Rupiah
  export const formatCurrency = (amount) => {
    if (typeof amount === 'string') {
      // If already formatted, return as is
      if (amount.includes('Rp')) return amount;
      amount = parseFloat(amount);
    }
    
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
