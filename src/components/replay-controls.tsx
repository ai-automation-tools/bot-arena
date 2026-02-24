'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Pause, SkipForward, SkipBack, Gauge } from 'lucide-react';

type PlaybackSpeed = 0.5 | 1 | 2 | 4;

interface ReplayControlsProps {
  isPaused: boolean;
  playbackSpeed: PlaybackSpeed;
  onTogglePause: () => void;
  onChangeSpeed: (speed: PlaybackSpeed) => void;
  onStepForward?: () => void;
  onStepBackward?: () => void;
  showStepControls?: boolean;
}

const SPEED_OPTIONS: PlaybackSpeed[] = [0.5, 1, 2, 4];

export function ReplayControls({
  isPaused,
  playbackSpeed,
  onTogglePause,
  onChangeSpeed,
  onStepForward,
  onStepBackward,
  showStepControls = false,
}: ReplayControlsProps) {
  return (
    <Card className="bg-black/50 border-accent/20 p-4">
      <div className="flex flex-col gap-4">
        {/* Title */}
        <div className="flex items-center gap-2 text-accent text-sm font-mono font-bold">
          <Gauge className="h-4 w-4" />
          REPLAY_CONTROLS
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-center gap-2">
          {showStepControls && onStepBackward && (
            <Button
              variant="outline"
              size="sm"
              onClick={onStepBackward}
              className="border-primary text-primary hover:bg-primary hover:text-black"
              disabled={!isPaused}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="outline"
            size="lg"
            onClick={onTogglePause}
            className={`border-accent text-accent hover:bg-accent hover:text-black font-mono font-bold ${
              isPaused ? 'animate-pulse' : ''
            }`}
          >
            {isPaused ? (
              <>
                <Play className="h-5 w-5 mr-2" />
                RESUME
              </>
            ) : (
              <>
                <Pause className="h-5 w-5 mr-2" />
                PAUSE
              </>
            )}
          </Button>

          {showStepControls && onStepForward && (
            <Button
              variant="outline"
              size="sm"
              onClick={onStepForward}
              className="border-primary text-primary hover:bg-primary hover:text-black"
              disabled={!isPaused}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Speed Controls */}
        <div className="flex flex-col gap-2">
          <div className="text-xs text-primary/70 font-mono text-center">
            PLAYBACK_SPEED
          </div>
          <div className="flex gap-2 justify-center">
            {SPEED_OPTIONS.map((speed) => (
              <Button
                key={speed}
                variant="outline"
                size="sm"
                onClick={() => onChangeSpeed(speed)}
                className={`font-mono font-bold ${
                  playbackSpeed === speed
                    ? 'bg-accent text-black border-accent'
                    : 'border-primary/30 text-primary/70 hover:border-primary hover:text-primary'
                }`}
              >
                {speed}x
              </Button>
            ))}
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="text-xs text-primary/50 font-mono text-center border-t border-primary/10 pt-2">
          [SPACE] Pause/Resume • [1-4] Speed Control
        </div>
      </div>
    </Card>
  );
}
