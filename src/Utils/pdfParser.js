import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker from cdnjs or local build
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Robust competitor parsing from PDF text items using geometric box grouping
 * Competitor box structure:
 * - Starts with seed item <number> (e.g. <1>, <9>, <5>, <21>)
 * - Club name: X <= 100, Y within 16px of box start
 * - Player name: X > 100, Y within 16px of box start
 */
const parseCompetitorsFromItems = (textItems) => {
    const compItems = textItems.filter(it => it.y > 80 && it.x < 250);
    const seedItems = compItems.filter(it => it.text.startsWith('<'));
    
    return seedItems.map(seedIt => {
        // Collect all text items belonging to this competitor box (within 16px of seedIt.y)
        const boxItems = compItems.filter(it => Math.abs(it.y - seedIt.y) <= 16);
        
        let clubStr = '';
        let nameStr = '';
        
        boxItems.forEach(it => {
            if (it.x > 100) {
                nameStr += (nameStr ? ' ' : '') + it.text;
            } else {
                clubStr += (clubStr ? ' ' : '') + it.text;
            }
        });
        
        // Clean seed prefix from club string e.g. "<5> 國際跆拳道香港總會"
        const seedMatch = clubStr.match(/^<(\d+)>\s*(.+)/);
        let seed = null;
        let club = clubStr.trim();
        if (seedMatch) {
            seed = parseInt(seedMatch[1], 10);
            club = seedMatch[2].trim();
        }
        
        return {
            seed,
            club,
            name: nameStr.trim(),
            y: seedIt.y
        };
    });
};

/**
 * Parse single PDF page from HKTKDA match draw document
 */
