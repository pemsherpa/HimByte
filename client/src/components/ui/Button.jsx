import { motion } from 'framer-motion';

const variants = {
  primary:  'bg-primary text-white hover:bg-primary-dark shadow-sm',
  gold:     'bg-gold text-ink hover:bg-gold-dark shadow-sm',
  outline:  'border-2 border-primary text-primary hover:bg-primary hover:text-white',
  ghost:    'text-body hover:bg-canvas-dark',
  danger:   'bg-danger text-white hover:bg-red-700',
  success:  'bg-success text-white hover:bg-green-700',
};

const sizes = {
  sm:   'px-3 py-1.5 text-sm',
  md:   'px-5 py-2.5 text-sm',
  lg:   'px-6 py-3 text-base',
  icon: 'p-2.5',
};

export default function Button({ children, variant = 'primary', size = 'md', disabled, className = '', onClick, type = 'button', ...props }) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors duration-150 cursor-pointer select-none
        ${variants[variant]} ${sizes[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
