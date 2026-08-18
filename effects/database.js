/* KEFE Visualiser — canonical effect database loader */
(function () {
  'use strict';

  const DB_URL = './effects/effect-database.json';

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(freeze);
    return value;
  }

  function normaliseDatabase(data) {
    if (!data || !Array.isArray(data.effects)) {
      throw new Error('KEFE effect database is missing its effects array.');
    }

    const ids = new Set();
    data.effects.forEach(effect => {
      if (!effect || typeof effect.id !== 'string' || !effect.id) {
        throw new Error('KEFE effect database contains an effect without a stable id.');
      }
      if (ids.has(effect.id)) {
        throw new Error(`KEFE effect database contains duplicate id: ${effect.id}`);
      }
      ids.add(effect.id);
    });

    return freeze(data);
  }

  window.kefeEffectDatabaseReady = fetch(DB_URL, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`Failed to load KEFE effect database (${response.status}).`);
      return response.json();
    })
    .then(normaliseDatabase)
    .then(database => {
      window.kefeEffectDatabase = database;

      const byId = new Map(database.effects.map(effect => [effect.id, effect]));
      const byCategory = new Map();
      database.effects.forEach(effect => {
        if (!byCategory.has(effect.category)) byCategory.set(effect.category, []);
        byCategory.get(effect.category).push(effect);
      });

      window.kefeEffectsCatalog = Object.freeze({
        all: () => database.effects,
        get: id => byId.get(id) || null,
        byCategory: category => byCategory.get(category) || [],
        implemented: () => database.effects.filter(effect => effect.status === 'implemented'),
        catalogued: () => database.effects.filter(effect => effect.status === 'catalogued')
      });

      document.dispatchEvent(new CustomEvent('kefe:effect-database-ready', {
        detail: database
      }));

      return database;
    })
    .catch(error => {
      console.error('[KEFE] Effect database failed to load:', error);
      window.kefeEffectDatabaseError = error;
      throw error;
    });
})();
