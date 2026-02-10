'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { submittedGames } from '@/lib/data';
import { notFound } from 'next/navigation';
import { Check, X } from 'lucide-react';

export default function ReviewPage({ params }: { params: { id: string } }) {
  const game = submittedGames.find(g => g.id === params.id);

  if (!game) {
    notFound();
  }

  const [status, setStatus] = useState(game.status);

  const handleApprove = () => {
    setStatus('approved');
  };

  const handleReject = () => {
    setStatus('rejected');
  };

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-primary">-- Review Game --</h1>
        <p className="text-muted-foreground mt-2">[APPROVE OR REJECT SUBMITTED GAME]</p>
      </header>
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>{game.title}</CardTitle>
          <CardDescription>{game.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Template: {game.template}</p>
          <p className="text-sm text-muted-foreground">Status: {status}</p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 pt-6">
          <Button variant="outline" onClick={handleApprove} disabled={status === 'approved'}>
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={status === 'rejected'}>
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
