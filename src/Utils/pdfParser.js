import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker from cdnjs or local build
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Robust competitor parsing from PDF text items using geometric box grouping
 * Competitor box structure:
 * - Starts with seed item <number> (e.g. <1>, <9>, <5>, <21>)
 * - Header Y < 60; Competitors Y >= 60 and X < 250
 * - Club name: X <= 100, Y within 16px of box start
 * - Player name: X > 100, Y within 16px of box start
 */
const parseCompetitorsFromItems = (textItems) => {
    // Find all seeds (e.g. <1>, <21>) to establish the left boundary
    const seedItems = textItems.filter(it => it.y >= 60 && /^<\d+>/.test(it.text));
    
    if (seedItems.length === 0) return [];
    
    const baseOffsetX = Math.min(...seedItems.map(s => s.x));
    
    // Define dynamic X boundaries based on the base offset
    // This solves issues with brackets that are shifted to the right
    const clubNameBoundary = baseOffsetX + 50;
    const competitorMaxX = baseOffsetX + 200;

    const compItems = textItems.filter(it => it.y >= 60 && it.x < competitorMaxX);
    
    return seedItems.map(seedIt => {
        // Collect all text items belonging to this competitor box (within 16px of seedIt.y)
        const boxItems = compItems.filter(it => Math.abs(it.y - seedIt.y) <= 16);
        
        let clubStr = '';
        let nameStr = '';
        
        boxItems.forEach(it => {
            if (it.x > clubNameBoundary) {
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
        // Remove all spaces from the club name
        club = club.replace(/\s+/g, '');
        
        return {
            seed,
            club,
            name: nameStr.trim(),
            x: seedIt.x,
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

    // Sort items vertically for header detection (Top Y < 60)
    const sortedY = [...textItems].sort((a, b) => a.y - b.y);
    
    let eventName = '';
    let categoryTitle = '';
    let courtId = '';
    let matchDate = '';
    
    // Group header items by approximate Y
    const headerGroups = {};
    sortedY.forEach(item => {
        if (item.y < 60) {
            // Group by 10px height slices
            const yKey = Math.floor(item.y / 10) * 10;
            if (!headerGroups[yKey]) headerGroups[yKey] = [];
            headerGroups[yKey].push(item);
        }
    });

    const headerYKeys = Object.keys(headerGroups).map(Number).sort((a, b) => a - b);
    if (headerYKeys.length > 0) {
        // The topmost line is the event name
        const firstLineItems = headerGroups[headerYKeys[0]].sort((a, b) => a.x - b.x);
        eventName = firstLineItems.map(i => i.text).join(' ');
    }

    // Still parse Court and Category from all header items
    sortedY.forEach(item => {
        if (item.y < 60) {
            if (item.text.includes('Court:')) {
                const match = item.text.match(/Court:\s*([A-Z0-9]+)(?:\(\s*([^)]+)\))?/i);
                if (match) {
                    courtId = match[1];
                    if (match[2]) {
                        matchDate = match[2].trim();
                    }
                }
            } else if (item.text.includes('級') || item.text.includes('男子') || item.text.includes('女子') || item.text.includes('組')) {
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
        if (item.y < 60) return;
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

    // Initialize parsedMatches
    xClusters.forEach((cluster, colIndex) => {
        cluster.matches.forEach(m => {
            parsedMatches[m.matchId] = {
                config: {
                    matchId: m.matchId,
                    nextMatchId: null,
                    nextMatchSlot: null,
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

    // Frontier Merge Algorithm (Left-to-Right Topology Matching)
    // 解決 Euclidean Distance 在 X 距離過大時導致的誤判 (如 A1006 錯誤連接 A1001)
    let frontier = competitors.map(comp => ({ type: 'competitor', data: comp, y: comp.y }));
    frontier.sort((a, b) => a.y - b.y);

    for (let c = 0; c < xClusters.length; c++) {
        const cluster = xClusters[c];
        
        cluster.matches.forEach(m => {
            let bestPairIndex = -1;
            let minError = Infinity;

            // 在 Frontier 尋找最匹配的相鄰節點對 (Adjacent Pair)
            for (let i = 0; i < frontier.length - 1; i++) {
                const upper = frontier[i];
                const lower = frontier[i + 1];
                const midpoint = (upper.y + lower.y) / 2;
                const error = Math.abs(m.y - midpoint);

                if (error < minError) {
                    minError = error;
                    bestPairIndex = i;
                }
            }

            if (bestPairIndex !== -1 && minError < 40) { // 容差 40px
                const upperNode = frontier[bestPairIndex];
                const lowerNode = frontier[bestPairIndex + 1];

                // Assign Blue (Upper)
                if (upperNode.type === 'competitor') {
                    parsedMatches[m.matchId].config.competitors.blue = {
                        name: upperNode.data.name,
                        affiliatedClub: upperNode.data.club
                    };
                } else if (upperNode.type === 'match') {
                    parsedMatches[m.matchId].config.competitors.blue = {
                        name: '',
                        affiliatedClub: '',
                        previousMatch: upperNode.data.matchId
                    };
                    parsedMatches[upperNode.data.matchId].config.nextMatchId = m.matchId;
                    parsedMatches[upperNode.data.matchId].config.nextMatchSlot = 'blue';
                }

                // Assign Red (Lower)
                if (lowerNode.type === 'competitor') {
                    parsedMatches[m.matchId].config.competitors.red = {
                        name: lowerNode.data.name,
                        affiliatedClub: lowerNode.data.club
                    };
                } else if (lowerNode.type === 'match') {
                    parsedMatches[m.matchId].config.competitors.red = {
                        name: '',
                        affiliatedClub: '',
                        previousMatch: lowerNode.data.matchId
                    };
                    parsedMatches[lowerNode.data.matchId].config.nextMatchId = m.matchId;
                    parsedMatches[lowerNode.data.matchId].config.nextMatchSlot = 'red';
                }

                // 合併這對節點為一個新的 Match 節點，更新 Frontier
                const newNode = { type: 'match', data: m, y: m.y };
                frontier.splice(bestPairIndex, 2, newNode);
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
