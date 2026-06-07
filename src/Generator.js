export const generateTimetable = async (lessons, teachersList, classesList, timeOffs, constraints, algorithm = 'backtracking', onProgress = () => {}, lockedCards = []) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const periods = [1, 2, 3, 4, 5];
  
  const cardsToPlace = [];
  lessons.forEach(lesson => {
    const lockedForThisLesson = lockedCards.filter(c => c.lessonId === lesson.id).length;
    const remainingPeriods = lesson.periods - lockedForThisLesson;
    for (let i = 0; i < remainingPeriods; i++) {
      const ts = lesson.teachers || (lesson.teacherId ? [{id: lesson.teacherId, role: 'primary'}] : []);
      cardsToPlace.push({ 
        ...lesson, 
        teachers: ts, 
        lessonId: lesson.id,
        id: `card-${lesson.id}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        uniqueId: `${lesson.id}-${i}` 
      });
    }
  });

  const getRule = (teacherId, ruleKey) => {
    const tRule = constraints?.teachers?.[teacherId]?.[ruleKey];
    if (tRule && tRule.value !== 0) return tRule;
    return constraints?.global?.[ruleKey];
  };

  // Check if ALL teachers for a card are free
  const isFree = (day, period, cardTeachers, classId, occupied, dailyCounts) => {
    const tKey = `${day}-${period}`;
    
    // Class constraints
    if (occupied[`${day}-${period}-${classId}`]) return false;
    if ((timeOffs[classId] || []).includes(tKey)) return false;

    // Teacher constraints
    for (const t of cardTeachers) {
      if (occupied[`${day}-${period}-${t.id}`]) return false;
      if ((timeOffs[t.id] || []).includes(tKey)) return false;
      const maxC = getRule(t.id, 'maxClassesPerDay');
      if (maxC && maxC.isStrict && (dailyCounts[`${day}-${t.id}`] || 0) >= maxC.value) return false;
    }
    
    return true;
  };

  const markOccupied = (card, day, period, occupied, dailyCounts, val) => {
    occupied[`${day}-${period}-${card.classId}`] = val;
    card.teachers.forEach(t => {
      occupied[`${day}-${period}-${t.id}`] = val;
      if (dailyCounts) {
         if (val) dailyCounts[`${day}-${t.id}`] = (dailyCounts[`${day}-${t.id}`] || 0) + 1;
         else dailyCounts[`${day}-${t.id}`]--;
      }
    });
  };

  // --- GREEDY ENGINE ---
  if (algorithm === 'greedy') {
    const occupied = {};
    const generatedCards = [...lockedCards];
    lockedCards.forEach(c => markOccupied(c, c.day, c.period, occupied, null, true));
    let unplacedCount = 0;
    
    for (const card of cardsToPlace) {
      let placed = false;
      for (const day of days) {
        if (placed) break;
        for (const period of periods) {
          if (isFree(day, period, card.teachers, card.classId, occupied, {})) {
            generatedCards.push({
              ...card,
              day, 
              period
            });
            markOccupied(card, day, period, occupied, null, true);
            placed = true;
            break;
          }
        }
      }
      if (!placed) {
        unplacedCount++;
        generatedCards.push({
          ...card,
          day: null, 
          period: null
        });
      }
      
      // Yield for UI update
      if (onProgress) onProgress({ type: 'Greedy', current: unplacedCount, text: `Placing cards...` });
      await new Promise(r => setTimeout(r, 20));
    }
    return { cards: generatedCards, unplacedCount, timeout: false, type: 'Greedy' };
  }

  // --- ADVANCED HEURISTIC ENGINE (Iterative Repair / Min-Conflicts) ---
  if (algorithm === 'backtracking') {
    const START_TIME = Date.now();
    let lastYieldTime = START_TIME;
    let bestSolution = [...lockedCards];
    let bestUnplacedQueue = [...cardsToPlace].map(c => ({...c, day: null, period: null}));
    let bestUnplacedCount = cardsToPlace.length;
    let iterations = 0;

    // 1. Planning Ahead: Calculate difficulty (MRV)
    // Teachers with many classes are harder to place
    const teacherLoad = {};
    cardsToPlace.forEach(c => {
      c.teachers.forEach(t => {
        teacherLoad[t.id] = (teacherLoad[t.id] || 0) + 1;
      });
    });
    
    // Sort cardsToPlace: hardest first
    const sortedCards = [...cardsToPlace].sort((a, b) => {
      const loadA = a.teachers.reduce((sum, t) => sum + (teacherLoad[t.id] || 0), 0);
      const loadB = b.teachers.reduce((sum, t) => sum + (teacherLoad[t.id] || 0), 0);
      return loadB - loadA; // Higher load first
    });

    let currentPlacements = [...lockedCards];
    const occupied = {};
    const dailyCounts = {};
    lockedCards.forEach(c => markOccupied(c, c.day, c.period, occupied, dailyCounts, true));
    
    let unplacedQueue = [...sortedCards];
    const bumpCounts = {}; // Track how many times a card has been bumped (Tabu mechanism)

    while ((Date.now() - START_TIME) < 8000 && unplacedQueue.length > 0) {
      iterations++;
      
      if (Date.now() - lastYieldTime > 100) {
        lastYieldTime = Date.now();
        const elapsed = lastYieldTime - START_TIME;
        const remainingTime = Math.max(0, (8000 - elapsed));
        const etaSec = (remainingTime / 1000).toFixed(1);
        
        onProgress({ 
          type: 'Advanced Iterative Repair', 
          current: iterations, 
          total: null,
          text: `Resolving conflicts... (Best: ${cardsToPlace.length - bestUnplacedCount} placed)`,
          eta: `${etaSec}s remaining`
        });
        await new Promise(r => setTimeout(r, 15)); // 15ms guarantees browser paint cycle
      }

      const card = unplacedQueue.shift();
      let bestSlot = null;
      let minConflicts = 9999;
      let bestConflicts = [];

      // Find the best slot (least bumps)
      const dayOrder = days.slice().sort(() => Math.random() - 0.5); // Add some randomness to tie-breaking
      const periodOrder = periods.slice().sort(() => Math.random() - 0.5);

      for (const day of dayOrder) {
        for (const period of periodOrder) {
          const tKey = `${day}-${period}`;
          
          // Hard constraints that cannot be bumped (TimeOffs and Locked Cards)
          let valid = true;
          if ((timeOffs[card.classId] || []).includes(tKey)) valid = false;
          for (const t of card.teachers) {
            if ((timeOffs[t.id] || []).includes(tKey)) valid = false;
            const maxC = getRule(t.id, 'maxClassesPerDay');
            if (maxC && maxC.isStrict) {
               const hasCardInSlot = occupied[`${day}-${period}-${t.id}`];
               // If placing here increases the daily count, check the limit
               if (!hasCardInSlot && (dailyCounts[`${day}-${t.id}`] || 0) >= maxC.value) {
                   valid = false;
               }
            }
          }
          if (!valid) continue;

          // Check existing cards in this slot that would need bumping
          const conflictingCards = [];
          for (const placed of currentPlacements) {
            if (placed.day !== day || placed.period !== period) continue;
            
            // Is there a collision?
            let collision = false;
            if (placed.classId === card.classId) collision = true;
            for (const t of card.teachers) {
              if (placed.teachers.some(pt => pt.id === t.id)) collision = true;
            }
            
            if (collision) {
               // We cannot bump locked cards!
               if (lockedCards.some(lc => lc.id === placed.id)) {
                  valid = false;
                  break; 
               }
               conflictingCards.push(placed);
            }
          }
          
          if (!valid) continue;

          // Tabu penalty: if bumping a card that has been bumped a lot recently, penalize this slot
          let penalty = conflictingCards.length;
          conflictingCards.forEach(cc => {
            penalty += (bumpCounts[cc.id] || 0) * 0.5; // Avoid bumping the same cards repeatedly
          });

          if (penalty < minConflicts) {
            minConflicts = penalty;
            bestSlot = { day, period };
            bestConflicts = conflictingCards;
          }
        }
      }

      if (bestSlot) {
        // Bump conflicting cards
        bestConflicts.forEach(bc => {
           // Remove from current placements
           const idx = currentPlacements.findIndex(p => p.id === bc.id);
           if (idx > -1) currentPlacements.splice(idx, 1);
           markOccupied(bc, bc.day, bc.period, occupied, dailyCounts, false);
           
           // Update bump count
           bumpCounts[bc.id] = (bumpCounts[bc.id] || 0) + 1;
           
           // Put back in unplaced queue
           unplacedQueue.push(bc);
        });

        // Place new card
        card.day = bestSlot.day;
        card.period = bestSlot.period;
        currentPlacements.push(card);
        markOccupied(card, card.day, card.period, occupied, dailyCounts, true);
        
      } else {
        // Absolutely nowhere to put it (all slots blocked by locked cards/timeoffs)
        // Push it back to the end of the queue to try other cards first
        unplacedQueue.push(card);
      }

      if (unplacedQueue.length < bestUnplacedCount) {
        bestUnplacedCount = unplacedQueue.length;
        bestSolution = currentPlacements.map(c => ({...c})); // deep copy
        bestUnplacedQueue = unplacedQueue.map(c => ({...c, day: null, period: null}));
      }

      if (bestUnplacedCount === 0) break; // Perfect!
    }

    return { cards: [...bestSolution, ...bestUnplacedQueue], unplacedCount: bestUnplacedCount, timeout: bestUnplacedCount > 0, type: 'Advanced Iterative Repair' };
  }

  // --- GENETIC / EVOLUTIONARY ENGINE ---
  if (algorithm === 'genetic') {
    const START_TIME = Date.now();
    const POPULATION_SIZE = 50;
    let bestIndividual = { cards: [], fitness: -999999 };

    const evaluateFitness = (indCards) => {
      let fitness = 0;
      let placedCount = 0;
      const occ = {};
      const tCounts = {};

      // Pre-fill occupied array with locked cards
      lockedCards.forEach(c => {
        if (!c.day) return;
        const keyC = `${c.day}-${c.period}-${c.classId}`;
        const tKey = `${c.day}-${c.period}`;
        occ[keyC] = true;
        c.teachers.forEach(t => {
           occ[`${c.day}-${c.period}-${t.id}`] = true;
           tCounts[`${c.day}-${t.id}`] = (tCounts[`${c.day}-${t.id}`] || 0) + 1;
        });
      });

      indCards.forEach(c => {
        if (!c.day) return;
        placedCount++;
        const keyC = `${c.day}-${c.period}-${c.classId}`;
        const tKey = `${c.day}-${c.period}`;
        
        if (occ[keyC]) fitness -= 1000;
        if ((timeOffs[c.classId] || []).includes(tKey)) fitness -= 1000;
        occ[keyC] = true;

        c.teachers.forEach(t => {
           const keyT = `${c.day}-${c.period}-${t.id}`;
           if (occ[keyT]) fitness -= 1000;
           if ((timeOffs[t.id] || []).includes(tKey)) fitness -= 1000;
           occ[keyT] = true;
           tCounts[`${c.day}-${t.id}`] = (tCounts[`${c.day}-${t.id}`] || 0) + 1;

           // Soft Penalties
           const prefs = constraints?.teachers?.[t.id]?.timePreferences || {};
           if (prefs[tKey] === 'avoid') fitness -= 50;
           if (prefs[tKey] === 'prefer') fitness += 10;
        });
      });

      fitness -= (cardsToPlace.length - placedCount) * 500;

      for (const [key, count] of Object.entries(tCounts)) {
        const [day, tId] = key.split('-');
        const rule = getRule(tId, 'maxClassesPerDay');
        if (rule && count > rule.value) fitness -= rule.isStrict ? 1000 : 100;
      }
      return fitness;
    };

    const createRandomIndividual = () => {
      const ind = [];
      cardsToPlace.forEach(card => {
        const pDay = days[Math.floor(Math.random() * days.length)];
        const pPeriod = periods[Math.floor(Math.random() * periods.length)];
        ind.push({ ...card, day: pDay, period: pPeriod });
      });
      return ind;
    };

    let population = Array.from({ length: POPULATION_SIZE }, createRandomIndividual);

    let gen = 0;
    let lastYieldTime = START_TIME;
    
    while ((Date.now() - START_TIME) < 5000) {
      gen++;
      
      if (Date.now() - lastYieldTime > 100) {
        lastYieldTime = Date.now();
        const elapsed = lastYieldTime - START_TIME;
        const remainingTime = Math.max(0, (5000 - elapsed));
        const etaSec = (remainingTime / 1000).toFixed(1);
        
        onProgress({ 
          type: 'Genetic Algorithm', current: gen, 
          text: `Evolving Gen ${gen}... Best Fitness: ${bestIndividual.fitness}`, eta: `${etaSec}s remaining`
        });
        await new Promise(r => setTimeout(r, 15)); // 15ms guarantees browser paint cycle
      }

      const evaluated = population.map(cards => ({ cards, fitness: evaluateFitness(cards) }));
      evaluated.sort((a, b) => b.fitness - a.fitness);

      if (evaluated[0].fitness > bestIndividual.fitness) bestIndividual = evaluated[0];
      if (bestIndividual.fitness >= 0) break;

      const survivors = evaluated.slice(0, Math.floor(POPULATION_SIZE * 0.2)).map(e => e.cards);
      population = [];
      while (population.length < POPULATION_SIZE) {
        const parentA = survivors[Math.floor(Math.random() * survivors.length)];
        const parentB = survivors[Math.floor(Math.random() * survivors.length)];
        
        const child = [];
        for (let i = 0; i < cardsToPlace.length; i++) {
          let inheritedCard = Math.random() > 0.5 ? parentA[i] : parentB[i];
          if (Math.random() < 0.10) {
             inheritedCard = { ...inheritedCard, day: days[Math.floor(Math.random() * days.length)], period: periods[Math.floor(Math.random() * periods.length)] };
          }
          child.push(inheritedCard);
        }
        population.push(child);
      }
    }

    const finalCards = [...lockedCards];
    const occ = {};
    lockedCards.forEach(c => {
       occ[`${c.day}-${c.period}-${c.classId}`] = true;
       c.teachers.forEach(t => occ[`${c.day}-${c.period}-${t.id}`] = true);
    });

    bestIndividual.cards.forEach(c => {
        const keyC = `${c.day}-${c.period}-${c.classId}`;
        const tKey = `${c.day}-${c.period}`;
        const isClassTimeOff = (timeOffs[c.classId] || []).includes(tKey);

        let valid = !occ[keyC] && !isClassTimeOff;
        c.teachers.forEach(t => {
            const keyT = `${c.day}-${c.period}-${t.id}`;
            if (occ[keyT] || (timeOffs[t.id] || []).includes(tKey)) valid = false;
        });

        if (valid) {
            occ[keyC] = true;
            c.teachers.forEach(t => occ[`${c.day}-${c.period}-${t.id}`] = true);
            finalCards.push(c);
        }
    });

    return { cards: finalCards, unplacedCount: cardsToPlace.length - finalCards.length, timeout: bestIndividual.fitness < 0, type: `Genetic (Gen ${gen})` };
  }
};
