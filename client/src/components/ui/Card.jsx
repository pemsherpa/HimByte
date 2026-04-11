export default function Card({ children, className = '', onClick, ...props }) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-2xl border border-border shadow-sm
        ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200' : ''}
        ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
