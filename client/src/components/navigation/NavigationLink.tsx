import { Link } from 'react-router-dom';
import { NavigationItem } from './types';

interface NavigationLinkProps extends Omit<NavigationItem, 'requiresAuth'> {
  className?: string;
  onClick?: () => void;
}

export const NavigationLink: React.FC<NavigationLinkProps> = ({
  name,
  href,
  icon,
  ariaLabel,
  className = '',
  onClick,
}) => {
  // Handle hash links with smooth scrolling
  const handleClick = (e: React.MouseEvent) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const targetId = href.substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }
    onClick?.();
  };

  // For hash links, use a button instead of Link
  if (href.startsWith('#')) {
    return (
      <button
        onClick={handleClick}
        aria-label={ariaLabel}
        className={`flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${className}`}
      >
        <span className="mr-3 text-gray-400" aria-hidden="true">
          {icon}
        </span>
        {name}
      </button>
    );
  }

  // For regular links, use React Router Link
  return (
    <Link
      to={href}
      aria-label={ariaLabel}
      className={`flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${className}`}
      onClick={onClick}
    >
      <span className="mr-3 text-gray-400" aria-hidden="true">
        {icon}
      </span>
      {name}
    </Link>
  );
};
