import { loadGame, perform, saveGame, STORAGE_KEY, synchronize } from './game.mjs?v=0.16';

// The IndexedDB write transaction provides mutual exclusion on Safari versions
// without Web Locks. Keep the localStorage read, reduction and write synchronous.
function idbLock(indexedDB) {
  let database;
  return task => {
    database ??= new Promise((resolve,reject)=>{
      const request = indexedDB.open('motor-empire-clock',1);
      request.onupgradeneeded = ()=>request.result.createObjectStore('lock');
      request.onsuccess = ()=>resolve(request.result);
      request.onerror = ()=>reject(request.error);
      request.onblocked = ()=>reject(new Error('Kayıt kilidi açılamadı.'));
    });
    return database.then(db=>new Promise((resolve,reject)=>{
      const tx = db.transaction('lock','readwrite');
      const request = tx.objectStore('lock').get('game');
      let result, failure;
      request.onsuccess = ()=>{
        try { result = task(); }
        catch (error) { failure = error; tx.abort(); }
      };
      tx.oncomplete = ()=>resolve(result);
      tx.onabort = tx.onerror = ()=>reject(failure ?? tx.error ?? new Error('Kayıt kilidi kaybedildi.'));
    }));
  };
}

export function saveLock(navigator, indexedDB) {
  return navigator.locks?.request
    ? task=>navigator.locks.request('motor-empire-game',task)
    : idbLock(indexedDB);
}

export function createTimeStore(storage, lock, now = Date.now) {
  let lastRaw;
  let lastState;
  return (action,id,amount,branchId)=>lock(()=>{
    const raw = storage.getItem(STORAGE_KEY);
    const source = raw && raw === lastRaw ? lastState : loadGame(storage);
    if (action === 'refresh') {
      lastRaw = raw;
      lastState = source;
      return {state:source};
    }
    const wall = now();
    let {state,summary} = synchronize(source,wall);
    let message, error;
    if (action === 'toggle-clock') {
      state = {...state,clock:{...state.clock,wall:Math.max(state.clock.wall,wall),paused:!state.clock.paused}};
    } else if (action) {
      try {
        const result = perform(state,action,id,amount,branchId);
        state = result.state;
        message = result.message;
      } catch (failure) { error = failure; }
    }
    if ((action && action !== 'hold-buyer' && !error) || summary?.days || summary?.completed || summary?.delivered || summary?.inspected || summary?.approved || summary?.rides || summary?.complaints || summary?.staffEvents) {
      state = {...state,clock:{...state.clock,revision:(state.clock.revision ?? 0)+1}};
    }
    if (!raw || state !== source) saveGame(storage,state);
    lastRaw = storage.getItem(STORAGE_KEY);
    lastState = state;
    return {state,summary,message,error};
  });
}
