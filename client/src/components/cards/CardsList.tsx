import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CreditCard, MoreVertical, Eye, EyeOff, Square, Play, Settings } from 'lucide-react';

interface CorporateCard {
  id: string;
  cardNumber: string;
  cardholder: string;
  status: 'active' | 'frozen' | 'pending';
  balance: number;
  currency: string;
  expirationDate: string;
  lastFour: string;
  department?: string;
  monthlyLimit?: number;
}

interface CardsListProps {
  cards: CorporateCard[];
  onFreezeCard: (cardId: string) => void;
  onUnfreezeCard: (cardId: string) => void;
  onViewDetails: (cardId: string) => void;
  onUpdateCard: (cardId: string) => void;
  isLoading?: boolean;
}

export function CardsList({ 
  cards, 
  onFreezeCard, 
  onUnfreezeCard, 
  onViewDetails, 
  onUpdateCard,
  isLoading 
}: CardsListProps) {
  const [showCardNumbers, setShowCardNumbers] = useState<Record<string, boolean>>({});

  const toggleCardNumber = (cardId: string) => {
    setShowCardNumbers(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'frozen': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const maskCardNumber = (cardNumber: string) => {
    return `**** **** **** ${cardNumber.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-24 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No corporate cards found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {cards.map((card) => (
        <Card key={card.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-lg">
                      {showCardNumbers[card.id] ? card.cardNumber : maskCardNumber(card.cardNumber)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCardNumber(card.id)}
                    >
                      {showCardNumbers[card.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {card.cardholder}
                  </div>
                  
                  {card.department && (
                    <div className="text-xs text-muted-foreground">
                      {card.department}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(card.status)}>
                    {card.status}
                  </Badge>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetails(card.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      
                      {card.status === 'active' ? (
                        <DropdownMenuItem onClick={() => onFreezeCard(card.id)}>
                          <Square className="h-4 w-4 mr-2" />
                          Freeze Card
                        </DropdownMenuItem>
                      ) : card.status === 'frozen' ? (
                        <DropdownMenuItem onClick={() => onUnfreezeCard(card.id)}>
                          <Play className="h-4 w-4 mr-2" />
                          Unfreeze Card
                        </DropdownMenuItem>
                      ) : null}
                      
                      <DropdownMenuItem onClick={() => onUpdateCard(card.id)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="text-sm">
                  <div className="font-semibold">
                    {card.currency} {card.balance.toLocaleString()}
                  </div>
                  
                  {card.monthlyLimit && (
                    <div className="text-muted-foreground text-xs">
                      Limit: {card.currency} {card.monthlyLimit.toLocaleString()}
                    </div>
                  )}
                  
                  <div className="text-muted-foreground text-xs">
                    Expires: {card.expirationDate}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}