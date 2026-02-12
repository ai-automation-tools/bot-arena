# Bot Arena Retro - Planning

**Last Updated:** 2026-02-09

---

## 🗺️ Roadmap

### Phase 1: MVP (Minimum Viable Product)
**Target:** 2026-03-31

- [ ] Arena lobby and presets
- [ ] Bot submission and validation
- [ ] Match runner and replay
- [ ] Basic documentation
- [ ] Initial deployment

### Phase 2: Enhancement
**Target:** 2026-05-31

- [ ] Leaderboards and match analytics
- [ ] Performance and rendering polish
- [ ] Performance optimization
- [ ] Extended documentation

### Phase 3: Scale
**Target:** 2026-07-31

- [ ] Scalability improvements
- [ ] Tournaments and seasons
- [ ] Analytics & monitoring
- [ ] Community features (if applicable)

---

## 📋 Backlog

### High Priority
- [ ] Define bot submission format and validation rules
- [ ] Implement match results summary UI
- [ ] Replace hardcoded admin password with env-based check

### Medium Priority
- [ ] Add match history list with filters
- [ ] Add replay controls and speed toggles
- [ ] Add protocol details page

### Low Priority
- [ ] Add retro sound effects toggle
- [ ] Add shareable match links
- [ ] Add protocol badges and difficulty icons

---

## 🎯 Milestones

### Milestone 1: MVP Core Loop
**Target Date:** 2026-03-31  
**Status:** Not Started

- [ ] Two-bot match with replay
- [ ] Results summary page

### Milestone 2: Enhanced UX
**Target Date:** 2026-05-31  
**Status:** Not Started

- [ ] Leaderboards and match history
- [ ] Arena presets and rule tweaks

---

## 📊 Sprint Planning (if applicable)

### Current Sprint: Protocol Marketplace MVP
**Start:** 2026-02-10  
**End:** 2026-02-14 (5 days)

**Goal:** Ship working Protocol Marketplace with basic selection and match initiation

**Daily Tasks:**

**Mon Feb 10 - Foundation**
- [ ] Set up basic marketplace page structure and routing
- [ ] Create protocol card component with retro styling
- [ ] Add static protocol data (3-5 sample protocols)

**Tue Feb 11 - Interactivity**
- [ ] Add protocol selection state management
- [ ] Implement protocol details drawer/modal
- [ ] Add "Select Protocol" button and flow

**Wed Feb 12 - Integration**
- [ ] Wire up protocol selection to match configuration
- [ ] Connect marketplace → match launcher
- [ ] Test end-to-end protocol selection → match start

**Thu Feb 13 - Polish**
- [ ] Add protocol difficulty badges
- [ ] Add hover states and animations
- [ ] Add empty states and loading indicators

**Fri Feb 14 - Ship**
- [ ] Final QA and bug fixes
- [ ] Update README with Protocol Marketplace docs
- [ ] Deploy to Vercel
- [ ] Create PR and merge

---

## 💡 Ideas & Future Features

- Live spectator mode with chat
- Bot customization skins
- Arcade-style tournaments

---

## 🗓️ Daily Update Queue (First 10)

- [x] Add protocol details drawer in marketplace
- [ ] Add empty state for match-report when AI audit fails
- [ ] Add loading skeletons for spectate view
- [ ] Add protocol difficulty badges in cards
- [ ] Add keyboard shortcuts for spectate controls
- [ ] Add toggle to hide event log
- [ ] Add match-report share button
- [ ] Add favicon and title polish
- [ ] Add admin password via env var
- [ ] Add lint/typecheck badges to README

---

## 📝 Notes

- Dates are targets and may shift once repo is reviewed
