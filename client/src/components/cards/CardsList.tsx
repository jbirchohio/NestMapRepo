import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, CreditCard, Lock, Unlock, Eye, EyeOff, Pause, Play } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface CorporateCard {
  id: string;
  holderName: string;
  lastFour: string;
  status: 'active' | 'frozen' | 'suspended' | 'expired';
  spendingLimit: number;
  availableBalance: number;
  monthlySpent: number;
  cardType: 'physical' | 'virtual';
  expiryDate: string;
  department?: string;
  purpose?: string;
}

interface CardsListProps {
  cards: CorporateCard[];
  onCardAction: (cardId: string, action: 'freeze' | 'unfreeze' | 'view' | 'suspend') => void;
  isLoading?: boolean;
}

export function CardsList({ cards, onCardAction, isLoading }: CardsListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'frozen':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'expired':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getSpendingPercentage = (spent: number, limit: number) => {
    return Math.min((spent / limit) * 100, 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cards.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Corporate Cards
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              No corporate cards have been issued yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        cards.map((card) => (
          <Card key={card.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-16 bg-gradient-to-r from-blue-500 to-electric-600 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {card.holderName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      •••• {card.lastFour}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(card.status)}>
                    {card.status}
                  </Badge>
                  <Badge variant="outline">
                    {card.cardType}
                  </Badge>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onCardAction(card.id, 'view')}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {card.status === 'active' ? (
                        <DropdownMenuItem onClick={() => onCardAction(card.id, 'freeze')}>
                          <Lock className="h-4 w-4 mr-2" />
                          Freeze Card
                        </DropdownMenuItem>
                      ) : card.status === 'frozen' ? (
                        <DropdownMenuItem onClick={() => onCardAction(card.id, 'unfreeze')}>
                          <Unlock className="h-4 w-4 mr-2" />
                          Unfreeze Card
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem 
                        onClick={() => onCardAction(card.id, 'suspend')}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Suspend Card
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Spending Limit</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(card.spendingLimit)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Available Balance</p>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(card.availableBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Spent</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(card.monthlySpent)}
                  </p>
                </div>
              </div>

              {/* Spending Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span>Monthly Spending</span>
                  <span>{getSpendingPercentage(card.monthlySpent, card.spendingLimit).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getSpendingPercentage(card.monthlySpent, card.spendingLimit)}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="flex gap-4">
                  {card.department && (
                    <span>Department: {card.department}</span>
                  )}
                  {card.purpose && (
                    <span>Purpose: {card.purpose}</span>
                  )}
                </div>
                <span>Expires: {card.expiryDate}</span>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
