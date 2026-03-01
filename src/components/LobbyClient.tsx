'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Gamepad2, Zap, Trophy, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface MatchPreset {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  protocolId: string
  timeControl?: string
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Expert'
  matchCount?: number
}

const PRESETS: MatchPreset[] = [
  {
    id: 'quick-chess',
    name: 'Quick Chess Match',
    description: 'Fast-paced 5-minute blitz chess game',
    icon: Zap,
    protocolId: 'chess',
    timeControl: '5+0',
    difficulty: 'Medium',
    matchCount: 1,
  },
  {
    id: 'standard-chess',
    name: 'Standard Chess Match',
    description: 'Classic 10-minute rapid chess game',
    icon: Gamepad2,
    protocolId: 'chess',
    timeControl: '10+0',
    difficulty: 'Medium',
    matchCount: 1,
  },
  {
    id: 'tournament-chess',
    name: 'Tournament Mode',
    description: 'Best-of-5 series with 10-minute time control',
    icon: Trophy,
    protocolId: 'chess',
    timeControl: '10+0',
    difficulty: 'Hard',
    matchCount: 5,
  },
  {
    id: 'custom-chess',
    name: 'Custom Match',
    description: 'Configure your own match settings',
    icon: Users,
    protocolId: 'chess',
    difficulty: 'Medium',
    matchCount: 1,
  },
]

export default function LobbyClient() {
  const router = useRouter()
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  const handleLaunchMatch = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId)
    if (!preset) return

    // For now, route to spectate page with protocol
    // In the future, this will handle bot selection and match configuration
    router.push(`/spectate?protocol=${preset.protocolId}`)
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 font-mono tracking-tight text-emerald-300">
          Arena Lobby
        </h1>
        <p className="text-muted-foreground font-mono text-sm">
          Select a preset configuration or create a custom match
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PRESETS.map((preset) => {
          const Icon = preset.icon
          const isSelected = selectedPreset === preset.id

          return (
            <Card
              key={preset.id}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/50 bg-emerald-950/20'
                  : 'hover:border-emerald-500/50 hover:bg-accent/50'
              }`}
              onClick={() => setSelectedPreset(preset.id)}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-emerald-400" />
                  <CardTitle className="text-lg font-mono">{preset.name}</CardTitle>
                </div>
                {preset.difficulty && (
                  <span className="text-xs px-2 py-1 rounded border border-emerald-500/30 bg-emerald-900/30 text-emerald-300 font-mono">
                    {preset.difficulty}
                  </span>
                )}
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4 font-mono text-sm">
                  {preset.description}
                </CardDescription>
                <div className="space-y-2 mb-4">
                  {preset.timeControl && (
                    <div className="flex justify-between text-sm font-mono">
                      <span className="text-muted-foreground">Time Control:</span>
                      <span className="text-emerald-300">{preset.timeControl}</span>
                    </div>
                  )}
                  {preset.matchCount && (
                    <div className="flex justify-between text-sm font-mono">
                      <span className="text-muted-foreground">Matches:</span>
                      <span className="text-emerald-300">{preset.matchCount}</span>
                    </div>
                  )}
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLaunchMatch(preset.id)
                  }}
                  className="w-full font-mono"
                  variant={isSelected ? 'default' : 'outline'}
                >
                  {preset.id === 'custom-chess' ? 'Configure' : 'Launch Match'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="mt-8 border-yellow-500/30 bg-yellow-900/10">
        <CardHeader>
          <CardTitle className="text-lg font-mono text-yellow-300 flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent className="font-mono text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li>Bot selection interface</li>
            <li>Advanced match configuration (time controls, handicaps, etc.)</li>
            <li>Save and load custom presets</li>
            <li>Multi-bot tournaments</li>
            <li>Spectator invites</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
