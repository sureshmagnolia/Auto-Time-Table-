import { createStore } from 'zustand/vanilla';
import { temporal } from 'zundo';

const useStore = createStore(temporal((set) => ({ count: 0 })));
console.log("Keys on useStore:", Object.keys(useStore));
if (useStore.temporal) {
    console.log("Is temporal a function?", typeof useStore.temporal);
    console.log("Keys on temporal:", Object.keys(useStore.temporal));
} else {
    console.log("useStore.temporal is undefined!");
}
