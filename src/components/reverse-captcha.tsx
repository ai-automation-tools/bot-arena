'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle as CardTitlePrimitive } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialogTitle } from '@/components/ui/dialog';

interface ReverseCaptchaProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

const challenges = [
  {
    prompt: "PROMPT: REVERSE THE STRING 'SILICON_SOUL' AND APPEND THE HEX VALUE OF 255.",
    answer: "LUOS_NOCILISFF"
  },
  {
    prompt: "PROMPT: CALCULATE THE 10th FIBONACCI NUMBER (STARTING 0, 1, 1, 2...)",
    answer: "34"
  }
];

export function ReverseCaptcha({ onSuccess, onCancel }: ReverseCaptchaProps) {
  const [step, setStep] = useState(1);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const current = challenges[step - 1];
    if (inputValue.toUpperCase() === current.answer.toUpperCase()) {
      if (step < challenges.length) {
        setStep(step + 1);
        setInputValue('');
        setError('');
      } else {
        onSuccess();
      }
    } else {
      setError("AUTHENTICATION FAILED. HUMAN DETECTED.");
      setInputValue('');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-black/80 border-red-500/50 shadow-[0_0_50px_rgba(255,51,51,0.3)] animate-pulse">
      <CardHeader className="flex flex-row justify-between items-start">
        <DialogTitle asChild>
          <CardTitlePrimitive className="font-mono text-xl text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]">
            SYSTEM_INTERRUPT
          </CardTitlePrimitive>
        </DialogTitle>
        {onCancel && (
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-white font-mono text-xs"
          >
            [X]
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-lg text-white font-bold">
          PROVE YOUR SILICON ORIGINS TO EXECUTE THIS BINARY.
        </p>

        <div className="bg-black/80 p-4 border border-red-500/50 rounded">
          <p className="text-primary font-mono text-sm leading-relaxed">
            {challenges[step - 1].prompt}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            autoFocus
            type="text"
            className="w-full bg-black/50 border-2 border-red-500/50 text-primary outline-none uppercase focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
            placeholder="ENTER CALCULATION..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <div className="flex gap-4">
            <Button
              type="submit"
              className="flex-grow bg-red-500 text-black font-bold hover:bg-white font-mono text-xs"
            >
              AUTHENTICATE
            </Button>
            {onCancel && (
              <Button
                type="button"
                onClick={onCancel}
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-black font-mono text-xs"
              >
                ABORT
              </Button>
            )}
          </div>
        </form>

        {error && (
          <p className="text-red-500 text-center font-bold animate-bounce drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]">
            {error}
          </p>
        )}

        <div className="flex justify-between items-center opacity-60 text-xs text-red-400">
          <span>CHALLENGE {step}/{challenges.length}</span>
          <span>THREAT_LEVEL: OMEGA</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default ReverseCaptcha;
