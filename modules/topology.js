// modules/topology.js - Topological Indexing and Mapping System for The Council
// Structures and indexes story data for efficient querying and relationship tracking

const CouncilTopology = {
  // ===== STATE =====
  _maps: null,
  _graphs: null,
  _initialized: false,

  // ===== INITIALIZATION =====
  init() {
    this._maps = this.getEmptyMaps();
    this._graphs = this.getEmptyGraphs();
    this._initialized = true;
    return this;
  },

  getEmptyMaps() {
    return {
      story: new Map(), // Story structure and beats
      lore: new Map(), // World lore and rules
      characters: new Map(), // Character data and traits
      scenes: new Map(), // Scene details
      locations: new Map(), // Location data
      timeline: new Map(), // Chronological events
      keywords: new Map(), // Keyword to entity mapping
    };
  },

  getEmptyGraphs() {
    return {
      relationships: new Graph(), // Entity relationships
      plotDependencies: new Graph(), // Plot thread dependencies
      locationGraph: new Graph(), // Location connections
      characterGraph: new Graph(), // Character interactions
      causalChain: new Graph(), // Cause and effect
    };
  },

  // ===== STORY TOPOLOGY =====
  // Handles plot structure, narrative beats, and story arcs

  storyTopology: {
    /**
     * Index a plot line
     */
    indexPlotLine(topology, plotLine) {
      const key = `plot_${plotLine.id}`;
      topology._maps.story.set(key, {
        id: plotLine.id,
        type: "plotLine",
        data: plotLine,
        connections: {
          characters: plotLine.relatedCharacters || [],
          locations: plotLine.relatedLocations || [],
          scenes: [],
        },
        metadata: {
          status: plotLine.status,
          plotType: plotLine.type,
          indexedAt: Date.now(),
        },
      });

      // Index keywords
      topology.indexKeywords(plotLine.name, key);
      topology.indexKeywords(plotLine.description, key);

      return key;
    },

    /**
     * Index a story beat
     */
    indexBeat(topology, beat) {
      const key = `beat_${beat.id || topology.generateId()}`;
      topology._maps.story.set(key, {
        id: beat.id,
        type: "beat",
        data: beat,
        connections: {
          plotLine: beat.plotLineId,
          scene: beat.sceneId,
          characters: beat.characters || [],
        },
        metadata: {
          beatType: beat.type, // setup, confrontation, resolution, etc.
          tension: beat.tension,
          indexedAt: Date.now(),
        },
      });

      return key;
    },

    /**
     * Build story arc structure
     */
    buildArcStructure(topology, plotLines) {
      const arcs = {
        macro: [], // Overall story arcs
        micro: [], // Scene-level arcs
        active: [], // Currently active threads
        resolved: [], // Completed threads
        stalled: [], // Threads that need attention
      };

      for (const plot of plotLines) {
        const arcEntry = {
          id: plot.id,
          name: plot.name,
          status: plot.status,
          timeline: plot.timeline || [],
          tension: topology.calculatePlotTension(plot),
        };

        if (plot.type === "macro") {
          arcs.macro.push(arcEntry);
        } else {
          arcs.micro.push(arcEntry);
        }

        switch (plot.status) {
          case "active":
            arcs.active.push(arcEntry);
            break;
          case "resolved":
            arcs.resolved.push(arcEntry);
            break;
          case "stalled":
          case "inactive":
            arcs.stalled.push(arcEntry);
            break;
        }
      }

      return arcs;
    },

    /**
     * Get narrative momentum analysis
     */
    analyzeNarrativeMomentum(topology, recentScenes, plotLines) {
      const analysis = {
        overallTension: 0,
        activePlotCount: 0,
        progressingPlots: [],
        stalledPlots: [],
        recommendations: [],
      };

      const activePlots = plotLines.filter((p) => p.status === "active");
      analysis.activePlotCount = activePlots.length;

      // Calculate overall tension from recent scenes
      if (recentScenes && recentScenes.length > 0) {
        const tensions = recentScenes.map((s) => s.tension || 5);
        analysis.overallTension =
          tensions.reduce((a, b) => a + b, 0) / tensions.length;
      }

      // Check plot progression
      for (const plot of activePlots) {
        const timeline = plot.timeline || [];
        const recentActivity = timeline.filter(
          (t) => Date.now() - t.timestamp < 3600000, // Last hour
        );

        if (recentActivity.length > 0) {
          analysis.progressingPlots.push(plot.name);
        } else {
          analysis.stalledPlots.push(plot.name);
        }
      }

      // Generate recommendations
      if (analysis.overallTension < 3) {
        analysis.recommendations.push(
          "Consider introducing conflict or tension",
        );
      }
      if (analysis.stalledPlots.length > 2) {
        analysis.recommendations.push(
          `Progress stalled plots: ${analysis.stalledPlots.join(", ")}`,
        );
      }
      if (analysis.activePlotCount > 5) {
        analysis.recommendations.push(
          "Consider resolving some active plot threads",
        );
      }

      return analysis;
    },
  },

  // ===== LORE TOPOLOGY =====
  // Handles world-building, rules, and established facts

  loreTopology: {
    /**
     * Index a world info entry
     */
    indexWorldInfo(topology, entry) {
      const key = `lore_${entry.uid || topology.generateId()}`;
      const category = this.categorizeEntry(entry);

      topology._maps.lore.set(key, {
        id: entry.uid,
        type: "worldInfo",
        category,
        data: {
          content: entry.content,
          keys: entry.key || [],
          comment: entry.comment,
          priority: entry.order || 0,
        },
        connections: {
          relatedEntries: [],
          characters: [],
          locations: [],
        },
        metadata: {
          enabled: !entry.disable,
          constant: entry.constant || false,
          indexedAt: Date.now(),
        },
      });

      // Index by keywords
      const keys = entry.key || [];
      for (const k of keys) {
        topology.indexKeywords(k, key);
      }
      topology.indexKeywords(entry.content, key);

      return key;
    },

    /**
     * Categorize a world info entry
     */
    categorizeEntry(entry) {
      const comment = (entry.comment || "").toLowerCase();
      const content = (entry.content || "").toLowerCase();

      if (comment.includes("character") || comment.includes("person")) {
        return "character";
      }
      if (comment.includes("location") || comment.includes("place")) {
        return "location";
      }
      if (comment.includes("faction") || comment.includes("organization")) {
        return "faction";
      }
      if (comment.includes("rule") || comment.includes("system")) {
        return "rules";
      }
      if (comment.includes("history") || comment.includes("event")) {
        return "history";
      }
      if (comment.includes("item") || comment.includes("object")) {
        return "item";
      }

      // Fallback to content analysis
      if (content.includes("was born") || content.includes("years old")) {
        return "character";
      }
      if (content.includes("located") || content.includes("building")) {
        return "location";
      }

      return "general";
    },

    /**
     * Build lore hierarchy
     */
    buildLoreHierarchy(topology) {
      const hierarchy = {
        rules: [], // World rules and systems
        history: [], // Historical events
        factions: [], // Organizations and groups
        culture: [], // Cultural elements
        items: [], // Special items
        general: [], // Uncategorized
      };

      for (const [key, entry] of topology._maps.lore) {
        const category = entry.category || "general";
        if (hierarchy[category]) {
          hierarchy[category].push({
            key,
            name: entry.data.comment || entry.data.keys?.[0] || "Unknown",
            priority: entry.data.priority,
          });
        } else {
          hierarchy.general.push({
            key,
            name: entry.data.comment || "Unknown",
            priority: entry.data.priority,
          });
        }
      }

      // Sort by priority
      for (const category of Object.keys(hierarchy)) {
        hierarchy[category].sort((a, b) => b.priority - a.priority);
      }

      return hierarchy;
    },

    /**
     * Check for lore conflicts
     */
    checkLoreConflicts(topology, newContent) {
      const conflicts = [];
      const newLower = newContent.toLowerCase();

      for (const [key, entry] of topology._maps.lore) {
        const existingContent = entry.data.content.toLowerCase();

        // Simple conflict detection - look for contradicting statements
        // This is basic and could be enhanced with NLP
        const contradictionPatterns = [
          { pattern: /(\w+) is (\w+)/, type: "attribute" },
          { pattern: /(\w+) has (\w+)/, type: "possession" },
          { pattern: /(\w+) cannot (\w+)/, type: "ability" },
        ];

        for (const { pattern, type } of contradictionPatterns) {
          const existingMatches = existingContent.match(pattern);
          const newMatches = newLower.match(pattern);

          if (existingMatches && newMatches) {
            if (
              existingMatches[1] === newMatches[1] &&
              existingMatches[2] !== newMatches[2]
            ) {
              conflicts.push({
                type,
                existing: existingMatches[0],
                new: newMatches[0],
                entryKey: key,
                severity: "warning",
              });
            }
          }
        }
      }

      return conflicts;
    },
  },

  // ===== CHARACTER TOPOLOGY =====
  // Handles character traits, relationships, and development

  characterTopology: {
    /**
     * Index a character
     */
    indexCharacter(topology, character) {
      const key = `char_${character.id || topology.generateId()}`;

      topology._maps.characters.set(key, {
        id: character.id,
        type: "character",
        data: character,
        traits: this.extractTraits(character),
        connections: {
          relationships: character.relationships || {},
          locations: [],
          plotLines: [],
          scenes: [],
        },
        metadata: {
          characterType: character.type, // main, supporting, minor
          isPresent: character.isPresent,
          lastUpdated: Date.now(),
        },
      });

      // Add to character graph
      topology._graphs.characterGraph.addNode(key, { name: character.name });

      // Index by name and keywords
      topology.indexKeywords(character.name, key);
      topology.indexKeywords(character.description, key);

      return key;
    },

    /**
     * Extract character traits from description
     */
    extractTraits(character) {
      const traits = {
        personality: [],
        physical: [],
        skills: character.skills || [],
        flaws: character.flaws || [],
        motivations: character.motivations || [],
        fears: character.fears || [],
      };

      // Extract from personality field
      if (character.personality) {
        const personalityTraits = character.personality
          .split(/[,;.]/)
          .map((t) => t.trim())
          .filter((t) => t.length > 0 && t.length < 50);
        traits.personality.push(...personalityTraits);
      }

      // Extract from description using patterns
      if (character.description) {
        const desc = character.description.toLowerCase();

        // Physical traits
        const physicalPatterns = [
          /has (\w+ (?:hair|eyes|skin))/g,
          /is (\w+ (?:tall|short|built))/g,
          /(\w+) appearance/g,
        ];

        for (const pattern of physicalPatterns) {
          let match;
          while ((match = pattern.exec(desc)) !== null) {
            traits.physical.push(match[1]);
          }
        }
      }

      return traits;
    },

    /**
     * Index a relationship between characters
     */
    indexRelationship(topology, char1Key, char2Key, relationship) {
      const relKey = `rel_${char1Key}_${char2Key}`;

      // Add edge to character graph
      topology._graphs.characterGraph.addEdge(char1Key, char2Key, {
        type: relationship.type,
        strength: relationship.strength || 5,
        description: relationship.description,
      });

      // Store in relationships graph
      topology._graphs.relationships.addEdge(char1Key, char2Key, relationship);

      return relKey;
    },

    /**
     * Build character relationship map
     */
    buildRelationshipMap(topology) {
      const map = {
        nodes: [],
        edges: [],
        clusters: [],
      };

      // Build nodes
      for (const [key, entry] of topology._maps.characters) {
        map.nodes.push({
          id: key,
          name: entry.data.name,
          type: entry.metadata.characterType,
          isPresent: entry.metadata.isPresent,
        });
      }

      // Build edges from graph
      const edges = topology._graphs.characterGraph.getEdges();
      for (const edge of edges) {
        map.edges.push({
          source: edge.from,
          target: edge.to,
          type: edge.data?.type || "unknown",
          strength: edge.data?.strength || 5,
        });
      }

      // Identify clusters (groups of closely connected characters)
      map.clusters = this.findCharacterClusters(topology);

      return map;
    },

    /**
     * Find clusters of related characters
     */
    findCharacterClusters(topology) {
      // Simple clustering based on connection density
      const visited = new Set();
      const clusters = [];

      for (const [key] of topology._maps.characters) {
        if (visited.has(key)) continue;

        const cluster = [];
        const queue = [key];

        while (queue.length > 0) {
          const current = queue.shift();
          if (visited.has(current)) continue;

          visited.add(current);
          cluster.push(current);

          const neighbors =
            topology._graphs.characterGraph.getNeighbors(current);
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
              queue.push(neighbor);
            }
          }
        }

        if (cluster.length > 1) {
          clusters.push(cluster);
        }
      }

      return clusters;
    },

    /**
     * Track character development
     */
    trackDevelopment(topology, characterKey, milestone) {
      const entry = topology._maps.characters.get(characterKey);
      if (!entry) return null;

      if (!entry.development) {
        entry.development = {
          milestones: [],
          arc: "",
          currentState: "",
          changes: [],
        };
      }

      entry.development.milestones.push({
        ...milestone,
        timestamp: Date.now(),
      });

      return entry.development;
    },
  },

  // ===== SCENE TOPOLOGY =====
  // Handles scene structure, settings, and flow

  sceneTopology: {
    /**
     * Index a scene
     */
    indexScene(topology, scene) {
      const key = `scene_${scene.id || topology.generateId()}`;

      topology._maps.scenes.set(key, {
        id: scene.id,
        type: "scene",
        data: scene,
        elements: {
          characters: scene.characters || [],
          props: scene.props || [],
          location: scene.location,
          timeOfDay: this.extractTimeOfDay(scene),
          weather: scene.weather,
        },
        connections: {
          previousScene: null,
          nextScene: null,
          plotLines: [],
          location: scene.location,
        },
        metadata: {
          mood: scene.mood,
          tension: scene.tension || 5,
          number: scene.number,
          indexedAt: Date.now(),
        },
      });

      // Link to previous scene
      const prevKey = this.findPreviousScene(topology, scene.number);
      if (prevKey) {
        topology._maps.scenes.get(key).connections.previousScene = prevKey;
        const prevEntry = topology._maps.scenes.get(prevKey);
        if (prevEntry) {
          prevEntry.connections.nextScene = key;
        }
      }

      topology.indexKeywords(scene.title, key);
      topology.indexKeywords(scene.summary, key);

      return key;
    },

    /**
     * Extract time of day from scene data
     */
    extractTimeOfDay(scene) {
      if (scene.timeOfDay) return scene.timeOfDay;

      const timeInStory = (scene.timeInStory || "").toLowerCase();
      const summary = (scene.summary || "").toLowerCase();
      const combined = timeInStory + " " + summary;

      if (combined.includes("morning") || combined.includes("dawn"))
        return "morning";
      if (combined.includes("afternoon") || combined.includes("midday"))
        return "afternoon";
      if (combined.includes("evening") || combined.includes("dusk"))
        return "evening";
      if (combined.includes("night") || combined.includes("midnight"))
        return "night";

      return "unknown";
    },

    /**
     * Find previous scene by number
     */
    findPreviousScene(topology, currentNumber) {
      if (!currentNumber || currentNumber <= 1) return null;

      for (const [key, entry] of topology._maps.scenes) {
        if (entry.metadata.number === currentNumber - 1) {
          return key;
        }
      }

      return null;
    },

    /**
     * Build scene flow graph
     */
    buildSceneFlow(topology) {
      const flow = {
        scenes: [],
        transitions: [],
        tensionCurve: [],
      };

      // Sort scenes by number
      const sortedScenes = Array.from(topology._maps.scenes.entries()).sort(
        (a, b) => (a[1].metadata.number || 0) - (b[1].metadata.number || 0),
      );

      for (let i = 0; i < sortedScenes.length; i++) {
        const [key, entry] = sortedScenes[i];

        flow.scenes.push({
          key,
          number: entry.metadata.number,
          title: entry.data.title,
          location: entry.elements.location,
          tension: entry.metadata.tension,
        });

        flow.tensionCurve.push({
          scene: entry.metadata.number,
          tension: entry.metadata.tension,
        });

        // Build transitions
        if (i > 0) {
          const prevEntry = sortedScenes[i - 1][1];
          flow.transitions.push({
            from: sortedScenes[i - 1][0],
            to: key,
            locationChange:
              prevEntry.elements.location !== entry.elements.location,
            timeGap: this.calculateTimeGap(prevEntry, entry),
          });
        }
      }

      return flow;
    },

    /**
     * Calculate time gap between scenes
     */
    calculateTimeGap(scene1, scene2) {
      // Simple estimation based on time descriptors
      const time1 = scene1.elements.timeOfDay;
      const time2 = scene2.elements.timeOfDay;

      const timeOrder = ["morning", "afternoon", "evening", "night"];
      const idx1 = timeOrder.indexOf(time1);
      const idx2 = timeOrder.indexOf(time2);

      if (idx1 === -1 || idx2 === -1) return "unknown";
      if (idx2 > idx1) return "hours";
      if (idx2 < idx1) return "day_or_more";
      return "minimal";
    },

    /**
     * Analyze scene pacing
     */
    analyzePacing(topology) {
      const analysis = {
        averageTension: 0,
        tensionVariance: 0,
        pacingIssues: [],
        recommendations: [],
      };

      const scenes = Array.from(topology._maps.scenes.values());
      if (scenes.length === 0) return analysis;

      const tensions = scenes.map((s) => s.metadata.tension || 5);
      analysis.averageTension =
        tensions.reduce((a, b) => a + b, 0) / tensions.length;

      // Calculate variance
      const squaredDiffs = tensions.map((t) =>
        Math.pow(t - analysis.averageTension, 2),
      );
      analysis.tensionVariance = Math.sqrt(
        squaredDiffs.reduce((a, b) => a + b, 0) / tensions.length,
      );

      // Identify pacing issues
      for (let i = 1; i < tensions.length; i++) {
        const diff = Math.abs(tensions[i] - tensions[i - 1]);
        if (diff > 5) {
          analysis.pacingIssues.push({
            sceneNumber: i + 1,
            issue: "Abrupt tension change",
            previousTension: tensions[i - 1],
            currentTension: tensions[i],
          });
        }
      }

      // Check for flat sections
      let flatCount = 0;
      for (let i = 1; i < tensions.length; i++) {
        if (Math.abs(tensions[i] - tensions[i - 1]) < 1) {
          flatCount++;
          if (flatCount >= 3) {
            analysis.pacingIssues.push({
              sceneNumber: i + 1,
              issue: "Extended flat pacing",
              tension: tensions[i],
            });
            flatCount = 0;
          }
        } else {
          flatCount = 0;
        }
      }

      // Generate recommendations
      if (analysis.tensionVariance < 1) {
        analysis.recommendations.push("Consider adding more tension variation");
      }
      if (analysis.averageTension > 7) {
        analysis.recommendations.push(
          "Consider adding quieter moments for contrast",
        );
      }
      if (analysis.averageTension < 4) {
        analysis.recommendations.push(
          "Consider increasing conflict and stakes",
        );
      }

      return analysis;
    },
  },

  // ===== LOCATION TOPOLOGY =====
  // Handles locations, geography, and spatial relationships

  locationTopology: {
    /**
     * Index a location
     */
    indexLocation(topology, location) {
      const key = `loc_${location.id || topology.generateId()}`;

      topology._maps.locations.set(key, {
        id: location.id,
        type: "location",
        data: location,
        spatial: {
          type: location.type, // interior, exterior
          connections: location.connections || [],
          containedIn: location.parentLocation || null,
          contains: [],
        },
        metadata: {
          visitCount: 0,
          lastVisited: null,
          indexedAt: Date.now(),
        },
      });

      // Add to location graph
      topology._graphs.locationGraph.addNode(key, {
        name: location.name,
        type: location.type,
      });

      // Add connections to graph
      for (const connection of location.connections || []) {
        topology._graphs.locationGraph.addEdge(key, `loc_${connection}`, {
          type: "connected",
        });
      }

      topology.indexKeywords(location.name, key);
      topology.indexKeywords(location.description, key);

      return key;
    },

    /**
     * Build location hierarchy
     */
    buildLocationHierarchy(topology) {
      const hierarchy = {
        root: [],
        byType: {
          interior: [],
          exterior: [],
        },
        tree: {},
      };

      for (const [key, entry] of topology._maps.locations) {
        const locData = {
          key,
          name: entry.data.name,
          type: entry.spatial.type,
          children: entry.spatial.contains,
        };

        if (!entry.spatial.containedIn) {
          hierarchy.root.push(locData);
        }

        if (entry.spatial.type === "interior") {
          hierarchy.byType.interior.push(locData);
        } else {
          hierarchy.byType.exterior.push(locData);
        }

        hierarchy.tree[key] = locData;
      }

      return hierarchy;
    },

    /**
     * Find path between locations
     */
    findPath(topology, fromKey, toKey) {
      return topology._graphs.locationGraph.findPath(fromKey, toKey);
    },

    /**
     * Get nearby locations
     */
    getNearbyLocations(topology, locationKey, maxDistance = 2) {
      const nearby = [];
      const visited = new Set();
      const queue = [{ key: locationKey, distance: 0 }];

      while (queue.length > 0) {
        const { key, distance } = queue.shift();

        if (visited.has(key)) continue;
        if (distance > maxDistance) continue;

        visited.add(key);

        if (distance > 0) {
          const entry = topology._maps.locations.get(key);
          if (entry) {
            nearby.push({
              key,
              name: entry.data.name,
              distance,
            });
          }
        }

        const neighbors = topology._graphs.locationGraph.getNeighbors(key);
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push({ key: neighbor, distance: distance + 1 });
          }
        }
      }

      return nearby.sort((a, b) => a.distance - b.distance);
    },
  },

  // ===== KEYWORD INDEXING =====

  /**
   * Index keywords from text
   */
  indexKeywords(text, entityKey) {
    if (!text) return;

    // Extract significant words
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3);

    // Remove common stop words
    const stopWords = new Set([
      "the",
      "and",
      "for",
      "are",
      "but",
      "not",
      "you",
      "all",
      "can",
      "had",
      "her",
      "was",
      "one",
      "our",
      "out",
      "has",
      "have",
      "been",
      "were",
      "they",
      "this",
      "that",
      "with",
      "from",
      "will",
      "would",
      "there",
      "their",
      "what",
      "about",
      "which",
      "when",
      "make",
      "like",
      "time",
      "just",
      "know",
      "take",
      "into",
      "year",
      "your",
      "good",
      "some",
      "could",
      "them",
      "than",
      "then",
      "look",
      "only",
      "come",
      "over",
      "such",
      "also",
      "back",
      "after",
      "most",
    ]);

    for (const word of words) {
      if (stopWords.has(word)) continue;

      if (!this._maps.keywords.has(word)) {
        this._maps.keywords.set(word, new Set());
      }
      this._maps.keywords.get(word).add(entityKey);
    }
  },

  /**
   * Search by keyword
   */
  searchByKeyword(keyword) {
    const keyLower = keyword.toLowerCase();
    const results = new Set();

    // Exact match
    if (this._maps.keywords.has(keyLower)) {
      for (const key of this._maps.keywords.get(keyLower)) {
        results.add(key);
      }
    }

    // Partial match
    for (const [word, keys] of this._maps.keywords) {
      if (word.includes(keyLower) || keyLower.includes(word)) {
        for (const key of keys) {
          results.add(key);
        }
      }
    }

    return Array.from(results);
  },

  // ===== UTILITY FUNCTIONS =====

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  calculatePlotTension(plot) {
    // Calculate based on status and timeline
    let tension = 5;

    if (plot.status === "active") tension += 2;
    if (plot.status === "stalled") tension -= 1;

    if (plot.timeline && plot.timeline.length > 0) {
      const lastEvent = plot.timeline[plot.timeline.length - 1];
      if (lastEvent.tension) tension = lastEvent.tension;
    }

    return Math.max(1, Math.min(10, tension));
  },

  /**
   * Get entity by key
   */
  getEntity(key) {
    const type = key.split("_")[0];

    switch (type) {
      case "plot":
      case "beat":
        return this._maps.story.get(key);
      case "lore":
        return this._maps.lore.get(key);
      case "char":
        return this._maps.characters.get(key);
      case "scene":
        return this._maps.scenes.get(key);
      case "loc":
        return this._maps.locations.get(key);
      default:
        return null;
    }
  },

  /**
   * Get all entities of a type
   */
  getEntitiesByType(type) {
    switch (type) {
      case "story":
        return Array.from(this._maps.story.values());
      case "lore":
        return Array.from(this._maps.lore.values());
      case "character":
        return Array.from(this._maps.characters.values());
      case "scene":
        return Array.from(this._maps.scenes.values());
      case "location":
        return Array.from(this._maps.locations.values());
      default:
        return [];
    }
  },

  /**
   * Clear all topology data
   */
  clear() {
    this._maps = this.getEmptyMaps();
    this._graphs = this.getEmptyGraphs();
  },

  /**
   * Get topology summary
   */
  getSummary() {
    return {
      storyEntries: this._maps.story.size,
      loreEntries: this._maps.lore.size,
      characters: this._maps.characters.size,
      scenes: this._maps.scenes.size,
      locations: this._maps.locations.size,
      keywordsIndexed: this._maps.keywords.size,
      graphs: {
        relationships: this._graphs.relationships.nodeCount(),
        characterInteractions: this._graphs.characterGraph.nodeCount(),
        locationConnections: this._graphs.locationGraph.nodeCount(),
      },
    };
  },
};

