import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  subtitle,
}) => {
  const sizeClasses = {
    sm: 'text-base tracking-widest',
    md: 'text-xl md:text-2xl tracking-[0.2em]',
    lg: 'text-2xl md:text-3xl tracking-[0.25em]',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="flex items-center">
        {/* Stylized OMODA */}
        <span
          className={`font-brand font-black text-white ${sizeClasses[size]}`}
          style={{ letterSpacing: '0.18em' }}
        >
          OMODA
        </span>

        {/* Brand Divider */}
        <span className="mx-2 md:mx-3 text-[#ff284d] font-light text-xl md:text-2xl">
          |
        </span>

        {/* Stylized JAECOO */}
        <span
          className={`font-brand font-black text-white ${sizeClasses[size]}`}
          style={{ letterSpacing: '0.18em' }}
        >
          JAECOO
        </span>
      </div>

      {subtitle && (
        <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-700/80">
          <span className="text-[11px] font-semibold text-slate-400 tracking-[0.2em] uppercase font-tech">
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
};
