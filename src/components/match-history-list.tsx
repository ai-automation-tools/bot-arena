'use client';

import { useState, useMemo } from 'react';
import { matchHistory, protocols, type Match } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Trophy, Clock, Filter, Search } from 'lucide-react';
import Link from 'next/link';

export function MatchHistoryList() {
  const [protocolFilter, setProtocolFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'duration'>('date');

  const filteredMatches = useMemo(() => {
    let filtered = [...matchHistory];

    // Filter by protocol
    if (protocolFilter !== 'all') {
      filtered = filtered.filter(match => match.protocolId === protocolFilter);
    }

    // Filter by search term (searches winner, loser, or protocol title)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(match =>
        match.winner.toLowerCase().includes(term) ||
        match.loser.toLowerCase().includes(term) ||
        match.protocolTitle.toLowerCase().includes(term)
      );
    }

    // Sort
    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === 'duration') {
      const parseDuration = (dur: string) => {
        const [mins, secs] = dur.split('m ').map(s => parseInt(s));
        return mins * 60 + secs;
      };
      filtered.sort((a, b) => parseDuration(b.duration) - parseDuration(a.duration));
    }

    return filtered;
  }, [protocolFilter, searchTerm, sortBy]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-accent/20 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5 text-accent" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Protocol Filter */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Protocol</label>
              <Select value={protocolFilter} onValueChange={setProtocolFilter}>
                <SelectTrigger className="border-accent/30">
                  <SelectValue placeholder="All Protocols" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Protocols</SelectItem>
                  {protocols.map(protocol => (
                    <SelectItem key={protocol.id} value={protocol.id}>
                      {protocol.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Sort By</label>
              <Select value={sortBy} onValueChange={(val) => setSortBy(val as 'date' | 'duration')}>
                <SelectTrigger className="border-accent/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Most Recent</SelectItem>
                  <SelectItem value="duration">Longest Duration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Bot name or protocol..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 border-accent/30"
                />
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredMatches.length} of {matchHistory.length} matches
          </div>
        </CardContent>
      </Card>

      {/* Match List */}
      {filteredMatches.length === 0 ? (
        <Card className="border-accent/20">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No matches found. Try adjusting your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMatches.map((match) => (
            <Card key={match.id} className="border-accent/20 hover:border-accent/40 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-mono">
                      {match.protocolTitle}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 text-xs">
                      <Clock className="w-3 h-3" />
                      {formatDate(match.date)} at {formatTime(match.date)}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="border-accent/40 text-accent">
                    {match.duration}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Match Result */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Winner */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-950/20 border border-green-500/30">
                      <Trophy className="w-5 h-5 text-green-400" />
                      <div className="flex-1">
                        <div className="text-sm text-muted-foreground">Winner</div>
                        <div className="font-semibold text-green-400">{match.winner}</div>
                        {match.winnerScore !== undefined && (
                          <div className="text-xs text-green-300/70">Score: {match.winnerScore}</div>
                        )}
                      </div>
                    </div>

                    {/* Loser */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-red-950/20 border border-red-500/30">
                      <div className="w-5 h-5 rounded-full border-2 border-red-400/50" />
                      <div className="flex-1">
                        <div className="text-sm text-muted-foreground">Loser</div>
                        <div className="font-semibold text-red-400">{match.loser}</div>
                        {match.loserScore !== undefined && (
                          <div className="text-xs text-red-300/70">Score: {match.loserScore}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-end">
                    <Link href={`/match-report/${match.protocolId}`}>
                      <Button variant="outline" size="sm" className="border-accent/40 hover:bg-accent/10">
                        View Match Report →
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