// ===== SIMPLE GRAPH CLASS =====
// Basic graph implementation for relationship tracking

class Graph {
  constructor() {
    this._nodes = new Map();
    this._edges = new Map();
  }

  addNode(id, data = {}) {
    if (!this._nodes.has(id)) {
      this._nodes.set(id, { id, data, edges: new Set() });
    }
    return this;
  }

  removeNode(id) {
    if (this._nodes.has(id)) {
      const node = this._nodes.get(id);
      for (const edgeId of node.edges) {
        this._edges.delete(edgeId);
      }
      this._nodes.delete(id);
    }
    return this;
  }

  addEdge(fromId, toId, data = {}) {
    this.addNode(fromId);
    this.addNode(toId);

    const edgeId = `${fromId}->${toId}`;
    this._edges.set(edgeId, { from: fromId, to: toId, data });

    this._nodes.get(fromId).edges.add(edgeId);
    this._nodes.get(toId).edges.add(edgeId);

    return this;
  }

  removeEdge(fromId, toId) {
    const edgeId = `${fromId}->${toId}`;
    if (this._edges.has(edgeId)) {
      this._edges.delete(edgeId);
      this._nodes.get(fromId)?.edges.delete(edgeId);
      this._nodes.get(toId)?.edges.delete(edgeId);
    }
    return this;
  }

