import React, { useMemo } from 'react';
import './TournamentBracket.css';

const MatchCard = ({ matchData }) => {
    if (!matchData) {
        return (
            <div className="match-card empty-card">
                <div className="match-card-content">TBD</div>
            </div>
        );
    }

    const { config } = matchData;
    const matchId = config.matchId;
    
    // Get display names
    const getDisplayText = (competitor) => {
        if (!competitor.name && !competitor.affiliatedClub && competitor.previousMatch) {
            return `Winner of ${competitor.previousMatch}`;
        }
        if (competitor.affiliatedClub) {
            return `${competitor.name} (${competitor.affiliatedClub})`;
        }
        return competitor.name || 'TBD';
    };

    const blueName = getDisplayText(config.competitors.blue);
    const redName = getDisplayText(config.competitors.red);

    return (
        <div className="match-card">
            <div className="match-card-header">
                <span className="match-id">{matchId}</span>
            </div>
            <div className="match-competitors">
                <div className="competitor blue-side">
                    <span className="competitor-name">{blueName}</span>
                </div>
                <div className="competitor red-side">
                    <span className="competitor-name">{redName}</span>
                </div>
            </div>
        </div>
    );
};

const BracketNode = ({ node, isRoot }) => {
    if (!node) return null;

    const hasChildren = node.blueChild || node.redChild;

    return (
        <div className="bracket-node">
            {hasChildren && (() => {
                const isBlueFinished = node.blueChild?.matchData?.state?.winnerSide != null;
                const isRedFinished = node.redChild?.matchData?.state?.winnerSide != null;
                const isBlueReady = !node.blueChild || isBlueFinished;
                const isRedReady = !node.redChild || isRedFinished;

                return (
                    <div className="bracket-children">
                        <div className={`bracket-child blue-slot ${!node.blueChild ? 'is-empty' : ''} ${isBlueFinished ? 'is-finished' : ''}`}>
                            {node.blueChild ? (
                                <BracketNode node={node.blueChild} isRoot={false} />
                            ) : (
                                // Placeholder if there's no child but the red side has one
                                <div className="bracket-node placeholder">
                                    <div className="bracket-match"><MatchCard matchData={null} /></div>
                                </div>
                            )}
                        </div>
                        <div className={`bracket-child red-slot ${!node.redChild ? 'is-empty' : ''} ${isRedFinished ? 'is-finished' : ''}`}>
                            {node.redChild ? (
                                <BracketNode node={node.redChild} isRoot={false} />
                            ) : (
                                <div className="bracket-node placeholder">
                                    <div className="bracket-match"><MatchCard matchData={null} /></div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
            
            <div className={`bracket-match ${hasChildren ? 'has-children' : ''} ${node.blueChild || node.redChild ? (() => {
                const isBlueReady = !node.blueChild || node.blueChild.matchData?.state?.winnerSide != null;
                const isRedReady = !node.redChild || node.redChild.matchData?.state?.winnerSide != null;
                return (isBlueReady && isRedReady) ? 'is-ready' : '';
            })() : ''}`}>
                <MatchCard matchData={node.matchData} />
            </div>
        </div>
    );
};

const TournamentBracket = ({ matches }) => {
    // Build tree structure
    const trees = useMemo(() => {
        if (!matches || Object.keys(matches).length === 0) return [];

        const matchMap = {};
        Object.values(matches).forEach(m => {
            matchMap[m.config.matchId] = {
                matchData: m,
                blueChild: null,
                redChild: null,
                isRoot: true // Assume root until proven otherwise
            };
        });

        // Link children
        Object.values(matchMap).forEach(node => {
            const m = node.matchData;
            
            // 1. Link via previousMatch (Backward linking)
            const bluePrev = m.config.competitors?.blue?.previousMatch;
            const redPrev = m.config.competitors?.red?.previousMatch;

            if (bluePrev && matchMap[bluePrev]) {
                node.blueChild = matchMap[bluePrev];
                matchMap[bluePrev].isRoot = false;
            }
            if (redPrev && matchMap[redPrev]) {
                node.redChild = matchMap[redPrev];
                matchMap[redPrev].isRoot = false;
            }

            // 2. Link via nextMatchId (Forward linking) - more robust fallback
            const nextMatchId = m.config.nextMatchId;
            const nextMatchSlot = m.config.nextMatchSlot?.toLowerCase();
            
            if (nextMatchId && matchMap[nextMatchId]) {
                node.isRoot = false; // This node points to another, so it's not a root
                
                if (nextMatchSlot === 'blue') {
                    matchMap[nextMatchId].blueChild = node;
                } else if (nextMatchSlot === 'red') {
                    matchMap[nextMatchId].redChild = node;
                } else {
                    // Fallback if slot is undefined: fill blue then red
                    if (!matchMap[nextMatchId].blueChild) {
                        matchMap[nextMatchId].blueChild = node;
                    } else if (!matchMap[nextMatchId].redChild) {
                        matchMap[nextMatchId].redChild = node;
                    }
                }
            }
        });

        const roots = Object.values(matchMap).filter(node => node.isRoot);
        return roots;
    }, [matches]);

    if (trees.length === 0) {
        return <div className="tournament-bracket-empty">No bracket data available.</div>;
    }

    return (
        <div className="tournament-bracket-container">
            {trees.map((rootNode, index) => (
                <div key={index} className="bracket-tree-wrapper">
                    <BracketNode node={rootNode} isRoot={true} />
                </div>
            ))}
        </div>
    );
};

export default TournamentBracket;
