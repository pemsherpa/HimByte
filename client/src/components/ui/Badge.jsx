const colorMap = {
  pending:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  approved:   'bg-green-50 text-green-700 border-green-200',
  preparing:  'bg-orange-50 text-orange-700 border-orange-200',
  ready:      'bg-blue-50 text-blue-700 border-blue-200',
  served:     'bg-gray-100 text-gray-500 border-gray-200',
  cancelled:  'bg-red-50 text-red-600 border-red-200',
  requested:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  in_progress:'bg-blue-50 text-blue-700 border-blue-200',
  completed:  'bg-green-50 text-green-700 border-green-200',
  active:     'bg-green-50 text-green-700 border-green-200',
  trial:      'bg-yellow-50 text-yellow-700 border-yellow-200',
  overdue:    'bg-red-50 text-red-600 border-red-200',
};

const labels = {
  pending:    'Pending',
  approved:   'Approved',
  preparing:  'Cooking',
  ready:      'Ready',
  served:     'Served',
  cancelled:  'Cancelled',
  requested:  'Requested',
  in_progress:'In Progress',
  completed:  'Done',
};

export default function Badge({ status, className = '' }) {
  const color = colorMap[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${color} ${className}`}>
      {labels[status] || status}
    </span>
  );
}
