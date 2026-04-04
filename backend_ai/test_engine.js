const prompts = [
  // Existing regression tests
  "A dense coastal city with towering commercial skyscrapers and modern high-tech layout.",
  "A large industrial logging operation bordering a vertical river. Low density housing.",
  "A massive residential suburb surrounding a beautiful central lake.",
  // Guide example inputs (Section 1)
  "Design a 10 acre eco friendly city with parks, hospitals, low traffic and commercial zones",
  "Build a smart urban area with healthcare, green spaces, high density housing and balanced traffic",
  // School placement test
  "A city with schools near residential areas and commercial zones",
  // Edge case: minimal input
  "city",
];

async function runCriticalTest() {
  console.log("=== INITIATING CRITICAL ENGINE AUDIT ===");
  for (let i = 0; i < prompts.length; i++) {
    console.log(`\nTEST #${i+1}: "${prompts[i]}"`);
    
    try {
      const start = Date.now();
      const res = await fetch('http://localhost:3001/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompts[i], saveToHistory: false })
      });
      
      if (!res.ok) {
        console.log(`❌ HTTP Error: ${res.status}`);
        console.log(await res.text());
        continue;
      }
      
      const payload = await res.json();
      const grid = payload.layoutData;
      const intent = payload.normalizedIntent;
      
      console.log(`✅ Server Responded in ${Date.now() - start}ms`);
      if (intent) {
        console.log(`[INTENT]: gridSize=${intent.gridSize}, density=${intent.density}, traffic=${intent.trafficLevel}, eco=${intent.eco}, smart=${intent.smart}, fallback=${intent.usedFallback}`);
      }
      
      // 1. Grid Size Test — should be square N×N matching intent
      const rows = grid.length;
      const cols = grid[0]?.length || 0;
      const isSquare = grid.every(row => row.length === cols);
      const expectedSize = intent?.gridSize || 20;
      const sizeMatch = rows === expectedSize && cols === expectedSize;
      console.log(`[DIMENSION TEST]: ${rows}×${cols} ${isSquare ? '(square)' : '(NOT square)'} ${sizeMatch ? 'MATCH' : `EXPECTED ${expectedSize}×${expectedSize}`}`);
      
      // 2. Road Graph Test (No isolated nodes)
      let isolatedRoads = 0;
      let totalRoads = 0;
      const getAt = (x, y) => grid[y]?.[x]?.type;
      
      grid.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell.type === 'road') {
            totalRoads++;
            let neighbors = [getAt(x-1,y), getAt(x+1,y), getAt(x,y-1), getAt(x,y+1)];
            if (!neighbors.includes('road')) isolatedRoads++;
          }
        });
      });
      console.log(`[ROAD GRAPH TEST]: ${isolatedRoads === 0 ? 'PASS' : `FAIL - ${isolatedRoads} isolated roads`} (${totalRoads} total roads)`);
      
      // 3. Zone Distribution
      let counts = {};
      grid.flat().forEach(c => counts[c.type] = (counts[c.type] || 0) + 1);
      console.log(`[DISTRIBUTION]: `, counts);

      // 4. School zone check (for school-specific test)
      if (prompts[i].toLowerCase().includes('school')) {
        const hasSchool = counts['school'] > 0;
        console.log(`[SCHOOL ZONE TEST]: ${hasSchool ? 'PASS' : 'FAIL - no school cells found'}`);
      }

      // 5. Hospital zone check (for hospital-specific test)
      if (prompts[i].toLowerCase().includes('hospital') || prompts[i].toLowerCase().includes('healthcare')) {
        const hasHospital = counts['hospital'] > 0;
        console.log(`[HOSPITAL ZONE TEST]: ${hasHospital ? 'PASS' : 'FAIL - no hospital cells found'}`);
      }

      // 6. Eco check — should have parks
      if (prompts[i].toLowerCase().includes('eco')) {
        const hasPark = counts['park'] > 0;
        console.log(`[ECO PARKS TEST]: ${hasPark ? 'PASS' : 'FAIL - eco city has no parks'}`);
      }
      
    } catch(e) {
      console.error("❌ Exception: ", e.message);
    }
  }
}

runCriticalTest();
