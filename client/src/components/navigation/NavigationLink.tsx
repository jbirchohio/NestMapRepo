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
}) => (
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
