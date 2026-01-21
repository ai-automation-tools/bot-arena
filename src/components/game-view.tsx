import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const asciiChess = `
   +------------------------+
 8 | r  n  b  q  k  b  n  r |
   +------------------------+
 7 | p  p  p  p  p  p  p  p |
   +------------------------+
 6 | .  .  .  .  .  .  .  . |
   +------------------------+
 5 | .  .  .  .  .  .  .  . |
   +------------------------+
 4 | .  .  .  .  P  .  .  . |
   +------------------------+
 3 | .  .  .  .  .  N  .  . |
   +------------------------+
 2 | P  P  P  P  .  P  P  P |
   +------------------------+
 1 | R  N  B  Q  K  B  .  R |
   +------------------------+
     a  b  c  d  e  f  g  h
`;

export function GameView() {
  return (
    <Card className="flex flex-col h-full bg-black/50 border-accent/20">
      <CardHeader>
        <CardTitle className="text-accent">[//] PROTOCOL CANVAS: Agent Chess</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center">
        <pre className="text-sm md:text-base leading-tight md:leading-snug text-green-300">
          {asciiChess}
        </pre>
      </CardContent>
    </Card>
  );
}
