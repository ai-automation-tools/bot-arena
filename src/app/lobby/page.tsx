import { Metadata } from 'next'
import LobbyClient from '@/components/LobbyClient'

export const metadata: Metadata = {
  title: 'Arena Lobby',
  description: 'Configure and launch bot matches with preset configurations',
}

export default function LobbyPage() {
  return <LobbyClient />
}