export const parsePdfPage = async (page) => {
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    const pageHeight = viewport.height;
    
    const textItems = textContent.items.map(item => {
        const x = item.transform[4];
        const y = pageHeight - item.transform[5]; // Flip Y so top of page is Y = 0
        return {
            text: item.str.trim(),
            x,
            y,
            height: item.height,
            width: item.width
        };
    }).filter(item => item.text.length > 0);

    // Sort items vertically for header detection (Top Y < 80)
    const sortedY = [...textItems].sort((a, b) => a.y - b.y);
    
    let eventName = '';
    let categoryTitle = '';
    let courtId = '';
    let matchDate = '';
    
    sortedY.forEach(item => {
        if (item.y < 80) {
            if (item.text.includes('體育節') || item.text.includes('錦標賽') || item.text.includes('賽20')) {
                eventName = item.text;
            } else if (item.text.includes('Court:')) {
                const match = item.text.match(/Court:\s*([A-Z0-9]+)(?:\(\s*([^)]+)\))?/i);
                if (match) {
                    courtId = match[1];
                    if (match[2]) {
                        matchDate = match[2].trim();
                    }
                }
            } else if (item.text.includes('級') || item.text.includes('男子') || item.text.includes('女子')) {
                categoryTitle = item.text;
            }
        }
    });

    // Extract Competitors with Geometric Invariant Box Grouping
    const competitors = parseCompetitorsFromItems(textItems);
    competitors.sort((a, b) => a.y - b.y);

    // Extract Match IDs (e.g. A1001, A1004, B1034, A2001)
    const matchIds = [];
    textItems.forEach(item => {
        if (item.y < 80) return;
        const matchIdPattern = /^([A-Z]\d{3,4})$/;
        if (matchIdPattern.test(item.text)) {
            matchIds.push({
                matchId: item.text,
                x: item.x,
                y: item.y
            });
        }
    });

    // Group match IDs by X coordinate columns (Rounds)
    const xClusters = [];
    matchIds.sort((a, b) => a.x - b.x);
    
    matchIds.forEach(m => {
        let cluster = xClusters.find(c => Math.abs(c.x - m.x) < 25);
        if (!cluster) {
            cluster = { x: m.x, matches: [] };
            xClusters.push(cluster);
        }
        cluster.matches.push(m);
    });
    
    // Sort clusters left-to-right (Round 1 -> Round 2 -> Round 3 -> Final)
    xClusters.sort((a, b) => a.x - b.x);

    // Sort matches within each cluster top-to-bottom
    xClusters.forEach(cluster => {
        cluster.matches.sort((a, b) => a.y - b.y);
    });

    const parsedMatches = {};

    // Build Bracket Tree Relationships
    xClusters.forEach((cluster, colIndex) => {
        const nextCluster = xClusters[colIndex + 1];

        cluster.matches.forEach(m => {
            let nextMatchId = null;
            let nextMatchSlot = null;

            if (nextCluster) {
                let closestNext = null;
                let minDiff = Infinity;

                nextCluster.matches.forEach(nm => {
                    const diff = Math.abs(nm.y - m.y);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestNext = nm;
                    }
                });

                if (closestNext) {
                    nextMatchId = closestNext.matchId;
                    // Top position advances to Blue slot, Bottom position advances to Red slot
                    nextMatchSlot = m.y <= closestNext.y ? 'blue' : 'red';
                }
            }

            parsedMatches[m.matchId] = {
                config: {
                    matchId: m.matchId,
                    nextMatchId,
                    nextMatchSlot,
                    categoryTitle: categoryTitle || '',
                    matchDate: matchDate || '',
                    courtCode: courtId || '',
                    rules: {
                        maxGamjeom: 5,
                        maxPointGap: 15,
                        restDuration: 60,
                        roundDuration: 120
                    },
                    competitors: {
                        blue: { name: '', affiliatedClub: '' },
                        red: { name: '', affiliatedClub: '' }
                    }
                },
                x: m.x,
                y: m.y,
                colIndex
            };
        });
    });

    // Precision Round-Aware Competitor Assignment
    // 1. Check if there is a match in Round 1 (colIndex 0) within 30px tolerance.
    // 2. If not in Round 1, find the match in earliest subsequent round with minimum Y-distance.
    if (competitors.length > 0) {
        competitors.forEach((comp) => {
            let bestMatch = null;

            if (xClusters.length > 1 && xClusters[0].matches.length > 0) {
                let minDiff0 = Infinity;
                xClusters[0].matches.forEach(m => {
                    const diff = Math.abs(m.y - comp.y);
                    if (diff <= 30 && diff < minDiff0) {
                        minDiff0 = diff;
                        bestMatch = parsedMatches[m.matchId];
                    }
                });
            }

            if (!bestMatch) {
                let minCol = Infinity;
                let minDiff = Infinity;
                Object.values(parsedMatches).forEach(m => {
                    const diff = Math.abs(m.y - comp.y);
                    if (diff <= 140) {
                        if (m.colIndex < minCol || (m.colIndex === minCol && diff < minDiff)) {
                            minCol = m.colIndex;
                            minDiff = diff;
                            bestMatch = m;
                        }
                    }
                });
            }

            if (bestMatch) {
                if (comp.y <= bestMatch.y) {
                    bestMatch.config.competitors.blue = {
                        name: comp.name,
                        affiliatedClub: comp.club
                    };
                } else {
                    bestMatch.config.competitors.red = {
                        name: comp.name,
                        affiliatedClub: comp.club
                    };
                }
            }
        });
    }

    // Format clean matches map
    const cleanMatchesMap = {};
    Object.keys(parsedMatches).forEach(mId => {
        const m = parsedMatches[mId];
        cleanMatchesMap[mId] = {
            config: m.config,
            state: {
                isStarted: false,
                isPaused: true,
                isFinished: false,
                currentRound: 1,
                timer: m.config.rules.roundDuration,
                winnerSide: null,
                phase: 'ROUND',
                winReason: null
            },
            stats: {
                roundWins: { red: 0, blue: 0 },
                blue: { pointsStat: [0, 0, 0, 0, 0], gamjeom: 0 },
                red: { pointsStat: [0, 0, 0, 0, 0], gamjeom: 0 }
            }
        };
    });

    return {
        eventName: eventName || '跆拳道錦標賽',
        categoryTitle,
        courtId: courtId || 'court1',
        matchDate: matchDate || '未指定日期',
        matches: cleanMatchesMap
    };
};

/**
 * Main Entry Point: Parse full HKTKDA PDF file
 * Extract dates, multi-day grouping, and sub-events
 */
export const parseHktkdaPdfFile = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let globalEventName = '';
    let globalCourtId = '';
    const allMatches = {};
    const categories = [];
    const dateGroups = {};

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const pageResult = await parsePdfPage(page);
        
        if (pageResult.eventName && pageResult.eventName !== '跆拳道錦標賽') {
            globalEventName = pageResult.eventName;
        }
        if (pageResult.courtId && pageResult.courtId !== 'court1') {
            globalCourtId = pageResult.courtId;
        }
        if (pageResult.categoryTitle) {
            categories.push(pageResult.categoryTitle);
        }

        const pageDate = pageResult.matchDate || 'Day 1';
        if (!dateGroups[pageDate]) {
            dateGroups[pageDate] = {
                dateStr: pageDate,
                matches: {}
            };
        }

        Object.assign(dateGroups[pageDate].matches, pageResult.matches);
        Object.assign(allMatches, pageResult.matches);
    }

    const datesList = Object.keys(dateGroups);

    return {
        eventName: globalEventName || '第69屆體育節 - 跆拳道色帶賽2026',
        courtId: globalCourtId || 'court1',
        matchCount: Object.keys(allMatches).length,
        categories,
        datesList,
        dateGroups,
        matches: allMatches
    };
};