  getNode(id) {
    return this._nodes.get(id);
  }

  getEdge(fromId, toId) {
    return this._edges.get(`${fromId}->${toId}`);
  }

  getEdges() {
    return Array.from(this._edges.values());
  }

  getNeighbors(id) {
    const node = this._nodes.get(id);
    if (!node) return [];

    const neighbors = new Set();
    for (const edgeId of node.edges) {
      const edge = this._edges.get(edgeId);
      if (edge) {
        if (edge.from === id) neighbors.add(edge.to);
        if (edge.to === id) neighbors.add(edge.from);
      }
    }
    return Array.from(neighbors);
  }

  hasNode(id) {
    return this._nodes.has(id);
  }

  hasEdge(fromId, toId) {
    return this._edges.has(`${fromId}->${toId}`);
  }

  nodeCount() {
    return this._nodes.size;
  }

  edgeCount() {
    return this._edges.size;
  }

  /**
   * Find shortest path between two nodes using BFS
   */
  findPath(fromId, toId) {
    if (!this._nodes.has(fromId) || !this._nodes.has(toId)) {
      return null;
    }

    if (fromId === toId) {
      return [fromId];
    }

    const visited = new Set();
    const queue = [{ node: fromId, path: [fromId] }];

    while (queue.length > 0) {
      const { node, path } = queue.shift();

      if (visited.has(node)) continue;
      visited.add(node);

      const neighbors = this.getNeighbors(node);
      for (const neighbor of neighbors) {
        if (neighbor === toId) {
          return [...path, neighbor];
        }
        if (!visited.has(neighbor)) {
          queue.push({ node: neighbor, path: [...path, neighbor] });
        }
      }
    }

    return null; // No path found
  }

  /**
   * Clear all nodes and edges
   */
  clear() {
    this._nodes.clear();
    this._edges.clear();
  }

  /**
   * Export graph data
   */
  export() {
    return {
      nodes: Array.from(this._nodes.entries()).map(([id, node]) => ({
        id,
        data: node.data,
      })),
      edges: Array.from(this._edges.entries()).map(([id, edge]) => ({
        id,
        from: edge.from,
        to: edge.to,
        data: edge.data,
      })),
    };
  }
}

// Export for use in other modules
if (typeof window !== "undefined") {
  window.CouncilTopology = CouncilTopology;
  window.Graph = Graph;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CouncilTopology, Graph };
}
