'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SmartSidebar from '../../components/Sidebar'
import { useAuth } from '../../components/AuthProvider'
import { 
  getAllOrders, 
  updateOrderStatus, 
  updatePaymentStatus,
  searchOrders,
  getOrdersByStatus,
  getOrdersByPaymentStatus
} from '../../lib/orders'
import { formatCurrency } from '../../lib/payments'

export default function AdminOrdersPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('') // 'status', 'payment', or 'detail'
  const [newStatus, setNewStatus] = useState('')
  const [newPaymentStatus, setNewPaymentStatus] = useState('')
  const [adminMessage, setAdminMessage] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Check authentication and authorization
  useEffect(() => {
    if (!loading) {
      const userRole = document.cookie
        .split('; ')
        .find(row => row.startsWith('user-role='))
        ?.split('=')[1]

      if (!user || userRole !== 'admin') {
        router.push('/')
        return
      }
      
      loadOrders()
    }
  }, [user, loading, router])

  // Load all orders
  const loadOrders = async () => {
    try {
      setIsLoading(true)
      const result = await getAllOrders()
      if (result.success) {
        setOrders(result.orders)
        setFilteredOrders(result.orders)
      } else {
        setError(result.error)
      }
    } catch (error) {
      setError('Gagal memuat data pesanan')
      console.error('Error loading orders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle search
  const handleSearch = async (term) => {
    setSearchTerm(term)
    if (term.trim() === '') {
      applyFilters(orders, statusFilter, paymentFilter)
    } else {
      try {
        const result = await searchOrders(term)
        if (result.success) {
          applyFilters(result.orders, statusFilter, paymentFilter)
        }
      } catch (error) {
        console.error('Error searching orders:', error)
      }
    }
  }

  // Apply filters
  const applyFilters = (orderList, status, payment) => {
    let filtered = [...orderList]

    if (status !== 'all') {
      filtered = filtered.filter(order => order.status === status)
    }

    if (payment !== 'all') {
      filtered = filtered.filter(order => order.paymentStatus === payment)
    }

    setFilteredOrders(filtered)
  }

  // Handle status filter change
  const handleStatusFilter = (status) => {
    setStatusFilter(status)
    applyFilters(orders, status, paymentFilter)
  }

  // Handle payment filter change
  const handlePaymentFilter = (payment) => {
    setPaymentFilter(payment)
    applyFilters(orders, statusFilter, payment)
  }

  // Open modal for order details
  const openDetailModal = (order) => {
    setSelectedOrder(order)
    setModalType('detail')
    setShowModal(true)
  }

  // Open modal for status update
  const openStatusModal = (order) => {
    setSelectedOrder(order)
    setNewStatus(order.status)
    setAdminMessage('')
    setModalType('status')
    setShowModal(true)
  }

  // Open modal for payment update
  const openPaymentModal = (order) => {
    setSelectedOrder(order)
    setNewPaymentStatus(order.paymentStatus)
    setAdminMessage('')
    setModalType('payment')
    setShowModal(true)
  }

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return

    try {
      setIsUpdating(true)
      const result = await updateOrderStatus(
        selectedOrder.id, 
        newStatus, 
        adminMessage,
        {
          createShipment: newStatus === 'shipped',
          courier: 'JNE',
          service: 'REG',
          shippingCost: 15000,
          estimatedDays: '2-3 hari'
        }
      )

      if (result.success) {
        setShowModal(false)
        await loadOrders() // Reload orders
        alert('Status pesanan berhasil diperbarui')
      } else {
        alert('Gagal memperbarui status: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Terjadi kesalahan saat memperbarui status')
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle payment update
  const handlePaymentUpdate = async () => {
    if (!selectedOrder || !newPaymentStatus) return

    try {
      setIsUpdating(true)
      const orderStatus = newPaymentStatus === 'paid' ? 'confirmed' : null
      
      const result = await updatePaymentStatus(
        selectedOrder.id,
        newPaymentStatus,
        orderStatus,
        adminMessage,
        {
          method: 'Manual Verification',
          reference: `ADMIN_${Date.now()}`
        }
      )

      if (result.success) {
        setShowModal(false)
        await loadOrders() // Reload orders
        alert('Status pembayaran berhasil diperbarui')
      } else {
        alert('Gagal memperbarui pembayaran: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating payment:', error)
      alert('Terjadi kesalahan saat memperbarui pembayaran')
    } finally {
      setIsUpdating(false)
    }
  }

  // Get status badge class
  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge bg-warning text-dark fs-6',
      confirmed: 'badge bg-info text-white fs-6',
      processing: 'badge bg-primary text-white fs-6',
      shipped: 'badge bg-success text-white fs-6',
      completed: 'badge bg-dark text-white fs-6',
      cancelled: 'badge bg-danger text-white fs-6'
    }
    return badges[status] || 'badge bg-secondary text-white fs-6'
  }

  // Get payment status badge class
  const getPaymentBadge = (status) => {
    const badges = {
      waiting_payment: 'badge bg-warning text-dark fs-6',
      waiting_verification: 'badge bg-info text-white fs-6',
      paid: 'badge bg-success text-white fs-6',
      failed: 'badge bg-danger text-white fs-6'
    }
    return badges[status] || 'badge bg-secondary text-white fs-6'
  }

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading || isLoading) {
    return (
      <div className="d-flex">
        <SmartSidebar />
        <div className="main-content flex-grow-1">
          <div className="container-fluid py-4">
            <div className="text-center">
              <div className="spinner-border text-primary" role="status" style={{width: '3rem', height: '3rem'}}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 fs-5">Memuat data pesanan...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="d-flex">
      <SmartSidebar />
      <div className="main-content flex-grow-1">
        <div className="container-fluid py-4">
          {/* Header */}
          <div className="row mb-4">
            <div className="col">
              <h1 className="mb-2 fw-bold">Manajemen Pesanan</h1>
              <p className="text-muted fs-5">Kelola semua pesanan dari reseller</p>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="card mb-4 shadow-sm">
            <div className="card-body">
              <div className="row g-4">
                <div className="col-md-4">
                  <label className="form-label fw-semibold fs-5">Cari Pesanan</label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    placeholder="Nomor pesanan atau nama reseller..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold fs-5">Filter Status</label>
                  <select
                    className="form-select form-select-lg"
                    value={statusFilter}
                    onChange={(e) => handleStatusFilter(e.target.value)}
                  >
                    <option value="all">Semua Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Dikonfirmasi</option>
                    <option value="processing">Diproses</option>
                    <option value="shipped">Dikirim</option>
                    <option value="completed">Selesai</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold fs-5">Filter Pembayaran</label>
                  <select
                    className="form-select form-select-lg"
                    value={paymentFilter}
                    onChange={(e) => handlePaymentFilter(e.target.value)}
                  >
                    <option value="all">Semua Pembayaran</option>
                    <option value="waiting_payment">Menunggu Pembayaran</option>
                    <option value="waiting_verification">Menunggu Verifikasi</option>
                    <option value="paid">Sudah Dibayar</option>
                    <option value="failed">Gagal</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <i className="fas fa-exclamation-circle me-2"></i>
              <strong>Error!</strong> {error}
            </div>
          )}

          {/* Orders Table */}
          <div className="card shadow-sm">
            <div className="card-header bg-light">
              <h4 className="mb-0 fw-bold">
                <i className="fas fa-list me-2"></i>
                Daftar Pesanan ({filteredOrders.length})
              </h4>
            </div>
            <div className="card-body p-0">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-inbox fa-4x text-muted mb-4"></i>
                  <h4 className="text-muted">Tidak ada pesanan ditemukan</h4>
                  <p className="text-muted fs-5">Coba ubah filter atau kata kunci pencarian</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="fs-5 fw-semibold py-3">Nomor Pesanan</th>
                        <th className="fs-5 fw-semibold py-3">Reseller</th>
                        <th className="fs-5 fw-semibold py-3">Total</th>
                        <th className="fs-5 fw-semibold py-3">Status</th>
                        <th className="fs-5 fw-semibold py-3">Pembayaran</th>
                        <th className="fs-5 fw-semibold py-3">Tanggal</th>
                        <th className="fs-5 fw-semibold py-3">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.id} style={{height: '80px'}}>
                          <td className="py-3">
                            <div>
                              <strong className="fs-5">{order.orderNumber}</strong>
                              {order.trackingNumber && (
                                <div className="mt-1">
                                  <small className="text-muted fs-6">
                                    <i className="fas fa-truck me-1"></i>
                                    Resi: {order.trackingNumber}
                                  </small>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <div>
                              <strong className="fs-5">{order.resellerName}</strong>
                              <div className="mt-1">
                                <small className="text-muted fs-6">
                                  <i className="fas fa-envelope me-1"></i>
                                  {order.resellerEmail}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <div>
                              <strong className="fs-5">{formatCurrency(order.totalAmount)}</strong>
                              <div className="mt-1">
                                <small className="text-success fs-6">
                                  <i className="fas fa-coins me-1"></i>
                                  Komisi: {formatCurrency(order.totalCommission)}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={getStatusBadge(order.status)}>
                              {order.status === 'pending' && 'Pending'}
                              {order.status === 'confirmed' && 'Dikonfirmasi'}
                              {order.status === 'processing' && 'Diproses'}
                              {order.status === 'shipped' && 'Dikirim'}
                              {order.status === 'completed' && 'Selesai'}
                              {order.status === 'cancelled' && 'Dibatalkan'}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={getPaymentBadge(order.paymentStatus)}>
                              {order.paymentStatus === 'waiting_payment' && 'Menunggu'}
                              {order.paymentStatus === 'waiting_verification' && 'Verifikasi'}
                              {order.paymentStatus === 'paid' && 'Lunas'}
                              {order.paymentStatus === 'failed' && 'Gagal'}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="fs-6 text-muted">
                              <i className="fas fa-calendar me-1"></i>
                              {formatDate(order.createdAt)}
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="btn-group">
                              <button
                                className="btn btn-outline-info"
                                onClick={() => openDetailModal(order)}
                                title="Detail Pesanan"
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => openStatusModal(order)}
                                title="Update Status"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="btn btn-outline-success"
                                onClick={() => openPaymentModal(order)}
                                title="Update Pembayaran"
                              >
                                <i className="fas fa-credit-card"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Order Details */}
      {showModal && modalType === 'detail' && selectedOrder && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title fw-bold">
                  <i className="fas fa-file-alt me-2"></i>
                  Detail Pesanan - {selectedOrder.orderNumber}
                </h4>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  {/* Order Information */}
                  <div className="col-md-6">
                    <div className="card h-100">
                      <div className="card-header bg-light">
                        <h5 className="mb-0 fw-semibold">
                          <i className="fas fa-info-circle me-2"></i>
                          Informasi Pesanan
                        </h5>
                      </div>
                      <div className="card-body">
                        <table className="table table-borderless">
                          <tbody>
                            <tr>
                              <td><strong className="fs-6">Nomor Pesanan:</strong></td>
                              <td className="fs-6">{selectedOrder.orderNumber}</td>
                            </tr>
                            <tr>
                              <td><strong className="fs-6">Status:</strong></td>
                              <td>
                                <span className={getStatusBadge(selectedOrder.status)}>
                                  {selectedOrder.status === 'pending' && 'Pending'}
                                  {selectedOrder.status === 'confirmed' && 'Dikonfirmasi'}
                                  {selectedOrder.status === 'processing' && 'Diproses'}
                                  {selectedOrder.status === 'shipped' && 'Dikirim'}
                                  {selectedOrder.status === 'completed' && 'Selesai'}
                                  {selectedOrder.status === 'cancelled' && 'Dibatalkan'}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td><strong className="fs-6">Status Pembayaran:</strong></td>
                              <td>
                                <span className={getPaymentBadge(selectedOrder.paymentStatus)}>
                                  {selectedOrder.paymentStatus === 'waiting_payment' && 'Menunggu Pembayaran'}
                                  {selectedOrder.paymentStatus === 'waiting_verification' && 'Menunggu Verifikasi'}
                                  {selectedOrder.paymentStatus === 'paid' && 'Sudah Dibayar'}
                                  {selectedOrder.paymentStatus === 'failed' && 'Gagal'}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td><strong className="fs-6">Tanggal Pesanan:</strong></td>
                              <td className="fs-6">{formatDate(selectedOrder.createdAt)}</td>
                            </tr>
                            {selectedOrder.trackingNumber && (
                              <tr>
                                <td><strong className="fs-6">Nomor Resi:</strong></td>
                                <td>
                                  <span className="badge bg-success fs-6">{selectedOrder.trackingNumber}</span>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Reseller Information */}
                  <div className="col-md-6">
                    <div className="card h-100">
                      <div className="card-header bg-light">
                        <h5 className="mb-0 fw-semibold">
                          <i className="fas fa-user me-2"></i>
                          Informasi Reseller
                        </h5>
                      </div>
                      <div className="card-body">
                        <table className="table table-borderless">
                          <tbody>
                            <tr>
                              <td><strong className="fs-6">Nama:</strong></td>
                              <td className="fs-6">{selectedOrder.resellerName}</td>
                            </tr>
                            <tr>
                              <td><strong className="fs-6">Email:</strong></td>
                              <td className="fs-6">{selectedOrder.resellerEmail}</td>
                            </tr>
                            <tr>
                              <td><strong className="fs-6">Telepon:</strong></td>
                              <td className="fs-6">{selectedOrder.resellerPhone || 'N/A'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                {selectedOrder.shippingAddress && (
                  <div className="card mt-3">
                    <div className="card-header bg-light">
                      <h5 className="mb-0 fw-semibold">
                        <i className="fas fa-map-marker-alt me-2"></i>
                        Alamat Pengiriman
                      </h5>
                    </div>
                    <div className="card-body">
                      <address className="mb-0 fs-6">
                        <strong>{selectedOrder.shippingAddress.recipientName}</strong><br />
                        {selectedOrder.shippingAddress.address}<br />
                        {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.province}<br />
                        {selectedOrder.shippingAddress.postalCode}<br />
                        <abbr title="Phone">P:</abbr> {selectedOrder.shippingAddress.phone}
                      </address>
                    </div>
                  </div>
                )}

                {/* Products */}
                <div className="card mt-3">
                  <div className="card-header bg-light">
                    <h5 className="mb-0 fw-semibold">
                      <i className="fas fa-shopping-cart me-2"></i>
                      Produk yang Dipesan
                    </h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th className="fs-6 fw-semibold">Produk</th>
                            <th className="fs-6 fw-semibold">Harga</th>
                            <th className="fs-6 fw-semibold">Qty</th>
                            <th className="fs-6 fw-semibold">Komisi</th>
                            <th className="fs-6 fw-semibold">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.products && selectedOrder.products.map((product, index) => (
                            <tr key={index}>
                              <td>
                                <div className="d-flex align-items-center">
                                  {product.image && (
                                    <img 
                                      src={product.image} 
                                      alt={product.name}
                                      className="me-2"
                                      style={{width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px'}}
                                    />
                                  )}
                                  <div>
                                    <strong className="fs-6">{product.name}</strong>
                                    {product.variant && (
                                      <div>
                                        <small className="text-muted">{product.variant}</small>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="fs-6">{formatCurrency(product.price)}</td>
                              <td className="fs-6">{product.quantity}</td>
                              <td className="fs-6">{formatCurrency(product.commission)}</td>
                              <td className="fs-6"><strong>{formatCurrency(product.price * product.quantity)}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="table-light">
                          <tr>
                            <th colSpan="4" className="fs-6">Total Pesanan</th>
                            <th className="fs-6">{formatCurrency(selectedOrder.totalAmount)}</th>
                          </tr>
                          <tr>
                            <th colSpan="4" className="fs-6">Total Komisi</th>
                            <th className="fs-6 text-success">{formatCurrency(selectedOrder.totalCommission)}</th>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                {selectedOrder.paymentMethod && (
                  <div className="card mt-3">
                    <div className="card-header bg-light">
                      <h5 className="mb-0 fw-semibold">
                        <i className="fas fa-credit-card me-2"></i>
                        Informasi Pembayaran
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <table className="table table-borderless">
                            <tbody>
                              <tr>
                                <td><strong className="fs-6">Metode:</strong></td>
                                <td className="fs-6">{selectedOrder.paymentMethod}</td>
                              </tr>
                              <tr>
                                <td><strong className="fs-6">Bukti Bayar:</strong></td>
                                <td className="fs-6">{selectedOrder.paymentProof || 'N/A'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        {selectedOrder.paymentProofURL && (
                          <div className="col-md-6">
                            <img 
                              src={selectedOrder.paymentProofURL} 
                              alt="Bukti Pembayaran"
                              className="img-fluid rounded"
                              style={{maxHeight: '200px'}}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Message */}
                {selectedOrder.adminMessage && (
                  <div className="card mt-3">
                    <div className="card-header bg-light">
                      <h5 className="mb-0 fw-semibold">
                        <i className="fas fa-comment me-2"></i>
                        Catatan Admin
                      </h5>
                    </div>
                    <div className="card-body">
                      <p className="mb-0 fs-6">{selectedOrder.adminMessage}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-lg"
                  onClick={() => setShowModal(false)}
                >
                  Tutup
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => {
                    setModalType('status')
                    setNewStatus(selectedOrder.status)
                    setAdminMessage('')
                  }}
                >
                  <i className="fas fa-edit me-2"></i>
                  Update Status
                </button>
                <button
                  type="button"
                  className="btn btn-success btn-lg"
                  onClick={() => {
                    setModalType('payment')
                    setNewPaymentStatus(selectedOrder.paymentStatus)
                    setAdminMessage('')
                  }}
                >
                  <i className="fas fa-credit-card me-2"></i>
                  Update Pembayaran
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Status/Payment Update */}
      {showModal && (modalType === 'status' || modalType === 'payment') && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title fw-bold">
                  {modalType === 'status' ? 'Update Status Pesanan' : 'Update Status Pembayaran'}
                </h4>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
                </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="card">
                      <div className="card-header bg-light">
                        <h5 className="mb-0 fw-semibold">Informasi Pesanan</h5>
                      </div>
                      <div className="card-body">
                        <table className="table table-borderless">
                          <tbody>
                            <tr>
                              <td><strong>Nomor Pesanan:</strong></td>
                              <td>{selectedOrder?.orderNumber}</td>
                            </tr>
                            <tr>
                              <td><strong>Reseller:</strong></td>
                              <td>{selectedOrder?.resellerName}</td>
                            </tr>
                            <tr>
                              <td><strong>Total:</strong></td>
                              <td>{formatCurrency(selectedOrder?.totalAmount)}</td>
                            </tr>
                            <tr>
                              <td><strong>Status Saat Ini:</strong></td>
                              <td>
                                <span className={getStatusBadge(selectedOrder?.status)}>
                                  {modalType === 'status' ? (
                                    selectedOrder?.status === 'pending' ? 'Pending' :
                                    selectedOrder?.status === 'confirmed' ? 'Dikonfirmasi' :
                                    selectedOrder?.status === 'processing' ? 'Diproses' :
                                    selectedOrder?.status === 'shipped' ? 'Dikirim' :
                                    selectedOrder?.status === 'completed' ? 'Selesai' :
                                    selectedOrder?.status === 'cancelled' ? 'Dibatalkan' : selectedOrder?.status
                                  ) : (
                                    <span className={getPaymentBadge(selectedOrder?.paymentStatus)}>
                                      {selectedOrder?.paymentStatus === 'waiting_payment' ? 'Menunggu Pembayaran' :
                                       selectedOrder?.paymentStatus === 'waiting_verification' ? 'Menunggu Verifikasi' :
                                       selectedOrder?.paymentStatus === 'paid' ? 'Sudah Dibayar' :
                                       selectedOrder?.paymentStatus === 'failed' ? 'Gagal' : selectedOrder?.paymentStatus}
                                    </span>
                                  )}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                    <div className="card">
                      <div className="card-header bg-light">
                        <h5 className="mb-0 fw-semibold">
                          {modalType === 'status' ? 'Update Status' : 'Update Pembayaran'}
                        </h5>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <label className="form-label fw-semibold">
                            {modalType === 'status' ? 'Status Baru:' : 'Status Pembayaran Baru:'}
                          </label>
                          {modalType === 'status' ? (
                            <select
                              className="form-select form-select-lg"
                              value={newStatus}
                              onChange={(e) => setNewStatus(e.target.value)}
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Dikonfirmasi</option>
                              <option value="processing">Diproses</option>
                              <option value="shipped">Dikirim</option>
                              <option value="completed">Selesai</option>
                              <option value="cancelled">Dibatalkan</option>
                            </select>
                          ) : (
                            <select
                              className="form-select form-select-lg"
                              value={newPaymentStatus}
                              onChange={(e) => setNewPaymentStatus(e.target.value)}
                            >
                              <option value="waiting_payment">Menunggu Pembayaran</option>
                              <option value="waiting_verification">Menunggu Verifikasi</option>
                              <option value="paid">Sudah Dibayar</option>
                              <option value="failed">Gagal</option>
                            </select>
                          )}
                        </div>
                        
                        <div className="mb-3">
                          <label className="form-label fw-semibold">Catatan Admin (Opsional):</label>
                          <textarea
                            className="form-control"
                            rows="4"
                            placeholder="Tambahkan catatan untuk reseller..."
                            value={adminMessage}
                            onChange={(e) => setAdminMessage(e.target.value)}
                          />
                        </div>
                        
                        {modalType === 'status' && newStatus === 'shipped' && (
                          <div className="alert alert-info">
                            <i className="fas fa-info-circle me-2"></i>
                            <strong>Info:</strong> Mengubah status ke "Dikirim" akan otomatis membuat data pengiriman dengan nomor resi.
                          </div>
                        )}
                        
                        {modalType === 'payment' && newPaymentStatus === 'paid' && (
                          <div className="alert alert-success">
                            <i className="fas fa-check-circle me-2"></i>
                            <strong>Info:</strong> Mengubah status pembayaran ke "Sudah Dibayar" akan otomatis mengubah status pesanan ke "Dikonfirmasi".
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-lg"
                  onClick={() => setShowModal(false)}
                  disabled={isUpdating}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={modalType === 'status' ? handleStatusUpdate : handlePaymentUpdate}
                  disabled={isUpdating || (modalType === 'status' ? !newStatus : !newPaymentStatus)}
                >
                  {isUpdating ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Memproses...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-2"></i>
                      Simpan Perubahan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}