import { create, useStore as useZustandStore } from 'zustand';
import { temporal } from 'zundo';
import React from 'react';

const useStore = create(temporal((set) => ({ count: 0 })));
console.log("Keys on useStore:", Object.keys(useStore));
console.log("Is useStore.temporal a function?", typeof useStore.temporal);
