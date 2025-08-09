import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CardsListProps {
  userId?: number;
}

export function CardsList({ userId }: CardsListProps) {
  // Payment cards for template purchases (consumer feature)
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Payment Methods</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Card
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Saved Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No payment methods saved yet.</p>
            <p className="text-sm mt-2">Add a card to purchase templates easily.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}