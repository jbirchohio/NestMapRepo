import React from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWhiteLabel } from '@/contexts/WhiteLabelContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  Settings, 
  LogOut, 
  Menu,
  Bell,
  HelpCircle
} from 'lucide-react';

export default function BrandedHeader() {
  const { config } = useWhiteLabel();
  const { user, logout } = useAuth();
  const [location] = useLocation();

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card border-b border-white/10 bg-gradient-to-r from-electric-600/5 to-electric-700/10 backdrop-blur-lg sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Section */}
          <motion.div 
            className="flex items-center gap-4"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Link href="/" className="flex items-center gap-3">
              {config.companyLogo ? (
                <motion.img 
                  src={config.companyLogo} 
                  alt={config.companyName}
                  className="h-8 w-8 object-contain"
                  whileHover={{ rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                />
              ) : (
                <motion.div 
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm electric-gradient electric-glow"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {config.companyName.charAt(0)}
                </motion.div>
              )}
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent">
                  {config.companyName}
                </h1>
                {config.tagline && (
                  <p className="text-xs text-navy-500 dark:text-navy-400 -mt-1">
                    {config.tagline}
                  </p>
                )}
              </div>
            </Link>
          </motion.div>

          {/* Navigation */}
          <motion.nav 
            className="hidden md:flex items-center gap-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link href="/">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant={location === '/' ? 'default' : 'ghost'}
                  size="sm"
                  className={location === '/' ? 'electric-gradient morphing-button text-white' : 'hover:bg-electric-100 dark:hover:bg-electric-900/20'}
                >
                  Dashboard
                </Button>
              </motion.div>
            </Link>
            <Link href="/analytics">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant={location === '/analytics' ? 'default' : 'ghost'}
                  size="sm"
                  className={location === '/analytics' ? 'electric-gradient morphing-button text-white' : 'hover:bg-electric-100 dark:hover:bg-electric-900/20'}
                >
                  Analytics
                </Button>
              </motion.div>
            </Link>
            <Link href="/teams">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant={location === '/teams' ? 'default' : 'ghost'}
                  size="sm"
                  className={location === '/teams' ? 'electric-gradient morphing-button text-white' : 'hover:bg-electric-100 dark:hover:bg-electric-900/20'}
                >
                  Teams
                </Button>
              </motion.div>
            </Link>
          </motion.nav>

          {/* User Actions */}
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {config.helpUrl && (
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="sm" asChild className="electric-glow">
                  <a href={config.helpUrl} target="_blank" rel="noopener noreferrer">
                    <HelpCircle className="h-4 w-4" />
                  </a>
                </Button>
              </motion.div>
            )}
            
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="sm" className="electric-glow">
                <Bell className="h-4 w-4" />
              </Button>
            </motion.div>

            {user ? (
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline"
                  className="electric-gradient-soft border-electric-300 text-electric-700"
                >
                  {user.role || 'User'}
                </Badge>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="ghost" size="sm" className="electric-glow">
                    <User className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">
                      {user.email || 'User'}
                    </span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="ghost" size="sm" className="electric-glow">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {config.enablePublicSignup && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="outline" size="sm" className="border-electric-300 text-electric-600 hover:bg-electric-50">
                      Sign Up
                    </Button>
                  </motion.div>
                )}
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    size="sm"
                    className="electric-gradient morphing-button text-white"
                  >
                    Sign In
                  </Button>
                </motion.div>
              </div>
            )}

            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="sm" className="md:hidden electric-glow">
                <Menu className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}