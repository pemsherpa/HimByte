/**
 * @typedef {'super_admin' | 'restaurant_admin' | 'staff' | 'kitchen' | 'customer'} UserRole
 * @typedef {'pending' | 'approved' | 'preparing' | 'ready' | 'served' | 'rejected' | 'cancelled'} OrderStatus
 * @typedef {'dine_in' | 'room_service' | 'housekeeping'} OrderType
 * @typedef {'active' | 'trial' | 'overdue' | 'suspended' | 'cancelled'} SubscriptionStatus
 * @typedef {'clean_room' | 'towels' | 'dnd' | 'other'} ServiceRequestType
 * @typedef {'table' | 'room'} QRContext
 */

export const ORDER_STATUS_FLOW = ['pending', 'approved', 'preparing', 'ready', 'served'];

export const ORDER_STATUS_LABELS = {
  pending: 'Pending Approval',
  approved: 'Approved',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_COLORS = {
  pending: '#F4C430',
  approved: '#4CAF50',
  preparing: '#FF9800',
  ready: '#2196F3',
  served: '#9E9E9E',
  rejected: '#BC4A3C',
  cancelled: '#757575',
};
