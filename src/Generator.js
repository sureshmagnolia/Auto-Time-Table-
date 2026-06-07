export const generateTimetable = async (lessons, teachersList, classesList, timeOffs, constraints, algorithm = 'backtracking', onProgress = () => {}) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const periods = [1, 2, 3, 4, 5];
  
  const cardsToPlace = [];
  lessons.forEach(lesson => {
    for (let i = 0; i < lesson.periods; i++) {
      const ts = lesson.teachers || (lesson.teacherId ? [{id: lesson.teacherId, role: 'primary'}] : []);
      cardsToPlace.push({ ...lesson, teachers: ts, uniqueId: `${lesson.id}-${i}` });
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
    const generatedCards = [];
    let unplacedCount = 0;
    
    for (const card of cardsToPlace) {
      let placed = false;
      for (const day of days) {
        if (placed) break;
        for (const period of periods) {
          if (isFree(day, period, card.teachers, card.classId, occupied, {})) {
            generatedCards.push({
              id: Date.now().toString() + Math.random().toString(),
              lessonId: card.id, teachers: card.teachers, classId: card.classId, subjectId: card.subjectId, day, period
            });
            markOccupied(card, day, period, occupied, null, true);
            placed = true;
            break;
          }
        }
      }
      if (!placed) unplacedCount++;
      
      // Yield for UI update
      if (onProgress) onProgress({ type: 'Greedy', current: unplacedCount, text: `Placing cards...` });
      await new Promise(r => setTimeout(r, 20));
    }
    return { cards: generatedCards, unplacedCount, timeout: false, type: 'Greedy' };
  }

  // --- STOCHASTIC HEURISTIC ENGINE (Replaces traditional backtracking) ---
  if (algorithm === 'backtracking') {
    const START_TIME = Date.now();
    let lastYieldTime = START_TIME;
    let bestSolution = [];
    let bestUnplacedCount = 9999;
    let iterations = 0;

    const shuffleArray = (array) => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    while ((Date.now() - START_TIME) < 3000) {
      iterations++;
      
      if (Date.now() - lastYieldTime > 100) {
        lastYieldTime = Date.now();
        const elapsed = lastYieldTime - START_TIME;
        const remainingTime = Math.max(0, (3000 - elapsed));
        const etaSec = (remainingTime / 1000).toFixed(1);
        
        onProgress({ 
          type: 'Advanced Heuristic Search', 
          current: iterations, 
          total: null,
          text: `Exploring timetable combinations... (Best: ${cardsToPlace.length - bestUnplacedCount} placed)`,
          eta: `${etaSec}s remaining`
        });
        await new Promise(r => setTimeout(r, 15)); // 15ms guarantees browser paint cycle
      }

      const occupied = {};
      const dailyCounts = {};
      const currentPlacements = [];
      let unplacedCount = 0;
      
      // Shuffle cards to explore different placement paths
      const randomizedCards = shuffleArray(cardsToPlace);

      for (const card of randomizedCards) {
        let placed = false;
        
        // Randomize days/periods to avoid deterministic traps
        const randDays = shuffleArray(days);
        const randPeriods = shuffleArray(periods);

        for (const day of randDays) {
          if (placed) break;
          for (const period of randPeriods) {
            if (isFree(day, period, card.teachers, card.classId, occupied, dailyCounts)) {
              currentPlacements.push({
                id: Math.random().toString(),
                lessonId: card.id, teachers: card.teachers, classId: card.classId, subjectId: card.subjectId, day, period
              });
              markOccupied(card, day, period, occupied, dailyCounts, true);
              placed = true;
              break;
            }
          }
        }
        if (!placed) unplacedCount++;
      }

      if (unplacedCount < bestUnplacedCount) {
        bestUnplacedCount = unplacedCount;
        bestSolution = [...currentPlacements];
      }

      if (bestUnplacedCount === 0) break; // Perfect score!
    }

    return { cards: bestSolution, unplacedCount: bestUnplacedCount, timeout: bestUnplacedCount > 0, type: 'Advanced Heuristic' };
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
        ind.push({ ...card, day: pDay, period: pPeriod, id: Math.random().toString() });
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

    const finalCards = [];
    const occ = {};
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
